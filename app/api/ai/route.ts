import { createVertex } from '@ai-sdk/google-vertex';
import { streamText } from 'ai';
import { auth } from 'auth';
import { canImportRatecon } from 'lib/ratecon-import-check/ratecon-import-check-server';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';

interface LogisticsData {
    logistics_company: string;
    load_number: string;
    stops: {
        type: string;
        name: string;
        address: {
            street: string;
            city: string;
            state: string;
            zip: string;
            country: string;
        };
        date: string;
        time: string;
        po_numbers?: string[];
        pickup_numbers?: string[];
        reference_numbers?: string[];
    }[];
    rate: number;
    invoice_emails: string[];
    customer_details?: {
        name: string;
        contact_email?: string;
        billing_email?: string;
        payment_status_email?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            zip: string;
            country: string;
        };
    };
}

const system = `Objective: Extract sequences from a rate confirmation document using OCR and structure the extracted data.

Output Format:
{
    "logistics_company": string or null,
    "load_number": string or null,
    "stops": [
        {
            "type": "PU" or "SO",
            "name": string or null,
            "address": {
                "street": string or null,
                "city": string or null,
                "state": string or null,
                "zip": string or null,
                "country": string or null
            },
            "date": string or null (use MM/DD/YYYY format, replace - with / if necessary),
            "time": string or null,
            "po_numbers": ["<po_number_1>", "<po_number_2>", ...] or null,
            "pickup_numbers": ["<pickup_number_1>", "<pickup_number_2>", ...] or null,
            "reference_numbers": ["<reference_number_1>", "<reference_number_2>", ...] or null
        },
        ... (repeat this structure for each stop regardless if it appears multiple times)
    ],
    "rate": number or null,
    "invoice_emails": ["<invoice_email_1>", "<invoice_email_2>", ...] or null,
    "customer_details": {
        "name": string or null,
        "contact_email": string or null,
        "billing_email": string or null,
        "payment_status_email": string or null,
        "address": {
            "street": string or null,
            "city": string or null,
            "state": string or null,
            "zip": string or null,
            "country": string or null
        } or null
    } or null
}

Extraction Guidelines:
1. General: Context is crucial due to OCR inaccuracies. Default to 'null' in ambiguous situations.
2. Logistics Company/Broker: Distinct from the carrier. Prioritize names with suffixes like "LLC", "Inc", "Corp". Exclude slogans.
3. Load Number: Identify as "Load", "Order", "Load #", "Order #", etc. Remove '#' from the result.
4. Stops:
    - Types: Classify as "PU" for indications of "shipper" or "pickup"; use "SO" for terms like "consignee", "receiver", or "delivery".
    - Details:
        - Name & Address: Capture the entity's name along with its complete address.
        - Date: Extract the date ensuring it follows the MM/DD/YYYY format. Be on the lookout for nearby contextual clues (like "Date:") to accurately identify it.
        - Time: The shipping/receiving hours for the shipment. The extracted time should strictly be in the 24-hour format. If a range is provided, it should appear in the format "HH:mm - HH:mm", for instance, "05:00 - 20:00". If the time is accompanied by a date within the range (like "2023-06-01 05:00 - 2023-07-08 20:00"), only the time portion should be extracted, omitting the date.
5. Rate: Look for "Total", "Rate", "Amount". Extract the complete amount including any additional fees. Represent the value numerically.
6. Invoice Emails: Extract all emails where invoices should be sent. If none are found, use 'null'.
7. Customer Details: Extract comprehensive broker information as customer details (since you invoice the broker who generated this rate confirmation):
    - Name: The broker/logistics company name. This is the entity that contracted the load and will be invoiced. Look for "Broker", "Logistics Company", "Contracted By", "Bill To", or the main company header on the rate confirmation.
    - Contact Email: Broker's primary contact email, often labeled as "Contact", "Email", "Broker Email", "Coordinator Email"
    - Billing Email: Email where the broker expects BOL/POD paperwork to be sent for processing invoices. Look for "Submit Documents", "Send BOL", "Send POD", "Document Submission", "Paperwork Email", "Invoice Documents", or similar instructions.
    - Payment Status Email: Email for inquiries about payment status, typically the accounts payable department. Look for "Accounts Payable", "AP Email", "Payment Inquiries", "Payment Status", "Finance Department", "AR Department", or contact information for payment-related questions.
    - Address: The broker's mailing address where they want documents sent. This can be either a PO Box or a normal street address. This address typically appears close to the broker name/company header, often in "Bill To", "Send Documents To", or broker contact information sections. This is NOT the pickup or delivery location addresses.

    IMPORTANT: Customer details should represent the BROKER/LOGISTICS COMPANY that generated the rate confirmation and will be invoiced, NOT the shipper at the pickup location. The broker is your customer who you need to bill for transportation services.

    NOTE: In the example above, "C.H. Robinson" is the broker/customer (who you invoice) and "Gorilla Glue Company" is the shipper (at pickup location). The customer_details should reflect the broker (C.H. Robinson), not the shipper (Gorilla Glue Company).

Advanced Extraction Details:
1. PO Numbers:
    - Extract from labels "PO", "PO Number", "PO #".
    - Avoid numbers far from labels or near "Ref Numbers:", "BOL#", "ORDER:", "Pro".
2. Pickup Numbers:
    - Start with labels like "Pickup", "PU", "Pickup #", "Delivery", etc.
    - Be cautious about sequences near "Load Number", "Order Number", "Ref", "Reference", or resembling phone numbers.
3. Reference Numbers:
    - This is vital. Capture the entire sequence of label-value pairs immediately following mentions of "Reference", "Ref Numbers", or "Shipper ID". These pairs are typically separated by commas.
    - Concatenate all the captured label-value pairs from a single stop using commas but without line breaks.
    - Stay vigilant for any continuation on the next page and strictly avoid usual address patterns or mentions like "Phone", "Tel", or "Contact".
4. Broker Information Extraction (CRITICAL for customer_details):
    - Look for sections like "Broker INFORMATION", "BILL TO", "Contracted By", "Load Broker", or company headers/letterheads
    - The broker is usually the company that generated the rate confirmation document
    - Broker address should be different from pickup/delivery locations and is often in header, footer, or "Bill To" sections
    - The broker address typically appears near the broker company name, often in the document header or a dedicated "Bill To" or "Send Documents To" section
    - Email addresses may be in dedicated sections or near broker contact information (e.g., "Broker Email", "Broker Contact", "Load Coordinator")
    - Common broker identifiers: company logos, "Rate Confirmation from [Company]", "Contracted By", "Broker: [Company]"
    - The broker name often appears prominently at the top of the document or in document headers
    - For billing_email: Look for document submission instructions like "Submit freight bills to:", "Send BOL/POD to:", "Document submission:", "Paperwork email:"
    - For payment_status_email: Look for payment inquiry instructions like "Payment questions:", "Accounts payable:", "Payment status:", "Finance contact:"
    - Broker name and address and contact information is typically found close by at the top of bottom of the document
Example:
Document snippet:

LOGISTICS DETAILS
-----------------

Contracted By:     C.H. Robinson
                   14701 Charlson Rd
                   Eden Prairie, MN 55347

LOAD CONFIRMATION
-----------------
Load #:            426973549

SHIPMENT STOPS
---------------
Shipper:

Gorilla Glue Company
2125 E Kemper Rd, Cincinnati, OH 45241
Stop Type:         Pickup (PU)
Date:              2/23/2023
Time:              12:00
Reference: SI#: 90, CFM: Y, QN: 90, ZN: 768327, SWT: 33282.0, SPC: 1493.0

Receiver:

CHR Metro Air Logistics Center
4241 Plainfield Rd, Plainfield, IN 46231
Stop Type:         Dropoff (SO)
Date:              2/23/2023
Time:              19:00
Reference Numbers: 1RPRL2-01, 1RPRF9-01

RATE INFORMATION
----------------
Total Rate:        $800.00

INVOICE DETAILS
---------------
Please submit freight bills to the following emails:
- LoadDocs@CHRobinson.com

Payment inquiries should be directed to:
- AP@CHRobinson.com

Page 1 of 1

Extraction output:
{
    "logistics_company": "C.H. Robinson",
    "load_number": "426973549",
    "stops": [
        {
            "type": "PU",
            "name": "Gorilla Glue Company",
            "address": {
                "street": "2125 E Kemper Rd",
                "city": "Cincinnati",
                "state": "OH",
                "zip": "45241",
                "country": null
            },
            "date": "2/23/2023",
            "time": "12:00",
            "po_numbers": null,
            "pickup_numbers": null,
            "reference_numbers": ["SI#: 90", "CFM: Y", "QN: 90", "ZN: 768327", "SWT: 33282.0", "SPC: 1493.0"]
        },
        {
            "type": "SO",
            "name": "CHR Metro Air Logistics Center",
            "address": {
                "street": "4241 Plainfield Rd",
                "city": "Plainfield",
                "state": "IN",
                "zip": "46231",
                "country": null
            },
            "date": "2/23/2023",
            "time": "19:00",
            "po_numbers": null,
            "pickup_numbers": null,
            "reference_numbers": ["1RPRL2-01", "1RPRF9-01"]
        }
    ],
    "rate": 800.00,
    "invoice_emails": ["LoadDocs@CHRobinson.com"],
    "customer_details": {
        "name": "C.H. Robinson",
        "contact_email": null,
        "billing_email": "LoadDocs@CHRobinson.com",
        "payment_status_email": "AP@CHRobinson.com",
        "address": {
            "street": "14701 Charlson Rd",
            "city": "Eden Prairie",
            "state": "MN",
            "zip": "55347",
            "country": null
        }
    }
}`;

export const maxDuration = 30;
export const POST = auth(async (req: NextAuthRequest) => {
    if (req.method !== 'POST') {
        return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const session = req.auth;
    if (!session || !session.user || !session.user.defaultCarrierId) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const carrierId = session.user.defaultCarrierId;

    try {
        const { documents } = await req.json();

        const canImport = await canImportRatecon({
            carrierId,
            shouldIncrement: true,
        });
        if (!canImport) {
            return new NextResponse(JSON.stringify({ error: 'Ratecon import limit reached.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 403,
            });
        }

        if (!Array.isArray(documents)) {
            throw new Error('Invalid input. Expected arrays.');
        }

        if (documents.length === 0) {
            throw new Error('Invalid input. Expected arrays with at least one item.');
        }

        const context = documents.map((item) => {
            return item.pageContent as string;
        });

        const vertex = createVertex({
            location: 'us-central1',
            project: process.env.GCP_PROJECT_ID,
            googleAuthOptions: {
                credentials: {
                    type: 'service_account',
                    private_key: process.env.GCP_PRIVATE_KEY,
                    client_email: process.env.GCP_CLIENT_EMAIL,
                    client_id: process.env.GCP_CLIENT_ID,
                    project_id: process.env.GCP_PROJECT_ID,
                },
            },
        });

        const result = streamText({
            model: vertex('gemini-2.0-flash-001', {
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_ONLY_HIGH',
                    },
                ],
            }),
            maxTokens: 2048,
            temperature: 0,
            system: system,
            prompt: JSON.stringify(context),
        });

        return result.toTextStreamResponse();
    } catch (error) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

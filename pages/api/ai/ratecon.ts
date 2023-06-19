import { ChatOpenAI } from 'langchain/chat_models/openai';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { Document } from 'langchain/document';
import { NextRequest, NextResponse } from 'next/server';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts';

export const config = {
    runtime: 'edge',
};

export default async function POST(req: NextRequest) {
    try {
        const list = await req.json();

        if (!Array.isArray(list)) {
            throw new Error('Invalid input. Expected an array.');
        }

        const documents: Document[] = list.map((item) => {
            if (!isValidItem(item)) {
                throw new Error('Invalid item in the list.');
            }

            return new Document({
                pageContent: item.pageContent,
                metadata: item.metadata,
            });
        });

        const splitter = new CharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 300,
        });

        const splitDocuments = await splitter.splitDocuments(documents);
        const vectordb = await MemoryVectorStore.fromDocuments(splitDocuments, new OpenAIEmbeddings());

        const instructions = `
\`\`\`json

load: { // Load Details
    logistics_company: string // The name of the logistics company
    load_number: string // The load/reference number for the shipment. Remove '#' from string
    shipper: string // The name of the shipper
    shipper_address: { // The address of the shipper.
        street: string // Street
        city: string // City
        state: string // State
        zip: string // Zip
        country: string // Country
    }
    pickup_date: string // The date of pickup
    pickup_time: string // The time of pickup. Give time in 24 hour format
    consignee: string // The name of the consignee/receiver
    consignee_address: { // The address of the consignee/receiver
        street: string // Street
        city: string // City
        state: string // State
        zip: string // Zip
        country: string // Country
    }
    delivery_date: string // The date of delivery
    delivery_time: string // The time of delivery
    rate: number // The flat rate for the line haul. Only include the number, not the currency
    invoice_email: string // The email address where to send proof of delivery (POD/BOL) and invoice after delivery. If there is no email address, return null
}
\`\`\`


Please output the extracted information in JSON format. Do not output anything except for the extracted information. Do not add any clarifying information. Do not add any fields that are not in the schema. If the text contains attributes that do not appear in the schema, please ignore them. All output must be in JSON format and follow the schema specified above.



Input: and have the driver turn on location services for the duration of the shipment.\n- Update arrival and departure times in the tech tracking app\n- Drivers must opt in to at least one method of tech tracking for the duration of the shipment\n- Ensure the load is secured properly prior to leaving the shipper. If unable to inspect the loading process, have the shipper write\n'SHIPPER LOAD COUNT' on paperwork to reduce liability\n\nDetention\n\n- Drivers must opt in to at least one method of tech tracking to be eligible for detention\n- Detention rate is $40/hour (Max detention = 5 hours), 5+ hrs detention will be paid out as 1 layover with signed in/out times\n- Detention starts 2 hours after the scheduled appointment time\n- Carrier must notify Stord Freight 30 min prior to entering detention to be eligible for compensation\n- Detention request must include a signed BOL with in/out times by the shipper or consignee\n- Detention must be requested within 48 hrs after delivery\n\nLayover/TONU\n\nCarrier Rate and Load Confirmation\n\nSTORD FREIGHT LLC\n1602 E Republic Rd Suite A\nSpringfield, MO 65804\nKarla Bartlett\nkarla.bartlett@stord.com\n\nLoad Number:\n \nL60458\n \nCarrier:\n \nPSB EXPRESS INC\n\nDate:\n \n07/13/2022\n \nContact:\n \nPARMJEET SINGH, (p) 317-270-2968 (f)\n\nEquipment Type:\n \nDry Van 53'\n \nCustomer Load Id:\n\nPO Number:\n \nMIY0001505-01\n \nBill of Lading Number:\n \nNB27333005\n\nOrder Number:\n \nCustomer Reference:\n\nShipper Pickup (Stop 1)\n\nPLAINFIELD\n1250 WHITAKER ROAD\nPlainfield, IN US 46168\n\nExpected Date:\n \n07/14/2022\n\nShipping/Receiving Hours:\nAppointment Required:\n \nNo\n\nAppointment Time:\n \n22:40\n\nContact:\nPickup Instructions:\nShipper References:\nPickup/Delivery Number:\n \n32247754\n\nStop:\n \nStop 1\n\nConsignee Delivery (Stop 2)\n\nMCLANE DANVILLE - 61832 - 1\n3400 E MAIN\nDANVILLE, IL US 61832\n\nExpected Date:\n \n07/15/2022\n\nShipping/Receiving Hours:\nAppointment Required:\n \nNo\n\nAppointment Time:\n \n07:00\n\nAdditional Services\n\nStop 2 Lumper Delivery\n\nCarrier Fees\nDescription\n \nCost\nNet Freight Charges\n \nUSD 800.00\nTotal Cost\n \nUSD 800.00\n\nTo ensure a successful shipment, here is what we need from you!\n\n- Contact us at 678-735-4772 or liveops@stord.com immediately for any issues in transit\n- Carrier will receive a link at the time of booking prompting the Carrier to opt into a form of tech tracking. Please accept the request\n\nLayover/TONU\n\n- Carrier must be tracking with tech tracking (e.g. MacroPoint and P44) to be eligible for Layover\n- Layover rate is $250/day\n- TONU rate is $150 (Dry Van and Flatbed) and $250 (Reefer if precooled)\n\nLumpers\n\n- All lumper charges must be approved at the time of occurrence. Unapproved lumper charges will NOT be paid\n- Receipts must be submitted to Stord Freight within 48 hours of occurrence via email/phone and attached to invoice submission\n- If Stord Freight advances payment for a lumper and Carrier does not provide a lumper receipt, the charges will be deducted from\nthe Carrier’s rate\n\nStop Offs\n\n- Additional stop off rate is $50/stop\n\nInvoices\n\n- Email BOL/POD to freight-accounting@stord.com within 48 hours after delivery\n\nContact:\nPickup Instructions:\nShipper References:\nPickup/Delivery Number:\n \n32247754\n\nStop:\n \nStop 1\n\nConsignee Delivery (Stop 2)\n\nMCLANE DANVILLE - 61832 - 1\n3400 E MAIN\nDANVILLE, IL US 61832\n\nExpected Date:\n \n07/15/2022\n\nShipping/Receiving Hours:\nAppointment Required:\n \nNo\n\nAppointment Time:\n \n07:00\n\nContact:\nDelivery Instructions:\n \nLumper required at RECEIVER, DRIVER\nWILL NEED TO PAY & SUBMIT RECEIPT WITHIN 24 HOURS\nTO BE REIMBURSED\n\nConsignee References:\nPickup/Delivery Number:\n \nNBL.32247754\n\nStop:\n \nStop 2\n\nShipment Information\nHandling Unit\n \nPackage\n \nLTL Only\n\nQty\n \nType\n \nQty\n \nType\n \nWeight\n \nHM (X)\n \nCommodity Description\n \nNMFC #\n \nNMFC Class\n20\n \nPallets\n \n43084 lbs\n \nFinished Goods\n\nAdditional Services\n\nStop 2 Lumper Delivery\n\nCarrier Fees\nDescription\n \nCost\nNet Freight Charges\n \nUSD 800.00\nTotal Cost\n \nUSD 800.00\n\nTo ensure a successful shipment, here is what we need from you!
Output: {"load": {"logistics_company": "STORD FREIGHT LLC", "load_number": "L60458", "shipper": "PLAINFIELD", "shipper_address": {"street": "1250 WHITAKER ROAD", "city": "Plainfield", "state": "IN", "zip": "46168", "country": "US"}, "pickup_date": "07/14/2022", "pickup_time": "22:40", "consignee": "MCLANE DANVILLE - 61832 - 1", "consignee_address": {"street": "3400 E MAIN", "city": "DANVILLE", "state": "IL", "zip": "61832", "country": "US"}, "delivery_date": "07/15/2022", "delivery_time": "07:00", "rate": "800.00", "invoice_email": "freight-accounting@stord.com"}}
`;

        const chatPrompt = ChatPromptTemplate.fromPromptMessages([
            SystemMessagePromptTemplate.fromTemplate(
                "Your goal is to extract structured information from the user's input that matches the form described below. When extracting information please make sure it matches the type information exactly. Do not add any attributes that do not appear in the schema shown below.\n\n{instructions}",
            ),
            HumanMessagePromptTemplate.fromTemplate('{context}'),
        ]);
        chatPrompt.partialVariables = { instructions: instructions };

        const qaChain = RetrievalQAChain.fromLLM(
            new ChatOpenAI({
                verbose: true,
            }),
            vectordb.asRetriever(7),
            {
                returnSourceDocuments: false,
                prompt: chatPrompt,
            },
        );

        const result = await qaChain.call({
            query: 'Output:',
        });

        if (typeof result.text === 'string') {
            const jsonStr = result.text?.replace(/`/g, '');

            try {
                const json = JSON.parse(jsonStr);
                return NextResponse.json(
                    {
                        code: 200,
                        data: json,
                    },
                    { status: 200 },
                );
            } catch (error) {
                return NextResponse.json(
                    {
                        code: 200,
                        error: jsonStr,
                    },
                    { status: 200 },
                );
            }
        } else {
            return NextResponse.json(
                {
                    code: 200,
                    data: result.text,
                },
                { status: 200 },
            );
        }
    } catch (error) {
        return NextResponse.json(
            {
                code: 400,
                error: error.message,
            },
            { status: 400 },
        );
    }
}

function isValidItem(item: Document): boolean {
    if (typeof item.pageContent !== 'string') {
        return false;
    }

    if (typeof item.metadata !== 'object') {
        return false;
    }

    return true;
}

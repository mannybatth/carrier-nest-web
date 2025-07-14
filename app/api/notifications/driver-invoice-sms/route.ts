import { NextRequest, NextResponse } from 'next/server';
import Twilio from 'twilio';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { driverPhone, driverName, invoiceNum, approvalUrl, invoiceAmount, carrierName } = body;

        if (!driverPhone || !driverName || !invoiceNum || !approvalUrl || !invoiceAmount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Initialize Twilio client using the same setup as auth.ts
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            console.error('Twilio credentials not configured');
            return NextResponse.json({ error: 'SMS service not configured' }, { status: 500 });
        }

        const twilioClient = Twilio(accountSid, authToken);

        // Create SMS message
        const messageBody = createSMSMessage({
            driverName,
            invoiceNum,
            approvalUrl,
            invoiceAmount,
            carrierName: carrierName || 'CarrierNest',
        });

        await twilioClient.messages.create({
            body: messageBody,
            from: '+18883429736', // Using the same number as in auth.ts
            to: driverPhone,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending driver invoice SMS:', error);
        return NextResponse.json({ error: 'Failed to send SMS notification' }, { status: 500 });
    }
}

function createSMSMessage(data: {
    driverName: string;
    invoiceNum: string;
    approvalUrl: string;
    invoiceAmount: string;
    carrierName: string;
}): string {
    return `Hi ${data.driverName}! 🚛

Your invoice is ready for approval:
💰 Amount: ${data.invoiceAmount}
📄 Invoice #${data.invoiceNum}

👆 Tap to review and approve:
${data.approvalUrl}

- ${data.carrierName}
- CarrierNest`;
}

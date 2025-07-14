import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { driverEmail, driverName, invoiceNum, approvalUrl, invoiceAmount, carrierName } = body;

        if (!driverEmail || !driverName || !invoiceNum || !approvalUrl || !invoiceAmount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const transport = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST,
            port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
            secure: parseInt(process.env.EMAIL_SERVER_PORT || '587') === 465,
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
        });

        const subject = `New Invoice Ready for Approval - ${invoiceAmount}`;

        const htmlContent = createEmailTemplate({
            driverName,
            invoiceNum,
            approvalUrl,
            invoiceAmount,
            carrierName: carrierName || 'CarrierNest',
        });

        const textContent = createTextTemplate({
            driverName,
            invoiceNum,
            approvalUrl,
            invoiceAmount,
            carrierName: carrierName || 'CarrierNest',
        });

        await transport.sendMail({
            to: driverEmail,
            from: process.env.EMAIL_FROM,
            subject,
            text: textContent,
            html: htmlContent,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending driver invoice email:', error);
        return NextResponse.json({ error: 'Failed to send email notification' }, { status: 500 });
    }
}

function createEmailTemplate(data: {
    driverName: string;
    invoiceNum: string;
    approvalUrl: string;
    invoiceAmount: string;
    carrierName: string;
}): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Ready for Approval</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                line-height: 1.47;
                color: #1d1d1f;
                background-color: #f5f5f7;
                margin: 0;
                padding: 0;
                font-size: 17px;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
            }
            .email-wrapper {
                background-color: #f5f5f7;
                padding: 40px 20px;
                min-height: 100vh;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 18px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            .header {
                background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
                padding: 48px 32px;
                text-align: center;
                position: relative;
            }
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                pointer-events: none;
            }
            .header-content {
                position: relative;
                z-index: 2;
            }
            .header h1 {
                font-size: 28px;
                font-weight: 600;
                color: white;
                margin-bottom: 8px;
                letter-spacing: -0.022em;
            }
            .header p {
                font-size: 17px;
                color: rgba(255, 255, 255, 0.85);
                font-weight: 400;
                letter-spacing: -0.022em;
            }
            .content {
                padding: 40px 32px;
                text-align: center;
            }
            .amount-highlight {
                background: linear-gradient(135deg, #e8f5e8 0%, #f0f9f0 100%);
                border-radius: 16px;
                padding: 24px;
                margin: 24px 0;
                border: 1px solid #e5e5e7;
            }
            .amount {
                font-size: 32px;
                font-weight: 700;
                color: #1d7324;
                margin-bottom: 8px;
            }
            .action-button {
                display: inline-block;
                padding: 14px 28px;
                background: #007AFF;
                color: white !important;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 590;
                font-size: 16px;
                letter-spacing: -0.43px;
                transition: all 0.15s ease-out;
                border: none;
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0, 122, 255, 0.12), 0 1px 2px rgba(0, 122, 255, 0.24);
                margin: 24px 0;
            }
            .action-button:hover {
                background: #0051D5;
                text-decoration: none;
                color: white !important;
                transform: translateY(-0.5px);
                box-shadow: 0 3px 8px rgba(0, 122, 255, 0.16), 0 3px 6px rgba(0, 122, 255, 0.31);
            }
            .footer {
                background: #f5f5f7;
                padding: 32px;
                text-align: center;
                border-top: 1px solid #d2d2d7;
            }
            .footer p {
                font-size: 13px;
                color: #86868b;
                margin-bottom: 4px;
                letter-spacing: -0.022em;
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-container">
                <div class="header">
                    <div class="header-content">
                        <h1>Invoice Ready for Approval</h1>
                        <p>Hi ${data.driverName}, you have a new invoice to review</p>
                    </div>
                </div>

                <div class="content">
                    <h2>Your invoice is ready for approval</h2>
                    <p>Invoice #${data.invoiceNum}</p>

                    <div class="amount-highlight">
                        <div class="amount">${data.invoiceAmount}</div>
                        <p>Total Amount</p>
                    </div>

                    <p>Please review and approve your invoice by clicking the button below:</p>

                    <a href="${data.approvalUrl}" class="action-button">
                        Review & Approve Invoice
                    </a>

                    <p style="color: #86868b; font-size: 14px; margin-top: 24px;">
                        This link will take you to a secure page where you can review the details and approve your invoice.
                    </p>
                </div>            <div class="footer">
                <p>This is an automated notification from ${data.carrierName}</p>
                <p>Powered by CarrierNest • Questions? Contact us at support@carriernest.com</p>
            </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

function createTextTemplate(data: {
    driverName: string;
    invoiceNum: string;
    approvalUrl: string;
    invoiceAmount: string;
    carrierName: string;
}): string {
    return `
INVOICE READY FOR APPROVAL

Hi ${data.driverName},

You have a new invoice ready for approval:

Invoice #${data.invoiceNum}
Total Amount: ${data.invoiceAmount}

Please review and approve your invoice by visiting:
${data.approvalUrl}

This link will take you to a secure page where you can review the details and approve your invoice.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated notification from ${data.carrierName}.
Powered by CarrierNest • If you have questions, contact us at support@carriernest.com
    `;
}

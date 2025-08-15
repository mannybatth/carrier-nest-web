import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { driverEmail, driverName, invoiceNum, approvalUrl, invoiceAmount, carrierName, createdByName, action } =
            body;

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

        // Dynamic subject based on action
        const subject =
            action === 'update'
                ? `Invoice #${invoiceNum} Updated - ${invoiceAmount}`
                : `New Invoice #${invoiceNum} Created - ${invoiceAmount}`;

        const htmlContent = createEmailTemplate({
            driverName,
            invoiceNum,
            approvalUrl,
            invoiceAmount,
            carrierName: carrierName || 'CarrierNest',
            createdByName: createdByName || 'CarrierNest Team',
            action: action || 'create',
        });

        const textContent = createTextTemplate({
            driverName,
            invoiceNum,
            approvalUrl,
            invoiceAmount,
            carrierName: carrierName || 'CarrierNest',
            createdByName: createdByName || 'CarrierNest Team',
            action: action || 'create',
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
    createdByName: string;
    action: string;
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
            .carrier-name {
                font-size: 36px;
                font-weight: 700;
                color: white;
                margin-bottom: 12px;
                letter-spacing: -0.025em;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            .header-subtitle {
                font-size: 15px;
                color: rgba(255, 255, 255, 0.75);
                font-weight: 400;
                letter-spacing: -0.015em;
                opacity: 0.9;
            }
            .content {
                padding: 40px 32px;
                text-align: center;
            }
            .content h2 {
                font-size: 22px;
                font-weight: 600;
                color: #1d1d1f;
                margin-bottom: 16px;
                letter-spacing: -0.022em;
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
                        <div class="carrier-name">${data.carrierName}</div>
                        <p class="header-subtitle">${
                            data.action === 'update' ? 'Invoice Updated' : 'Invoice Ready for Approval'
                        }</p>
                    </div>
                </div>

                <div class="content">
                    <div class="carrier-name" style="color: #1d1d1f; font-size: 36px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.025em;">${
                        data.carrierName
                    }</div>
                    <h2>${
                        data.action === 'update'
                            ? 'Your updated invoice is ready for approval'
                            : 'You have a new invoice ready for approval'
                    }</h2>
                    <p style="color: #1d1d1f; font-size: 18px; font-weight: 500; margin-bottom: 8px;">Invoice #${
                        data.invoiceNum
                    }</p>
                    <p style="color: #86868b; font-size: 14px; margin-bottom: 16px;">
                        ${
                            data.action === 'update'
                                ? `Updated by ${data.createdByName} • For ${data.driverName}`
                                : `Created by ${data.createdByName} • For ${data.driverName}`
                        }
                    </p>

                    <div class="amount-highlight">
                        <div class="amount">${data.invoiceAmount}</div>
                        <p>Total Amount</p>
                    </div>

                    <p>${
                        data.action === 'update'
                            ? 'Please review the changes and approve your updated invoice by clicking the button below:'
                            : 'Please review and approve your new invoice by clicking the button below:'
                    }</p>

                    <a href="${data.approvalUrl}" class="action-button">
                        ${data.action === 'update' ? 'Review Changes & Approve' : 'Review & Approve Invoice'}
                    </a>

                    <p style="color: #86868b; font-size: 14px; margin-top: 24px;">
                        ${
                            data.action === 'update'
                                ? 'This link will take you to a secure page where you can review the updated details and approve your invoice.'
                                : 'This link will take you to a secure page where you can review the details and approve your invoice.'
                        }
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
    createdByName: string;
    action: string;
}): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.carrierName.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.action === 'update' ? 'INVOICE UPDATED' : 'NEW INVOICE CREATED'}

${data.driverName},

${
    data.action === 'update'
        ? 'Your invoice has been updated and is ready for approval:'
        : 'A new invoice has been created and is ready for your approval:'
}

Invoice #${data.invoiceNum}
${data.action === 'update' ? 'Updated by:' : 'Created by:'} ${data.createdByName}
Total Amount: ${data.invoiceAmount}

${
    data.action === 'update'
        ? 'Please review the changes and approve your updated invoice by visiting:'
        : 'Please review and approve your new invoice by visiting:'
}
${data.approvalUrl}

${
    data.action === 'update'
        ? 'This link will take you to a secure page where you can review the updated details and approve your invoice.'
        : 'This link will take you to a secure page where you can review the details and approve your invoice.'
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated notification from ${data.carrierName}.
Powered by CarrierNest • If you have questions, contact us at support@carriernest.com
    `;
}

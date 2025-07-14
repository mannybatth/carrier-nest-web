import nodemailer from 'nodemailer';

interface InvoiceApprovalEmailData {
    carrierName: string;
    carrierEmail: string;
    driverName: string;
    invoiceNumber: string;
    invoiceAmount: string;
    approvedDate: string;
    assignmentCount: number;
    fromDate: string;
    toDate: string;
    invoiceId: string;
}

export async function sendDriverInvoiceApprovalNotification(data: InvoiceApprovalEmailData) {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: parseInt(process.env.EMAIL_SERVER_PORT || '587') === 465,
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
        },
    });

    const subject = `Driver Invoice #${data.invoiceNumber} Approved - ${data.driverName}`;

    const htmlContent = createAppleStyledEmailTemplate(data);
    const textContent = createTextTemplate(data);

    await transport.sendMail({
        to: data.carrierEmail,
        from: process.env.EMAIL_FROM,
        subject,
        text: textContent,
        html: htmlContent,
    });
}

function createAppleStyledEmailTemplate(data: InvoiceApprovalEmailData): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Driver Invoice Approved</title>
        <!--[if mso]>
        <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        </noscript>
        <![endif]-->
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
                box-shadow:
                    0 4px 20px rgba(0, 0, 0, 0.08),
                    0 1px 3px rgba(0, 0, 0, 0.05);
            }

            /* Clean Header */
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

            /* Content Area */
            .content {
                padding: 40px 32px;
            }

            .section {
                margin-bottom: 32px;
            }

            .section:last-child {
                margin-bottom: 0;
            }

            .section-title {
                font-size: 20px;
                font-weight: 600;
                color: #1d1d1f;
                margin-bottom: 16px;
                letter-spacing: -0.022em;
            }

            /* Invoice Details Card */
            .details-card {
                background: #ffffff;
                border-radius: 16px;
                border: 1px solid #e5e5e7;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
            }

            .detail-row {
                display: table;
                width: 100%;
                padding: 20px 24px;
                border-bottom: 1px solid #f5f5f7;
            }

            .detail-row:last-child {
                border-bottom: none;
            }

            .detail-label {
                display: table-cell;
                font-size: 15px;
                font-weight: 500;
                color: #86868b;
                letter-spacing: -0.022em;
                width: 40%;
                vertical-align: top;
                padding-right: 20px;
            }

            .detail-value {
                display: table-cell;
                font-size: 15px;
                font-weight: 600;
                color: #1d1d1f;
                letter-spacing: -0.022em;
                text-align: right;
                vertical-align: top;
            }

            /* Amount Highlight */
            .amount-highlight {
                background: linear-gradient(135deg, #e8f5e8 0%, #f0f9f0 100%);
                border: none;
                margin: 0;
                position: relative;
            }

            .amount-highlight::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: #30d158;
                border-radius: 0 2px 2px 0;
            }

            .amount-highlight .detail-label {
                color: #1d7324;
                font-weight: 600;
            }

            .amount-highlight .detail-value {
                font-size: 20px;
                font-weight: 700;
                color: #1d7324;
            }

            /* Action Section */
            .action-section {
                text-align: center;
                padding: 32px 24px;
                background: #ffffff;
                border-radius: 16px;
                border: 1px solid #e5e5e7;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
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
                box-shadow:
                    0 1px 3px rgba(0, 122, 255, 0.12),
                    0 1px 2px rgba(0, 122, 255, 0.24);
                -webkit-font-smoothing: antialiased;
                text-rendering: optimizeLegibility;
                position: relative;
                overflow: hidden;
                user-select: none;
                -webkit-user-select: none;
            }

            .action-button:hover {
                background: #0051D5;
                text-decoration: none;
                color: white !important;
                transform: translateY(-0.5px);
                box-shadow:
                    0 3px 8px rgba(0, 122, 255, 0.16),
                    0 3px 6px rgba(0, 122, 255, 0.31);
            }

            .action-button:active {
                transform: translateY(0px);
                transition-duration: 0.05s;
                color: white !important;
                box-shadow:
                    0 1px 2px rgba(0, 122, 255, 0.12),
                    0 1px 1px rgba(0, 122, 255, 0.24);
            }

            .action-description {
                font-size: 15px;
                color: #86868b;
                margin-bottom: 20px;
                line-height: 1.4211;
                letter-spacing: -0.24px;
                max-width: 360px;
                margin-left: auto;
                margin-right: auto;
                font-weight: 400;
                -webkit-font-smoothing: antialiased;
            }

            /* Footer */
            .footer {
                background: #f5f5f7;
                padding: 32px;
                text-align: center;
                border-top: 1px solid #d2d2d7;
            }

            .footer-logo {
                margin-bottom: 16px;
            }

            .footer-logo .logo-text {
                font-size: 18px;
                font-weight: 600;
                color: #007AFF;
                letter-spacing: -0.022em;
            }

            .footer p {
                font-size: 13px;
                color: #86868b;
                margin-bottom: 4px;
                letter-spacing: -0.022em;
            }

            .footer a {
                color: #007AFF;
                text-decoration: none;
            }

            /* Responsive Design */
            @media (max-width: 600px) {
                .email-wrapper {
                    padding: 20px 16px;
                }

                .header {
                    padding: 32px 24px;
                }

                .header h1 {
                    font-size: 24px;
                }

                .content {
                    padding: 32px 24px;
                }

                .detail-row {
                    display: block;
                    padding: 16px 20px;
                }

                .detail-label {
                    display: block;
                    width: 100%;
                    padding-right: 0;
                    margin-bottom: 8px;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .detail-value {
                    display: block;
                    text-align: left;
                    font-weight: 700;
                    font-size: 16px;
                }

                .amount-highlight .detail-value {
                    font-size: 18px;
                }

                .action-section {
                    padding: 24px 20px;
                }

                .action-button {
                    width: 100%;
                    padding: 16px 24px;
                    font-size: 17px;
                    border-radius: 12px;
                }

                .action-description {
                    font-size: 15px;
                    margin-bottom: 20px;
                }
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                body {
                    background-color: #000000;
                    color: #f5f5f7;
                }

                .email-wrapper {
                    background-color: #000000;
                }

                .email-container {
                    background: #1c1c1e;
                    border: 1px solid #38383a;
                }

                .details-card {
                    background: #1c1c1e;
                    border-color: #38383a;
                }

                .detail-row {
                    border-color: #38383a;
                }

                .detail-label {
                    color: #a1a1a6;
                }

                .detail-value {
                    color: #f5f5f7;
                }

                .amount-highlight {
                    background: linear-gradient(135deg, #1a3a1a 0%, #0f2a0f 100%);
                }

                .amount-highlight .detail-label {
                    color: #4ade80;
                }

                .amount-highlight .detail-value {
                    color: #4ade80;
                }

                .action-section {
                    background: #1c1c1e;
                    border-color: #38383a;
                }

                .action-description {
                    color: #a1a1a6;
                }

                .footer {
                    background: #1c1c1e;
                    border-color: #38383a;
                }

                .footer p {
                    color: #a1a1a6;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-container">
                <!-- Header -->
                <div class="header">
                    <div class="header-content">
                        <h1>Driver Invoice Approved</h1>
                        <p>${data.driverName} has approved their driver invoice</p>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="content">
                    <!-- Invoice Details -->
                    <div class="section">
                        <h2 class="section-title">Invoice Details</h2>
                        <div class="details-card">
                            <div class="detail-row">
                                <span class="detail-label">Invoice Number</span>
                                <span class="detail-value">#${data.invoiceNumber}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Driver</span>
                                <span class="detail-value">${data.driverName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Period</span>
                                <span class="detail-value">${data.fromDate} - ${data.toDate}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Assignments</span>
                                <span class="detail-value">${data.assignmentCount} assignment${
        data.assignmentCount !== 1 ? 's' : ''
    }</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Approved</span>
                                <span class="detail-value">${data.approvedDate}</span>
                            </div>
                            <div class="detail-row amount-highlight">
                                <span class="detail-label">Total Amount</span>
                                <span class="detail-value">${data.invoiceAmount}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Next Steps -->
                    <div class="section">
                        <h2 class="section-title">Next Steps</h2>
                        <div class="action-section">
                            <p class="action-description">
                                The driver has approved their invoice. You can now proceed with payment processing.
                            </p>
                            <a href="https://carriernest.com/driverinvoices/${data.invoiceId}" class="action-button">
                                View Invoice Details
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <div class="footer-logo">
                        <span class="logo-text">CarrierNest</span>
                    </div>
                    <p>This is an automated notification from CarrierNest</p>
                    <p>Questions? Contact us at <a href="mailto:support@carriernest.com">support@carriernest.com</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

function createTextTemplate(data: InvoiceApprovalEmailData): string {
    return `
DRIVER INVOICE APPROVED

${data.driverName} has approved their invoice #${data.invoiceNumber}

INVOICE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Invoice Number: #${data.invoiceNumber}
• Driver: ${data.driverName}
• Total Amount: ${data.invoiceAmount}
• Period: ${data.fromDate} - ${data.toDate}
• Assignments: ${data.assignmentCount} assignment${data.assignmentCount !== 1 ? 's' : ''}
• Approved Date: ${data.approvedDate}

NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The driver has approved their invoice. You can now proceed with payment processing.

View the full invoice details at:
https://carriernest.com/driverinvoices/${data.invoiceId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated notification from CarrierNest.
If you have questions, contact us at support@carriernest.com
    `;
}

import { NextResponse } from 'next/server';
import { sendDriverInvoiceApprovalNotification } from 'lib/driver-invoice-notifications';

export async function POST() {
    try {
        // Test data for preview
        const testData = {
            carrierName: 'Sample Trucking Co.',
            carrierEmail: 'test@example.com',
            driverName: 'John Doe',
            invoiceNumber: '2024-001',
            invoiceAmount: '$2,450.00',
            approvedDate: 'January 13, 2025 at 2:30 PM',
            assignmentCount: 3,
            fromDate: 'Jan 1, 2025',
            toDate: 'Jan 7, 2025',
            invoiceId: 'test-invoice-id',
        };

        // Test email sending
        await sendDriverInvoiceApprovalNotification(testData);

        return NextResponse.json({
            success: true,
            message: 'Test notification sent successfully',
            data: testData,
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
}

export async function GET() {
    // Return HTML preview of the email template
    const testData = {
        carrierName: 'Sample Trucking Co.',
        carrierEmail: 'test@example.com',
        driverName: 'John Doe',
        invoiceNumber: '2024-001',
        invoiceAmount: '$2,450.00',
        approvedDate: 'January 13, 2025 at 2:30 PM',
        assignmentCount: 3,
        fromDate: 'Jan 1, 2025',
        toDate: 'Jan 7, 2025',
        invoiceId: 'test-invoice-id',
    };

    const htmlTemplate = createAppleStyledEmailTemplate(testData);

    return new Response(htmlTemplate, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}

// Import the template creation function (normally would be in the main file)
function createAppleStyledEmailTemplate(data: any): string {
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
            /* Apple Design System Colors */
            :root {
                --apple-blue: #007AFF;
                --apple-green: #34C759;
                --apple-indigo: #5856D6;
                --apple-purple: #AF52DE;
                --apple-pink: #FF2D92;
                --apple-red: #FF3B30;
                --apple-orange: #FF9500;
                --apple-yellow: #FFCC00;
                --apple-teal: #5AC8FA;
                --apple-cyan: #55BEF0;
                --apple-mint: #00C7BE;
                --apple-brown: #A2845E;
                --apple-gray: #8E8E93;
                --apple-gray2: #AEAEB2;
                --apple-gray3: #C7C7CC;
                --apple-gray4: #D1D1D6;
                --apple-gray5: #E5E5EA;
                --apple-gray6: #F2F2F7;
                --apple-system-blue: #007AFF;
                --apple-system-green: #28CD41;
                --apple-system-red: #FF3B30;
                --apple-system-orange: #FF9500;
                --apple-system-yellow: #FFCC00;
                --apple-system-pink: #FF2D92;
                --apple-system-purple: #AF52DE;
                --apple-system-indigo: #5856D6;
                --apple-system-teal: #5AC8FA;
                --apple-system-cyan: #55BEF0;
                --apple-system-mint: #00C7BE;
                --apple-system-brown: #A2845E;
                --apple-system-gray: #8E8E93;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #1d1d1f;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                margin: 0;
                padding: 20px 0;
                font-size: 16px;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 20px;
                overflow: hidden;
                box-shadow:
                    0 4px 20px rgba(0, 0, 0, 0.1),
                    0 0 0 1px rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            /* Glassmorphism Header */
            .header {
                background: linear-gradient(135deg,
                    rgba(52, 199, 89, 0.9) 0%,
                    rgba(52, 199, 89, 0.7) 50%,
                    rgba(0, 122, 255, 0.8) 100%);
                backdrop-filter: blur(30px);
                -webkit-backdrop-filter: blur(30px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding: 32px 24px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg,
                    rgba(255, 255, 255, 0.1) 25%,
                    transparent 25%,
                    transparent 75%,
                    rgba(255, 255, 255, 0.1) 75%);
                background-size: 20px 20px;
                opacity: 0.3;
                pointer-events: none;
            }

            .header-icon {
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 36px;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
                box-shadow:
                    0 8px 32px rgba(31, 38, 135, 0.37),
                    inset 0 1px 0 rgba(255, 255, 255, 0.5);
            }

            .header h1 {
                font-size: 28px;
                font-weight: 700;
                color: white;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                letter-spacing: -0.5px;
            }

            .header p {
                font-size: 17px;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            /* Content Area with Glassmorphism */
            .content {
                padding: 32px 24px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            /* Apple-style Cards */
            .info-card {
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 24px;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                box-shadow:
                    0 4px 16px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                transition: all 0.3s ease;
            }

            .info-card:hover {
                transform: translateY(-2px);
                box-shadow:
                    0 8px 32px rgba(0, 0, 0, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }

            .info-card h3 {
                font-size: 20px;
                font-weight: 600;
                color: #1d1d1f;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                letter-spacing: -0.3px;
            }

            .info-card-icon {
                width: 24px;
                height: 24px;
                margin-right: 12px;
                background: linear-gradient(135deg, var(--apple-blue), var(--apple-indigo));
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
            }

            /* Detail Grid with Apple Styling */
            .detail-grid {
                display: grid;
                gap: 16px;
                margin-bottom: 24px;
            }

            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: rgba(245, 247, 250, 0.8);
                border-radius: 12px;
                border: 1px solid rgba(209, 213, 219, 0.3);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                transition: all 0.2s ease;
            }

            .detail-item:hover {
                background: rgba(245, 247, 250, 0.95);
                border-color: rgba(0, 122, 255, 0.3);
                transform: scale(1.02);
            }

            .detail-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 15px;
                letter-spacing: -0.1px;
            }

            .detail-value {
                font-weight: 700;
                color: #1f2937;
                font-size: 16px;
                letter-spacing: -0.2px;
            }

            /* Amount Highlight with Apple Green */
            .amount-highlight {
                background: linear-gradient(135deg,
                    rgba(52, 199, 89, 0.1) 0%,
                    rgba(52, 199, 89, 0.05) 100%);
                border: 2px solid rgba(52, 199, 89, 0.3);
                color: #059669;
            }

            .amount-highlight .detail-value {
                color: #059669;
                font-size: 20px;
                font-weight: 800;
            }

            /* Apple-style Button */
            .action-button {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, var(--apple-blue) 0%, var(--apple-indigo) 100%);
                color: white;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 17px;
                text-align: center;
                box-shadow:
                    0 4px 16px rgba(0, 122, 255, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                letter-spacing: -0.2px;
            }

            .action-button:hover {
                background: linear-gradient(135deg, var(--apple-indigo) 0%, var(--apple-blue) 100%);
                transform: translateY(-1px);
                box-shadow:
                    0 6px 20px rgba(0, 122, 255, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }

            .action-button:active {
                transform: translateY(0);
                box-shadow:
                    0 2px 8px rgba(0, 122, 255, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }

            /* Footer with Apple Branding */
            .footer {
                background: rgba(248, 250, 252, 0.9);
                padding: 24px;
                text-align: center;
                border-top: 1px solid rgba(229, 231, 235, 0.5);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .footer p {
                color: #6b7280;
                font-size: 14px;
                margin-bottom: 8px;
                letter-spacing: -0.1px;
            }

            .company-name {
                background: linear-gradient(135deg, var(--apple-blue), var(--apple-purple));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: 700;
                font-size: 16px;
            }

            .logo-container {
                margin-bottom: 16px;
            }

            .logo {
                width: 48px;
                height: 48px;
                margin: 0 auto;
                background: linear-gradient(135deg, var(--apple-blue), var(--apple-indigo));
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 20px;
                box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
            }

            /* Responsive Design */
            @media (max-width: 600px) {
                .email-container {
                    margin: 0 10px;
                    border-radius: 16px;
                }

                .header {
                    padding: 24px 16px;
                }

                .header h1 {
                    font-size: 24px;
                }

                .content {
                    padding: 24px 16px;
                }

                .info-card {
                    padding: 20px;
                }

                .detail-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .action-button {
                    width: 100%;
                    padding: 18px;
                }
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                body {
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                }

                .email-container {
                    background: #1c1c1e;
                    border: 1px solid #38383a;
                }

                .content {
                    background: rgba(28, 28, 30, 0.95);
                }

                .info-card {
                    background: rgba(44, 44, 46, 0.7);
                    border-color: rgba(84, 84, 88, 0.3);
                }

                .detail-item {
                    background: rgba(44, 44, 46, 0.8);
                    border-color: rgba(84, 84, 88, 0.3);
                }

                .detail-label {
                    color: #a1a1a6;
                }

                .detail-value {
                    color: #f2f2f7;
                }

                .footer {
                    background: rgba(44, 44, 46, 0.9);
                    border-color: rgba(84, 84, 88, 0.5);
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header with Apple-style glassmorphism -->
            <div class="header">
                <div class="header-icon">✅</div>
                <h1>Invoice Approved</h1>
                <p>Driver ${data.driverName} has approved their invoice</p>
            </div>

            <!-- Main Content -->
            <div class="content">
                <!-- Invoice Information Card -->
                <div class="info-card">
                    <h3>
                        <span class="info-card-icon">📄</span>
                        Invoice Details
                    </h3>

                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Invoice Number</span>
                            <span class="detail-value">#${data.invoiceNumber}</span>
                        </div>

                        <div class="detail-item">
                            <span class="detail-label">Driver</span>
                            <span class="detail-value">${data.driverName}</span>
                        </div>

                        <div class="detail-item amount-highlight">
                            <span class="detail-label">Total Amount</span>
                            <span class="detail-value">${data.invoiceAmount}</span>
                        </div>

                        <div class="detail-item">
                            <span class="detail-label">Period</span>
                            <span class="detail-value">${data.fromDate} - ${data.toDate}</span>
                        </div>

                        <div class="detail-item">
                            <span class="detail-label">Assignments</span>
                            <span class="detail-value">${data.assignmentCount} assignment${
        data.assignmentCount !== 1 ? 's' : ''
    }</span>
                        </div>

                        <div class="detail-item">
                            <span class="detail-label">Approved Date</span>
                            <span class="detail-value">${data.approvedDate}</span>
                        </div>
                    </div>
                </div>

                <!-- Action Section -->
                <div class="info-card">
                    <h3>
                        <span class="info-card-icon">🎯</span>
                        Next Steps
                    </h3>

                    <p style="color: #6b7280; margin-bottom: 20px; line-height: 1.6;">
                        The driver has approved their invoice. You can now proceed with payment processing.
                        Click below to view the full invoice details.
                    </p>

                    <div style="text-align: center;">
                        <a href="https://carriernest.com/driverinvoices/${data.invoiceId}" class="action-button">
                            View Invoice Details
                        </a>
                    </div>
                </div>

                <!-- System Information -->
                <div class="info-card">
                    <h3>
                        <span class="info-card-icon">ℹ️</span>
                        System Information
                    </h3>

                    <div style="background: rgba(245, 247, 250, 0.5); border-radius: 8px; padding: 16px; border-left: 4px solid var(--apple-blue);">
                        <p style="color: #4b5563; font-size: 14px; margin: 0; line-height: 1.5;">
                            <strong>Notification:</strong> This email was automatically generated when ${
                                data.driverName
                            } approved invoice #${data.invoiceNumber} at ${data.approvedDate}.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="logo-container">
                    <div class="logo">🚚</div>
                </div>
                <p>This is an automated notification from <span class="company-name">CarrierNest</span></p>
                <p>The all-in-one trucking management platform</p>
                <p style="margin-top: 16px; font-size: 12px;">
                    If you have questions, contact us at
                    <a href="mailto:support@carriernest.com" style="color: var(--apple-blue); text-decoration: none;">support@carriernest.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}

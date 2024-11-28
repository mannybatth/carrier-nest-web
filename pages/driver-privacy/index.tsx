import { useRouter } from 'next/router';
import Image from 'next/image';
import React from 'react';

const PrivacyPolicy = () => {
    const router = useRouter();

    return (
        <section className="min-h-screen bg-white">
            <div className="px-6 mx-auto max-w-7xl sm:px-8">
                {/* Header */}
                <header className="flex items-center justify-between py-6">
                    <div className="flex items-center space-x-3">
                        <Image src="/logo_truck_100.png" alt="Carrier Nest Logo" width={50} height={50} />
                        <h1 className="text-2xl font-bold text-gray-800">Carrier Nest</h1>
                    </div>
                    <div>
                        <button
                            className="px-6 py-2 font-semibold text-white transition bg-blue-600 rounded-md hover:bg-blue-700"
                            onClick={() => router.push('/homepage')}
                        >
                            Home
                        </button>
                    </div>
                </header>

                {/* Privacy Policy Content */}
                <main className="py-16">
                    <h1 className="mb-6 text-3xl font-extrabold text-center text-gray-900">
                        Driver App - Privacy Policy
                    </h1>
                    <div className="p-8 text-gray-700 bg-white">
                        <p className="text-sm text-right text-gray-500">Effective Date: November 28, 2024</p>
                        <p className="mb-8 text-sm text-right text-gray-500">Last Updated: November 28, 2024</p>

                        <p className="mb-4">
                            At <strong>Carrier Nest</strong>, we are committed to protecting your personal information
                            and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and
                            safeguard your information when you use the Carrier Nest Driver App ("
                            <strong>Driver App</strong>"). By accessing or using the Driver App, you agree to this
                            Privacy Policy.
                        </p>

                        {/* Section 1 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">1. Information We Collect</h2>

                        {/* 1.1 Personal Information */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold text-gray-800">1.1 Personal Information</h3>
                        <p className="mb-4">We may collect personal information that identifies you, such as:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Full Name</li>
                            <li>Email Address</li>
                            <li>Phone Number</li>
                        </ul>

                        {/* 1.2 Usage Data */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold text-gray-800">1.2 Usage Data</h3>
                        <p className="mb-4">
                            We automatically collect certain information when you use our App, including:
                        </p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Device Information: Model, operating system, unique device identifiers</li>
                            <li>Log Data: IP address, app usage details, access times, and dates</li>
                            <li>Cookies and Similar Technologies: To enhance your experience and collect usage data</li>
                        </ul>

                        {/* 1.3 Location Data */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold text-gray-800">1.3 Location Data</h3>
                        <p className="mb-4">With your permission, we collect real-time location information to:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Provide navigation and route guidance</li>
                            <li>Optimize task assignments based on your location</li>
                            <li>Verify pickup and drop-off points</li>
                        </ul>

                        {/* 1.4 Proof of Delivery (POD) */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold text-gray-800">1.4 Proof of Delivery (POD)</h3>
                        <p className="mb-4">When you upload PODs, we collect:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Images or scans of delivery documents</li>
                            <li>Recipient signatures</li>
                            <li>Delivery timestamps</li>
                        </ul>

                        {/* Section 2 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">
                            2. How We Use Your Information
                        </h2>
                        <p className="mb-4">We use the collected information for purposes such as:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>
                                <strong>Task Management:</strong> Assigning and tracking delivery tasks
                            </li>
                            <li>
                                <strong>Service Improvement:</strong> Enhancing app functionality through usage analysis
                            </li>
                            <li>
                                <strong>Communication:</strong> Sending updates, notifications, and responding to
                                inquiries
                            </li>
                            <li>
                                <strong>Invoice Processing:</strong> Expediting invoicing through uploaded PODs
                            </li>
                            <li>
                                <strong>Compliance and Security:</strong> Monitoring for fraudulent activities or policy
                                violations
                            </li>
                        </ul>

                        {/* Section 3 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">
                            3. Disclosure of Your Information
                        </h2>
                        <p className="mb-4">We may share your information with:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>
                                <strong>Service Providers:</strong> Third-party companies that assist in operating the
                                Driver App
                            </li>
                            <li>
                                <strong>Legal Obligations:</strong> If required by law or to protect our rights
                            </li>
                            <li>
                                <strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset
                                sales
                            </li>
                        </ul>

                        {/* Section 4 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">4. Data Security</h2>
                        <p className="mb-4">
                            We implement reasonable security measures to protect your personal information. However, no
                            method of transmission over the internet or electronic storage is completely secure.
                        </p>

                        {/* Section 5 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">5. Your Rights and Choices</h2>
                        <p className="mb-4">
                            You may have certain rights regarding your personal information, including:
                        </p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>
                                <strong>Access:</strong> Request access to your personal data
                            </li>
                            <li>
                                <strong>Correction:</strong> Request correction of inaccurate information
                            </li>
                            <li>
                                <strong>Deletion:</strong> Request deletion of your personal data
                            </li>
                            <li>
                                <strong>Opt-Out:</strong> Opt-out of certain data processing activities
                            </li>
                        </ul>

                        {/* Section 6 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">6. Third-Party Services</h2>
                        <p className="mb-4">
                            The Driver App may contain links to third-party websites or services. We are not responsible
                            for the privacy practices of these third parties.
                        </p>

                        {/* Section 7 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">7. Children's Privacy</h2>
                        <p className="mb-4">
                            Our services are not intended for individuals under the age of 18. We do not knowingly
                            collect personal information from minors.
                        </p>

                        {/* Section 8 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">
                            8. Changes to This Privacy Policy
                        </h2>
                        <p className="mb-4">
                            We may update this Privacy Policy from time to time. We will notify you of any changes by
                            posting the new Privacy Policy on this page. Your continued use of the Driver App after any
                            changes indicates your acceptance of the new policy.
                        </p>

                        {/* Section 9 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">9. Contact Us</h2>
                        <p className="mb-4">
                            If you have any questions or concerns about this Privacy Policy, please contact us at:
                        </p>
                        <ul className="mb-4 list-none">
                            <li>
                                Email:{' '}
                                <a href="mailto:carriernestapp@gmail.com" className="text-blue-600 hover:underline">
                                    carriernestapp@gmail.com
                                </a>
                            </li>
                        </ul>
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-8 mt-16 border-t border-gray-200">
                    <div className="flex flex-col items-center justify-between text-gray-600 md:flex-row">
                        <p className="mb-4 text-center md:text-left md:mb-0">
                            &copy; {new Date().getFullYear()} Carrier Nest. All rights reserved.
                        </p>
                        <p className="text-center md:text-right">
                            Questions? Email us at{' '}
                            <a href="mailto:carriernestapp@gmail.com" className="text-blue-600 hover:underline">
                                carriernestapp@gmail.com
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </section>
    );
};

export default PrivacyPolicy;

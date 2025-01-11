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
                        Carrier Nest App - Privacy Policy
                    </h1>
                    <div className="p-8 text-gray-700 bg-white">
                        <p className="text-sm text-right text-gray-500">Effective Date: January 10, 2025</p>
                        <p className="mb-8 text-sm text-right text-gray-500">Effective Date: January 10, 2025</p>

                        <p className="mb-4">
                            At <strong>Carrier Nest</strong>, we are committed to protecting your privacy. This Privacy
                            Policy outlines how we collect, use, disclose, and safeguard your information when you use
                            our mobile application. By using the Carrier Nest app, you agree to the collection and use
                            of information in accordance with this policy. We value your trust and are dedicated to
                            ensuring the security and confidentiality of your personal data.
                        </p>

                        {/* Data Collection and Use */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">Data Collection and Use</h2>

                        {/* Personal Information */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold text-gray-800">Personal Information</h3>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Phone Number: Collected during the login process to authenticate the driver.</li>
                            <li>Carrier Code: Collected during the login process to identify the carrier.</li>
                            <li>
                                Location Data: Collected to provide route directions and update load status with the
                                driver&apos;s current location.
                            </li>
                            <li>
                                Device Information: Collected to manage cookies and sessions for authentication
                                purposes.
                            </li>
                        </ul>

                        {/* Data Sharing */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">Data Sharing</h2>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Geolocation Services: Used to provide route directions and update load status.</li>
                            <li>Authentication Services: Used to authenticate drivers and manage sessions.</li>
                            <li>
                                File Upload Services: Used to upload documents related to loads, such as proof of
                                delivery (POD) documents.
                            </li>
                        </ul>

                        {/* Data Security */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">Data Security</h2>
                        <p className="mb-4">
                            All collected data is securely stored and transmitted using industry-standard encryption
                            protocols. Access to personal data is restricted to authorized personnel only.
                        </p>

                        {/* User Rights */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">User Rights</h2>
                        <h3 className="mt-6 mb-2 text-xl font-semibold text-gray-800">Access and Control</h3>
                        <ul className="mb-4 list-disc list-inside">
                            <li>
                                Users can access and update their personal information through the app&apos;s settings.
                            </li>
                            <li>Users can request the deletion of their personal data by contacting support.</li>
                        </ul>

                        <h3 className="mt-6 mb-2 text-xl font-semibold text-gray-800">Data Retention</h3>
                        <p className="mb-4">
                            Personal data is retained for as long as necessary to provide the app&apos;s services and
                            comply with legal obligations.
                        </p>

                        {/* Children's Privacy */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">Children&apos;s Privacy</h2>
                        <p className="mb-4">
                            Our app is not intended for use by children under the age of 13. We do not knowingly collect
                            personally identifiable information from children under 13. If we become aware that we have
                            collected personal data from a child under 13, we will take steps to delete such
                            information.
                        </p>

                        {/* No App Tracking Transparency */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">No App Tracking Transparency</h2>
                        <p className="mb-4">
                            Our app does not track users&apos; data across other apps and websites for advertising
                            purposes. This includes not using third-party advertising networks or analytics tools that
                            track users across different apps and websites.
                        </p>

                        {/* Changes to This Privacy Policy */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">
                            Changes to This Privacy Policy
                        </h2>
                        <p className="mb-4">
                            We may update our Privacy Policy from time to time. We will notify you of any changes by
                            posting the new Privacy Policy on this page. You are advised to review this Privacy Policy
                            periodically for any changes. Changes to this Privacy Policy are effective when they are
                            posted on this page.
                        </p>

                        {/* Contact Information */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-800">Contact Information</h2>
                        <p className="mb-4">
                            For any questions or concerns regarding privacy and data use, please contact us at:
                        </p>
                        <ul className="mb-4 list-none">
                            <li>
                                Email:{' '}
                                <a href="mailto:info@carriernest.com" className="text-blue-600 hover:underline">
                                    info@carriernest.com
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
                            <a href="mailto:info@carriernest.com" className="text-blue-600 hover:underline">
                                info@carriernest.com
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </section>
    );
};

export default PrivacyPolicy;

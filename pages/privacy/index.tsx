import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

const PrivacyPolicy = () => {
    const router = useRouter();

    return (
        <section className="relative min-h-screen px-6 m-0 min-w-screen bg-slate-100 sm:px-14">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="py-10 px-4 shadow-2xl shadow-slate-50 rounded-b-2xl pb-6 sticky top-0 h-[50px] z-50 bg-slate-100 mb-4 flex flex-row justify-between items-center">
                    <div className="flex flex-row items-center gap-2 text-lg font-extrabold text-gray-800 underline md:text-3xl underline-offset-2">
                        <Image src={'/logo_truck_100.png'} alt="logo" width={46} height={46} />
                        <p>Carrier Nest</p>
                    </div>
                    <div>
                        <button
                            className="p-1 shadow-2xl rounded-xl from-rose-200 via-cyan-400 to-indigo-600 bg-gradient-to-bl"
                            onClick={() => router.push('/homepage')}
                        >
                            <span className="block px-4 py-2 text-sm font-black text-white transition rounded-lg bg-cyan-900 hover:bg-transparent hover:text-white">
                                Home
                            </span>
                        </button>
                    </div>
                </div>

                {/* Privacy Policy Content */}
                <div className="py-16">
                    <h1 className="w-full mb-10 text-5xl font-black text-center text-cyan-800">
                        Driver App - Privacy Policy
                    </h1>
                    <div className="max-w-4xl p-8 mx-auto bg-white shadow-md rounded-3xl text-slate-700">
                        <p className="text-sm text-right text-gray-500">Effective Date: November 28, 2024</p>
                        <p className="mb-8 text-sm text-right text-gray-500">Last Updated: November 28, 2024</p>

                        <p className="mb-4">
                            This Privacy Policy outlines how we collect, use, disclose, and safeguard your information
                            when you use the Carrier Nest Driver App (&quot;Driver App&quot;). Please read this policy
                            carefully. If you do not agree with the terms of this Privacy Policy, please do not access
                            Driver App.
                        </p>

                        {/* Section 1 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold">1. Information We Collect</h2>

                        {/* 1.1 Personal Information */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold">1.1 Personal Information</h3>
                        <p className="mb-4">
                            When you register or use Driver App, we may collect personal information that can identify
                            you, such as:
                        </p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Name</li>
                            <li>Email Address</li>
                            <li>Phone Number</li>
                            <li>Driver&apos;s License Information</li>
                            <li>Vehicle Details</li>
                        </ul>

                        {/* 1.2 Usage Data */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold">1.2 Usage Data</h3>
                        <p className="mb-4">
                            We may collect information that your device sends whenever you use our App, such as:
                        </p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Device Information: Model, operating system, unique device identifiers.</li>
                            <li>Log Data: IP address, app usage details, access times, and dates.</li>
                            <li>
                                Cookies and Similar Technologies: To enhance your experience and collect usage data.
                            </li>
                        </ul>

                        {/* 1.3 Location Data */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold">1.3 Location Data</h3>
                        <p className="mb-4">With your permission, we collect real-time location information to:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Provide navigation and route guidance.</li>
                            <li>Optimize task assignments based on your location.</li>
                            <li>Verify pickup and drop-off points.</li>
                        </ul>

                        {/* 1.4 Proof of Delivery (POD) */}
                        <h3 className="mt-6 mb-2 text-xl font-semibold">1.4 Proof of Delivery (POD)</h3>
                        <p className="mb-4">When you upload PODs, we collect:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>Images or Scans of Delivery Documents</li>
                            <li>Recipient Signatures</li>
                            <li>Delivery Time Stamps</li>
                        </ul>

                        {/* Continue with other sections in similar fashion */}

                        {/* Section 2 */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold">2. How We Use Your Information</h2>
                        <p className="mb-4">We use the collected data to:</p>
                        <ul className="mb-4 list-disc list-inside">
                            <li>
                                <strong>Manage Tasks:</strong> Assign and track delivery tasks.
                            </li>
                            <li>
                                <strong>Improve Services:</strong> Analyze usage to enhance app functionality.
                            </li>
                            <li>
                                <strong>Communicate:</strong> Send updates, notifications, and respond to inquiries.
                            </li>
                            <li>
                                <strong>Process Invoices:</strong> Expedite invoicing through uploaded PODs.
                            </li>
                            <li>
                                <strong>Ensure Compliance:</strong> Monitor for fraudulent activities or violations.
                            </li>
                        </ul>

                        {/* Add remaining sections similarly */}
                        {/* ... */}

                        {/* Contact Information */}
                        <h2 className="mt-8 mb-4 text-2xl font-semibold">9. Contact Us</h2>
                        <p className="mb-4">
                            If you have questions or comments about this Privacy Policy, please contact us at:
                        </p>
                        <ul className="mb-4 list-none">
                            <li>
                                Email:{' '}
                                <a href="mailto:carriernestapp@gmail.com" className="text-blue-600">
                                    carriernestapp@gmail.com
                                </a>
                            </li>
                        </ul>

                        {/* Disclaimer */}
                        <p className="mt-8 text-sm text-gray-500">
                            *Disclaimer: This Privacy Policy is provided for informational purposes only and does not
                            constitute legal advice. Please consult a qualified attorney to ensure compliance with all
                            applicable laws and regulations.*
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse justify-between p-4 h-fit md:flex-row bg-slate-200 rounded-t-2xl">
                    <p className="py-4 text-lg font-light text-center text-slate-400">
                        All Rights Reserved By Carrier Nest ©2024
                    </p>
                    <p className="py-4 text-lg font-light text-center text-slate-600">
                        Got questions? Email us:{' '}
                        <a href="mailto:carriernestapp@gmail.com" className="text-blue-600">
                            carriernestapp@gmail.com
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
};

export default PrivacyPolicy;

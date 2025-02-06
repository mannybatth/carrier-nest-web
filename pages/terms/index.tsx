import { auth } from 'auth';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React from 'react';

const Terms = () => {
    const { status, data: session } = useSession();
    const router = useRouter();

    return (
        <section className="min-h-screen bg-white">
            <div className="px-6 mx-auto max-w-7xl sm:px-8">
                {/* Header */}
                <header className="sticky top-0 z-10 flex items-center justify-between py-6 pb-2 bg-white">
                    <div className="flex flex-col items-start space-x-0 md:flex-row md:items-end md:space-x-3">
                        <Image src="/logo_truck_100.png" alt="Carrier Nest Logo" width={50} height={50} />
                        <h1 className="text-sm font-bold text-gray-800 md:text-2xl">Carrier Nest</h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            className={`p-2 md:px-6 md:py-2 font-semibold transition whitespace-nowrap text-sm md:text-lg ${
                                status === 'authenticated'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 '
                                    : 'bg-slate-200 text-slate-500 hover:bg-slate-300 '
                            }  rounded-md `}
                            onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                        >
                            {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
                        </button>

                        {status !== 'authenticated' && (
                            <button
                                className="p-2 text-sm  font-semibold text-white transition bg-blue-600 rounded-md md:px-6 md:py-2 whitespace-nowrap md:text-lg hover:bg-blue-700"
                                onClick={() => signIn()}
                            >
                                Get Started!
                            </button>
                        )}
                    </div>
                </header>

                {/* Hero Section */}
                <main id="mainContent" tabIndex={-1} role="main" className="py-12">
                    <div className="max-w-4xl mx-auto font-light text-sm">
                        <h1 className="text-4xl text-center font-extrabold text-gray-800">Terms of Use</h1>
                        <section>
                            <h2 className="text-xl font-semibold mt-4">1. Eligibility</h2>
                            <p className="text-gray-700 mt-2">
                                You must be at least 18 years old or the legal age of majority in your jurisdiction to
                                use CarrierNest. By using the Services, you affirm that you are legally permitted to
                                enter into this agreement.
                            </p>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">2. License to Use the Services</h2>
                            <p className="text-gray-700 mt-2">
                                CarrierNest grants you a limited, non-exclusive, non-transferable, and revocable license
                                to use the Services for managing trucking operations, including load tracking, route
                                management, driver scheduling, and other related features, as intended by CarrierNest.
                            </p>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">3. Subscription and Billing</h2>
                            <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-2">
                                <li>
                                    <strong>Subscription Plans:</strong> CarrierNest offers subscription-based access to
                                    premium features (&quot;Subscription&quot;). Details about available plans, pricing,
                                    and billing cycles are provided in the app or on the website.
                                </li>
                                <li>
                                    <strong>Free Trials:</strong> CarrierNest may offer free trials of certain
                                    subscription features, these are limited by usage not duration. After you reach your
                                    limits on each feature, you may upgrade to a pro account.
                                </li>
                                <li>
                                    <strong>Payments:</strong> All subscriptions are billed in advance and prorated upon
                                    cancellation or upgrades. Payment methods include credit/debit cards and other
                                    methods accepted by CarrierNest. Our payment processer is Stripe, by using our
                                    services you agree to their terms of service.
                                </li>
                                <li>
                                    <strong>Cancellation:</strong> You may cancel your subscription at any time through
                                    your account settings. Your subscription will remain active until the end of the
                                    current billing cycle, and no prorated refunds will be provided.
                                </li>
                            </ul>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Data Privacy</h2>
                            <p className="text-gray-700 mb-4">
                                At CarrierNest, we prioritize the privacy and security of your data. We are committed to
                                ensuring that your information is handled responsibly and transparently.
                            </p>
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-gray-800">Data Sharing</h3>
                                <p className="text-gray-700">
                                    CarrierNest will not share your data with any third-party or affiliate companies
                                    without your explicit approval.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-800">
                                    Use of Rate Confirmation (RateCon) Data
                                </h3>
                                <p className="text-gray-700">
                                    CarrierNest may utilize your RateCon data to enhance our AI-driven processing
                                    features. This allows us to:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 mt-2">
                                    <li>Provide you with actionable insights into your data.</li>
                                    <li>Generate detailed reports to support your trucking business.</li>
                                    <li>
                                        Continuously improve the quality of our services for a better user experience.
                                    </li>
                                </ul>
                            </div>
                            <p className="text-gray-700 mt-4">
                                By using CarrierNest, you agree to this use of data strictly for the purposes outlined
                                above. Your trust is important to us, and we ensure that all data usage complies with
                                applicable privacy laws and best practices.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">5. Restrictions on Use</h2>
                            <p className="text-gray-700 mt-2">You agree not to:</p>
                            <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-2">
                                <li>
                                    Use the Services for any illegal activities or to promote unlawful goods or
                                    services.
                                </li>
                                <li>Reverse engineer, modify, or create derivative works of the app or Services.</li>
                                <li>
                                    Use CarrierNest to develop competing solutions or collect data for commercial
                                    purposes outside of your trucking operations.
                                </li>
                                <li>Share your subscription access with unauthorized third parties.</li>
                                <li>Interfere with the security or functionality of the Services.</li>
                            </ul>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">6. Data Usage and Privacy</h2>
                            <p className="text-gray-700 mt-2">
                                Your use of CarrierNest involves the collection and processing of data related to your
                                business, including but not limited to fleet information, routes, driver schedules, and
                                financial details. By using the Services, you grant CarrierNest the right to process and
                                store such data in accordance with our Privacy Policy.
                            </p>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">7. Intellectual Property</h2>
                            <p className="text-gray-700 mt-2">
                                CarrierNest retains all rights, title, and interest in the Services, including all
                                intellectual property rights. You are granted no ownership or rights beyond the limited
                                license outlined in these Terms.
                            </p>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">8. Disclaimer of Warranties</h2>
                            <p className="text-gray-700 mt-2">
                                The Services are provided on an &quot;as-is&quot; and &quot;as-available&quot; basis.
                                CarrierNest makes no warranties, express or implied, regarding the Services, including
                                but not limited to merchantability, fitness for a particular purpose, or
                                non-infringement.
                            </p>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">9. Limitation of Liability</h2>
                            <p className="text-gray-700 mt-2">To the fullest extent permitted by law:</p>
                            <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-2">
                                <li>
                                    CarrierNest will not be liable for any indirect, incidental, special, or
                                    consequential damages, including loss of profits, revenue, or data.
                                </li>
                                <li>
                                    CarrierNest&apos;s total liability for claims related to the Services will not
                                    exceed the amount you paid for the Services in the 12 months preceding the claim.
                                </li>
                            </ul>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">10. Termination</h2>
                            <p className="text-gray-700 mt-2">
                                CarrierNest may terminate or suspend your account or access to the Services if you
                                breach these Terms or fail to comply with payment obligations. Upon termination, your
                                license to use the Services will immediately cease.
                            </p>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">11. Changes to the Terms</h2>
                            <p className="text-gray-700 mt-2">
                                CarrierNest reserves the right to modify these Terms at any time. Updates will be posted
                                on the app or website, and the &quot;Last Updated&quot; date will reflect the changes.
                                Your continued use of the Services after changes constitutes your acceptance of the
                                updated Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">12. Governing Law and Dispute Resolution</h2>
                            <p className="text-gray-700 mt-2">
                                These Terms are governed by the laws of the State of Washington. You waive the right to
                                participate in class actions.
                            </p>
                            <div className="my-4" />
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">13. Contact Us</h2>
                            <p className="text-gray-700 mt-2">
                                For questions or concerns about these Terms, please contact CarrierNest at
                                info@carriernest.com.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-4">Updates</h2>
                            <p className="text-gray-700 mt-2">Last updated on January 25, 2025</p>
                        </section>
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-8 mt-16 border-t border-gray-200">
                    <div className="flex flex-col items-center justify-between text-gray-600 md:flex-row">
                        <p className="mb-4 text-center md:text-left md:mb-0">
                            &copy; 2024 Carrier Nest. All Rights Reserved.
                        </p>
                        <p className="text-center md:text-right">
                            Got questions? Email us at{' '}
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

export default Terms;

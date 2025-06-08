import {
    EnvelopeIcon,
    ShieldCheckIcon,
    DocumentTextIcon,
    UserGroupIcon,
    GlobeAltIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function PrivacyPolicy() {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between py-3 px-6 bg-slate-50 sticky top-0 ">
                <div className="flex items-center space-x-3">
                    <Image src="/logo_truck_100.png" alt="Carrier Nest Logo" width={50} height={50} />
                    <h1 className="text-2xl font-bold text-gray-800">Carrier Nest</h1>
                </div>
                <div>
                    <button
                        className="px-6 py-2 font-semibold text-white transition bg-blue-600 rounded-md hover:bg-blue-700"
                        onClick={() => router.push('/')}
                    >
                        Home
                    </button>
                </div>
            </header>
            <div className="bg-blue-600 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className="h-8 w-8 text-blue-100" />
                        <h1 className="text-3xl font-bold text-slate-50">Privacy Policy</h1>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0 text-sm text-gray-100">
                        <div className="flex items-center space-x-2">
                            <DocumentTextIcon className="h-4 w-4" />
                            <span>Effective Date&#58; March 31&#44; 2025</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <EnvelopeIcon className="h-4 w-4" />
                            <span>Contact&#58; support&#64;carriernest&#46;com</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="px-6 py-8 sm:px-8 sm:py-10">
                        {/* Introduction */}
                        <div className="mb-12">
                            <p className="text-lg text-gray-700 leading-relaxed">
                                CarrierNest &#40;&#34;CarrierNest&#34;&#44; &#34;we&#34;&#44; &#34;us&#34;&#44; or
                                &#34;our&#34;&#41; provides a logistics coordination platform connecting carriers&#44;
                                shippers&#44; and brokers to streamline the management and execution of freight
                                transportation services&#46;
                            </p>
                            <p className="mt-4 text-gray-600 leading-relaxed">
                                This Privacy Policy describes how CarrierNest collects&#44; uses&#44; discloses&#44; and
                                secures your personal information when you access or use our web-based platform&#44;
                                mobile applications&#44; or related services &#40;&#34;Services&#34;&#41;&#46; By using
                                the Services&#44; you consent to the data practices described in this Policy&#46; If you
                                do not agree with this Policy&#44; please do not use our Services&#46;
                            </p>
                            <p className="mt-4 text-gray-600 leading-relaxed">
                                We may update this Policy periodically and will notify users by posting changes to this
                                URL and&#44; where appropriate&#44; by other means&#46;
                            </p>
                        </div>

                        {/* Section 1 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">1</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
                            </div>

                            <div className="ml-11 space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                                        a&#46; Personal Information
                                    </h3>
                                    <p className="text-gray-600 mb-3">
                                        &#34;Personal Information&#34; refers to information that identifies&#44;
                                        relates to&#44; describes&#44; or could reasonably be linked to an
                                        individual&#46; This may include&#58;
                                    </p>
                                    <ul className="space-y-2 text-gray-600">
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Name&#44; address&#44; email address&#44; and phone number</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Company affiliation and role</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>
                                                DOT&#44; MC&#44; CDL numbers&#44; and insurance documentation &#40;for
                                                carriers&#41;
                                            </span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>
                                                Payment-related information &#40;processed via third-party
                                                providers&#41;
                                            </span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Geolocation and device-related identifiers</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Login credentials and communication preferences</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                                        b&#46; How We Collect Information
                                    </h3>
                                    <p className="text-gray-600 mb-3">We collect Personal Information when you&#58;</p>
                                    <ul className="space-y-2 text-gray-600 mb-4">
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Register for an account</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Use or interact with the Services</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Communicate with our support team</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>
                                                Enable location or device features &#40;e&#46;g&#46;&#44; GPS
                                                tracking&#41;
                                            </span>
                                        </li>
                                    </ul>
                                    <p className="text-gray-600 mb-3">We also receive information from&#58;</p>
                                    <ul className="space-y-2 text-gray-600">
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>
                                                Third-party integrations &#40;e&#46;g&#46;&#44; CRM&#44; FMCSA&#44;
                                                insurance databases&#41;
                                            </span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>Cookies&#44; web beacons&#44; and server logs</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">2</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Use of Your Information</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600 mb-3">We use your information to&#58;</p>
                                <ul className="space-y-2 text-gray-600">
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Deliver&#44; maintain&#44; and improve our Services</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Authenticate user access</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Provide support&#44; training&#44; and user engagement</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Facilitate billing and payments</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Ensure compliance with legal and regulatory obligations</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Analyze aggregated trends for operational improvements</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>
                                            Send service updates&#44; transactional messages&#44; and marketing
                                            communications &#40;with opt-out options&#41;
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">3</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Disclosure of Your Information</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600 mb-3">We may share your information&#58;</p>
                                <ul className="space-y-2 text-gray-600 mb-4">
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>
                                            With third-party vendors for service enablement &#40;e&#46;g&#46;&#44;
                                            hosting&#44; communications&#44; analytics&#41;
                                        </span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>
                                            With integration and compliance partners &#40;e&#46;g&#46;&#44; FMCSA&#44;
                                            insurance providers&#41;
                                        </span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Within your organization or company account</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>With other platform users when necessary for service execution</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>With law enforcement or legal authorities when required</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>
                                            In the event of a merger&#44; acquisition&#44; or corporate restructuring
                                        </span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>With your consent or at your direction</span>
                                    </li>
                                </ul>
                                <p className="text-gray-600 font-medium">
                                    We do not sell&#44; rent&#44; or share your Personal Information with unaffiliated
                                    third parties for their own direct marketing&#46;
                                </p>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">4</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Location and Device Data</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600 mb-3">
                                    If you use our mobile applications&#44; we may collect geolocation data to&#58;
                                </p>
                                <ul className="space-y-2 text-gray-600 mb-4">
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Match carriers with suitable loads</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Track shipments</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Verify job completion and delivery times</span>
                                    </li>
                                </ul>
                                <p className="text-gray-600">
                                    You can disable location services at any time through your device settings&#46;
                                    However&#44; doing so may limit the functionality of the Services&#46;
                                </p>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">5</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Cookies and Tracking Technologies
                                </h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600 mb-3">
                                    CarrierNest and its partners use cookies&#44; web beacons&#44; and other tracking
                                    technologies to&#58;
                                </p>
                                <ul className="space-y-2 text-gray-600 mb-4">
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Analyze site usage</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Personalize your experience</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Provide targeted communications and advertisements</span>
                                    </li>
                                </ul>
                                <p className="text-gray-600">
                                    You can manage cookie preferences through your browser settings&#46; For information
                                    on opting out of tracking&#44; visit Google Ad Settings&#46;
                                </p>
                            </div>
                        </section>

                        {/* Section 6 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">6</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Data Retention and Storage</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600">
                                    We retain your information for as long as necessary to fulfill the purposes outlined
                                    in this Privacy Policy&#44; and as required by applicable law&#46; Our data is
                                    securely stored on U&#46;S&#46;-based cloud infrastructure&#46;
                                </p>
                            </div>
                        </section>

                        {/* Section 7 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <LockClosedIcon className="h-4 w-4 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Security of Your Information</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600 mb-3">
                                    We implement technical and organizational safeguards to protect your Personal
                                    Information&#44; including&#58;
                                </p>
                                <ul className="space-y-2 text-gray-600 mb-4">
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Encrypted storage and transmission</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Access control and authentication measures</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Regular audits and vendor oversight</span>
                                    </li>
                                </ul>
                                <p className="text-gray-600">
                                    Despite these efforts&#44; no system is completely secure&#46; We cannot guarantee
                                    absolute protection of your data&#44; and your use of the Services acknowledges this
                                    risk&#46;
                                </p>
                            </div>
                        </section>

                        {/* Section 8 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">8</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Children&#39;s Privacy</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600">
                                    CarrierNest does not knowingly collect information from individuals under the age of
                                    13&#46; If we become aware that we have inadvertently gathered such data&#44; we
                                    will delete it promptly&#46; Please notify us at support&#64;carriernest&#46;com if
                                    you believe a minor has provided us with Personal Information&#46;
                                </p>
                            </div>
                        </section>

                        {/* Section 9 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <GlobeAltIcon className="h-4 w-4 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">International Users</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600">
                                    Our Services are intended for use within the United States&#46; By accessing
                                    CarrierNest from outside the U&#46;S&#46;&#44; you consent to the transfer&#44;
                                    storage&#44; and processing of your information in the United States&#46;
                                </p>
                            </div>
                        </section>

                        {/* Section 10 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <UserGroupIcon className="h-4 w-4 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Your Rights and Choices</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600 mb-3">You have the right to&#58;</p>
                                <ul className="space-y-2 text-gray-600 mb-4">
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Access and request copies of your Personal Information</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Update or correct inaccuracies</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Request deletion&#44; subject to legal limitations</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>Opt-out of marketing communications</span>
                                    </li>
                                </ul>
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <p className="text-gray-700 font-medium mb-2">
                                        To exercise your rights&#44; contact us at&#58;
                                    </p>
                                    <div className="flex items-center space-x-2 text-blue-600">
                                        <EnvelopeIcon className="h-4 w-4" />
                                        <span>support&#64;carriernest&#46;com</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 11 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">11</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">California Residents</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600 mb-3">
                                    If you are a California resident&#44; you may have additional rights under the
                                    California Consumer Privacy Act &#40;CCPA&#41;&#44; including&#58;
                                </p>
                                <ul className="space-y-2 text-gray-600">
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>The right to know what Personal Information we collect</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>The right to request deletion</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                        <span>
                                            The right to opt-out of the sale of personal data &#40;CarrierNest does not
                                            sell personal data&#41;
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 12 */}
                        <section className="mb-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">12</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Changes to This Policy</h2>
                            </div>

                            <div className="ml-11">
                                <p className="text-gray-600">
                                    We may revise this Privacy Policy from time to time&#46; Changes are effective when
                                    posted&#46; Continued use of the Services constitutes your acceptance of the revised
                                    Policy&#46;
                                </p>
                            </div>
                        </section>

                        {/* Contact Section */}
                        <section className="border-t pt-8">
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
                                <div className="space-y-2">
                                    <p className="text-gray-700 font-medium">CarrierNest Privacy Office</p>
                                    <div className="flex items-center space-x-2 text-gray-600">
                                        <EnvelopeIcon className="h-4 w-4" />
                                        <span>Email&#58; support&#64;carriernest&#46;com</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

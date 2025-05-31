import {
    DocumentArrowUpIcon,
    ArrowPathIcon,
    BriefcaseIcon,
    MapPinIcon,
    ReceiptRefundIcon,
    DocumentDuplicateIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    DevicePhoneMobileIcon,
    BanknotesIcon,
    TruckIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import PricingTable from 'components/PricingTable';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

type LoadFeatureProps = {
    name: string;
    desc: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const Homepage = () => {
    const { status, data: session } = useSession();
    const router = useRouter();

    React.useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading
        //if (status === 'unauthenticated') signIn(); // If not authenticated, force log in
        if (status === 'unauthenticated') router.replace('/homepage');
        // If authenticated, but no default carrier, redirect to carrier setup
        if (status === 'authenticated' && !session?.user?.defaultCarrierId) {
            router.replace('/setup/carrier');
        } else if (status === 'authenticated' && router.pathname === '/setup/carrier') {
            router.replace('/');
        }
    }, [status, session]);

    const appFeatures: LoadFeatureProps[] = [
        {
            name: 'AI Load Import',
            desc: 'Import load with drag-drop rate con feature, no data entry needed.',
            icon: DocumentArrowUpIcon,
        },
        {
            name: 'Full Load Lifecycle',
            desc: 'Manage your load from booked, driver assignment, loaded, unloaded, POD ready, and invoiced.',
            icon: ArrowPathIcon,
        },
        {
            name: 'Broker Management',
            desc: 'Manage all broker loads under one page.',
            icon: BriefcaseIcon,
        },
        {
            name: 'Driver Management',
            desc: 'Add/remove drivers to loads, track driver location on assigned load.',
            icon: MapPinIcon,
        },
        {
            name: 'Driver App',
            desc: 'Allow drivers to view assigned route details, upload documents, and track accurate location.',
            icon: DevicePhoneMobileIcon,
        },
        {
            name: 'Driver Payroll',
            desc: 'Add driver pay to each assignment based on per mile, per load, or hourly basis.',
            icon: BanknotesIcon,
        },
        {
            name: 'Invoice Generation',
            desc: 'See POD ready loads and generate invoices with one click.',
            icon: ReceiptRefundIcon,
        },

        {
            name: 'Document Management',
            desc: 'All load documents are connected to each load so you can easily see/download them.',
            icon: DocumentDuplicateIcon,
        },
        {
            name: 'Track Payments',
            desc: 'Mark loads paid (partial or full).',
            icon: CurrencyDollarIcon,
        },
        {
            name: 'Company Reports',
            desc: 'Track different metrics to stay informed about company activity.',
            icon: ChartBarIcon,
        },
        {
            name: 'Equipment Management',
            desc: 'Keep track of your equipment status, location and driver assignments.',
            icon: TruckIcon,
        },
    ];

    // Define an array of border color classes
    const borderColors = [
        'border-blue-700',
        'border-green-700',
        'border-red-700',
        'border-yellow-700',
        'border-purple-700',
        'border-pink-700',
        'border-indigo-700',
        'border-teal-700',
        'border-lime-700',
    ];

    const textColors = [
        'text-blue-700',
        'text-green-700',
        'text-red-700',
        'text-yellow-700',
        'text-purple-700',
        'text-pink-700',
        'text-indigo-700',
        'text-teal-700',
        'text-lime-700',
    ];

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
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-300 border '
                            }  rounded-md `}
                            onClick={() => {
                                status === 'authenticated' ? router.push('/') : router.push('/auth/signin');
                            }}
                        >
                            {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
                        </button>

                        {status !== 'authenticated' && (
                            <button
                                className="p-2 shadow-lg text-sm  font-semibold text-white transition bg-orange-600 rounded-md md:px-6 md:py-2 whitespace-nowrap md:text-lg hover:bg-orange-700"
                                onClick={() => router.push('/auth/signup')}
                            >
                                Try it Free!
                            </button>
                        )}
                    </div>
                </header>

                {/* Hero Section */}
                <main id="mainContent" tabIndex={-1} role="main" className="pt-16 md:pt-20">
                    <section className="grid items-center grid-cols-1 gap-8 md:grid-cols-12">
                        <div className="md:col-span-6 ">
                            <h1 className="text-4xl font-extrabold text-gray-900 md:text-5xl">Trucking Simplified.</h1>
                            <p className="mt-4 text-lg text-gray-700 md:text-xl">
                                Simplify your trucking management with Carrier Nest. Start your free trial today-
                                <span className="font-semibold underline text-black">no credit card required</span>.
                                Experience streamlined logistics and business growth.
                            </p>
                            <div className="mt-6">
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        className="px-6 py-3 shadow-lg shadow-gray-800/50 font-semibold text-white transition bg-orange-600 rounded-md hover:bg-orange-700"
                                        onClick={() =>
                                            status === 'authenticated' ? router.push('/') : router.push('/auth/signup')
                                        }
                                    >
                                        Get Started for Free
                                    </button>
                                    {/* <button
                                        className="px-6 py-3 font-semibold text-gray-700 transition border border-gray-300 rounded-md hover:bg-gray-100"
                                        onClick={() => router.push('/learn-more')}
                                    >
                                        Learn More
                                    </button> */}
                                </div>
                            </div>
                        </div>
                        <div className="relative md:col-span-6">
                            <div className="hidden md:block">
                                <Image
                                    src="/truckbg.png"
                                    alt="Truck Background"
                                    width={800}
                                    height={600}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                        </div>
                    </section>
                </main>

                {/* Features Section */}
                <div className="py-16">
                    <h2 className="mb-12 text-3xl font-extrabold text-center text-gray-900">App Features</h2>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
                        {appFeatures.map((feature, index) => {
                            const borderColorClass = borderColors[index % borderColors.length];
                            const textColorClass = textColors[index % textColors.length];
                            const IconComponent = feature.icon;
                            return (
                                <div
                                    key={index}
                                    className={`p-6 transition duration-200 ease-out border-2 rounded-2xl hover:shadow-lg ${borderColorClass}`}
                                >
                                    <div className="mb-4">
                                        <IconComponent className={`w-10 h-10 mb-2 ${textColorClass}`} />
                                        <h3 className={`text-xl font-semibold ${textColorClass}`}>{feature.name}</h3>
                                    </div>
                                    <p className="text-gray-600">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Dashboard Overview */}
                <div className="py-16">
                    <div className="flex flex-col items-center ">
                        <div className="w-full  ">
                            <h2 className="mb-2 text-3xl font-extrabold text-gray-900">App Dashboard Overview</h2>
                            <p className="mb-6 text-lg text-gray-700">
                                Experience a comprehensive dashboard that provides real-time insights into your
                                operations.
                            </p>
                        </div>
                        <div className="relative w-full bg-slate-50 rounded-xl ">
                            <Image
                                src="/dashboardmapview.png"
                                alt="App Dashboard Overview"
                                width={1920}
                                height={1080}
                                loading="lazy"
                                className="  rounded-xl shadow-none "
                            />
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="px-6 py-16 text-center text-gray-600 bg-gradient-to-br from-blue-50 to-blue-100/90 rounded-xl">
                    <h2 className="mb-6 text-4xl font-extrabold">Get Started with Carrier Nest Today!</h2>
                    <p className="max-w-4xl px-3 mx-auto mb-8 text-lg">
                        Carrier Nest isn&apos;t just a management system; it&apos;s a partner in your success. Our
                        dedicated support team is here to assist you every step of the way, ensuring you get the most
                        out of our system. Join the growing number of trucking companies that trust Carrier Nest to keep
                        their operations running smoothly. Experience the future of trucking management today.
                    </p>
                    <button
                        className="px-8 py-3 font-semibold text-blue-600 transition bg-white rounded-md hover:bg-gray-100"
                        onClick={() => (status === 'authenticated' ? router.push('/') : router.push('/auth/signup'))}
                    >
                        Start For Free
                    </button>
                </div>

                {/* Dashboard Overview */}
                <div className="my-16 bg-gray-50 p-8 rounded-lg">
                    <div className="flex flex-col sm:flex-row  items-center gap-8 ">
                        <div className="w-full  ">
                            <h2 className="mb-2 text-3xl font-extrabold text-gray-900">Daily Analytics</h2>
                            <p className="mb-6 text-lg text-gray-700">
                                Know what’s happening—every mile, every dollar, every day. Your fleet’s performance,
                                delivered in real-time. No spreadsheets. No guesswork.
                            </p>
                        </div>
                        <div className="relative w-full bg-slate-50 rounded-xl flex justify-center">
                            <Image
                                src="/dashboarddailyanalytics.png"
                                alt="App Dashboard Overview"
                                width={600}
                                height={800}
                                loading="lazy"
                                className="  rounded-xl shadow-none "
                            />
                        </div>
                    </div>
                </div>

                {/* Clean Pricing Comparison Table */}
                <div className=" mx-auto sm:mt-12 mb-24 w-full sm:bg-gradient-to-br from-purple-400 to-blue-600/90  bg-gray-white sm:px-4 py-8 rounded-lg ">
                    <h1 className=" text-2xl sm:text-4xl font-extrabold sm:text-white text-center mb-4">
                        Pricing Plans
                    </h1>
                    <PricingTable />
                </div>

                {/* Driver App Section */}
                <section className="mt-16 bg-gray-50 sm:bg-white  py-8 sm:py-20 text-gray-800 rounded-2xl">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                    Carrier Nest Driver App
                                </h2>
                                <p className="mt-4 text-xl text-gray-400">
                                    Empower your drivers with our dedicated mobile application. Streamline
                                    communication, document handling, and route management.
                                </p>
                                <ul className="mt-8 space-y-4">
                                    <li className="flex items-start">
                                        <CheckCircleIcon className="mr-2 h-6 w-6 flex-shrink-0 text-blue-300" />
                                        <span>View Assigned Routes and Load Details</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircleIcon className="mr-2 h-6 w-6 flex-shrink-0 text-blue-300" />
                                        <span>Start & Complete Routes with Status Updates</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircleIcon className="mr-2 h-6 w-6 flex-shrink-0 text-blue-300" />
                                        <span>Upload BOL, POD, and Other Documents Instantly</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircleIcon className="mr-2 h-6 w-6 flex-shrink-0 text-blue-300" />
                                        <span>Automatic Location Tracking for Better Coordination</span>
                                    </li>
                                </ul>
                                <div className="mt-8">
                                    <Link href={'https://apps.apple.com/us/app/carrier-nest/id6471352606'}>
                                        <button className="rounded-lg bg-gray-600 px-6 py-3 text-base font-medium text-slate-50 shadow-sm transition hover:bg-blue-50">
                                            Download Driver App
                                        </button>
                                    </Link>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <div className="relative  overflow-hidden rounded-3xl ">
                                    <Image
                                        src="/carriernestiphoneapp.png"
                                        alt="App Dashboard Overview"
                                        width={300}
                                        height={500}
                                        loading="lazy"
                                        className="  rounded-xl shadow-none "
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

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

export default Homepage;

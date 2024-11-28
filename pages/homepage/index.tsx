import {
    DocumentArrowUpIcon,
    ArrowPathIcon,
    BriefcaseIcon,
    MapPinIcon,
    ReceiptRefundIcon,
    DocumentDuplicateIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

type LoadFeatureProps = {
    name: string;
    desc: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const Homepage = () => {
    const { status, data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    React.useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading
        //if (status === 'unauthenticated') signIn(); // If not authenticated, force log in
        if (status === 'unauthenticated') router.replace('/homepage');
        // If authenticated, but no default carrier, redirect to carrier setup
        if (status === 'authenticated' && !session?.user?.defaultCarrierId) {
            router.replace('/setup/carrier');
        } else if (status === 'authenticated' && pathname === '/setup/carrier') {
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
    ];

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
                            onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                        >
                            {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
                        </button>
                    </div>
                </header>

                {/* Hero Section */}
                <main id="mainContent" tabIndex={-1} role="main" className="pt-16 md:pt-20">
                    <section className="grid items-center grid-cols-1 gap-8 md:grid-cols-12">
                        <div className="md:col-span-6">
                            <h1 className="text-4xl font-extrabold text-gray-900 md:text-5xl">Trucking Simplified.</h1>
                            <p className="mt-4 text-lg text-gray-700 md:text-xl">
                                Carrier Nest lets you focus on growing your business. We aim to simplify logistics for
                                owner-operators and medium-sized trucking companies.
                            </p>
                            <div className="mt-6">
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        className="px-6 py-3 font-semibold text-white transition bg-blue-600 rounded-md hover:bg-blue-700"
                                        onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                                    >
                                        Get Started
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
                    <div className="flex flex-col items-center lg:flex-row">
                        <div className="w-full lg:w-1/3 lg:pr-12">
                            <h2 className="mb-6 text-3xl font-extrabold text-gray-900">App Dashboard Overview</h2>
                            <p className="mb-6 text-lg text-gray-700">
                                Experience a comprehensive dashboard that provides real-time insights into your
                                operations.
                            </p>
                        </div>
                        <div className="w-full lg:w-2/3">
                            <Image
                                src="/dashboard.png"
                                alt="App Dashboard Overview"
                                width={800}
                                height={600}
                                className="rounded-lg shadow-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="px-6 py-16 text-center text-white bg-blue-600 rounded-xl">
                    <h2 className="mb-6 text-4xl font-extrabold">Get Started with Carrier Nest Today!</h2>
                    <p className="max-w-4xl px-3 mx-auto mb-8 text-lg">
                        Carrier Nest isn&apos;t just a management system; it&apos;s a partner in your success. Our
                        dedicated support team is here to assist you every step of the way, ensuring you get the most
                        out of our system. Join the growing number of trucking companies that trust Carrier Nest to keep
                        their operations running smoothly. Experience the future of trucking management today.
                    </p>
                    <button
                        className="px-8 py-3 font-semibold text-blue-600 transition bg-white rounded-md hover:bg-gray-100"
                        onClick={() => (status === 'authenticated' ? router.push('/') : signIn())}
                    >
                        Start Free Trial
                    </button>
                </div>

                {/* Footer */}
                <footer className="py-8 mt-16 border-t border-gray-200">
                    <div className="flex flex-col items-center justify-between text-gray-600 md:flex-row">
                        <p className="mb-4 text-center md:text-left md:mb-0">
                            &copy; 2024 Carrier Nest. All Rights Reserved.
                        </p>
                        <p className="text-center md:text-right">
                            Got questions? Email us at{' '}
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

export default Homepage;

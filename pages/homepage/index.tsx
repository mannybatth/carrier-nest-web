'use client';

import React from 'react';
import {
    ArrowRightIcon,
    CheckCircleIcon,
    ChevronUpIcon,
    ClockIcon,
    CreditCardIcon,
    EnvelopeIcon,
    DocumentArrowUpIcon,
    ArrowPathIcon,
    BriefcaseIcon,
    MapPinIcon,
    DevicePhoneMobileIcon,
    BanknotesIcon,
    ReceiptRefundIcon,
    DocumentDuplicateIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    TruckIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import PricingTable from 'components/PricingTable';
import { PageWithAuth } from '../../interfaces/auth';

const Homepage: PageWithAuth = () => {
    // Session data for conditional rendering
    const { status, data: session } = useSession();
    const router = useRouter();

    // If authenticated and has a carrier, redirect to main app
    React.useEffect(() => {
        if (status === 'authenticated' && session?.user?.defaultCarrierId) {
            router.replace('/');
        }
    }, [status, session, router]);

    // Refs for scroll functionality
    const featuresRef = useRef<HTMLDivElement>(null);
    const howItWorksRef = useRef<HTMLDivElement>(null);
    const testimonialsRef = useRef<HTMLDivElement>(null);

    // State for scroll-to-top button
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Check scroll position to show/hide scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 500);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Scroll to section functions
    const scrollToFeatures = () => {
        featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToHowItWorks = () => {
        howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToTestimonials = () => {
        testimonialsRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const appFeatures = [
        {
            name: 'AI Load Import',
            desc: 'Import loads with a simple drag-and-drop. No manual data entry needed.',
            icon: DocumentArrowUpIcon,
            color: 'text-orange-500',
        },
        {
            name: 'Full Load Lifecycle',
            desc: 'Track your loads from booking to payment in one simple view.',
            icon: ArrowPathIcon,
            color: 'text-emerald-500',
        },
        {
            name: 'Broker Management',
            desc: 'Keep all your broker relationships and loads organized in one place.',
            icon: BriefcaseIcon,
            color: 'text-blue-500',
        },
        {
            name: 'Driver Management',
            desc: 'Assign drivers to loads and track their location in real-time.',
            icon: MapPinIcon,
            color: 'text-purple-500',
        },
        {
            name: 'Driver App',
            desc: 'Free mobile app for your drivers to view routes and upload documents.',
            icon: DevicePhoneMobileIcon,
            color: 'text-pink-500',
        },
        {
            name: 'Driver Payroll',
            desc: 'Calculate driver pay automatically based on miles, loads, or hours.',
            icon: BanknotesIcon,
            color: 'text-yellow-500',
        },
        {
            name: 'Invoice Generation',
            desc: 'Create and send professional invoices with one click.',
            icon: ReceiptRefundIcon,
            color: 'text-sky-500',
        },
        {
            name: 'Document Management',
            desc: 'Store all your load documents in one place for easy access.',
            icon: DocumentDuplicateIcon,
            color: 'text-red-500',
        },
        {
            name: 'Track Payments',
            desc: 'Monitor payments and get notified when invoices are paid.',
            icon: CurrencyDollarIcon,
            color: 'text-green-500',
        },
        {
            name: 'Company Reports',
            desc: 'Get insights into your business with easy-to-understand reports.',
            icon: ChartBarIcon,
            color: 'text-indigo-500',
        },
        {
            name: 'Equipment Management',
            desc: 'Keep track of your trucks and trailers in one central location.',
            icon: TruckIcon,
            color: 'text-amber-500',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-gray-100 shadow-sm">
                <div className="flex items-center justify-between h-16 sm:h-20 px-4 mx-auto max-w-7xl">
                    <div className="flex items-end gap-2">
                        <div className="p-1 pr-0">
                            <div className="flex items-center justify-center">
                                <Image src="/logo_truck_100.png" alt="CarrierNest Logo" width={50} height={50} />
                            </div>
                        </div>
                        <span className="text-xl font-bold text-gray-800 hidden sm:block">CarrierNest</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-6">
                        <button
                            onClick={scrollToFeatures}
                            className="font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Features
                        </button>
                        <button
                            onClick={scrollToHowItWorks}
                            className="font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            How It Works
                        </button>
                        <button
                            onClick={scrollToTestimonials}
                            className="font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Testimonials
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            className="px-2 sm:px-6 py-2 font-medium whitespace-nowrap text-gray-700 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d2d4,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d2d4,inset_-4px_-4px_8px_#ffffff] transition-all duration-300"
                            onClick={() => {
                                status === 'authenticated' ? router.push('/') : router.push('/auth/signin');
                            }}
                        >
                            {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
                        </button>

                        {status !== 'authenticated' && (
                            <button
                                className="px-6 py-2 whitespace-nowrap font-medium text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-[4px_4px_8px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.1)] hover:from-orange-500 hover:to-orange-700 active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)] transition-all duration-300"
                                onClick={() => router.push('/auth/signup')}
                            >
                                Try it Free!
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="px-4 py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl">
                    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-16 items-center">
                        <div className="flex flex-col gap-8">
                            <div className="flex items-center px-6 py-3 text-sm font-medium text-orange-800 bg-orange-100 rounded-full w-fit shadow-[3px_3px_6px_#d1d2d4,-3px_-3px_6px_#ffffff]">
                                <ClockIcon className="w-4 h-4 mr-2" />
                                <span>Built for small fleets & owner-operators</span>
                            </div>

                            <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight text-gray-800 max-w-none lg:max-w-2xl">
                                Trucking Management <span className="text-orange-500">Made Simple</span>
                            </h1>

                            <p className="text-lg lg:text-xl text-gray-600 leading-relaxed">
                                CarrierNest is the only TMS designed specifically for small fleets and owner-operators.
                                No complicated features you&quot;ll never use. Just the tools you need to run your
                                business efficiently.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 lg:gap-8 items-stretch sm:items-center">
                                <Link href="/auth/signup" className="w-full sm:w-auto">
                                    <button className="w-full px-6 lg:px-8 py-3 lg:py-4 text-base lg:text-lg font-medium text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-[6px_6px_12px_rgba(0,0,0,0.1),-3px_-3px_8px_rgba(255,255,255,0.1)] hover:from-orange-500 hover:to-orange-700 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center justify-center">
                                        Get Started Free
                                        <ArrowRightIcon className="w-5 h-5 ml-3" />
                                    </button>
                                </Link>
                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                    <CreditCardIcon className="w-5 h-5" />
                                    <span>No credit card required</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                                    <span className="text-gray-700 text-base lg:text-lg">AI-powered load import</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                                    <span className="text-gray-700 text-base lg:text-lg">One-click invoicing</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                                    <span className="text-gray-700 text-base lg:text-lg">Free driver mobile app</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-200 rounded-3xl shadow-[12px_12px_24px_#d1d2d4,-12px_-12px_24px_#ffffff]">
                                <Image
                                    src="/mkt/gifs/loadimport.gif"
                                    alt="CarrierNest Dashboard"
                                    width={1000}
                                    height={700}
                                    className="w-full rounded-2xl border border-gray-300"
                                />
                            </div>
                            <div className="absolute bottom-4 lg:-bottom-4 left-4 lg:left-6 bg-gradient-to-br from-gray-50 to-gray-200 px-4 lg:px-6 py-3 lg:py-4 rounded-xl shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm lg:text-base text-orange-700">
                                        Perfect for 1-10 truck operations
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section ref={howItWorksRef} className="px-4 py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-4xl mx-auto text-center mb-12 lg:mb-16">
                        <h2 className="mb-4 text-2xl lg:text-4xl font-bold text-gray-800">How It Works</h2>
                        <p className="text-lg lg:text-xl text-gray-600">
                            Streamline your trucking operation with our simple, AI-powered platform. No more manual data
                            entry.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
                        {[
                            {
                                number: 1,
                                title: 'Drop Your Rate Con',
                                description:
                                    'Simply drag and drop your rate confirmation PDF. No manual data entry needed.',
                                image: '/mkt/gifs/upload.gif',
                            },
                            {
                                number: 2,
                                title: 'AI Extracts Everything',
                                description:
                                    'Our AI instantly pulls all load details, pickup/delivery info, and payment terms.',
                                image: '/mkt/gifs/aiprocess.gif',
                            },
                            {
                                number: 3,
                                title: 'Ready to Dispatch',
                                description:
                                    'Assign drivers, track deliveries, and send invoices with just a few clicks.',
                                image: '/mkt/gifs/aiextractloaddetails.gif',
                            },
                        ].map((step, index) => (
                            <div
                                key={index}
                                className="relative p-6 lg:p-10 bg-gradient-to-br from-gray-50 to-gray-200 rounded-3xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff]"
                            >
                                <div className="absolute -top-5 lg:-top-7 flex items-center justify-center w-10 h-10 lg:w-14 lg:h-14 text-base lg:text-xl font-bold text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                    {step.number}
                                </div>
                                <h3 className="mt-4 lg:mt-6 mb-4 text-xl lg:text-2xl font-bold text-gray-800">
                                    {step.title}
                                </h3>
                                <p className="text-gray-600 text-base lg:text-lg leading-relaxed mb-6">
                                    {step.description}
                                </p>
                                <div className="p-4 lg:p-6 bg-gray-300 rounded-2xl shadow-[inset_4px_4px_8px_#d1d2d4,inset_-4px_-4px_8px_#ffffff]">
                                    <Image
                                        src={step.image || '/placeholder.svg?height=200&width=400'}
                                        alt={step.title}
                                        width={400}
                                        height={200}
                                        className="w-full h-auto rounded-lg"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center mt-12 lg:mt-16">
                        <Link href="/auth/signup">
                            <button className="px-6 lg:px-8 py-3 lg:py-4 text-base lg:text-lg font-medium text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-[6px_6px_12px_rgba(0,0,0,0.1),-3px_-3px_8px_rgba(255,255,255,0.1)] hover:from-orange-500 hover:to-orange-700 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center">
                                Try It Now
                                <ArrowRightIcon className="w-5 h-5 ml-3" />
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section ref={featuresRef} className="px-4 py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center mb-12 lg:mb-16">
                        <h2 className="mb-4 text-2xl lg:text-4xl font-bold text-gray-800">
                            Features Built for Small Fleets
                        </h2>
                        <p className="text-lg lg:text-xl text-gray-600 max-w-4xl mx-auto">
                            Everything you need to manage your trucking business efficiently
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
                        {appFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-200 rounded-3xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff] border border-white/10 h-full flex flex-col hover:shadow-[16px_16px_32px_#c5c6c8,-16px_-16px_32px_#ffffff] hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="mb-6">
                                    <div className="p-3 lg:p-4 w-12 h-12 lg:w-16 lg:h-16 mb-4 bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff] flex items-center justify-center">
                                        {React.createElement(feature.icon, {
                                            className: `w-6 h-6 lg:w-8 lg:h-8 ${feature.color}`,
                                        })}
                                    </div>
                                    <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-2">
                                        {feature.name}
                                    </h3>
                                </div>
                                <p className="text-gray-600 text-sm lg:text-base leading-relaxed flex-1">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dashboard Overview */}
            <section className="px-4 py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col items-center">
                        <div className="w-full max-w-4xl">
                            <h2 className="mb-2 text-2xl lg:text-3xl font-bold text-gray-800">
                                Simple Dashboard for Busy Operators
                            </h2>
                            <p className="mb-6 text-lg text-gray-600">
                                No complicated screens or confusing menus. Just the information you need to run your
                                fleet efficiently.
                            </p>
                        </div>
                        <div className="relative w-full max-w-6xl p-4 bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff]">
                            <Image
                                src="/dashboardmapview.png"
                                alt="App Dashboard Overview"
                                width={1920}
                                height={1080}
                                loading="lazy"
                                className="rounded-xl w-full"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Daily Analytics */}
            <section className="px-4 py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col lg:flex-row items-center gap-8 max-w-6xl mx-auto">
                        <div className="w-full">
                            <h2 className="mb-2 text-2xl lg:text-3xl font-bold text-gray-800">Daily Analytics</h2>
                            <p className="mb-6 text-lg text-gray-600">
                                Know what&quot;s happening with your fleet at a glance. See your performance in
                                real-time without complex reports or spreadsheets.
                            </p>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-gray-700">Track revenue by truck, driver, or customer</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-gray-700">Monitor on-time delivery performance</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-gray-700">See which lanes are most profitable</span>
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff] p-4">
                            <Image
                                src="/dashboarddailyanalytics.png"
                                alt="Daily Analytics Dashboard"
                                width={600}
                                height={800}
                                loading="lazy"
                                className="rounded-xl w-full"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section ref={testimonialsRef} className="px-4 py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-4xl mx-auto mb-12 text-center">
                        <h2 className="mb-3 text-2xl lg:text-3xl font-bold text-gray-800">
                            Trusted by Small Fleets Like Yours
                        </h2>
                        <div className="flex items-center justify-center gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <svg
                                    key={i}
                                    className="w-5 h-5 text-yellow-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                            <span className="ml-2 text-gray-600">4.8/5 (30+ reviews)</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff]">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-[3px_3px_6px_#d1d2d4,-3px_-3px_6px_#ffffff]">
                                    JD
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">John D.</h4>
                                    <p className="text-sm text-gray-600">Owner-Operator, 2 trucks</p>
                                </div>
                            </div>
                            <p className="text-gray-700">
                                &quot;As a small fleet owner, I was drowning in paperwork and spending too much time on
                                admin tasks. CarrierNest simplified everything. The AI load import feature alone saves
                                me hours every week. Now I can focus on finding better loads and growing my
                                business.&quot;
                            </p>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff]">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-[3px_3px_6px_#d1d2d4,-3px_-3px_6px_#ffffff]">
                                    SM
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">Sarah M.</h4>
                                    <p className="text-sm text-gray-600">Fleet Manager, 8 trucks</p>
                                </div>
                            </div>
                            <p className="text-gray-700">
                                &quot;We tried other TMS systems but they were too complicated and expensive for our
                                small fleet. CarrierNest gives us exactly what we need without the bloat. My drivers
                                love the mobile app, and I love how easy it is to create and send invoices.&quot;
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Driver App Section */}
            <section className="px-4 py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl">
                    <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                        <div>
                            <h2 className="text-2xl lg:text-3xl font-bold leading-tight text-gray-800">
                                Free Driver App Included
                            </h2>
                            <p className="mt-4 text-xl text-gray-600">
                                Give your drivers the tools they need to succeed. Our simple mobile app makes their job
                                easier.
                            </p>
                            <ul className="mt-8 flex flex-col gap-4">
                                <li className="flex items-start">
                                    <div className="p-1 mr-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-gray-700">View assigned loads and route details</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="p-1 mr-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-gray-700">Update load status with one tap</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="p-1 mr-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-gray-700">
                                        Upload BOL, POD, and other documents instantly
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <div className="p-1 mr-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff]">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-gray-700">
                                        Get turn-by-turn directions to pickup and delivery
                                    </span>
                                </li>
                            </ul>
                            <div className="mt-8">
                                <Link href="https://apps.apple.com/us/app/carrier-nest/id6471352606">
                                    <button className="px-6 py-3 text-base font-medium text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-[4px_4px_8px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.1)] hover:from-orange-500 hover:to-orange-700 active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)] transition-all duration-300">
                                        Download Driver App
                                    </button>
                                </Link>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff]">
                                <Image
                                    src="/carriernestiphoneapp.png"
                                    alt="Driver Mobile App"
                                    width={300}
                                    height={500}
                                    loading="lazy"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <PricingTable />

            {/* Call to Action */}
            <section className=" py-8 lg:py-24 bg-gray-100">
                <div className="mx-auto max-w-7xl  ">
                    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl shadow-[8px_8px_16px_#d1d2d4,-8px_-8px_16px_#ffffff]   mx-auto">
                        <h2 className="mb-6 text-2xl lg:text-3xl font-bold text-center text-gray-800">
                            Ready to simplify your trucking operation?
                        </h2>
                        <p className="max-w-4xl mx-auto mb-8 text-lg text-center text-gray-600">
                            Join other small fleets and owner-operators who are saving time and growing their business
                            with CarrierNest.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/auth/signup">
                                <button className="px-8 py-3 font-medium text-white bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-[4px_4px_8px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.1)] hover:from-orange-500 hover:to-orange-700 active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)] transition-all duration-300">
                                    Start For Free
                                </button>
                            </Link>
                            <p className="text-sm text-gray-500">No credit card required • Cancel anytime</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-4 py-8 lg:py-12 pb-24 bg-gray-100 text-gray-600">
                <div className="mx-auto max-w-7xl">
                    {/* Logo and Description */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        <div className="lg:col-span-1">
                            <div className="flex items-end gap-2 mb-4">
                                <div className="p-1 pr-0">
                                    <div className="flex items-center justify-center">
                                        <Image
                                            src="/logo_truck_100.png"
                                            alt="CarrierNest Logo"
                                            width={40}
                                            height={40}
                                        />
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-gray-800">CarrierNest</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                The transportation management system designed specifically for small fleets and
                                owner-operators.
                            </p>
                            <div className="flex items-center gap-4">
                                <a
                                    href="https://www.facebook.com/carriernest"
                                    className="p-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-full shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff] text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            fillRule="evenodd"
                                            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </a>
                                <a
                                    href="#"
                                    className="p-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-full shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff] text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.instagram.com/carriernestapp/"
                                    className="p-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-full shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff] text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            fillRule="evenodd"
                                            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4">
                                Quick Links
                            </h3>
                            <ul className="flex flex-col gap-3">
                                <li>
                                    <button
                                        onClick={scrollToFeatures}
                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        Features
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={scrollToHowItWorks}
                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        How It Works
                                    </button>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/signup"
                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        Sign Up
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/signin"
                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        Sign In
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4">Legal</h3>
                            <ul className="flex flex-col gap-3">
                                <li>
                                    <Link href="/terms" className="text-gray-600 hover:text-gray-800 transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/privacy-policy"
                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        Privacy Policy
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4">
                                Contact
                            </h3>
                            <ul className="flex flex-col gap-3">
                                <li className="flex items-center">
                                    <div className="p-1 mr-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[2px_2px_4px_#d1d2d4,-2px_-2px_4px_#ffffff]">
                                        <EnvelopeIcon className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <a
                                        href="mailto:support@carriernest.com"
                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        support@carriernest.com
                                    </a>
                                </li>
                                <li className="flex items-center">
                                    <div className="p-1 mr-2 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg shadow-[2px_2px_4px_#d1d2d4,-2px_-2px_4px_#ffffff]">
                                        <svg
                                            className="w-4 h-4 text-gray-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                            />
                                        </svg>
                                    </div>
                                    <a
                                        href="tel:+12065654638"
                                        className="text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        (206) 565-4638
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="pt-8 mt-8 border-t border-gray-300 flex flex-col sm:flex-row items-center justify-between">
                        <p className="text-sm text-gray-600">
                            © {new Date().getFullYear()} CarrierNest. All rights reserved.
                        </p>
                        <div className="mt-4 sm:mt-0">
                            <p className="text-xs text-gray-500">
                                Built specifically for small fleets and owner-operators.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-20 sm:bottom-6 right-4 z-40 p-3 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-700 rounded-full shadow-[4px_4px_8px_#d1d2d4,-4px_-4px_8px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d2d4,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d2d4,inset_-4px_-4px_8px_#ffffff] transition-all duration-300"
                    aria-label="Scroll to top"
                >
                    <ChevronUpIcon className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

// Mark homepage as a public page that doesn't require authentication
Homepage.authenticationEnabled = false;

export default Homepage;

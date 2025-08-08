'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    CheckCircleIcon,
    ArrowRightIcon,
    TruckIcon,
    DocumentTextIcon,
    ChartBarIcon,
    ClockIcon,
    CreditCardIcon,
    BoltIcon,
    EnvelopeIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { PageWithAuth } from '../../interfaces/auth';

const Home: PageWithAuth = () => {
    // Refs for scroll functionality
    const featuresRef = useRef<HTMLDivElement>(null);
    const pricingRef = useRef<HTMLDivElement>(null);

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

    const scrollToPricing = () => {
        pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Sticky Header with CTA */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
                <div className="container flex items-center justify-between h-16 px-4 mx-auto">
                    <div className="flex items-end gap-2">
                        <div className="p-1 pr-0">
                            <div className="flex items-center justify-center">
                                <Image src="/logo_truck.svg" alt="CarrierNest Logo" width={40} height={40} />
                            </div>
                        </div>
                        <span className="text-xl font-bold">CarrierNest</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* <Link href="/auth/signin" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            Sign In
                        </Link> */}
                        <Link href="/auth/signup">
                            <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors">
                                Try For Free
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section - Focused on Quick Setup */}
            <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50">
                <div className="container px-4 py-16 mx-auto md:py-24 lg:py-32">
                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        <div className="flex flex-col max-w-lg gap-6">
                            <div className="flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-full w-fit">
                                <ClockIcon className="w-4 h-4 mr-2" />
                                <span>Setup takes less than 30 seconds</span>
                            </div>

                            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                                The TMS that <span className="text-orange-500">actually works</span> for small fleets
                            </h1>

                            <p className="text-base text-gray-600 sm:text-lg">
                                Import loads, assign drivers, track deliveries, and send invoices&#8212;without touching
                                a single spreadsheet. Designed for small fleets and solo operators.
                            </p>

                            <div className="flex flex-col gap-4 sm:flex-row">
                                <Link href="/auth/signup" className="w-full sm:w-auto">
                                    <button className="w-full px-6 py-3 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center">
                                        Get Started Free
                                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                                    </button>
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <CreditCardIcon className="w-4 h-4" />
                                    <span>No credit card required</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    <span className="text-gray-700">AI-powered load import</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    <span className="text-gray-700">One-click invoicing</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    <span className="text-gray-700">Driver-friendly mobile app</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-blue-500/20 rounded-3xl blur-2xl -z-10"></div>
                            <div className="relative overflow-hidden border border-gray-200 rounded-xl shadow-lg">
                                <Image
                                    src="/mkt/gifs/setup.gif"
                                    alt="CarrierNest Dashboard"
                                    width={800}
                                    height={600}
                                    className="w-full"
                                    priority
                                    unoptimized
                                />
                            </div>
                            <div className="absolute -bottom-4  left-4 bg-white animate-pulse p-2 rounded-lg shadow-lg border border-orange-200">
                                <div className="flex items-center gap-2">
                                    <BoltIcon className="w-5 h-5 text-yellow-500" />
                                    <span className="font-bold text-sm ">30 sec. Setup - No CC Required</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works - Visual Step Process */}
            <section className="py-16 bg-white md:py-24">
                <div className="container px-4 mx-auto">
                    <div className="max-w-3xl mx-auto mb-12 text-center">
                        <h2 className="mb-3 text-2xl font-bold sm:text-3xl md:text-4xl md:mb-4">How It Works</h2>
                        <p className="text-lg text-gray-600">
                            See how easy it is to use CarrierNest. No complicated onboarding or training required.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="relative p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="absolute flex items-center justify-center w-10 h-10 text-white bg-orange-500 rounded-full -top-5">
                                1
                            </div>
                            <h3 className="mt-4 mb-2 text-xl font-bold">Drop Your Rate Con</h3>
                            <p className="text-gray-600">
                                Simply drag and drop your rate confirmation PDF. No manual data entry needed.
                            </p>
                            <div className="p-4 mt-4 bg-gray-50 rounded-md">
                                <Image
                                    src="/mkt/gifs/upload.gif"
                                    alt="Drag and drop interface"
                                    width={300}
                                    height={150}
                                    className="mx-auto rounded"
                                />
                            </div>
                        </div>

                        <div className="relative p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="absolute flex items-center justify-center w-10 h-10 text-white bg-orange-500 rounded-full -top-5">
                                2
                            </div>
                            <h3 className="mt-4 mb-2 text-xl font-bold">AI Extracts Everything</h3>
                            <p className="text-gray-600">
                                Our AI instantly pulls all load details, pickup/delivery info, and payment terms.
                            </p>
                            <div className="p-4 mt-4 bg-gray-50 rounded-md">
                                <Image
                                    src="/mkt/gifs/aiprocess.gif"
                                    alt="AI extraction"
                                    width={300}
                                    height={150}
                                    className="mx-auto rounded"
                                />
                            </div>
                        </div>

                        <div className="relative p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="absolute flex items-center justify-center w-10 h-10 text-white bg-orange-500 rounded-full -top-5">
                                3
                            </div>
                            <h3 className="mt-4 mb-2 text-xl font-bold">Ready to Dispatch</h3>
                            <p className="text-gray-600">
                                Assign drivers, track deliveries, and send invoices with just a few clicks.
                            </p>
                            <div className="p-4 mt-4 bg-gray-50 rounded-md">
                                <Image
                                    src="/mkt/gifs/aiextractloaddetails.gif"
                                    alt="Dispatch interface"
                                    width={300}
                                    height={150}
                                    className="mx-auto rounded"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-12">
                        <Link href="/auth/signup">
                            <button className="px-6 py-3 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors flex items-center">
                                Try It Now
                                <ArrowRightIcon className="w-4 h-4 ml-2" />
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Problem-Solution Section */}
            <section className="py-16 bg-gray-50 md:py-24">
                <div className="container px-4 mx-auto">
                    <div className="max-w-3xl mx-auto mb-12 text-center">
                        <h2 className="mb-3 text-2xl font-bold sm:text-3xl md:text-4xl md:mb-4">
                            Stop Wasting Time on Paperwork
                        </h2>
                        <p className="text-lg text-gray-600">
                            See how CarrierNest eliminates the most frustrating parts of running your trucking business
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-red-100 rounded-lg">
                                <DocumentTextIcon className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">Before: Manual Data Entry</h3>
                            <p className="text-gray-600">
                                Typing load details from PDFs into spreadsheets, wasting hours every week and making
                                costly mistakes.
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-green-100 rounded-lg">
                                <BoltIcon className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">After: AI-Powered Import</h3>
                            <p className="text-gray-600">
                                Just drag and drop your rate con. AI pulls all the details instantly with perfect
                                accuracy.
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-red-100 rounded-lg">
                                <TruckIcon className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">Before: Lost Track of Loads</h3>
                            <p className="text-gray-600">
                                Constantly calling drivers for updates, missing delivery windows, and scrambling to find
                                load info.
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-green-100 rounded-lg">
                                <ChartBarIcon className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">After: Real-Time Tracking</h3>
                            <p className="text-gray-600">
                                See where every truck is in real-time. Get automatic alerts for pickups and deliveries.
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-red-100 rounded-lg">
                                <CreditCardIcon className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">Before: Delayed Invoicing</h3>
                            <p className="text-gray-600">
                                Spending hours creating invoices, chasing PODs, and waiting weeks to get paid for
                                completed loads.
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-green-100 rounded-lg">
                                <DocumentTextIcon className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">After: One-Click Invoicing</h3>
                            <p className="text-gray-600">
                                Delivery complete? Click once and your invoice is sent with all required documentation
                                attached.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof Section */}
            <section className="py-16 bg-white md:py-24">
                <div className="container px-4 mx-auto">
                    <div className="max-w-3xl mx-auto mb-12 text-center">
                        <h2 className="mb-3 text-2xl font-bold sm:text-3xl md:text-4xl md:mb-4">
                            Trusted by Trucking Companies Like Yours
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

                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 text-white bg-orange-500 rounded-full">
                                    MB
                                </div>
                                <div>
                                    <h4 className="font-bold">Manny B.</h4>
                                    <p className="text-sm text-gray-600">Dispatcher, Indianapolis, IN</p>
                                </div>
                            </div>
                            <p className="text-gray-700">
                                &#8220;Switching to CarrierNest was like flipping a switch. We drag and drop rate cons,
                                the AI pulls all the info, and everything else just flows. It&#8217;s simple, it&#8217;s
                                fast, and best of all&#8212;it just works. Easily saves us several hours a day.&#8221;
                            </p>
                        </div>

                        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 text-white bg-orange-500 rounded-full">
                                    JT
                                </div>
                                <div>
                                    <h4 className="font-bold">James T.</h4>
                                    <p className="text-sm text-gray-600">Owner-Operator, Dallas, TX</p>
                                </div>
                            </div>
                            <p className="text-gray-700">
                                &#8220;As a solo operator, I was drowning in paperwork. CarrierNest took me 30 seconds
                                to set up, and now I spend my time driving instead of doing data entry. The mobile app
                                is actually easy to use, and I get paid faster with the one-click invoicing.&#8221;
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Highlights */}
            <section ref={featuresRef} className="py-16 bg-gray-50 md:py-24" id="features">
                <div className="container px-4 mx-auto">
                    <div className="max-w-3xl mx-auto mb-12 text-center">
                        <h2 className="mb-3 text-2xl font-bold sm:text-3xl md:text-4xl md:mb-4">
                            Everything You Need in One System
                        </h2>
                        <p className="text-lg text-gray-600">
                            Stop juggling multiple tools. CarrierNest handles everything your trucking operation needs.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <div className="flex flex-col p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                                    <DocumentTextIcon className="w-5 h-5 text-orange-500" />
                                </div>
                                <h3 className="text-lg font-bold">AI Load Import</h3>
                            </div>
                            <p className="mb-4 text-gray-600">
                                Just drag and drop your rate con. AI pulls out everything you need. No typing, no
                                guesswork.
                            </p>
                        </div>

                        <div className="flex flex-col p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                                    <TruckIcon className="w-5 h-5 text-orange-500" />
                                </div>
                                <h3 className="text-lg font-bold">Dispatch & Tracking</h3>
                            </div>
                            <p className="mb-4 text-gray-600">
                                Assign loads in seconds. Pay drivers by mile, load, or hour. See where everyone is at
                                any time.
                            </p>
                        </div>

                        <div className="flex flex-col p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                                    <DocumentTextIcon className="w-5 h-5 text-orange-500" />
                                </div>
                                <h3 className="text-lg font-bold">One-Click Invoicing</h3>
                            </div>
                            <p className="mb-4 text-gray-600">
                                Delivery done? POD uploaded? Click once&#8212;invoice sent with all documentation
                                attached.
                            </p>
                        </div>

                        <div className="flex flex-col p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                                    <ChartBarIcon className="w-5 h-5 text-orange-500" />
                                </div>
                                <h3 className="text-lg font-bold">Real-Time Analytics</h3>
                            </div>
                            <p className="mb-4 text-gray-600">
                                See what&#8217;s working and fix what&#8217;s not. Track your most profitable routes and
                                customers.
                            </p>
                        </div>

                        <div className="flex flex-col p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                                    <svg
                                        className="w-5 h-5 text-orange-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold">Driver Mobile App</h3>
                            </div>
                            <p className="mb-4 text-gray-600">
                                Simple one-tap controls for trip management. Upload delivery docs with a photo. No
                                paperwork.
                            </p>
                        </div>

                        <div className="flex flex-col p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                                    <svg
                                        className="w-5 h-5 text-orange-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold">Document Management</h3>
                            </div>
                            <p className="mb-4 text-gray-600">
                                Store all your documents in one place. Find what you need instantly. Never lose a POD
                                again.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section - Simple and Clear */}
            <section ref={pricingRef} className="py-12 bg-white md:py-24" id="pricing">
                <div className="container px-4 mx-auto">
                    <div className="max-w-3xl mx-auto mb-8 text-center md:mb-12">
                        <h2 className="mb-3 text-2xl font-bold md:text-4xl md:mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-base text-gray-600 md:text-lg">
                            No hidden fees. No long-term contracts. Cancel anytime.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        {/* Mobile View */}
                        <div className="block md:hidden">
                            <div className="space-y-4">
                                {/* Basic Plan - Mobile */}
                                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                                    <div className="mb-4 text-center">
                                        <h3 className="text-lg font-bold">Basic Plan</h3>
                                        <div className="flex items-center justify-center mt-2">
                                            <span className="text-3xl font-bold">Free</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Perfect for getting started</p>
                                    </div>

                                    <ul className="mb-6 space-y-2 text-sm">
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">1 Driver</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">30 loads total</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">10 AI imports/month</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">100MB storage</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">Driver mobile app</span>
                                        </li>
                                    </ul>

                                    <Link href="/auth/signup" className="block w-full">
                                        <button className="w-full px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                            Start Free
                                        </button>
                                    </Link>
                                </div>

                                {/* Pro Plan - Mobile */}
                                <div className="relative p-6 bg-white border-2 border-orange-500 rounded-xl shadow-md">
                                    <div className="absolute px-3 py-1 text-xs font-bold text-white bg-orange-500 rounded-full -top-3 right-6">
                                        MOST POPULAR
                                    </div>
                                    <div className="mb-4 text-center">
                                        <h3 className="text-lg font-bold">Pro Plan</h3>
                                        <div className="flex flex-col items-center mt-2">
                                            <span className="text-xs text-gray-400 line-through">
                                                $19/month per driver
                                            </span>
                                            <div className="flex items-center">
                                                <span className="text-3xl font-bold text-orange-600">$9.50</span>
                                                <span className="ml-1 text-sm text-gray-500">/month per driver</span>
                                            </div>
                                            <span className="px-2 py-1 mt-1 text-xs font-medium text-orange-700 bg-orange-100 rounded">
                                                50% OFF for 6 months
                                            </span>
                                        </div>
                                    </div>

                                    <ul className="mb-6 space-y-2 text-sm">
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">Unlimited drivers</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">Unlimited loads</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">Unlimited AI imports</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">5GB storage</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">Driver mobile app</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">IFTA (coming soon)</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-green-500" />
                                            <span className="ml-2 text-gray-700">Priority support</span>
                                        </li>
                                    </ul>

                                    <Link href="/auth/signup" className="block w-full">
                                        <button className="w-full px-6 py-3 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors">
                                            Start Free
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block">
                            <div className="grid gap-8 md:grid-cols-2">
                                <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm">
                                    <div className="mb-4 text-center">
                                        <h3 className="text-xl font-bold">Basic Plan</h3>
                                        <div className="flex items-center justify-center mt-2">
                                            <span className="text-4xl font-bold">Free</span>
                                        </div>
                                        <p className="text-gray-500 mt-2">Perfect for getting started</p>
                                    </div>

                                    <ul className="mb-8 space-y-3">
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">1 Driver</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">30 loads total</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">10 AI imports/month</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">100MB storage</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">Driver mobile app</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="relative p-8 bg-white border-2 border-orange-500 rounded-xl shadow-md">
                                    <div className="absolute px-4 py-1 text-xs font-bold text-white bg-orange-500 rounded-full -top-3 right-8">
                                        MOST POPULAR
                                    </div>
                                    <div className="mb-4 text-center">
                                        <h3 className="text-xl font-bold">Pro Plan</h3>
                                        <div className="flex flex-col items-center mt-2">
                                            <span className="text-sm text-gray-400 line-through">
                                                $19/month per driver
                                            </span>
                                            <div className="flex items-center">
                                                <span className="text-4xl font-bold text-orange-600">$9.50</span>
                                                <span className="ml-2 text-gray-500">/month per driver</span>
                                            </div>
                                            <span className="px-3 py-1 mt-2 text-sm font-medium text-orange-700 bg-orange-100 rounded">
                                                50% OFF for 6 months
                                            </span>
                                        </div>
                                    </div>

                                    <ul className="mb-8 space-y-3">
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">Unlimited drivers</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">Unlimited loads</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">Unlimited AI imports</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">5GB storage</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">Driver mobile app</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">IFTA (coming soon)</span>
                                        </li>
                                        <li className="flex items-start">
                                            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-500" />
                                            <span className="ml-3 text-gray-700">Priority support</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 mt-6 text-center bg-gray-50 rounded-lg md:p-12 md:mt-24">
                        <p className="md:text-4xl font-extrabold text-gray-500 w-1/2 mx-auto ">
                            Elevate your trucking business with CarrierNest. AI enabled TMS with simple and powerful
                            features.
                        </p>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-16 text-white bg-gradient-to-r from-orange-600 to-orange-500 md:py-24">
                <div className="container px-4 mx-auto">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="mb-3 text-2xl font-bold sm:text-3xl md:text-4xl md:mb-4">
                            Ready to simplify your trucking operation?
                        </h2>
                        <p className="mb-8 text-xl">Setup takes less than 30 seconds. No credit card required.</p>
                        <Link href="/auth/signup">
                            <button className="px-6 py-3 text-base font-medium text-orange-600 bg-white rounded-lg hover:bg-gray-100 transition-colors flex items-center mx-auto">
                                Try CarrierNest Free
                                <ArrowRightIcon className="w-5 h-5 ml-2" />
                            </button>
                        </Link>
                        <p className="mt-6 text-sm text-orange-100">
                            Join other smart trucking companies who&#8217;ve simplified their operations with
                            CarrierNest.
                        </p>
                    </div>
                </div>
            </section>

            {/* Floating CTA for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 md:hidden">
                <Link href="/auth/signup" className="block w-full">
                    <button className="w-full px-6 py-3 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center">
                        Import load under 30 sec. - Try Free
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </button>
                </Link>
            </div>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-20 right-4 z-40 p-2 bg-gray-800 text-white rounded-full shadow-lg md:bottom-6"
                    aria-label="Scroll to top"
                >
                    <ChevronUpIcon className="w-5 h-5" />
                </button>
            )}

            {/* Footer - Improved for Mobile */}
            <footer className="py-12 bg-gray-900 text-gray-400 pb-24 md:pb-12">
                <div className="container px-4 mx-auto">
                    {/* Logo and Description */}
                    <div className="grid gap-8 mb-8 md:grid-cols-2 lg:grid-cols-4">
                        <div className="col-span-1 md:col-span-2 lg:col-span-1">
                            <div className="flex items-end gap-2 mb-4">
                                <div className="p-1 pr-0">
                                    <div className="flex items-center justify-center">
                                        <Image src="/logo_truck.svg" alt="CarrierNest Logo" width={40} height={40} />
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-white">CarrierNest</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                The transportation management system that actually works for small fleets and solo
                                operators.
                            </p>
                            <div className="flex items-center gap-4">
                                <a
                                    href="https://www.facebook.com/carriernest"
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            fillRule="evenodd"
                                            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </a>
                                <a href="#" className="text-gray-400 hover:text-white">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.instagram.com/carriernestapp/"
                                    className="text-gray-400 hover:text-white"
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
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                                Quick Links
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <button onClick={scrollToFeatures} className="text-gray-400 hover:text-white">
                                        Features
                                    </button>
                                </li>
                                <li>
                                    <button onClick={scrollToPricing} className="text-gray-400 hover:text-white">
                                        Pricing
                                    </button>
                                </li>
                                <li>
                                    <Link href="/auth/signup" className="text-gray-400 hover:text-white">
                                        Sign Up
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/auth/signin" className="text-gray-400 hover:text-white">
                                        Sign In
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
                            <ul className="space-y-3">
                                <li>
                                    <Link href="/terms" className="text-gray-400 hover:text-white">
                                        Terms of Service
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/privacy-policy" className="text-gray-400 hover:text-white">
                                        Privacy Policy
                                    </Link>
                                </li>
                                {/* <li>
                                    <Link href="#" className="text-gray-400 hover:text-white">
                                        Cookie Policy
                                    </Link>
                                </li> */}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center">
                                    <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" />
                                    <a href="mailto:support@carriernest.com" className="text-gray-400 hover:text-white">
                                        support@carriernest.com
                                    </a>
                                </li>
                                <li>
                                    <Link href="#" className="text-gray-400 hover:text-white flex items-center">
                                        <svg
                                            className="w-4 h-4 mr-2"
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
                                        (206) 565-4638
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="pt-8 mt-8 border-t border-gray-800 md:flex md:items-center md:justify-between">
                        <p className="text-sm text-gray-400">
                            &#169; {new Date().getFullYear()} CarrierNest. All rights reserved.
                        </p>
                        <div className="mt-4 md:mt-0">
                            <p className="text-xs text-gray-500">
                                Designed for trucking companies that want to simplify their operations.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Mark special offer page as a public page that doesn't require authentication
Home.authenticationEnabled = false;

export default Home;

'use client';

import type React from 'react';

import { useState } from 'react';
import { BellIcon, CheckIcon, DocumentArrowDownIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Fragment } from 'react';
import { PageWithAuth } from 'interfaces/auth';
import Layout from 'components/layout/Layout';

const IFTAPage: PageWithAuth = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would send this to your backend
        console.log('Notification email:', email);
        setIsSubmitted(true);
        setEmail('');
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">All Loads</h1>

                    <div className="flex gap-2">IFTA</div>
                </div>
            }
        >
            <main className="min-h-screen bg-gray-50 relative">
                {/* Background content with reduced blur */}
                <div className="blur-[2px] filter">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                        <div className="mb-10">
                            <h1 className="text-3xl font-semibold text-gray-900">IFTA Reporting Dashboard</h1>
                            <p className="mt-2 text-gray-600">
                                Generate, track, and download your quarterly IFTA reports
                            </p>
                        </div>
                        <ReportGenerator />
                    </div>
                </div>

                {/* Coming Soon Overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <div className="max-w-2xl w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-blue-600 px-6 py-6 sm:px-8 sm:py-8 text-center">
                            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                Enhanced IFTA Reporting
                            </h2>
                            <p className="mt-2 text-lg text-blue-100">Coming Soon</p>
                        </div>

                        <div className="px-6 py-6 sm:px-8 sm:py-8">
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    We're building something better
                                </h3>
                                <p className="text-gray-600 max-w-lg mx-auto">
                                    Our enhanced IFTA reporting system with per-truck and per-driver reporting
                                    capabilities is currently under development. This powerful new feature will be
                                    available soon.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-blue-100 text-blue-600">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-5 h-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <h4 className="text-base font-medium text-gray-900">Per-Truck Reporting</h4>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Generate detailed IFTA reports for individual trucks or groups of trucks in
                                            your fleet.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-blue-100 text-blue-600">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-5 h-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <h4 className="text-base font-medium text-gray-900">Per-Driver Reporting</h4>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Track and report on IFTA data for specific drivers to better manage your
                                            operations.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-blue-100 text-blue-600">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-5 h-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <h4 className="text-base font-medium text-gray-900">Advanced Analytics</h4>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Gain insights with detailed analytics on fuel efficiency, mileage, and tax
                                            liability.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h4 className="text-center text-base font-medium text-gray-900 mb-3">
                                    Get notified when this feature launches
                                </h4>

                                {!isSubmitted ? (
                                    <form onSubmit={handleSubmit} className="sm:flex sm:max-w-md mx-auto">
                                        <label htmlFor="email-address" className="sr-only">
                                            Email address
                                        </label>
                                        <input
                                            type="email"
                                            name="email-address"
                                            id="email-address"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full min-w-0 appearance-none rounded-md border border-gray-300 bg-white py-2 px-4 text-base text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Enter your email"
                                        />
                                        <div className="mt-3 rounded-md sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                                            <button
                                                type="submit"
                                                className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                <BellIcon className="h-5 w-5 mr-2" />
                                                Notify me
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex items-center justify-center text-green-600 bg-green-50 rounded-md py-3 px-4">
                                        <CheckIcon className="h-5 w-5 mr-2" />
                                        <span>Thank you! We'll notify you when the feature is available.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </Layout>
    );
};

IFTAPage.authenticationEnabled = true;
export default IFTAPage;

// Types
type Quarter = {
    id: number;
    name: string;
    period: string;
};

type Driver = {
    id: string;
    name: string;
    licenseNumber: string;
    hireDate: Date;
};

type Truck = {
    id: string;
    unitNumber: string;
    make: string;
    model: string;
    year: number;
    vin: string;
    fuelType: 'diesel' | 'gasoline' | 'lpg' | 'cng';
};

type Fleet = {
    id: string;
    name: string;
    description: string;
};

type ReportScope = 'company' | 'fleet' | 'truck' | 'driver';

type Report = {
    id: string;
    quarter: Quarter;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    requestedAt: Date;
    completedAt?: Date;
    downloadUrl?: string;
    scope: ReportScope;
    fleetId?: string;
    truckIds?: string[];
    driverIds?: string[];
};

// Sample data
const quarters: Quarter[] = [
    { id: 1, name: 'Q1 2025', period: 'January 1 - March 31, 2025' },
    { id: 2, name: 'Q4 2024', period: 'October 1 - December 31, 2024' },
    { id: 3, name: 'Q3 2024', period: 'July 1 - September 30, 2024' },
    { id: 4, name: 'Q2 2024', period: 'April 1 - June 30, 2024' },
    { id: 5, name: 'Q1 2024', period: 'January 1 - March 31, 2024' },
];

const trucks: Truck[] = [
    {
        id: 'truck-001',
        unitNumber: 'T-101',
        make: 'Freightliner',
        model: 'Cascadia',
        year: 2022,
        vin: '1FUJA6CV12LH98765',
        fuelType: 'diesel',
    },
    {
        id: 'truck-002',
        unitNumber: 'T-102',
        make: 'Peterbilt',
        model: '579',
        year: 2021,
        vin: '2NKHHM6X15M12345',
        fuelType: 'diesel',
    },
    {
        id: 'truck-003',
        unitNumber: 'T-103',
        make: 'Kenworth',
        model: 'T680',
        year: 2023,
        vin: '3WKDD40X8NF67890',
        fuelType: 'diesel',
    },
    {
        id: 'truck-004',
        unitNumber: 'T-104',
        make: 'Volvo',
        model: 'VNL',
        year: 2022,
        vin: '4V4NC9EH5NN54321',
        fuelType: 'diesel',
    },
    {
        id: 'truck-005',
        unitNumber: 'T-105',
        make: 'Mack',
        model: 'Anthem',
        year: 2021,
        vin: '1M1AN07Y5MM09876',
        fuelType: 'diesel',
    },
];

const drivers: Driver[] = [
    { id: 'driver-001', name: 'John Smith', licenseNumber: 'DL12345678', hireDate: new Date('2020-03-15') },
    { id: 'driver-002', name: 'Maria Garcia', licenseNumber: 'DL87654321', hireDate: new Date('2019-07-22') },
    { id: 'driver-003', name: 'Robert Johnson', licenseNumber: 'DL23456789', hireDate: new Date('2021-01-10') },
    { id: 'driver-004', name: 'Sarah Williams', licenseNumber: 'DL98765432', hireDate: new Date('2022-05-03') },
    { id: 'driver-005', name: 'David Brown', licenseNumber: 'DL34567890', hireDate: new Date('2018-11-28') },
];

const fleets: Fleet[] = [
    { id: 'fleet-001', name: 'Northeast Fleet', description: 'Trucks operating in the northeastern region' },
    { id: 'fleet-002', name: 'Southeast Fleet', description: 'Trucks operating in the southeastern region' },
    { id: 'fleet-003', name: 'Midwest Fleet', description: 'Trucks operating in the midwestern region' },
];

const sampleReports: Report[] = [
    {
        id: 'rep-001',
        quarter: quarters[2],
        status: 'completed',
        requestedAt: new Date('2024-10-05'),
        completedAt: new Date('2024-10-05'),
        downloadUrl: '#',
        scope: 'company',
    },
    {
        id: 'rep-002',
        quarter: quarters[3],
        status: 'completed',
        requestedAt: new Date('2024-07-03'),
        completedAt: new Date('2024-07-03'),
        downloadUrl: '#',
        scope: 'fleet',
        fleetId: 'fleet-001',
    },
    {
        id: 'rep-003',
        quarter: quarters[3],
        status: 'completed',
        requestedAt: new Date('2024-07-05'),
        completedAt: new Date('2024-07-05'),
        downloadUrl: '#',
        scope: 'truck',
        truckIds: ['truck-001', 'truck-003'],
    },
    {
        id: 'rep-004',
        quarter: quarters[4],
        status: 'completed',
        requestedAt: new Date('2024-04-10'),
        completedAt: new Date('2024-04-10'),
        downloadUrl: '#',
        scope: 'driver',
        driverIds: ['driver-002'],
    },
];

function ReportGenerator() {
    const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(quarters[0]);
    const [reports, setReports] = useState<Report[]>(sampleReports);
    const [currentReport, setCurrentReport] = useState<Report | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportScope, setReportScope] = useState<ReportScope>('company');
    const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
    const [selectedTrucks, setSelectedTrucks] = useState<Truck[]>([]);
    const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([]);

    const handleGenerateReport = () => {
        setIsGenerating(true);

        // Create a new report with pending status
        const newReport: Report = {
            id: `rep-${Math.random().toString(36).substr(2, 9)}`,
            quarter: selectedQuarter,
            status: 'pending',
            requestedAt: new Date(),
            scope: reportScope,
            fleetId: reportScope === 'fleet' ? selectedFleet?.id : undefined,
            truckIds: reportScope === 'truck' ? selectedTrucks.map((t) => t.id) : undefined,
            driverIds: reportScope === 'driver' ? selectedDrivers.map((d) => d.id) : undefined,
        };

        setCurrentReport(newReport);

        // Simulate report generation process
        setTimeout(() => {
            const updatedReport: Report = { ...newReport, status: 'processing' as 'processing' };
            setCurrentReport(updatedReport);

            // Simulate completion after some time
            setTimeout(() => {
                const completedReport: Report = {
                    ...updatedReport,
                    status: 'completed' as 'completed',
                    completedAt: new Date(),
                    downloadUrl: '#',
                };
                setCurrentReport(completedReport);
                setReports([completedReport, ...reports]);
                setIsGenerating(false);
            }, 5000);
        }, 2000);
    };

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                    <h2 className="text-xl font-medium text-gray-900">Generate New IFTA Report</h2>
                </div>

                <div className="px-6 py-5">
                    <div className="max-w-3xl">
                        <div className="space-y-6">
                            {/* Quarter Selection */}
                            <div>
                                <label htmlFor="quarter" className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Quarter
                                </label>
                                <Listbox value={selectedQuarter} onChange={setSelectedQuarter}>
                                    {({ open }) => (
                                        <div className="relative mt-1">
                                            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-3 pl-4 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300 sm:text-sm">
                                                <span className="block truncate font-medium">
                                                    {selectedQuarter.name}
                                                </span>
                                                <span className="block truncate text-gray-500 text-xs mt-0.5">
                                                    {selectedQuarter.period}
                                                </span>
                                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                    <ChevronUpDownIcon
                                                        className="h-5 w-5 text-gray-400"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            </Listbox.Button>
                                            <Transition
                                                show={open}
                                                as={Fragment}
                                                leave="transition ease-in duration-100"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                            >
                                                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                                                    {quarters.map((quarter) => (
                                                        <Listbox.Option
                                                            key={quarter.id}
                                                            className={({ active }) =>
                                                                `relative cursor-default select-none py-2 pl-4 pr-4 ${
                                                                    active
                                                                        ? 'bg-blue-50 text-blue-900'
                                                                        : 'text-gray-900'
                                                                }`
                                                            }
                                                            value={quarter}
                                                        >
                                                            {({ selected }) => (
                                                                <>
                                                                    <div>
                                                                        <span
                                                                            className={`block truncate ${
                                                                                selected ? 'font-medium' : 'font-normal'
                                                                            }`}
                                                                        >
                                                                            {quarter.name}
                                                                        </span>
                                                                        <span className="block truncate text-gray-500 text-xs mt-0.5">
                                                                            {quarter.period}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Transition>
                                        </div>
                                    )}
                                </Listbox>
                            </div>

                            {/* Report Scope Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Report Scope</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReportScope('company')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            reportScope === 'company'
                                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        Entire Company
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReportScope('fleet')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            reportScope === 'fleet'
                                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        By Fleet
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReportScope('truck')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            reportScope === 'truck'
                                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        By Truck(s)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReportScope('driver')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            reportScope === 'driver'
                                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        By Driver(s)
                                    </button>
                                </div>
                            </div>

                            {/* Fleet Selection (when fleet scope is selected) */}
                            {reportScope === 'fleet' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Fleet</label>
                                    <Listbox value={selectedFleet} onChange={setSelectedFleet}>
                                        {({ open }) => (
                                            <div className="relative mt-1">
                                                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-3 pl-4 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300 sm:text-sm">
                                                    {selectedFleet ? (
                                                        <>
                                                            <span className="block truncate font-medium">
                                                                {selectedFleet.name}
                                                            </span>
                                                            <span className="block truncate text-gray-500 text-xs mt-0.5">
                                                                {selectedFleet.description}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="block truncate text-gray-500">
                                                            Select a fleet
                                                        </span>
                                                    )}
                                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronUpDownIcon
                                                            className="h-5 w-5 text-gray-400"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                </Listbox.Button>
                                                <Transition
                                                    show={open}
                                                    as={Fragment}
                                                    leave="transition ease-in duration-100"
                                                    leaveFrom="opacity-100"
                                                    leaveTo="opacity-0"
                                                >
                                                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                                                        {fleets.map((fleet) => (
                                                            <Listbox.Option
                                                                key={fleet.id}
                                                                className={({ active }) =>
                                                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${
                                                                        active
                                                                            ? 'bg-blue-50 text-blue-900'
                                                                            : 'text-gray-900'
                                                                    }`
                                                                }
                                                                value={fleet}
                                                            >
                                                                {({ selected }) => (
                                                                    <>
                                                                        <div>
                                                                            <span
                                                                                className={`block truncate ${
                                                                                    selected
                                                                                        ? 'font-medium'
                                                                                        : 'font-normal'
                                                                                }`}
                                                                            >
                                                                                {fleet.name}
                                                                            </span>
                                                                            <span className="block truncate text-gray-500 text-xs mt-0.5">
                                                                                {fleet.description}
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </Transition>
                                            </div>
                                        )}
                                    </Listbox>
                                </div>
                            )}

                            {/* Truck Selection (when truck scope is selected) */}
                            {reportScope === 'truck' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Truck(s)
                                    </label>
                                    <div className="mt-1 border border-gray-300 rounded-lg divide-y divide-gray-200 max-h-60 overflow-y-auto">
                                        {trucks.map((truck) => (
                                            <div key={truck.id} className="flex items-center px-4 py-3">
                                                <input
                                                    id={`truck-${truck.id}`}
                                                    name={`truck-${truck.id}`}
                                                    type="checkbox"
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    checked={selectedTrucks.some((t) => t.id === truck.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedTrucks([...selectedTrucks, truck]);
                                                        } else {
                                                            setSelectedTrucks(
                                                                selectedTrucks.filter((t) => t.id !== truck.id),
                                                            );
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={`truck-${truck.id}`} className="ml-3 flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {truck.unitNumber} - {truck.make} {truck.model}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {truck.year} | VIN: {truck.vin} | Fuel: {truck.fuelType}
                                                    </div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-500">
                                        {selectedTrucks.length} truck(s) selected
                                    </div>
                                </div>
                            )}

                            {/* Driver Selection (when driver scope is selected) */}
                            {reportScope === 'driver' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Driver(s)
                                    </label>
                                    <div className="mt-1 border border-gray-300 rounded-lg divide-y divide-gray-200 max-h-60 overflow-y-auto">
                                        {drivers.map((driver) => (
                                            <div key={driver.id} className="flex items-center px-4 py-3">
                                                <input
                                                    id={`driver-${driver.id}`}
                                                    name={`driver-${driver.id}`}
                                                    type="checkbox"
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    checked={selectedDrivers.some((d) => d.id === driver.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDrivers([...selectedDrivers, driver]);
                                                        } else {
                                                            setSelectedDrivers(
                                                                selectedDrivers.filter((d) => d.id !== driver.id),
                                                            );
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={`driver-${driver.id}`} className="ml-3 flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {driver.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        License: {driver.licenseNumber} | Hired:{' '}
                                                        {driver.hireDate.toLocaleDateString()}
                                                    </div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-500">
                                        {selectedDrivers.length} driver(s) selected
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleGenerateReport}
                                    disabled={
                                        isGenerating ||
                                        (reportScope === 'fleet' && !selectedFleet) ||
                                        (reportScope === 'truck' && selectedTrucks.length === 0) ||
                                        (reportScope === 'driver' && selectedDrivers.length === 0)
                                    }
                                    className={`inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                        isGenerating ||
                                        (reportScope === 'fleet' && !selectedFleet) ||
                                        (reportScope === 'truck' && selectedTrucks.length === 0) ||
                                        (reportScope === 'driver' && selectedDrivers.length === 0)
                                            ? 'opacity-70 cursor-not-allowed'
                                            : ''
                                    }`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                            Generating Report...
                                        </>
                                    ) : (
                                        'Generate IFTA Report'
                                    )}
                                </button>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-blue-800">Important Information</h3>
                                        <div className="mt-2 text-sm text-blue-700">
                                            <p>
                                                IFTA reports include fuel purchases and mileage data across all
                                                jurisdictions. Please ensure all trip data and fuel receipts have been
                                                entered into the system before generating your report.
                                            </p>
                                            {(reportScope === 'truck' || reportScope === 'driver') && (
                                                <p className="mt-2">
                                                    Individual {reportScope === 'truck' ? 'truck' : 'driver'} reports
                                                    will only include data for the selected{' '}
                                                    {reportScope === 'truck' ? 'trucks' : 'drivers'} during the
                                                    specified quarter.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {currentReport && <ReportStatus report={currentReport} />}

            <ReportHistory reports={reports} />
        </div>
    );
}

function ReportHistory({ reports }: { reports: Report[] }) {
    if (reports.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-medium text-gray-900">Report History</h2>
            </div>

            <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Quarter
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Scope
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Status
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Requested
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Completed
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reports.map((report) => (
                            <tr key={report.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{report.quarter.name}</div>
                                    <div className="text-sm text-gray-500">{report.quarter.period}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                        {report.scope}
                                    </span>
                                    {report.scope === 'fleet' && (
                                        <span className="text-xs text-gray-500 ml-2">Fleet</span>
                                    )}
                                    {report.scope === 'truck' && report.truckIds && (
                                        <span className="text-xs text-gray-500 ml-2">
                                            {report.truckIds.length} truck(s)
                                        </span>
                                    )}
                                    {report.scope === 'driver' && report.driverIds && (
                                        <span className="text-xs text-gray-500 ml-2">
                                            {report.driverIds.length} driver(s)
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            report.status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : report.status === 'processing'
                                                ? 'bg-blue-100 text-blue-800'
                                                : report.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {report.requestedAt.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {report.completedAt
                                        ? report.completedAt.toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                          })
                                        : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {report.status === 'completed' && report.downloadUrl ? (
                                        <a
                                            href={report.downloadUrl}
                                            className="inline-flex items-center text-blue-600 hover:text-blue-900"
                                        >
                                            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                            Download
                                        </a>
                                    ) : (
                                        <span className="text-gray-400">Not available</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ReportStatus({ report }: { report: Report }) {
    const getStatusColor = () => {
        switch (report.status) {
            case 'pending':
                return 'bg-yellow-50 border-yellow-200';
            case 'processing':
                return 'bg-blue-50 border-blue-200';
            case 'completed':
                return 'bg-green-50 border-green-200';
            case 'failed':
                return 'bg-red-50 border-red-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = () => {
        switch (report.status) {
            case 'pending':
                return <ArrowPathIcon className="h-8 w-8 text-yellow-400" />;
            case 'processing':
                return <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />;
            case 'completed':
                return <CheckIcon className="h-8 w-8 text-green-500" />;
            case 'failed':
                return <ExclamationCircleIcon className="h-8 w-8 text-red-500" />;
            default:
                return null;
        }
    };

    const getStatusText = () => {
        switch (report.status) {
            case 'pending':
                return 'Preparing to generate report';
            case 'processing':
                return 'Processing your IFTA report';
            case 'completed':
                return 'Your IFTA report is ready';
            case 'failed':
                return 'Report generation failed';
            default:
                return '';
        }
    };

    const getStatusDescription = () => {
        switch (report.status) {
            case 'pending':
                return 'We are preparing to generate your report. This should begin shortly.';
            case 'processing':
                return 'We are collecting and processing your mileage and fuel data across all jurisdictions.';
            case 'completed':
                return 'Your report has been successfully generated and is ready to download.';
            case 'failed':
                return 'There was an error generating your report. Please try again or contact support.';
            default:
                return '';
        }
    };

    return (
        <div className={`rounded-xl shadow-sm border overflow-hidden ${getStatusColor()}`}>
            <div className="px-6 py-5 border-b border-opacity-50" style={{ borderColor: 'currentColor' }}>
                <h2 className="text-xl font-medium text-gray-900">Current Report Status</h2>
            </div>

            <div className="px-6 py-5">
                <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">{getStatusIcon()}</div>
                    <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{getStatusText()}</h3>
                        <p className="mt-1 text-sm text-gray-600">{getStatusDescription()}</p>

                        <div className="mt-4">
                            <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-500">Quarter:</p>
                                <p className="ml-2 text-sm text-gray-900">
                                    {report.quarter.name} ({report.quarter.period})
                                </p>
                            </div>

                            <div className="flex items-center mt-1">
                                <p className="text-sm font-medium text-gray-500">Requested:</p>
                                <p className="ml-2 text-sm text-gray-900">
                                    {report.requestedAt.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            {report.completedAt && (
                                <div className="flex items-center mt-1">
                                    <p className="text-sm font-medium text-gray-500">Completed:</p>
                                    <p className="ml-2 text-sm text-gray-900">
                                        {report.completedAt.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {report.scope !== 'company' && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-500">Report Scope:</p>
                                <p className="text-sm text-gray-900 capitalize">
                                    {report.scope === 'fleet'
                                        ? 'Fleet'
                                        : report.scope === 'truck'
                                        ? 'Truck(s)'
                                        : 'Driver(s)'}
                                </p>

                                {report.scope === 'fleet' && report.fleetId && (
                                    <p className="text-sm text-gray-600 mt-1">Fleet ID: {report.fleetId}</p>
                                )}

                                {report.scope === 'truck' && report.truckIds && (
                                    <div className="mt-1">
                                        <p className="text-sm text-gray-600">
                                            {report.truckIds.length} truck(s) included
                                        </p>
                                    </div>
                                )}

                                {report.scope === 'driver' && report.driverIds && (
                                    <div className="mt-1">
                                        <p className="text-sm text-gray-600">
                                            {report.driverIds.length} driver(s) included
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {report.status === 'completed' && report.downloadUrl && (
                            <div className="mt-5">
                                <a
                                    href={report.downloadUrl}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                    Download IFTA Report
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';

const EquipmentsPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const invoices = [
        { id: '0012', date: '12 Apr' },
        { id: '0011', date: '12 Mar' },
        { id: '0010', date: '12 Feb' },
        { id: '0009', date: '12 Jan' },
        { id: '0008', date: '12 Dec' },
    ];
    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Plans & Billing</h1>
                </div>
            }
        >
            <>
                <div className="py-2 mx-auto max-w-7xl">
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">Plans & Billing</h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Manage your plans and billing history here.</p>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        <div className="max-w-3xl pb-6">
                            {/* Pricing Plans */}
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="p-6 border border-gray-200 rounded-lg">
                                    <div className="space-y-4">
                                        <div>
                                            <h2 className="text-xl font-semibold">Basic Plan</h2>
                                            <p className="text-gray-600">Up to 1 driver</p>
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-3xl font-bold">$0</span>
                                            <span className="ml-1 text-gray-600">per month</span>
                                        </div>
                                        <button className="w-full px-4 py-2 text-center bg-gray-100 rounded-lg">
                                            Current plan
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 border border-gray-200 rounded-lg">
                                    <div className="space-y-4">
                                        <div>
                                            <h2 className="text-xl font-semibold">Pro Plan</h2>
                                            <p className="text-gray-600">Up to 10 drivers</p>
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-3xl font-bold">$20</span>
                                            <span className="ml-1 text-gray-600">per month</span>
                                        </div>
                                        <button className="w-full px-4 py-2 text-center text-white bg-black rounded-lg">
                                            Upgrade plan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Billing History */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Billing history</h2>
                            <div className="space-y-2">
                                {[
                                    { id: '0012', date: '12 Apr' },
                                    { id: '0011', date: '12 Mar' },
                                    { id: '0010', date: '12 Feb' },
                                    { id: '0009', date: '12 Jan' },
                                    { id: '0008', date: '12 Dec' },
                                ].map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 text-xs text-white bg-orange-500 rounded">PDF</div>
                                            <span className="text-gray-900">Invoice {invoice.id}</span>
                                        </div>
                                        <span className="text-gray-600">{invoice.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        </Layout>
    );
};

EquipmentsPage.authenticationEnabled = true;

export default EquipmentsPage;

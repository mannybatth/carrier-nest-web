import React from 'react';
import Layout from '../../components/layout/Layout';
import { PageWithAuth } from '../../interfaces/auth';

const AccountingPage: PageWithAuth = () => {
    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Accounting</h1>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Accounting</h1>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="border-4 border-gray-200 border-dashed rounded-lg"></div>
                </div>
            </div>
        </Layout>
    );
};

AccountingPage.authenticationEnabled = true;

export default AccountingPage;

import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import Layout from '../../components/layout/Layout';
import { PageWithAuth } from '../../interfaces/auth';
import { withServerAuth } from '../../lib/auth/server-auth';

export async function getServerSideProps(context: NextPageContext) {
    return withServerAuth(context, async (context) => {
        return {
            props: {},
        };
    });
}

type Props = {};

const IFTAPage: PageWithAuth<Props> = ({}: Props) => {
    const router = useRouter();

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">IFTA Reporting</h1>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">IFTA Reporting</h1>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8"></div>
            </div>
        </Layout>
    );
};

IFTAPage.authenticationEnabled = true;

export default IFTAPage;

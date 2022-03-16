import { NextPageContext } from 'next';
import React from 'react';
import Layout from '../../../components/layout/Layout';
import { ComponentWithAuth } from '../../../interfaces/auth';
import { ExpandedLoad } from '../../../interfaces/models';
import { getLoadById } from '../../../lib/rest/load';

export async function getServerSideProps(context: NextPageContext) {
    const load = await getLoadById(Number(context.query.id));

    if (!load) {
        return {
            redirect: {
                permanent: false,
                destination: '/accounting',
            },
        };
    }

    return {
        props: {
            load,
        },
    };
}

type Props = {
    load: ExpandedLoad;
};

const CreateInvoice: ComponentWithAuth = ({ load }: Props) => {
    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Create Invoice</h1>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Create Invoice</h1>
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

CreateInvoice.authenticationEnabled = true;

export default CreateInvoice;

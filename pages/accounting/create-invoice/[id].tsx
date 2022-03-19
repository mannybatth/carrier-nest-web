import { TruckIcon } from '@heroicons/react/outline';
import { Prisma } from '@prisma/client';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import InvoiceForm from '../../../components/forms/invoice/InvoiceForm';
import Layout from '../../../components/layout/Layout';
import { PageWithAuth } from '../../../interfaces/auth';
import { ExpandedInvoice, ExpandedLoad } from '../../../interfaces/models';
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

    if (load.invoice) {
        return {
            redirect: {
                permanent: false,
                destination: `/accounting/invoice/${load.invoice.id}`,
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

const CreateInvoice: PageWithAuth = ({ load }: Props) => {
    const formHook = useForm<ExpandedInvoice>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);

    const watchFields = useWatch({ control: formHook.control, name: 'extraItems' });

    useEffect(() => {
        const data = formHook.getValues() as ExpandedInvoice;
        const extraItems = data.extraItems;
        const totalExtraItems =
            extraItems?.reduce((acc, item) => acc + new Prisma.Decimal(item.amount).toNumber(), 0) || 0;

        const total = totalExtraItems + new Prisma.Decimal(load.rate).toNumber();
        setTotal(total);
    }, [watchFields]);

    const submit = async (data: ExpandedInvoice) => {
        console.log('submit', data);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Create Invoice</h1>
                </div>
            }
        >
            <div className="max-w-4xl py-2 mx-auto">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Create Invoice</h1>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 space-y-6 sm:px-6 md:px-8">
                    <LoadCard load={load} />

                    <form id="invoice-form" onSubmit={formHook.handleSubmit(submit)}>
                        <InvoiceForm formHook={formHook}></InvoiceForm>

                        <div className="w-full mt-5 ml-auto sm:w-1/2 lg:w-1/3">
                            <div className="flex justify-between mb-4">
                                <div className="font-medium">TOTAL</div>
                                <div>${total}</div>
                            </div>
                        </div>

                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Create Invoice
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

CreateInvoice.authenticationEnabled = true;

type LoadCardProps = {
    load: ExpandedLoad;
};

const LoadCard: React.FC<Props> = ({ load }: LoadCardProps) => {
    return (
        <div className="overflow-hidden rounded-lg outline-none bg-gray-50 ring-2 ring-offset-2 ring-gray-200">
            <div className="px-5 py-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0 hidden md:block">
                        <TruckIcon className="text-gray-400 w-7 h-7" aria-hidden="true" />
                    </div>
                    <div className="flex-1 w-0 ml-0 md:ml-5">
                        <dl className="space-y-1">
                            <dt className="flex">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-500 truncate">
                                        Load Ref: # {load.refNum}
                                    </div>
                                    <div>
                                        <div className="text-lg font-medium text-gray-900">{load.customer.name}</div>
                                    </div>
                                </div>
                                <div className="text-lg font-medium">${load.rate}</div>
                            </dt>
                            <dd>
                                <div className="flow-root">
                                    <ul role="list" className="-mb-8">
                                        <li>
                                            <div className="relative pb-3">
                                                <span
                                                    className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-gray-500"
                                                    aria-hidden="true"
                                                />
                                                <div className="relative flex items-start space-x-1">
                                                    <>
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-gray-500">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    }).format(new Date(load.shipper.date))}
                                                                </span>
                                                                <div className="block md:hidden">
                                                                    {load.shipper.city}, {load.shipper.state}
                                                                </div>
                                                                <div className="hidden md:block">
                                                                    {load.shipper.name} {load.shipper.street}{' '}
                                                                    {load.shipper.city}, {load.shipper.state}{' '}
                                                                    {load.shipper.zip}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                </div>
                                            </div>
                                        </li>
                                        {load.stops && load.stops.length > 0 && (
                                            <li className="hidden md:block">
                                                <div className="relative pb-3">
                                                    <span
                                                        className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-gray-500"
                                                        aria-hidden="true"
                                                    />
                                                    <div className="relative flex items-center space-x-1">
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-[1px] border-gray-300 bg-gray-50 text-gray-800">
                                                                {load.stops.length} Stop{load.stops.length > 1 && 's'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        )}
                                        <li>
                                            <div className="relative pb-8">
                                                <div className="relative flex items-start space-x-1">
                                                    <>
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-gray-500">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    }).format(new Date(load.receiver.date))}
                                                                </span>
                                                                <div className="block md:hidden">
                                                                    {load.receiver.city}, {load.receiver.state}
                                                                </div>
                                                                <div className="hidden md:block">
                                                                    {load.receiver.name} {load.receiver.street}{' '}
                                                                    {load.receiver.city}, {load.receiver.state}{' '}
                                                                    {load.receiver.zip}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateInvoice;

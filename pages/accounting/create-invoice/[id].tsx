import { InvoiceItem, Prisma } from '@prisma/client';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import safeJsonStringify from 'safe-json-stringify';
import InvoiceForm from '../../../components/forms/invoice/InvoiceForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { LoadCard } from '../../../components/loads/LoadCard';
import { notify } from '../../../components/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import { ExpandedInvoice, ExpandedLoad } from '../../../interfaces/models';
import { createInvoice } from '../../../lib/rest/invoice';
import { useLocalStorage } from '../../../lib/useLocalStorage';
import { getLoad } from '../../api/loads/[id]';
import { getSession } from 'next-auth/react';
import { getNextInvoiceNum } from '../../api/invoices/next-invoice-num';

export async function getServerSideProps(context: NextPageContext) {
    const session = await getSession(context);
    const promise = Promise.all([
        getLoad({
            session,
            query: {
                id: context.query.id,
                expand: 'customer,shipper,receiver,stops,invoice,driver,documents',
            },
        }),
        getNextInvoiceNum(session.user.defaultCarrierId),
    ]);
    const [{ data }, nextInvoiceNum] = await promise;

    if (!data?.load) {
        return {
            redirect: {
                permanent: false,
                destination: '/accounting',
            },
        };
    }

    if (data.load.invoice) {
        return {
            redirect: {
                permanent: false,
                destination: `/accounting/invoices/${data.load.invoice.id}`,
            },
        };
    }

    return {
        props: {
            load: JSON.parse(safeJsonStringify(data.load)),
            nextInvoiceNum,
        },
    };
}

type Props = {
    load: ExpandedLoad;
    nextInvoiceNum: number;
};

const CreateInvoice: PageWithAuth = ({ load, nextInvoiceNum }: Props) => {
    const [_, setLastDueNetDays] = useLocalStorage('lastDueNetDays', 30);

    const formHook = useForm<ExpandedInvoice>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);

    const watchFields = useWatch({ control: formHook.control, name: 'extraItems' });

    useEffect(() => {
        formHook.setValue('invoiceNum', nextInvoiceNum);
    }, [nextInvoiceNum]);

    useEffect(() => {
        const data = formHook.getValues() as ExpandedInvoice;
        const extraItems = data.extraItems;

        const totalExtraItems =
            (extraItems?.reduce(
                (acc, item) => acc + (item.amount ? new Prisma.Decimal(item.amount).toNumber() : 0) * 100,
                0,
            ) || 0) / 100;

        const totalRate = new Prisma.Decimal(load.rate).toNumber();

        const total = (totalExtraItems * 100 + totalRate * 100) / 100;
        setTotal(total);
    }, [watchFields]);

    const submit = async (data: ExpandedInvoice) => {
        console.log('submit', data);

        setLoading(true);

        const invoiceData: ExpandedInvoice = {
            invoiceNum: Number(data.invoiceNum),
            invoicedAt: data.invoicedAt,
            totalAmount: new Prisma.Decimal(total),
            remainingAmount: new Prisma.Decimal(total),
            dueNetDays: data.dueNetDays,
            loadId: load.id,
            extraItems: data.extraItems.map((item) => ({
                title: item.title,
                amount: new Prisma.Decimal(item.amount),
            })) as InvoiceItem[],
        };

        try {
            const newInvoice = await createInvoice(invoiceData);
            console.log('new invoice', newInvoice);

            setLoading(false);
            setLastDueNetDays(data.dueNetDays);

            notify({ title: 'New invoice created', message: 'New invoice created successfully' });

            // Redirect to invoice page
            router.push(`/accounting/invoices/${newInvoice.id}`);
        } catch (error) {
            setLoading(false);
            notify({ title: 'Error', message: 'Error creating invoice', type: 'error' });
        }
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
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Accounting',
                            href: '/accounting',
                        },
                        {
                            label: 'Create New Invoice',
                        },
                    ]}
                ></BreadCrumb>
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
                                <div className="font-medium">Total</div>
                                <div>${total}</div>
                            </div>
                        </div>

                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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

export default CreateInvoice;

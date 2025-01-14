import { InvoiceItem, Prisma } from '@prisma/client';
import { LoadProvider, useLoadContext } from 'components/context/LoadContext';
import { LoadingOverlay } from 'components/LoadingOverlay';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import InvoiceForm from '../../../components/forms/invoice/InvoiceForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { LoadCard } from '../../../components/loads/LoadCard';
import { notify } from '../../../components/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import { ExpandedInvoice } from '../../../interfaces/models';
import { createInvoice, getNextInvoiceNum } from '../../../lib/rest/invoice';
import { useLocalStorage } from '../../../lib/useLocalStorage';

type Props = {
    nextInvoiceNum: number;
};

const CreateInvoice: PageWithAuth<Props> = ({ nextInvoiceNum }: Props) => {
    const [load, setLoad] = useLoadContext();
    const [_, setLastDueNetDays] = useLocalStorage('lastDueNetDays', 30);

    const formHook = useForm<ExpandedInvoice>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);

    const watchFields = useWatch({ control: formHook.control, name: 'extraItems' });

    useEffect(() => {
        if (nextInvoiceNum) {
            formHook.setValue('invoiceNum', nextInvoiceNum);
        }
    }, [nextInvoiceNum]);

    useEffect(() => {
        const data = formHook.getValues() as ExpandedInvoice;
        const extraItems = data.extraItems;

        const totalExtraItems =
            (extraItems?.reduce(
                (acc, item) => acc + (item.amount ? new Prisma.Decimal(item.amount).toNumber() : 0) * 100,
                0,
            ) || 0) / 100;

        const totalRate = load ? new Prisma.Decimal(load.rate).toNumber() : 0;

        const total = (totalExtraItems * 100 + totalRate * 100) / 100;
        setTotal(total);
    }, [watchFields, load]);

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

            setLastDueNetDays(data.dueNetDays);

            notify({ title: 'New invoice created', message: 'New invoice created successfully' });

            // Redirect to invoice page
            await router.push(`/invoices/${newInvoice.id}`);
            setLoading(false);
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
                            label: 'Invoices',
                            href: '/invoices',
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
                <div className="relative px-5 sm:px-6 md:px-8">
                    {(loading || !load) && <LoadingOverlay />}

                    <div className="pt-1 space-y-6">
                        {load && <LoadCard load={load} />}

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
            </div>
        </Layout>
    );
};

CreateInvoice.authenticationEnabled = true;

const CreateInvoiceWrapper: PageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const loadId = id as string;
    const [nextInvoiceNum, setNextInvoiceNum] = React.useState<number>(null);

    React.useEffect(() => {
        getNextInvoiceNum().then((num) => {
            setNextInvoiceNum(num);
        });
    });

    return (
        <LoadProvider loadId={loadId}>
            <CreateInvoice nextInvoiceNum={nextInvoiceNum}></CreateInvoice>
        </LoadProvider>
    );
};

CreateInvoiceWrapper.authenticationEnabled = true;

export default CreateInvoiceWrapper;

import { InvoiceItem, Prisma } from '@prisma/client';
import { InvoiceProvider, useInvoiceContext } from 'components/context/InvoiceContext';
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
import { updateInvoice } from '../../../lib/rest/invoice';

const EditInvoicePage: PageWithAuth = () => {
    const [invoice, setInvoice] = useInvoiceContext();

    const formHook = useForm<ExpandedInvoice>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);

    const watchFields = useWatch({ control: formHook.control, name: 'extraItems' });

    useEffect(() => {
        const data = formHook.getValues() as ExpandedInvoice;
        const extraItems = data.extraItems;

        const totalExtraItems =
            (extraItems?.reduce(
                (acc, item) => acc + (item.amount ? new Prisma.Decimal(item.amount).toNumber() : 0) * 100,
                0,
            ) || 0) / 100;

        const totalRate = invoice ? new Prisma.Decimal(invoice.load.rate).toNumber() : 0;

        const total = (totalExtraItems * 100 + totalRate * 100) / 100;
        setTotal(total);
    }, [watchFields, invoice]);

    useEffect(() => {
        if (!invoice) {
            formHook.reset();
            return;
        }

        formHook.setValue('invoiceNum', invoice.invoiceNum);
        formHook.setValue('invoicedAt', new Date(invoice.invoicedAt));
        formHook.setValue('dueNetDays', invoice.dueNetDays);
        formHook.setValue('extraItems', invoice.extraItems);
    }, [invoice]);

    const submit = async (data: ExpandedInvoice) => {
        console.log('data to save', data);

        setLoading(true);

        const invoiceData: ExpandedInvoice = {
            invoiceNum: Number(data.invoiceNum),
            invoicedAt: data.invoicedAt,
            totalAmount: new Prisma.Decimal(total),
            dueNetDays: data.dueNetDays,
            load: invoice.load,
            extraItems: data.extraItems.map((item) => ({
                title: item.title,
                amount: new Prisma.Decimal(item.amount),
            })) as InvoiceItem[],
        };

        const newInvoice = await updateInvoice(invoice.id, invoiceData);
        console.log('updated invoice', newInvoice);

        notify({ title: 'Invoice updated', message: 'Invoice updated successfully' });

        // Redirect to invoice page
        await router.push(`/invoices/${newInvoice.id}`);

        setLoading(false);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Invoice</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Invoices',
                            href: '/invoices',
                        },
                        {
                            label: invoice ? `# ${invoice?.invoiceNum ?? ''}` : '',
                            href: invoice ? `/invoices/${invoice.id}` : '',
                        },
                        {
                            label: 'Edit Invoice',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="flex-1 text-2xl font-semibold text-gray-900">Edit Invoice</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 sm:px-6 md:px-8">
                    {(loading || !invoice) && <LoadingOverlay message="Loading invoice data..." />}

                    <div className="pt-1 space-y-6">
                        {invoice && <LoadCard load={invoice.load} />}

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
                                    Save Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

EditInvoicePage.authenticationEnabled = true;

const EditInvoicePageWrapper: PageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const invoiceId = id as string;

    return (
        <InvoiceProvider invoiceId={invoiceId}>
            <EditInvoicePage></EditInvoicePage>
        </InvoiceProvider>
    );
};

EditInvoicePageWrapper.authenticationEnabled = true;

export default EditInvoicePageWrapper;

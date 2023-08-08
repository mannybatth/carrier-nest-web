import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, DotsVerticalIcon } from '@heroicons/react/outline';
import { Invoice } from '@prisma/client';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect, useState } from 'react';
import { formatValue } from 'react-currency-input-field';
import AddPaymentModal from '../../../components/forms/invoice/AddPaymentModal';
import { downloadInvoice } from '../../../components/invoices/invoicePdf';
import InvoiceStatusBadge from '../../../components/invoices/InvoiceStatusBadge';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { LoadCard } from '../../../components/loads/LoadCard';
import { notify } from '../../../components/Notification';
import InvoiceDetailsSkeleton from '../../../components/skeletons/InvoiceDetailsSkeleton';
import { PageWithAuth } from '../../../interfaces/auth';
import { ExpandedInvoice } from '../../../interfaces/models';
import { withServerAuth } from '../../../lib/auth/server-auth';
import { invoiceTermOptions } from '../../../lib/invoice/invoice-utils';
import { deleteInvoiceById, deleteInvoicePayment, getInvoiceById } from '../../../lib/rest/invoice';

type ActionsDropdownProps = {
    invoice: ExpandedInvoice;
    disabled?: boolean;
    downloadInvoice: () => void;
    deleteInvoice: (id: string) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ invoice, disabled, downloadInvoice, deleteInvoice }) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                    disabled={disabled}
                >
                    Actions
                    <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/accounting/invoices/edit/${invoice.id}`);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Edit
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/loads/${invoice.load.id}`);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    View Load
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadInvoice();
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Download Invoice
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteInvoice(invoice.id);
                                    }}
                                    className={classNames(
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    )}
                                >
                                    Delete
                                </a>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export async function getServerSideProps(context: NextPageContext) {
    return withServerAuth(context, async (context) => {
        const { id } = context.query;
        return {
            props: {
                invoiceId: id,
            },
        };
    });
}

type Props = {
    invoiceId: string;
};

const InvoiceDetailsPage: PageWithAuth<Props> = ({ invoiceId }: Props) => {
    const [invoice, setInvoice] = useState<ExpandedInvoice>();
    const { data: session } = useSession();

    const [openAddPayment, setOpenAddPayment] = useState(false);
    const router = useRouter();

    useEffect(() => {
        reloadInvoice();
    }, [invoiceId]);

    const reloadInvoice = async () => {
        const load = await getInvoiceById(invoiceId);
        setInvoice(load);
    };

    const addPayment = () => {
        setOpenAddPayment(true);
    };

    const onNewPaymentCreate = (invoice: Invoice) => {
        console.log('new payment created', invoice);
        reloadInvoice();
    };

    const deleteInvoice = async (invoiceId: string) => {
        console.log('delete invoice', invoiceId);

        await deleteInvoiceById(invoiceId);

        notify({ title: 'Invoice deleted', message: 'Invoice deleted successfully' });

        router.push('/accounting');
    };

    const deletePayment = async (paymentId: string) => {
        console.log('delete payment', paymentId);

        await deleteInvoicePayment(invoice.id, paymentId);

        notify({ title: 'Payment deleted', message: 'Invoice payment deleted successfully' });

        reloadInvoice();
    };

    const downloadInvoiceClicked = async () => {
        downloadInvoice(
            session.user.defaultCarrierId,
            invoice,
            invoice.load.customer,
            invoice.load,
            `invoice-${invoice.invoiceNum}.pdf`,
        );
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Invoice # {invoice?.invoiceNum}</h1>
                        <button
                            type="button"
                            onClick={addPayment}
                            disabled={!invoice}
                            className="hidden sm:inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            + Add Payment
                        </button>
                        <ActionsDropdown
                            invoice={invoice}
                            disabled={!invoice}
                            deleteInvoice={deleteInvoice}
                            downloadInvoice={downloadInvoiceClicked}
                        ></ActionsDropdown>
                    </div>
                </div>
            }
        >
            <div className="max-w-4xl py-2 mx-auto">
                <AddPaymentModal
                    onCreate={onNewPaymentCreate}
                    show={openAddPayment}
                    invoice={invoice}
                    onClose={() => setOpenAddPayment(false)}
                ></AddPaymentModal>
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Accounting',
                            href: '/accounting',
                        },
                        {
                            label: `# ${invoice?.invoiceNum ?? ''}`,
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex space-x-3">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Invoice # {invoice?.invoiceNum}</h1>
                        <button
                            type="button"
                            onClick={addPayment}
                            disabled={!invoice}
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            + Add Payment
                        </button>
                        <ActionsDropdown
                            invoice={invoice}
                            disabled={!invoice}
                            deleteInvoice={deleteInvoice}
                            downloadInvoice={downloadInvoiceClicked}
                        ></ActionsDropdown>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>

                <div className="fixed bottom-0 left-0 right-0 flex px-5 py-3 bg-white sm:hidden">
                    <button
                        type="button"
                        onClick={addPayment}
                        className="flex-1 inline-flex justify-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                        + Add Payment
                    </button>
                </div>

                <div className="px-5 mb-20 sm:px-6 md:px-8">
                    {invoice ? (
                        <>
                            <LoadCard load={invoice.load}></LoadCard>

                            <div className="grid grid-cols-2 gap-2 mt-4 md:gap-6">
                                <aside className="col-span-2 overflow-y-auto bg-white border-gray-200 md:col-span-1">
                                    <dl className="border-gray-200 divide-y divide-gray-200">
                                        <div className="flex flex-col py-3 space-y-2 text-sm font-medium">
                                            <dt className="text-gray-500">Bill To:</dt>
                                            <dd className="text-gray-900">
                                                <div>{invoice.load.customer.name}</div>
                                                <div>{invoice.load.customer.street}</div>
                                                <div>
                                                    {invoice.load.customer.city
                                                        ? invoice.load.customer.city + ', '
                                                        : null}
                                                    {invoice.load.customer.state ? invoice.load.customer.state : ' '}
                                                    {invoice.load.customer.zip}
                                                </div>
                                            </dd>
                                        </div>
                                    </dl>
                                </aside>
                                <aside className="col-span-2 overflow-y-auto bg-white border-gray-200 md:col-span-1">
                                    <dl className="border-gray-200 divide-y divide-gray-200">
                                        <div className="flex justify-between py-2.5 text-sm font-medium">
                                            <dt className="text-gray-500">Date</dt>
                                            <dd className="text-gray-900">
                                                {new Intl.DateTimeFormat('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: '2-digit',
                                                }).format(new Date(invoice.invoicedAt))}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between py-2.5 text-sm font-medium">
                                            <dt className="text-gray-500">Reference #</dt>
                                            <dd className="text-gray-900">{invoice.load.refNum}</dd>
                                        </div>
                                        <div className="flex justify-between py-2.5 text-sm font-medium">
                                            <dt className="text-gray-500">Term</dt>
                                            <dd className="text-gray-900">
                                                {
                                                    invoiceTermOptions.find(
                                                        (option) => option.value === invoice.dueNetDays,
                                                    )?.label
                                                }
                                            </dd>
                                        </div>
                                        <div className="flex justify-between py-2.5 text-sm font-medium">
                                            <dt className="text-gray-500">Status</dt>
                                            <dd className="text-gray-900">
                                                <InvoiceStatusBadge invoice={invoice} />
                                            </dd>
                                        </div>
                                    </dl>
                                </aside>
                            </div>

                            <table className="min-w-full mt-4 divide-y divide-gray-300">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th
                                            scope="col"
                                            className="py-2 pl-4 pr-3 text-sm font-semibold text-left text-gray-900 sm:pl-6"
                                        >
                                            Item
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2 text-sm font-semibold text-left text-gray-900"
                                        >
                                            Description
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2 text-sm font-semibold text-right text-gray-900"
                                        >
                                            Price
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr>
                                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                                            Flat Rate
                                        </td>
                                        <td className="px-3 py-4 text-sm text-left text-gray-500 whitespace-nowrap">
                                            Revenue of Load
                                        </td>
                                        <td className="px-3 py-4 text-sm text-right text-gray-500 whitespace-nowrap">
                                            {formatValue({
                                                value: invoice.load.rate.toString(),
                                                groupSeparator: ',',
                                                decimalSeparator: '.',
                                                prefix: '$',
                                                decimalScale: 2,
                                            })}
                                        </td>
                                    </tr>
                                    {invoice.extraItems?.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                                                Additional
                                            </td>
                                            <td className="px-3 py-4 text-sm text-left text-gray-500 whitespace-nowrap">
                                                {item.title}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-right text-gray-500 whitespace-nowrap">
                                                {formatValue({
                                                    value: item.amount.toString(),
                                                    groupSeparator: ',',
                                                    decimalSeparator: '.',
                                                    prefix: '$',
                                                    decimalScale: 2,
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="w-full mt-1 mb-1 border-t border-gray-300" />
                            <div className="w-full px-3 mt-3 ml-auto sm:w-1/2 lg:w-1/3">
                                <div className="flex justify-between mb-4">
                                    <div className="font-medium">Total Amount</div>
                                    <div>
                                        {formatValue({
                                            value: invoice.totalAmount.toString(),
                                            groupSeparator: ',',
                                            decimalSeparator: '.',
                                            prefix: '$',
                                            decimalScale: 2,
                                        })}
                                    </div>
                                </div>
                            </div>

                            {invoice.payments?.length > 0 && (
                                <>
                                    <h3 className="pt-2">Payment History</h3>
                                    <div className="grid grid-cols-6 mt-1">
                                        <div className="col-span-6 lg:col-span-4">
                                            <table className="relative min-w-full mt-1 divide-y divide-gray-300">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th
                                                            scope="col"
                                                            className="py-2 pl-4 pr-3 text-sm font-semibold text-left text-gray-900 sm:pl-6"
                                                        >
                                                            Date
                                                        </th>
                                                        <th
                                                            scope="col"
                                                            className="px-3 py-2 text-sm font-semibold text-right text-gray-900"
                                                        >
                                                            Amount
                                                        </th>
                                                        <th scope="col" className="relative px-6 py-3">
                                                            <span className="sr-only">More</span>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {invoice.payments?.map((payment, index) => (
                                                        <tr key={index}>
                                                            <td className="w-full py-4 pl-4 pr-3 text-sm text-gray-900 whitespace-nowrap sm:pl-6">
                                                                {new Intl.DateTimeFormat('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: '2-digit',
                                                                }).format(new Date(payment.paidAt))}
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-right whitespace-nowrap">
                                                                <>${payment.amount}</>
                                                            </td>
                                                            <td className="px-6 py-2 text-right whitespace-no-wrap">
                                                                <Menu as="div" className="inline-block text-left">
                                                                    <div>
                                                                        <Menu.Button className="flex items-center justify-center w-8 h-8 text-gray-400 bg-white rounded-full hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                                            <span className="sr-only">
                                                                                Open options
                                                                            </span>
                                                                            <DotsVerticalIcon
                                                                                className="w-6 h-6"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </Menu.Button>
                                                                    </div>

                                                                    <Transition
                                                                        as={Fragment}
                                                                        enter="transition ease-out duration-100"
                                                                        enterFrom="transform opacity-0 scale-95"
                                                                        enterTo="transform opacity-100 scale-100"
                                                                        leave="transition ease-in duration-75"
                                                                        leaveFrom="transform opacity-100 scale-100"
                                                                        leaveTo="transform opacity-0 scale-95"
                                                                    >
                                                                        <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                                            <div className="py-1">
                                                                                <Menu.Item>
                                                                                    {({ active }) => (
                                                                                        <a
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                deletePayment(
                                                                                                    payment.id,
                                                                                                );
                                                                                            }}
                                                                                            className={classNames(
                                                                                                active
                                                                                                    ? 'bg-gray-100 text-gray-900'
                                                                                                    : 'text-gray-700',
                                                                                                'block px-4 py-2 text-sm',
                                                                                            )}
                                                                                        >
                                                                                            Delete Payment
                                                                                        </a>
                                                                                    )}
                                                                                </Menu.Item>
                                                                            </div>
                                                                        </Menu.Items>
                                                                    </Transition>
                                                                </Menu>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <InvoiceDetailsSkeleton></InvoiceDetailsSkeleton>
                    )}
                </div>
            </div>
        </Layout>
    );
};

InvoiceDetailsPage.authenticationEnabled = true;

export default InvoiceDetailsPage;

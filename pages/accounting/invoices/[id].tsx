import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { Fragment } from 'react';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { LoadCard } from '../../../components/loads/LoadCard';
import { notify } from '../../../components/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import { ExpandedInvoice } from '../../../interfaces/models';
import { deleteInvoiceById, getInvoiceById } from '../../../lib/rest/invoice';

type ActionsDropdownProps = {
    invoice: ExpandedInvoice;
    deleteInvoice: (id: number) => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ invoice, deleteInvoice }: ActionsDropdownProps) => {
    const router = useRouter();

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
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
                <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
    const invoice = await getInvoiceById(Number(context.query.id));
    return {
        props: {
            invoice,
        },
    };
}

type Props = {
    invoice: ExpandedInvoice;
};

const InvoiceDetailsPage: PageWithAuth<Props> = ({ invoice }: Props) => {
    const router = useRouter();

    const deleteInvoice = async (id: number) => {
        console.log('delete invoice', id);

        await deleteInvoiceById(id);

        notify({ title: 'Invoice deleted', message: 'Invoice deleted successfully' });

        router.push('/accounting');
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Invoice # {invoice.id}</h1>
                    <ActionsDropdown invoice={invoice} deleteInvoice={deleteInvoice}></ActionsDropdown>
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
                            label: `# ${invoice.id}`,
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Invoice # {invoice.id}</h1>
                        <ActionsDropdown invoice={invoice} deleteInvoice={deleteInvoice}></ActionsDropdown>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
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
                                            {invoice.load.customer.city}, {invoice.load.customer.state}{' '}
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
                                        }).format(new Date(invoice.createdAt))}
                                    </dd>
                                </div>
                                <div className="flex justify-between py-2.5 text-sm font-medium">
                                    <dt className="text-gray-500">Reference #</dt>
                                    <dd className="text-gray-900">{invoice.load.refNum}</dd>
                                </div>
                                <div className="flex justify-between py-2.5 text-sm font-medium">
                                    <dt className="text-gray-500">Term</dt>
                                    <dd className="text-gray-900">{invoice.dueNetDays}</dd>
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
                                <th scope="col" className="px-3 py-2 text-sm font-semibold text-left text-gray-900">
                                    Description
                                </th>
                                <th scope="col" className="px-3 py-2 text-sm font-semibold text-right text-gray-900">
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
                                    ${invoice.load.rate}
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
                                        ${item.amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="w-full mt-5 mb-1 border-t border-gray-300" />
                    <div className="w-full px-3 mt-3 ml-auto sm:w-1/2 lg:w-1/3">
                        <div className="flex justify-between mb-4">
                            <div className="font-medium">Total Amount</div>
                            <div>${invoice.totalAmount}</div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

InvoiceDetailsPage.authenticationEnabled = true;

export default InvoiceDetailsPage;

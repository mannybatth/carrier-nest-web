import { Dialog, Transition } from '@headlessui/react';
import { Invoice, InvoicePayment, Prisma } from '@prisma/client';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import startOfDay from 'date-fns/startOfDay';
import React, { Fragment, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ExpandedInvoice } from '../../../interfaces/models';
import { createInvoicePayment } from '../../../lib/rest/invoice';
import Spinner from '../../Spinner';
import MoneyInput from '../MoneyInput';

type Props = {
    show: boolean;
    invoice: ExpandedInvoice;
    onCreate: (invoice: Invoice) => void;
    onClose: (value: boolean) => void;
};

const AddPaymentModal: React.FC<Props> = ({ show, invoice, onCreate, onClose }) => {
    const [loading, setLoading] = React.useState(false);
    const amountFieldRef = useRef(null);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        formState: { errors },
    } = useForm<InvoicePayment>();

    const submit = async (data: InvoicePayment) => {
        setLoading(true);

        const payment: Partial<InvoicePayment> = {
            paidAt: data.paidAt,
            amount: data.amount,
        };

        const newInvoice = await createInvoicePayment(invoice.id, payment);

        onCreate(newInvoice);
        close(true);
    };

    const close = (value: boolean) => {
        setLoading(false);
        reset();
        onClose(value);
    };

    const setToFullDue = () => {
        setValue('amount', invoice.remainingAmount);
        amountFieldRef?.current?.focus();
    };

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog
                as="div"
                initialFocus={amountFieldRef}
                className="fixed inset-0 z-10 overflow-y-auto"
                onClose={(value) => close(value)}
            >
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-32 text-center sm:block sm:p-0">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                        &#8203;
                    </span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <div className="relative inline-block w-full px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="block mb-4 mr-8">
                                <h1 className="text-xl font-semibold text-gray-900">Add New Payment</h1>
                            </div>

                            <form id="invoice-payment-form" onSubmit={handleSubmit(submit)}>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="col-span-1">
                                        <label htmlFor="paidAt" className="block text-sm font-medium text-gray-700">
                                            Payment Date
                                        </label>
                                        <Controller
                                            control={control}
                                            rules={{ required: 'Date is required' }}
                                            name="paidAt"
                                            defaultValue={startOfDay(new Date())}
                                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                                <>
                                                    <div className="relative mt-1">
                                                        <input
                                                            onChange={(e) => {
                                                                if (!e.target.validity.badInput) {
                                                                    onChange(parseISO(e.target.value));
                                                                }
                                                            }}
                                                            value={
                                                                value && !isNaN(new Date(value).getTime())
                                                                    ? format(new Date(value), 'yyyy-MM-dd')
                                                                    : ''
                                                            }
                                                            type="date"
                                                            max="9999-12-31"
                                                            id="paidAt"
                                                            autoComplete="date"
                                                            className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                                                                error
                                                                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                                                                    : ''
                                                            }`}
                                                        />
                                                    </div>
                                                    {error && <p className="text-sm text-red-600">{error?.message}</p>}
                                                </>
                                            )}
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label
                                            ref={amountFieldRef}
                                            htmlFor="amount"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Amount
                                        </label>
                                        <Controller
                                            control={control}
                                            rules={{ required: 'Amount is required' }}
                                            name="amount"
                                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                                <>
                                                    <div className="flex mt-1 rounded-md shadow-sm">
                                                        <div className="relative flex items-stretch flex-grow focus-within:z-10">
                                                            <MoneyInput
                                                                id="amount"
                                                                className="rounded-none rounded-l-md"
                                                                value={(value as Prisma.Decimal)?.toString() || ''}
                                                                onChange={(e) =>
                                                                    onChange(
                                                                        e.target.value
                                                                            ? new Prisma.Decimal(e.target.value)
                                                                            : '',
                                                                    )
                                                                }
                                                            ></MoneyInput>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={setToFullDue}
                                                            className="relative inline-flex items-center flex-shrink-0 px-4 py-2 -ml-px space-x-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                        >
                                                            <span>
                                                                {invoice.totalAmount === invoice.remainingAmount
                                                                    ? 'Full Due'
                                                                    : 'Full Remaining'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                    {error && <p className="text-sm text-red-600">{error?.message}</p>}
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 sm:mt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm disabled:pointer-events-none"
                                    >
                                        {loading && <Spinner className="text-white"></Spinner>}
                                        {loading ? 'Loading...' : 'Add Payment'}
                                    </button>
                                </div>
                            </form>

                            <div className="absolute top-0 right-0 mt-4 mr-4">
                                <button
                                    type="button"
                                    className="p-2 text-gray-400 rounded-md hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-500"
                                    onClick={() => close(false)}
                                >
                                    <svg className="w-6 h-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default AddPaymentModal;

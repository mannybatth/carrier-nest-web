import { Dialog, Transition } from '@headlessui/react';
import { Customer } from '@prisma/client';
import React, { Fragment, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { createCustomer } from '../../../lib/rest/customer';
import Spinner from '../../Spinner';
import CustomerForm from './CustomerForm';
import type { AICustomerDetails } from '../../../interfaces/ai';

type Props = {
    show: boolean;
    onCreate: (customer: Customer) => void;
    onClose: (value: boolean) => void;
    showMissingCustomerLabel?: boolean;
    prefillName?: string;
    condensed?: boolean;
    extractedCustomerDetails?: AICustomerDetails;
};

const CreateCustomerModal: React.FC<Props> = ({
    show,
    onCreate,
    onClose,
    showMissingCustomerLabel,
    prefillName,
    condensed = false,
    extractedCustomerDetails,
}) => {
    const [loading, setLoading] = React.useState(false);
    const formHook = useForm<Customer>({
        mode: 'onChange', // Enable real-time validation
        reValidateMode: 'onChange',
    });
    const formRef = useRef(null);

    React.useEffect(() => {
        if (prefillName) {
            formHook.setValue('name', prefillName);
        }
    }, [prefillName]);

    // Pre-populate form with extracted customer details
    React.useEffect(() => {
        console.log('CreateCustomerModal received extractedCustomerDetails:', extractedCustomerDetails);
        if (extractedCustomerDetails) {
            console.log('Pre-populating form with customer details');
            if (extractedCustomerDetails.name) {
                console.log('Setting name:', extractedCustomerDetails.name);
                formHook.setValue('name', extractedCustomerDetails.name);
            }
            if (extractedCustomerDetails.contact_email) {
                console.log('Setting contact email:', extractedCustomerDetails.contact_email);
                formHook.setValue('contactEmail', extractedCustomerDetails.contact_email);
            }
            if (extractedCustomerDetails.billing_email) {
                console.log('Setting billing email:', extractedCustomerDetails.billing_email);
                formHook.setValue('billingEmail', extractedCustomerDetails.billing_email);
            }
            if (extractedCustomerDetails.payment_status_email) {
                console.log('Setting payment status email:', extractedCustomerDetails.payment_status_email);
                formHook.setValue('paymentStatusEmail', extractedCustomerDetails.payment_status_email);
            }
            if (extractedCustomerDetails.address) {
                console.log('Setting address:', extractedCustomerDetails.address);
                const addr = extractedCustomerDetails.address;
                if (addr.street) formHook.setValue('street', addr.street);
                if (addr.city) formHook.setValue('city', addr.city);
                if (addr.state) formHook.setValue('state', addr.state);
                if (addr.zip) formHook.setValue('zip', addr.zip);
                if (addr.country) formHook.setValue('country', addr.country);
            }
        } else {
            console.log('No extractedCustomerDetails provided to CreateCustomerModal');
        }
    }, [extractedCustomerDetails, formHook]);

    const submit = async (data: Customer) => {
        setLoading(true);

        const customer: Partial<Customer> = {
            name: data.name,
            contactEmail: data.contactEmail || '',
            billingEmail: data.billingEmail || '',
            paymentStatusEmail: data.paymentStatusEmail || '',
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: data.country || '',
        };

        const newCustomer = await createCustomer(customer);

        onCreate(newCustomer);
        close(true);
    };

    const close = (value: boolean) => {
        setLoading(false);
        formHook.reset();
        onClose(value);
    };

    const addSubmitListener = () => {
        const form = formRef.current;
        if (form) {
            form.removeEventListener('submit', handleSubmit);
            form.addEventListener('submit', handleSubmit);
        }
    };

    const removeSubmitListener = () => {
        const form = formRef.current;
        if (form) {
            form.removeEventListener('submit', handleSubmit);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault(); // This will prevent the form's default submission behavior.
        e.stopPropagation();
        formHook.handleSubmit(submit)();
    };

    return (
        <Transition.Root show={show} as={Fragment} afterEnter={addSubmitListener} afterLeave={removeSubmitListener}>
            <Dialog as="div" className="relative z-10" onClose={(value) => close(value)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <Dialog.Panel className="relative w-full max-w-2xl h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
                            {/* Fixed Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                                <div>
                                    <h1 className="text-xl font-semibold text-gray-900">Create New Customer</h1>
                                    {showMissingCustomerLabel && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            The customer found doesn&apos;t exist, let&apos;s create it.
                                        </p>
                                    )}
                                </div>
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

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <form ref={formRef} id="customer-form" className="h-full">
                                    <CustomerForm formHook={formHook} condensed={condensed} />
                                </form>
                            </div>

                            {/* Fixed Footer */}
                            <div className="border-t border-gray-200 p-6 flex-shrink-0">
                                <button
                                    type="submit"
                                    form="customer-form"
                                    disabled={loading}
                                    className="inline-flex justify-center w-full px-4 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {loading && <Spinner className="text-white mr-2" />}
                                    {loading ? 'Creating Customer...' : 'Create Customer'}
                                </button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default CreateCustomerModal;

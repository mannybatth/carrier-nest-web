import { Dialog, Transition } from '@headlessui/react';
import { Customer } from '@prisma/client';
import React, { Fragment, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { createCustomer } from '../../../lib/rest/customer';
import Spinner from '../../Spinner';
import CustomerForm from './CustomerForm';

type Props = {
    show: boolean;
    onCreate: (customer: Customer) => void;
    onClose: (value: boolean) => void;
    showMissingCustomerLabel?: boolean;
    prefillName?: string;
};

const CreateCustomerModal: React.FC<Props> = ({ show, onCreate, onClose, showMissingCustomerLabel, prefillName }) => {
    const [loading, setLoading] = React.useState(false);
    const formHook = useForm<Customer>();
    const formRef = useRef(null);

    React.useEffect(() => {
        if (prefillName) {
            formHook.setValue('name', prefillName);
        }
    }, [prefillName]);

    const submit = async (data: Customer) => {
        setLoading(true);

        const customer: Partial<Customer> = {
            name: data.name,
            contactEmail: '',
            billingEmail: '',
            paymentStatusEmail: '',
            street: '',
            city: '',
            state: '',
            zip: '',
            country: '',
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

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-full p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative w-full px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="block mb-4 mr-8">
                                    <h1 className="text-xl font-semibold text-gray-900">Create New Customer</h1>
                                </div>

                                {showMissingCustomerLabel && (
                                    <div className="mb-4 mr-8">
                                        <p className="text-sm text-gray-500">
                                            The customer found doesnt exist, lets create it.
                                        </p>
                                    </div>
                                )}

                                <form ref={formRef} id="customer-form">
                                    <CustomerForm formHook={formHook} condensed></CustomerForm>
                                    <div className="mt-5 sm:mt-6">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:pointer-events-none"
                                        >
                                            {loading && <Spinner className="text-white"></Spinner>}
                                            {loading ? 'Loading...' : 'Create Customer'}
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
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default CreateCustomerModal;

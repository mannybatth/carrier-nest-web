import { Dialog, Transition } from '@headlessui/react';
import { Customer } from '@prisma/client';
import React, { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { SimpleCustomer } from '../../../interfaces/models';
import { createCustomer } from '../../../lib/rest/customer';
import CustomerForm from './CustomerForm';

type Props = {
    show: boolean;
    onCreate: (customer: Customer) => void;
    onClose: (value: boolean) => void;
};

const CreateCustomerModal: React.FC<Props> = ({ show, onCreate, onClose }: Props) => {
    const [loading, setLoading] = React.useState(false);
    const formHook = useForm();

    const submit = async (data) => {
        setLoading(true);

        const customer: SimpleCustomer = {
            name: data.name,
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

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={(value) => close(value)}>
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
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
                        <div className="relative inline-block w-full px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="block mb-4">
                                <h1 className="text-xl font-semibold text-gray-900">Create New Customer</h1>
                            </div>

                            <form id="customer-form" onSubmit={formHook.handleSubmit(submit)}>
                                <CustomerForm formHook={formHook}></CustomerForm>
                                <div className="mt-5 sm:mt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        onClick={() => onClose(true)}
                                        className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:pointer-events-none"
                                    >
                                        {loading && (
                                            <svg
                                                className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                        )}
                                        {loading ? 'Loading...' : 'Create Customer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default CreateCustomerModal;

import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ExpandedDriverAssignment } from '../../interfaces/models';

interface AssignmentPaymentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignment: ExpandedDriverAssignment | null;
    onAddPayment: (amount: number) => void;
}

const AssignmentPaymentsModal: React.FC<AssignmentPaymentsModalProps> = ({
    isOpen,
    onClose,
    assignment,
    onAddPayment,
}) => {
    return (
        <Transition.Root show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
                            <Transition.Child
                                as={React.Fragment}
                                enter="transform transition ease-in-out duration-500 sm:duration-200"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-500 sm:duration-200"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                                    <div className="flex flex-col h-full overflow-y-scroll bg-white shadow-xl">
                                        <div className="px-4 py-6 sm:px-6">
                                            <div className="flex items-start justify-between">
                                                <Dialog.Title className="text-lg font-medium text-gray-900">
                                                    Payments for Assignment
                                                </Dialog.Title>
                                                <div className="flex items-center ml-3 h-7">
                                                    <button
                                                        type="button"
                                                        className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                        onClick={onClose}
                                                    >
                                                        <span className="sr-only">Close panel</span>
                                                        <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative flex-1 px-4 sm:px-6">
                                            <div className="absolute inset-0 px-4 sm:px-6">
                                                <div className="h-full" aria-hidden="true">
                                                    <ul className="mt-2">
                                                        {assignment?.payments?.map((payment) => (
                                                            <li key={payment.id} className="flex justify-between">
                                                                <span>
                                                                    {new Date(payment.paymentDate).toLocaleDateString()}
                                                                </span>
                                                                <span>{payment.amount.toFixed(2)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="mt-4">
                                                        <input
                                                            type="number"
                                                            placeholder="Payment Amount"
                                                            className="p-2 border rounded"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    onAddPayment(Number(e.currentTarget.value));
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default AssignmentPaymentsModal;

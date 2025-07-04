import React, { Fragment, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Spinner from '../Spinner';

interface SimpleDialogProps {
    show?: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    primaryButtonText?: string;
    secondaryButtonText?: string;
    primaryButtonAction?: () => void;
    secondaryButtonAction?: () => void;
    primaryButtonColor?: string;
    icon?: React.ComponentType<{ className: string; 'aria-hidden': boolean }>;
    iconBgColor?: string;
    iconColor?: string;
    loading?: boolean;
    loadingText?: string;
}

const SimpleDialog: React.FC<SimpleDialogProps> = ({
    show = false,
    onClose,
    title = 'Default Title',
    description = 'Default description',
    primaryButtonText = 'Confirm',
    secondaryButtonText = 'Cancel',
    primaryButtonAction,
    secondaryButtonAction,
    primaryButtonColor = 'bg-red-600 hover:bg-red-500',
    icon: Icon = ExclamationTriangleIcon,
    iconBgColor = 'bg-red-100',
    iconColor = 'text-red-600',
    loading = false,
    loadingText = 'Processing...',
}) => {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    const handlePrimaryAction = () => {
        if (loading) return; // Prevent action when loading
        primaryButtonAction && primaryButtonAction();
        if (!loading) onClose(); // Only close if not loading (for async operations)
    };

    const handleSecondaryAction = () => {
        if (loading) return; // Prevent closing during loading
        secondaryButtonAction && secondaryButtonAction();
        onClose();
    };

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={onClose}>
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
                            <Dialog.Panel className="relative px-4 pt-5 pb-4 overflow-hidden text-left transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="sm:flex sm:items-start">
                                    <div
                                        className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${iconBgColor} sm:mx-0 sm:h-10 sm:w-10`}
                                    >
                                        <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden={true} />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-base font-semibold leading-6 text-gray-900"
                                        >
                                            {title}
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">{description}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                    {loading ? (
                                        <div className="flex items-center justify-center w-full p-3 text-blue-600">
                                            <Spinner />
                                            <span className="ml-2 text-sm font-medium">{loadingText}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${primaryButtonColor} sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed`}
                                                onClick={handlePrimaryAction}
                                                disabled={loading}
                                            >
                                                {primaryButtonText}
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex justify-center w-full px-3 py-2 mt-3 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={handleSecondaryAction}
                                                ref={cancelButtonRef}
                                                disabled={loading}
                                            >
                                                {secondaryButtonText}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default SimpleDialog;

import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DeactivateDriverDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    driverName: string;
    driverPhone: string;
}

const DeactivateDriverDialog: React.FC<DeactivateDriverDialogProps> = ({
    open,
    onClose,
    onConfirm,
    driverName,
    driverPhone,
}) => {
    const [phoneInput, setPhoneInput] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);

    const handleConfirm = async () => {
        if (phoneInput.trim() !== driverPhone) {
            setError("Phone number does not match. Please enter the driver's correct phone number.");
            return;
        }

        setIsLoading(true);
        setIsDeactivating(true);
        setError('');

        try {
            await onConfirm();
            // Don't call handleClose here - let the parent handle it via onConfirm success
        } catch (error: any) {
            setError(error.message || 'Failed to deactivate driver. Please try again.');
            setIsDeactivating(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (isLoading || isDeactivating) return; // Prevent closing during loading
        setPhoneInput('');
        setError('');
        onClose();
    };

    // Reset states when dialog opens
    React.useEffect(() => {
        if (open) {
            setPhoneInput('');
            setError('');
            setIsLoading(false);
            setIsDeactivating(false);
        }
    }, [open]);

    const LoadingSpinner = () => (
        <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
    return (
        <Transition.Root show={open} as={React.Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="px-6 pt-8 pb-6 text-center">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
                                        <ExclamationTriangleIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
                                    </div>
                                    <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-2">
                                        Deactivate Driver
                                    </Dialog.Title>
                                    <p className="text-base text-gray-600">{driverName}</p>
                                </div>

                                {/* Body */}
                                <div className="px-6 pb-6">
                                    <div className="text-center space-y-6">
                                        {/* Warning Info */}
                                        <div
                                            className={`rounded-2xl p-6 ${isDeactivating ? 'bg-blue-50' : 'bg-red-50'}`}
                                        >
                                            <div
                                                className={`text-sm font-medium mb-1 ${
                                                    isDeactivating ? 'text-blue-600' : 'text-red-600'
                                                }`}
                                            >
                                                {isDeactivating
                                                    ? 'Deactivating Driver...'
                                                    : 'This action will immediately'}
                                            </div>
                                            {!isDeactivating ? (
                                                <div className="space-y-2 text-sm text-red-700">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <span>•</span>
                                                        <span>Prevent new load assignments</span>
                                                    </div>
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <span>•</span>
                                                        <span>Remove driver app access</span>
                                                    </div>
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <span>•</span>
                                                        <span>Free up subscription seat</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xl font-bold text-blue-700">Please wait</div>
                                            )}
                                        </div>

                                        {!isDeactivating && driverPhone ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-gray-700 mb-3">
                                                        Confirm by entering the driver&apos;s phone number:
                                                    </p>
                                                    <div className="text-center">
                                                        <span className="inline-block bg-gray-100 text-gray-800 font-mono text-sm px-3 py-1 rounded-lg">
                                                            {driverPhone}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        id="phone-confirmation"
                                                        type="text"
                                                        placeholder="Enter phone number"
                                                        className="w-full h-12 text-center text-base rounded-xl border border-gray-300 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                                                        value={phoneInput}
                                                        onChange={(e) => {
                                                            setPhoneInput(e.target.value);
                                                            if (error) setError('');
                                                        }}
                                                        disabled={isLoading || isDeactivating}
                                                    />
                                                    {phoneInput.trim() === driverPhone && !isDeactivating && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                                                <svg
                                                                    className="h-4 w-4 text-white"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M5 13l4 4L19 7"
                                                                    />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : !isDeactivating && !driverPhone ? (
                                            <div className="bg-amber-50 rounded-2xl p-4">
                                                <p className="text-amber-700 text-sm">
                                                    No phone number on file for verification.
                                                </p>
                                            </div>
                                        ) : isDeactivating ? (
                                            <div className="bg-blue-50 rounded-2xl p-6">
                                                <div className="flex items-center justify-center mb-4">
                                                    <LoadingSpinner />
                                                </div>
                                                <p className="text-blue-700 text-sm text-center">
                                                    Deactivating driver and revoking app access...
                                                </p>
                                            </div>
                                        ) : null}

                                        {error && !isDeactivating && (
                                            <div className="bg-red-50 rounded-xl p-3">
                                                <p className="text-sm text-red-600">{error}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 pb-6 space-y-3">
                                    <button
                                        type="button"
                                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-2xl transition-colors duration-200 disabled:cursor-not-allowed"
                                        onClick={handleConfirm}
                                        disabled={
                                            isLoading ||
                                            isDeactivating ||
                                            !driverPhone ||
                                            phoneInput.trim() !== driverPhone
                                        }
                                    >
                                        {isLoading || isDeactivating ? (
                                            <div className="flex items-center justify-center">
                                                <LoadingSpinner />
                                                <span className="ml-2">Deactivating...</span>
                                            </div>
                                        ) : (
                                            'Deactivate Driver'
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-6 rounded-2xl transition-colors duration-200 disabled:opacity-50"
                                        onClick={handleClose}
                                        disabled={isLoading || isDeactivating}
                                    >
                                        Cancel
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

export default DeactivateDriverDialog;

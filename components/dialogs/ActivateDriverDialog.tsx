import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface ActivateDriverDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    driverName: string;
    driverPhone: string;
    availableSeats: number;
    totalSeats: number;
}

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

const ActivateDriverDialog: React.FC<ActivateDriverDialogProps> = ({
    open,
    onClose,
    onConfirm,
    driverName,
    driverPhone,
    availableSeats,
    totalSeats,
}) => {
    const [phoneInput, setPhoneInput] = React.useState('');
    const [error, setError] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isActivating, setIsActivating] = React.useState(false);

    // Capture available seats when dialog opens to prevent content flickering during activation
    const [dialogAvailableSeats, setDialogAvailableSeats] = React.useState(availableSeats);

    const handleClose = () => {
        if (isLoading || isActivating) return;
        setPhoneInput('');
        setError('');
        onClose();
    };

    const handleConfirm = async () => {
        if (phoneInput.trim() !== driverPhone) {
            setError("Phone number does not match. Please enter the driver's correct phone number.");
            return;
        }

        if (dialogAvailableSeats <= 0) {
            setError('No available seats in your subscription. Please upgrade your plan or deactivate another driver.');
            return;
        }

        setIsLoading(true);
        setIsActivating(true);
        setError('');

        try {
            await onConfirm();
            // Don't call handleClose here - let the parent handle it via onConfirm success
        } catch (error: any) {
            setError(error.message || 'Failed to activate driver. Please try again.');
            setIsActivating(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Reset states and update available seats when dialog opens
    React.useEffect(() => {
        if (open) {
            setPhoneInput('');
            setError('');
            setIsLoading(false);
            setIsActivating(false);
            // Update available seats with fresh data each time dialog opens
            setDialogAvailableSeats(availableSeats);
        }
    }, [open, availableSeats]);

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
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
                                        <CheckCircleIcon className="h-8 w-8 text-blue-600" aria-hidden="true" />
                                    </div>
                                    <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-2">
                                        Activate Driver
                                    </Dialog.Title>
                                    <p className="text-base text-gray-600">{driverName}</p>
                                </div>

                                {/* Body */}
                                <div className="px-6 pb-6">
                                    {dialogAvailableSeats <= 0 ? (
                                        /* No seats available - Apple-style upgrade flow */
                                        <div className="text-center space-y-6">
                                            {/* Subscription Status */}
                                            <div className="bg-red-50 rounded-2xl p-6">
                                                <div className="text-red-600 text-sm font-medium mb-1">
                                                    Subscription Limit Reached
                                                </div>
                                                <div className="text-2xl font-bold text-red-700 mb-3">
                                                    {totalSeats}/{totalSeats} seats used
                                                </div>
                                                <p className="text-red-700 text-sm leading-relaxed">
                                                    You&apos;ve reached your subscription limit. Upgrade your plan to
                                                    more driver seats.
                                                </p>
                                            </div>

                                            {/* Upgrade CTA */}
                                            <div className="space-y-3">
                                                <a
                                                    href="/billing"
                                                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-colors duration-200 text-center"
                                                >
                                                    Upgrade Plan
                                                </a>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    You can also deactivate an existing driver to free up a seat
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Phone confirmation for available seats */
                                        <div className="text-center space-y-6">
                                            {/* Subscription Status */}
                                            <div
                                                className={`rounded-2xl p-4 ${
                                                    isActivating ? 'bg-blue-50' : 'bg-green-50'
                                                }`}
                                            >
                                                <div
                                                    className={`text-sm font-medium mb-1 ${
                                                        isActivating ? 'text-blue-600' : 'text-green-600'
                                                    }`}
                                                >
                                                    {isActivating ? 'Activating Driver...' : 'Subscription Status'}
                                                </div>
                                                <div
                                                    className={`text-xl font-bold ${
                                                        isActivating ? 'text-blue-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    {isActivating
                                                        ? 'Please wait'
                                                        : `${dialogAvailableSeats} of ${totalSeats} seats available`}
                                                </div>
                                            </div>

                                            {!isActivating && driverPhone ? (
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
                                                            disabled={isLoading || isActivating}
                                                        />
                                                        {phoneInput.trim() === driverPhone && !isActivating && (
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
                                            ) : !isActivating && !driverPhone ? (
                                                <div className="bg-amber-50 rounded-2xl p-4">
                                                    <p className="text-amber-700 text-sm">
                                                        No phone number on file for verification.
                                                    </p>
                                                </div>
                                            ) : isActivating ? (
                                                <div className="bg-blue-50 rounded-2xl p-6">
                                                    <div className="flex items-center justify-center mb-4">
                                                        <LoadingSpinner />
                                                    </div>
                                                    <p className="text-blue-700 text-sm text-center">
                                                        Activating driver and updating subscription...
                                                    </p>
                                                </div>
                                            ) : null}

                                            {error && !isActivating && (
                                                <div className="bg-red-50 rounded-xl p-3">
                                                    <p className="text-sm text-red-600">{error}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 pb-6 space-y-3">
                                    {dialogAvailableSeats > 0 && (
                                        <button
                                            type="button"
                                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-2xl transition-colors duration-200 disabled:cursor-not-allowed"
                                            onClick={handleConfirm}
                                            disabled={
                                                isLoading ||
                                                isActivating ||
                                                !driverPhone ||
                                                phoneInput.trim() !== driverPhone ||
                                                dialogAvailableSeats <= 0
                                            }
                                        >
                                            {isLoading || isActivating ? (
                                                <div className="flex items-center justify-center">
                                                    <LoadingSpinner />
                                                    <span className="ml-2">Activating...</span>
                                                </div>
                                            ) : (
                                                'Activate Driver'
                                            )}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-6 rounded-2xl transition-colors duration-200 disabled:opacity-50"
                                        onClick={handleClose}
                                        disabled={isLoading || isActivating}
                                    >
                                        {dialogAvailableSeats <= 0 ? 'Close' : 'Cancel'}
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

export default ActivateDriverDialog;

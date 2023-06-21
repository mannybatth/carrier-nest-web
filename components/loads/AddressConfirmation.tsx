import { Dialog, Transition } from '@headlessui/react';
import { XIcon } from '@heroicons/react/outline';
import React, { Fragment } from 'react';
import { LocationEntry, regionFromLocationEntry } from '../../interfaces/location';
import { AILoad } from '../../lib/rest/ai';
import { RadioGroup } from '@headlessui/react';
import classNames from 'classnames';

type Props = {
    show: boolean;
    aiLoad: AILoad;
    shipperLocations: LocationEntry[];
    receiverLocations: LocationEntry[];
    onConfirm: (shipperLocation: LocationEntry, receiverLocation: LocationEntry) => void;
    onClose: (value: boolean) => void;
};

const AddressConfirmation: React.FC<Props> = ({
    show,
    aiLoad,
    shipperLocations,
    receiverLocations,
    onConfirm,
    onClose,
}) => {
    const [selectedShipperLocation, setSelectedShipperLocation] = React.useState<LocationEntry>(null);
    const [selectedReceiverLocation, setSelectedReceiverLocation] = React.useState<LocationEntry>(null);

    const close = (value: boolean) => {
        onClose(value);
    };

    React.useEffect(() => {
        if (shipperLocations.length) {
            setSelectedShipperLocation(shipperLocations[0]);
        }
        if (receiverLocations.length) {
            setSelectedReceiverLocation(receiverLocations[0]);
        }
    }, [shipperLocations, receiverLocations]);

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog static as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={() => null}>
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
                        <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
                            <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                                <button
                                    type="button"
                                    className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => close(false)}
                                >
                                    <span className="sr-only">Close</span>
                                    <XIcon className="w-6 h-6" aria-hidden="true" />
                                </button>
                            </div>
                            <div className="sm:flex sm:items-start">
                                <div className="flex-1 mt-3 text-left sm:mt-0">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        {shipperLocations.length & receiverLocations.length
                                            ? 'Please confirm the shipper and receiver addresses for this load.'
                                            : shipperLocations.length
                                            ? 'Please confirm the shipper address for this load.'
                                            : receiverLocations.length
                                            ? 'Please confirm the receiver address for this load.'
                                            : 'Please add a shipper and receiver address for this load.'}
                                    </Dialog.Title>
                                    <hr className="my-4 border-gray-200" />
                                    <div className="mt-2">
                                        <div className="mt-4">
                                            <div className="flex flex-col">
                                                {shipperLocations.length ? (
                                                    <>
                                                        <label
                                                            htmlFor="shipper"
                                                            className="block text-sm font-medium text-gray-700"
                                                        >
                                                            Shipper Address from doc:
                                                        </label>
                                                        <div className="mt-1 text-sm">
                                                            {aiLoad.shipper_address.street},{' '}
                                                            {aiLoad.shipper_address.city},{' '}
                                                            {aiLoad.shipper_address.state} {aiLoad.shipper_address.zip}
                                                        </div>
                                                        <RadioGroup
                                                            value={selectedShipperLocation}
                                                            onChange={(location) => {
                                                                setSelectedShipperLocation(location);
                                                            }}
                                                            className="mt-1"
                                                        >
                                                            <RadioGroup.Label className="sr-only">
                                                                Shipper Address
                                                            </RadioGroup.Label>
                                                            <div className="relative -space-y-px bg-white rounded-md">
                                                                {shipperLocations.map((location, index) => (
                                                                    <RadioGroup.Option
                                                                        key={index}
                                                                        value={location}
                                                                        className={({ checked }) =>
                                                                            classNames(
                                                                                index === 0
                                                                                    ? 'rounded-tl-md rounded-tr-md'
                                                                                    : '',
                                                                                index === shipperLocations.length - 1
                                                                                    ? 'rounded-bl-md rounded-br-md'
                                                                                    : '',
                                                                                checked
                                                                                    ? 'z-10 border-indigo-200 bg-indigo-50'
                                                                                    : 'border-gray-200',
                                                                                'relative flex cursor-pointer border p-3 focus:outline-none',
                                                                            )
                                                                        }
                                                                    >
                                                                        {({ active, checked }) => (
                                                                            <>
                                                                                <span
                                                                                    className={classNames(
                                                                                        checked
                                                                                            ? 'bg-indigo-600 border-transparent'
                                                                                            : 'bg-white border-gray-300',
                                                                                        active
                                                                                            ? 'ring-2 ring-offset-2 ring-indigo-500'
                                                                                            : '',
                                                                                        'h-4 w-4 mt-0.5 cursor-pointer rounded-full border flex items-center justify-center',
                                                                                    )}
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    <span className="rounded-full bg-white w-1.5 h-1.5" />
                                                                                </span>
                                                                                <div className="flex flex-col ml-3">
                                                                                    <RadioGroup.Label
                                                                                        as="span"
                                                                                        className={classNames(
                                                                                            checked
                                                                                                ? 'text-indigo-900'
                                                                                                : 'text-gray-900',
                                                                                            'block text-sm font-medium',
                                                                                        )}
                                                                                    >
                                                                                        {location.street}{' '}
                                                                                        {location.city},{' '}
                                                                                        {
                                                                                            regionFromLocationEntry(
                                                                                                location,
                                                                                            ).regionText
                                                                                        }{' '}
                                                                                        {location.zip}
                                                                                    </RadioGroup.Label>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </RadioGroup.Option>
                                                                ))}
                                                            </div>
                                                        </RadioGroup>
                                                    </>
                                                ) : null}

                                                {receiverLocations.length && shipperLocations.length ? (
                                                    <hr className="my-4 border-gray-200" />
                                                ) : null}

                                                {receiverLocations.length ? (
                                                    <>
                                                        <label
                                                            htmlFor="receiver"
                                                            className="block mt-3 text-sm font-medium text-gray-700"
                                                        >
                                                            Receiver address from doc:
                                                        </label>
                                                        <div className="mt-1 text-sm">
                                                            {aiLoad.consignee_address.street},{' '}
                                                            {aiLoad.consignee_address.city},{' '}
                                                            {aiLoad.consignee_address.state}{' '}
                                                            {aiLoad.consignee_address.zip}
                                                        </div>
                                                        <RadioGroup
                                                            value={selectedReceiverLocation}
                                                            onChange={(location) => {
                                                                setSelectedReceiverLocation(location);
                                                            }}
                                                            className="mt-1"
                                                        >
                                                            <RadioGroup.Label className="sr-only">
                                                                Receiver Address
                                                            </RadioGroup.Label>
                                                            <div className="relative -space-y-px bg-white rounded-md">
                                                                {receiverLocations.map((location, index) => (
                                                                    <RadioGroup.Option
                                                                        key={index}
                                                                        value={location}
                                                                        className={({ checked }) =>
                                                                            classNames(
                                                                                index === 0
                                                                                    ? 'rounded-tl-md rounded-tr-md'
                                                                                    : '',
                                                                                index === receiverLocations.length - 1
                                                                                    ? 'rounded-bl-md rounded-br-md'
                                                                                    : '',
                                                                                checked
                                                                                    ? 'z-10 border-indigo-200 bg-indigo-50'
                                                                                    : 'border-gray-200',
                                                                                'relative flex cursor-pointer border p-3 focus:outline-none',
                                                                            )
                                                                        }
                                                                    >
                                                                        {({ active, checked }) => (
                                                                            <>
                                                                                <span
                                                                                    className={classNames(
                                                                                        checked
                                                                                            ? 'bg-indigo-600 border-transparent'
                                                                                            : 'bg-white border-gray-300',
                                                                                        active
                                                                                            ? 'ring-2 ring-offset-2 ring-indigo-500'
                                                                                            : '',
                                                                                        'h-4 w-4 mt-0.5 cursor-pointer rounded-full border flex items-center justify-center',
                                                                                    )}
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    <span className="rounded-full bg-white w-1.5 h-1.5" />
                                                                                </span>
                                                                                <div className="flex flex-col ml-3">
                                                                                    <RadioGroup.Label
                                                                                        as="span"
                                                                                        className={classNames(
                                                                                            checked
                                                                                                ? 'text-indigo-900'
                                                                                                : 'text-gray-900',
                                                                                            'block text-sm font-medium',
                                                                                        )}
                                                                                    >
                                                                                        {location.street}{' '}
                                                                                        {location.city},{' '}
                                                                                        {
                                                                                            regionFromLocationEntry(
                                                                                                location,
                                                                                            ).regionText
                                                                                        }{' '}
                                                                                        {location.zip}
                                                                                    </RadioGroup.Label>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </RadioGroup.Option>
                                                                ))}
                                                            </div>
                                                        </RadioGroup>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => {
                                        onConfirm(selectedShipperLocation, selectedReceiverLocation);
                                        close(true);
                                    }}
                                >
                                    Confirm Addresses
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                                    onClick={() => close(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default AddressConfirmation;

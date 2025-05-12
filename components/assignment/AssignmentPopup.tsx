'use client';

import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Link from 'next/link';
import { XMarkIcon, PhoneIcon, ClockIcon, CurrencyDollarIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ExpandedDriverAssignment } from 'interfaces/models';
import { formatPhoneNumber, formatTimeTo12Hour } from 'lib/helpers/format';

interface AssignmentPopupProps {
    isOpen: boolean;
    onClose: () => void;
    assignment?: ExpandedDriverAssignment;
    loading?: boolean;
}

const AssignmentPopup: React.FC<AssignmentPopupProps> = ({ isOpen, onClose, assignment, loading = false }) => {
    const getGoogleMapsDirectionsUrl = () => {
        const stops = routeLeg?.locations?.map((loc) => loc.loadStop || loc.location).filter(Boolean);
        if (!stops || stops.length === 0) return '#';
        const waypoints = stops
            .map(
                (stop) =>
                    `${encodeURIComponent(stop.street)},${encodeURIComponent(stop.city)},${encodeURIComponent(
                        stop.state,
                    )}`,
            )
            .join('/');
        return `https://www.google.com/maps/dir/${waypoints}`;
    };
    const drivers = assignment?.routeLeg.driverAssignments;
    const routeLeg = assignment?.routeLeg;

    const formatDate = (dateStr?: string, time?: string) =>
        dateStr ? `${format(new Date(dateStr), 'MMM d, yyyy')}${time ? ' • ' + time : ''}` : '—';

    const calculateChargeDescription = () => {
        if (!assignment) return '';
        const { chargeType, chargeValue, billedDistanceMiles, billedDurationHours, billedLoadRate, routeLeg, load } =
            assignment;
        switch (chargeType) {
            case 'PER_MILE':
                return `$${chargeValue}/mile × ${billedDistanceMiles ?? routeLeg?.distanceMiles} mi`;
            case 'PER_HOUR':
                return `$${chargeValue}/hour × ${billedDurationHours ?? routeLeg?.durationHours} hrs`;
            case 'PERCENTAGE_OF_LOAD':
                return `${chargeValue}% of $${billedLoadRate ?? load?.rate}`;
            case 'FIXED_PAY':
                return `$${chargeValue} fixed pay`;
            default:
                return '';
        }
    };

    const renderStopsSequence = () => {
        return routeLeg?.locations?.map((loc, index) => {
            const stop = loc.loadStop || loc.location;
            if (!stop) return null;
            const stopType = loc.loadStop?.type ?? 'CUSTOM STOP';
            return (
                <div key={index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-4 h-4 rounded-full ${
                                index === 0
                                    ? 'bg-green-600'
                                    : index === routeLeg.locations.length - 1
                                    ? 'bg-red-500'
                                    : 'bg-gray-400'
                            }`}
                        />

                        {index < routeLeg.locations.length - 1 && (
                            <div className="h-8  border-l-2 border-dashed border-gray-2" />
                        )}
                    </div>
                    <div className="pb-6">
                        <div className="text-xs text-gray-500 uppercase font-medium">{stopType}</div>
                        <div className="font-semibold text-gray-800">{stop.name}</div>
                        <div className="text-sm text-gray-600">
                            {stop.street}, {stop.city}, {stop.state} {stop.zip}
                        </div>
                        <div className="text-xs text-gray-500">
                            {'date' in stop ? formatDate(stop.date.toString(), stop.time) : '—'}
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-50">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 " />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="translate-y-4 opacity-0"
                        enterTo="translate-y-0 opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="translate-y-0 opacity-100"
                        leaveTo="translate-y-4 opacity-0"
                    >
                        <Dialog.Panel className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto p-6 bg-white rounded-2xl shadow-xl">
                            <button
                                onClick={onClose}
                                className=" absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1 transition"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-1">
                                Assignment Summary
                            </Dialog.Title>

                            {loading || !assignment ? (
                                <SkeletonView />
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                                        <div className="text-sm font-medium !text-gray-500 items-center">
                                            <ClockIcon className="w-3.5 h-3.5 inline-block mr-1 font-medium text-gray-800" />
                                            Scheduled:{' '}
                                            {formatDate(
                                                routeLeg?.scheduledDate.toString(),
                                                formatTimeTo12Hour(routeLeg?.scheduledTime),
                                            )}
                                        </div>
                                        <div className="flex flex-1 flex-row gap-2 items-end justify-end">
                                            <Link
                                                href={`/loads/${assignment.load.id}`}
                                                target="_blank"
                                                className="text-sm px-4 py-1.5 bg-white w-fit text-blue-600 rounded-lg  hover:bg-gray-100 border border-gray-100 transition text-center"
                                            >
                                                View Load
                                            </Link>
                                            <Link
                                                href={`/loads/${assignment.load.id}?routeLegId=${routeLeg?.id}`}
                                                target="_blank"
                                                className="text-sm px-4 py-1.5 bg-blue-600 w-fit text-white rounded-lg shadow hover:bg-blue-700 transition text-center"
                                            >
                                                Edit Assignment
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-end  px-4 py-3  rounded-xl bg-white  w-full border border-gray-100">
                                        <div className=" rounded-xl  w-full">
                                            {assignment?.load?.customer && (
                                                <div className="flex flex-row  gap-4  items-center justify-start w-full  ">
                                                    <div>
                                                        <p className="text-xs text-grey-400">Customer</p>

                                                        <Link
                                                            href={`/customers/${assignment.load.customer.id}`}
                                                            target="_blank"
                                                            className="text-sm   p-0 m-0 w-full hover:text-blue-800 hover:underline transition text-start"
                                                        >
                                                            {assignment?.load?.customer?.name}
                                                        </Link>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-grey-400">Order# </p>
                                                        <p className="text-sm font-medium p-0 m-0 w-full hover:text-blue-800 hover:underline transition text-center">
                                                            {assignment?.load?.refNum}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-grey-400">Load# </p>
                                                        <p className="text-sm font-medium p-0 m-0 w-full hover:text-blue-800 hover:underline transition text-center">
                                                            {assignment?.load?.loadNum}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-end gap-2 p-4 rounded-xl bg-gray-50  w-full">
                                        <div className="flex gap-4 flex-1 w-full">
                                            <div className=" rounded-xl bg-gray-50 flex gap-3 w-full">
                                                <div className="flex flex-col items-start gap-2">
                                                    {drivers?.map((driver) => {
                                                        return (
                                                            <div
                                                                key={driver.id}
                                                                className="flex flex-row gap-2 items-start justify-start"
                                                            >
                                                                <UserCircleIcon className="w-5 h-5 text-gray-400 mt-1" />
                                                                <div className="flex flex-col">
                                                                    <div className="text-lg font-medium text-gray-900">
                                                                        <Link
                                                                            href={`/drivers/${assignment.driver.id}`}
                                                                            target="_blank"
                                                                            className="text-md font-semibold  w-full hover:text-blue-800 hover:underline transition text-center"
                                                                        >
                                                                            {driver?.driver?.name}
                                                                        </Link>
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                                                        <PhoneIcon className="w-3 h-3 text-grey-200" />
                                                                        {formatPhoneNumber(driver?.driver?.phone)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-gray-700">Stop Sequence</div>
                                            <a
                                                href={getGoogleMapsDirectionsUrl()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                Get Directions
                                            </a>
                                        </div>
                                        <div className="ml-2 border-l-2 border-blue-300 pl-4">
                                            {renderStopsSequence()}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-2 text-blue-600 font-semibold">
                                            <CurrencyDollarIcon className="w-5 h-5" />
                                            {calculateChargeDescription()}{' '}
                                        </div>
                                        <span className="text-xs text-gray-400 font-light line-clamp-2">
                                            {' Estimated charge, final charge can be edited at the time of invoicing'}
                                        </span>
                                        <div className="text-sm text-gray-600 mt-1">
                                            Distance: {routeLeg?.distanceMiles?.toFixed(1)} mi • Duration:{' '}
                                            {routeLeg?.durationHours?.toFixed(2)} hrs
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AssignmentPopup;

const SkeletonView = () => (
    <div className="animate-pulse space-y-6 mt-4">
        <div className="h-4 w-2/3 bg-gray-200 rounded" />
        <div className="h-20 w-full bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-gray-100 rounded-lg" />
            <div className="h-28 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-16 w-full bg-blue-100 rounded-lg" />
    </div>
);

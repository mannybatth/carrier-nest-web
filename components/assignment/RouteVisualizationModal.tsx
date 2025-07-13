'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MapIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import RouteMapViewer from './RouteMapViewer';
import type { ExpandedRouteLegLocation } from 'interfaces/models';

interface RouteVisualizationModalProps {
    show: boolean;
    onClose: () => void;
    locations: ExpandedRouteLegLocation[];
    routeEncoded?: string;
    distanceMiles?: number;
    durationHours?: number;
    onRouteUpdate?: (routeData: { routeEncoded: string; distanceMiles: number; durationHours: number }) => void;
}

const RouteVisualizationModal: React.FC<RouteVisualizationModalProps> = ({
    show,
    onClose,
    locations,
    routeEncoded,
    distanceMiles,
    durationHours,
    onRouteUpdate,
}) => {
    return (
        <Transition appear show={show} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <MapIcon className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <Dialog.Title
                                                as="h3"
                                                className="text-lg font-semibold leading-6 text-gray-900"
                                            >
                                                Route Visualization
                                            </Dialog.Title>
                                            <p className="text-sm text-gray-600">
                                                View and optimize the truck route for this assignment
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="px-6 py-6">
                                    {locations.length < 2 ? (
                                        <div className="text-center py-12">
                                            <MapIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                                No Route Available
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Select at least 2 locations to view route visualization.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Current Route Summary */}
                                            {distanceMiles && durationHours && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-blue-900">
                                                                Current Route
                                                            </h4>
                                                            <div className="mt-1 flex items-center space-x-4 text-sm text-blue-700">
                                                                <span>
                                                                    <strong>{distanceMiles.toFixed(1)}</strong> miles
                                                                </span>
                                                                <span>•</span>
                                                                <span>
                                                                    <strong>{(durationHours * 60).toFixed(0)}</strong>{' '}
                                                                    minutes
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-blue-600">
                                                            <MapIcon className="h-5 w-5" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Route Map Viewer */}
                                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                <RouteMapViewer
                                                    locations={locations}
                                                    routeEncoded={routeEncoded}
                                                    distanceMiles={distanceMiles}
                                                    durationHours={durationHours}
                                                    onRouteUpdate={onRouteUpdate}
                                                    className="w-full"
                                                />
                                            </div>

                                            {/* Location Summary */}
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h4 className="text-sm font-medium text-gray-900 mb-3">
                                                    Route Stops ({locations.length})
                                                </h4>
                                                <div className="space-y-2">
                                                    {locations.map((location, index) => {
                                                        const isLoadStop = !!location.loadStop;
                                                        const item = isLoadStop ? location.loadStop : location.location;
                                                        const isPickup =
                                                            isLoadStop && location.loadStop?.type === 'SHIPPER';

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-start space-x-3 py-2"
                                                            >
                                                                <div
                                                                    className={`
                                                                    flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold
                                                                    ${
                                                                        index === 0
                                                                            ? 'bg-green-500'
                                                                            : index === locations.length - 1
                                                                            ? 'bg-red-500'
                                                                            : 'bg-blue-500'
                                                                    }
                                                                `}
                                                                >
                                                                    {index + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 capitalize">
                                                                        {item.name.toLowerCase()}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 capitalize">
                                                                        {item.street.toLowerCase()},{' '}
                                                                        {item.city.toLowerCase()},{' '}
                                                                        {item.state.toUpperCase()}
                                                                    </p>
                                                                    {isLoadStop && (
                                                                        <p className="text-xs text-blue-600 font-medium">
                                                                            {new Date(
                                                                                (item as any).date,
                                                                            ).toLocaleDateString()}{' '}
                                                                            @ {(item as any).time}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex-shrink-0">
                                                                    <span
                                                                        className={`
                                                                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                                                        ${
                                                                            isPickup
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-red-100 text-red-800'
                                                                        }
                                                                    `}
                                                                    >
                                                                        {isPickup ? 'Shipper' : 'Receiver'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        Routes are optimized for truck traffic and exclude ferries. Click on route lines
                                        to select alternatives.
                                    </p>
                                    <div className="flex space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={onClose}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default RouteVisualizationModal;

import { TruckIcon } from '@heroicons/react/outline';
import React from 'react';
import { ExpandedLoad } from '../../interfaces/models';

type LoadCardProps = {
    load: ExpandedLoad;
};

export const LoadCard: React.FC<LoadCardProps> = ({ load }: LoadCardProps) => {
    return (
        <div className="overflow-hidden rounded-lg outline-none bg-gray-50 ring-2 ring-offset-2 ring-gray-200">
            <div className="px-5 py-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0 hidden md:block">
                        <TruckIcon className="text-gray-400 w-7 h-7" aria-hidden="true" />
                    </div>
                    <div className="flex-1 w-0 ml-0 md:ml-5">
                        <dl className="space-y-1">
                            <dt className="flex">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-500 truncate">
                                        Load Ref: # {load.refNum}
                                    </div>
                                    <div>
                                        <div className="text-lg font-medium text-gray-900">{load.customer.name}</div>
                                    </div>
                                </div>
                                <div className="text-lg font-medium">${load.rate}</div>
                            </dt>
                            <dd>
                                <div className="flow-root">
                                    <ul role="list" className="-mb-8">
                                        <li>
                                            <div className="relative pb-3">
                                                <span
                                                    className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-gray-500"
                                                    aria-hidden="true"
                                                />
                                                <div className="relative flex items-start space-x-1">
                                                    <>
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-gray-500">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    }).format(new Date(load.shipper.date))}
                                                                </span>
                                                                <div className="block md:hidden">
                                                                    {load.shipper.city}, {load.shipper.state}
                                                                </div>
                                                                <div className="hidden md:block">
                                                                    {load.shipper.name} {load.shipper.street}{' '}
                                                                    {load.shipper.city}, {load.shipper.state}{' '}
                                                                    {load.shipper.zip}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                </div>
                                            </div>
                                        </li>
                                        {load.stops && load.stops.length > 0 && (
                                            <li className="hidden md:block">
                                                <div className="relative pb-3">
                                                    <span
                                                        className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-gray-500"
                                                        aria-hidden="true"
                                                    />
                                                    <div className="relative flex items-center space-x-1">
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-[1px] border-gray-300 bg-gray-50 text-gray-800">
                                                                {load.stops.length} Stop{load.stops.length > 1 && 's'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        )}
                                        <li>
                                            <div className="relative pb-8">
                                                <div className="relative flex items-start space-x-1">
                                                    <>
                                                        <div className="relative flex items-center justify-center w-6 h-6 px-1">
                                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-gray-500">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {new Intl.DateTimeFormat('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    }).format(new Date(load.receiver.date))}
                                                                </span>
                                                                <div className="block md:hidden">
                                                                    {load.receiver.city}, {load.receiver.state}
                                                                </div>
                                                                <div className="hidden md:block">
                                                                    {load.receiver.name} {load.receiver.street}{' '}
                                                                    {load.receiver.city}, {load.receiver.state}{' '}
                                                                    {load.receiver.zip}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

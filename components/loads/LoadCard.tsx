import { ArrowRightIcon, TruckIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { ExpandedLoad } from '../../interfaces/models';
import { formatValue } from 'react-currency-input-field';

type LoadCardProps = {
    load: ExpandedLoad;
};

export const LoadCard: React.FC<LoadCardProps> = ({ load }) => {
    return (
        <div className="overflow-hidden rounded-lg outline-none bg-gray-50 ring-2 ring-offset-2 ring-gray-200">
            <div className="px-5 py-3">
                <dl>
                    <dt className="flex items-center">
                        <div className="flex-shrink-0 hidden mr-4 md:block">
                            <TruckIcon className="text-gray-400 w-7 h-7" aria-hidden="true" />
                        </div>
                        <div className="flex-1 hidden mr-3 sm:block">
                            <div className="text-xl font-medium text-gray-900">{load.customer.name}</div>
                            <div className="text-sm font-medium text-gray-500 truncate">Load Ref: # {load.refNum}</div>
                        </div>
                        <div className="flex-grow mr-3 text-lg font-medium">
                            <div className="flex flex-row items-center justify-center space-x-4">
                                <div className="text-xs text-gray-500">
                                    <div className="text-base font-medium text-gray-900">
                                        {new Intl.DateTimeFormat('en-US', {
                                            month: 'short',
                                            day: '2-digit',
                                        }).format(new Date(load.shipper.date))}
                                    </div>
                                    <div>
                                        {load.shipper.city}, {load.shipper.state}
                                    </div>
                                </div>
                                <div>
                                    <ArrowRightIcon className="w-4 h-4"></ArrowRightIcon>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <div className="text-base font-medium text-gray-900">
                                        {new Intl.DateTimeFormat('en-US', {
                                            month: 'short',
                                            day: '2-digit',
                                        }).format(new Date(load.receiver.date))}
                                    </div>
                                    <div>
                                        {load.receiver.city}, {load.receiver.state}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 text-lg font-medium text-right">
                            {formatValue({
                                value: load.rate.toString(),
                                groupSeparator: ',',
                                decimalSeparator: '.',
                                prefix: '$',
                                decimalScale: 2,
                            })}
                        </div>
                    </dt>
                </dl>
            </div>
        </div>
    );
};

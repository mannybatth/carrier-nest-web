'use client';

import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Sort } from 'interfaces/table';

type SortOption = {
    key: string;
    title: string;
};

type SortDropdownProps = {
    options: SortOption[];
    currentSort: Sort;
    onChange: (sort: Sort) => void;
};

export default function LoadsTableSortDropdown({ options, currentSort, onChange }: SortDropdownProps) {
    const handleSortChange = (key: string) => {
        if (currentSort?.key === key) {
            // Toggle order if same key
            onChange({
                key,
                order: currentSort.order === 'asc' ? 'desc' : 'asc',
            });
        } else {
            // New key, default to ascending
            onChange({
                key,
                order: 'asc',
            });
        }
    };

    const clearSort = () => {
        onChange(null);
    };

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className="inline-flex items-center justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    <FunnelIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                    Sort
                    {currentSort && (
                        <span className="ml-1 text-blue-600">
                            : {options.find((opt) => opt.key === currentSort.key)?.title}
                            {currentSort.order === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                    )}
                    <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {options.map((option) => (
                            <Menu.Item key={option.key}>
                                {({ active }) => (
                                    <button
                                        onClick={() => handleSortChange(option.key)}
                                        className={`${
                                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                        } group flex w-full items-center justify-between px-4 py-2 text-sm`}
                                    >
                                        <span>{option.title}</span>
                                        {currentSort?.key === option.key &&
                                            (currentSort.order === 'asc' ? (
                                                <ArrowUpIcon className="h-4 w-4 text-blue-600" />
                                            ) : (
                                                <ArrowDownIcon className="h-4 w-4 text-blue-600" />
                                            ))}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}
                    </div>
                    {currentSort && (
                        <div className="py-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={clearSort}
                                        className={`${
                                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                        } group flex w-full items-center px-4 py-2 text-sm`}
                                    >
                                        Clear sort
                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                    )}
                </Menu.Items>
            </Transition>
        </Menu>
    );
}

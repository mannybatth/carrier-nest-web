'use client';

import { Combobox, Dialog, Transition } from '@headlessui/react';
import { FaceFrownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { Customer, Driver, Load } from '@prisma/client';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import type { NextRouter } from 'next/router';
import React, { Fragment, useEffect, useState } from 'react';
import type { SearchResult } from '../../interfaces/models';
import { useDebounce } from '../../lib/debounce';
import { search } from '../../lib/rest/search';

interface SideBarSearchProps {
    collapsed: boolean;
}

const SideBarSearch: React.FC<SideBarSearchProps> = ({ collapsed }) => {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] =
        React.useState<[string, SearchResult<Load>[] | SearchResult<Customer>[] | SearchResult<Driver>[]][]>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (!debouncedSearchTerm) {
            setIsSearching(false);
            setSearchResults(null);
            return;
        }

        async function searchFetch() {
            const results = await search(debouncedSearchTerm);
            setIsSearching(false);

            const noResults = Object.values(results).every((result) => result.length === 0);
            if (noResults) {
                setSearchResults([]);
                return;
            }

            const entries = Object.entries(results).sort(
                ([, a], [, b]) => ((b[0] && b[0].sim) || 0) - ((a[0] && a[0].sim) || 0),
            );
            setSearchResults(entries);
        }

        searchFetch();
    }, [debouncedSearchTerm]);

    const afterLeave = () => {
        setIsSearching(false);
        setSearchTerm('');
        setSearchResults(null);
        setOpen(false);
    };

    if (collapsed) {
        return (
            <>
                <div className="px-2 mt-4">
                    <button
                        onClick={() => setOpen(true)}
                        className="flex items-center justify-center w-full p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
                        data-tooltip-id="tooltip"
                        data-tooltip-content="Quick Find"
                        data-tooltip-place="right"
                    >
                        <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                </div>
                <SearchDialog
                    open={open}
                    setOpen={setOpen}
                    afterLeave={afterLeave}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    isSearching={isSearching}
                    setIsSearching={setIsSearching}
                    searchResults={searchResults}
                    router={router}
                />
            </>
        );
    }

    return (
        <>
            <div className="px-3 mt-4">
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
                >
                    <MagnifyingGlassIcon className="flex-shrink-0 w-5 h-5 mr-3" />
                    Quick Find
                </button>
            </div>
            <SearchDialog
                open={open}
                setOpen={setOpen}
                afterLeave={afterLeave}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isSearching={isSearching}
                setIsSearching={setIsSearching}
                searchResults={searchResults}
                router={router}
            />
        </>
    );
};

// Clean search dialog
interface SearchDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    afterLeave: () => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isSearching: boolean;
    setIsSearching: (searching: boolean) => void;
    searchResults: [string, SearchResult<Load>[] | SearchResult<Customer>[] | SearchResult<Driver>[]][] | null;
    router: NextRouter;
}

/* eslint-disable react/prop-types */
const SearchDialog: React.FC<SearchDialogProps> = ({
    open,
    setOpen,
    afterLeave,
    searchTerm,
    setSearchTerm,
    isSearching,
    setIsSearching,
    searchResults,
    router,
}) => (
    <Transition.Root show={open} as={Fragment} afterLeave={afterLeave}>
        <Dialog as="div" className="fixed inset-0 z-50 p-4 overflow-y-auto sm:p-6 md:p-20" onClose={setOpen}>
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <Dialog.Overlay className="fixed inset-0 bg-slate-500 bg-opacity-25 backdrop-blur-sm" />
            </Transition.Child>

            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <Combobox
                    as="div"
                    className="relative z-50 max-w-xl mx-auto overflow-hidden bg-white shadow-xl rounded-xl ring-1 ring-slate-200"
                    value=""
                    onChange={(selection: any) => {
                        const { group, item } = selection;
                        if (group === 'loads') {
                            router.push(`/loads/${item.id}`);
                        } else if (group === 'customers') {
                            router.push(`/customers/${item.id}`);
                        } else if (group === 'drivers') {
                            router.push(`/drivers/${item.id}`);
                        }
                        afterLeave();
                    }}
                >
                    <div className="relative">
                        <MagnifyingGlassIcon
                            className="pointer-events-none absolute top-4 left-4 h-5 w-5 text-slate-400"
                            aria-hidden="true"
                        />
                        <Combobox.Input
                            className="w-full h-12 pr-4 text-slate-900 placeholder-slate-400 bg-transparent border-0 pl-11 focus:ring-0 sm:text-sm"
                            placeholder="Search for a load, customer, or driver"
                            autoComplete="off"
                            onChange={(e) => {
                                if (e.target.value.length > 0) {
                                    setIsSearching(true);
                                }
                                setSearchTerm(e.target.value);
                            }}
                        />
                    </div>

                    {isSearching ? (
                        <div className="px-6 py-6 text-sm text-center border-t border-slate-100">
                            <div className="inline-block w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="mt-2 text-slate-600">Searching...</p>
                        </div>
                    ) : (
                        <>
                            {searchResults?.length > 0 && (
                                <Combobox.Options
                                    static
                                    className="relative z-50 py-2 overflow-y-auto text-sm max-h-72 border-t border-slate-100"
                                >
                                    {searchResults.map(
                                        ([group, items]) =>
                                            items.length > 0 && (
                                                <li key={group}>
                                                    <h2 className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                                                        {group}
                                                    </h2>
                                                    <ul>
                                                        {items.map((item) => (
                                                            <Combobox.Option
                                                                key={item.id}
                                                                value={{ group, item }}
                                                                className={({ active }) =>
                                                                    classNames(
                                                                        'cursor-pointer select-none px-4 py-3 transition-colors duration-150',
                                                                        active
                                                                            ? 'bg-blue-50 text-blue-900'
                                                                            : 'text-slate-900',
                                                                    )
                                                                }
                                                            >
                                                                {group === 'loads' && (
                                                                    <p className="font-medium">
                                                                        {item.refNum}
                                                                        {item.loadNum ? ` (Load# ${item.loadNum})` : ''}
                                                                        {item.stopName
                                                                            ? ` - (${item.stopType} Name: ` +
                                                                              item.stopName +
                                                                              ')'
                                                                            : ''}
                                                                        {item.stopCity
                                                                            ? ` - (${item.stopType}: ` +
                                                                              item.stopCity +
                                                                              ', ' +
                                                                              item.stopState +
                                                                              ')'
                                                                            : ''}
                                                                    </p>
                                                                )}
                                                                {group === 'drivers' && (
                                                                    <p className="font-medium">{item.name}</p>
                                                                )}
                                                                {group === 'customers' && (
                                                                    <p className="font-medium">{item.name}</p>
                                                                )}
                                                            </Combobox.Option>
                                                        ))}
                                                    </ul>
                                                </li>
                                            ),
                                    )}
                                </Combobox.Options>
                            )}

                            {searchResults?.length === 0 && (
                                <div className="px-6 py-6 text-sm text-center border-t border-slate-100">
                                    <FaceFrownIcon className="w-6 h-6 mx-auto text-slate-400 mb-3" aria-hidden="true" />
                                    <p className="font-semibold text-slate-900">No results found</p>
                                    <p className="mt-2 text-slate-500">
                                        We couldn&apos;t find anything with that term. Please try again.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </Combobox>
            </Transition.Child>
        </Dialog>
    </Transition.Root>
);

export default SideBarSearch;

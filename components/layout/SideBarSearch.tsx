import { Combobox, Dialog, Transition } from '@headlessui/react';
import { FaceFrownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Customer, Driver, Load } from '@prisma/client';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect, useState } from 'react';
import { SearchResult } from '../../interfaces/models';
import { useDebounce } from '../../lib/debounce';
import { search } from '../../lib/rest/search';
import Spinner from '../Spinner';

const SideBarSearch: React.FC = () => {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] =
        React.useState<[string, SearchResult<Load>[] | SearchResult<Customer>[] | SearchResult<Driver>[]][]>(null);
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

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

    return (
        <>
            <div className="mt-5 space-y-1">
                <a
                    onClick={() => setOpen(true)}
                    className="flex items-center px-4 py-2 text-sm text-zinc-600 hover:bg-gray-200 hover:cursor-pointer hover:text-zinc-700 active:bg-gray-300 group"
                >
                    <MagnifyingGlassIcon className="flex-shrink-0 w-4 h-4 mr-3 text-slate-500 group-hover:text-slate-600" />
                    Quick Find
                </a>
            </div>
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
                        <Dialog.Overlay className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-25" />
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
                            className="z-10 max-w-xl mx-auto overflow-hidden transition-all transform bg-white divide-y divide-gray-100 shadow-2xl rounded-xl ring-4 ring-black ring-opacity-5"
                            value=""
                            onChange={({ group, item }: any) => {
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
                                    className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                                <Combobox.Input
                                    className="w-full h-12 pr-4 text-gray-800 placeholder-gray-400 bg-transparent border-0 pl-11 focus:ring-0 sm:text-sm"
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
                                <div className="px-6 py-6 text-sm text-center border-t border-gray-100 sm:px-14">
                                    <Spinner className="inline-block text-gray-700"></Spinner>
                                </div>
                            ) : (
                                <>
                                    {searchResults?.length > 0 && (
                                        <Combobox.Options
                                            static
                                            className="z-10 py-2 space-y-2 overflow-y-auto text-sm text-gray-800 max-h-72 scroll-py-2"
                                        >
                                            {searchResults.map(
                                                ([group, items]) =>
                                                    items.length > 0 && (
                                                        <li key={group}>
                                                            <h2 className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase bg-gray-100">
                                                                {group}
                                                            </h2>
                                                            <ul className="mt-2 text-sm text-gray-800">
                                                                {items.map((item) => (
                                                                    <Combobox.Option
                                                                        key={item.id}
                                                                        value={{
                                                                            group,
                                                                            item,
                                                                        }}
                                                                        className={({ active }) =>
                                                                            classNames(
                                                                                'cursor-pointer select-none px-4 py-2',
                                                                                active &&
                                                                                    'bg-blue-500 text-white cursor-pointer',
                                                                            )
                                                                        }
                                                                    >
                                                                        {group === 'loads' && (
                                                                            <p className="font-medium uppercase">
                                                                                {item.refNum}
                                                                                {item.loadNum
                                                                                    ? ` (Load# ${item.loadNum})`
                                                                                    : ''}
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
                                                                        {group === 'drivers' && item.name}
                                                                        {group === 'customers' && item.name}
                                                                    </Combobox.Option>
                                                                ))}
                                                            </ul>
                                                        </li>
                                                    ),
                                            )}
                                        </Combobox.Options>
                                    )}

                                    {searchResults?.length === 0 && (
                                        <div className="px-6 py-6 text-sm text-center border-t border-gray-100 sm:px-14">
                                            <FaceFrownIcon
                                                className="w-6 h-6 mx-auto text-gray-400"
                                                aria-hidden="true"
                                            />
                                            <p className="mt-4 font-semibold text-gray-900">No results found</p>
                                            <p className="mt-2 text-gray-500">
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
        </>
    );
};

export default SideBarSearch;

import React, { Fragment, useState } from 'react';
import { SearchIcon } from '@heroicons/react/outline';
import { Combobox, Dialog, Transition } from '@headlessui/react';

const people = [
    { id: 1, name: 'Leslie Alexander', url: '#' },
    // More people...
];

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const SideBarSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);

    const filteredPeople =
        query === '' ? [] : people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()));

    return (
        <>
            <div className="mt-5 space-y-1 ">
                <a
                    onClick={() => setOpen(true)}
                    className="flex items-center px-4 py-2 text-sm text-zinc-600 hover:bg-gray-200 hover:cursor-pointer hover:text-zinc-700 active:bg-gray-300 group"
                >
                    <SearchIcon className="flex-shrink-0 w-4 h-4 mr-3 text-slate-500 group-hover:text-slate-600" />
                    Quick Find
                </a>
            </div>
            <Transition.Root show={open} as={Fragment} afterLeave={() => setQuery('')}>
                <Dialog as="div" className="fixed inset-0 z-10 p-4 overflow-y-auto sm:p-6 md:p-20" onClose={setOpen}>
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
                            className="max-w-xl mx-auto overflow-hidden transition-all transform bg-white divide-y divide-gray-100 shadow-2xl rounded-xl ring-4 ring-black ring-opacity-5"
                            value=""
                            onChange={(person: any) => setOpen(false)}
                        >
                            <div className="relative">
                                <SearchIcon
                                    className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                                <Combobox.Input
                                    className="w-full h-12 pr-4 text-gray-800 placeholder-gray-400 bg-transparent border-0 pl-11 focus:ring-0 sm:text-sm"
                                    placeholder="Search for a load, customer, or driver"
                                    autoComplete="off"
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                            </div>

                            {filteredPeople.length > 0 && (
                                <Combobox.Options
                                    static
                                    className="py-2 overflow-y-auto text-sm text-gray-800 max-h-72 scroll-py-2"
                                >
                                    {filteredPeople.map((person) => (
                                        <Combobox.Option
                                            key={person.id}
                                            value={person}
                                            className={({ active }) =>
                                                classNames(
                                                    'cursor-default select-none px-4 py-2',
                                                    active && 'bg-blue-500 text-white cursor-pointer',
                                                )
                                            }
                                        >
                                            {person.name}
                                        </Combobox.Option>
                                    ))}
                                </Combobox.Options>
                            )}

                            {query !== '' && filteredPeople.length === 0 && (
                                <p className="p-4 text-sm text-gray-500">No people found.</p>
                            )}
                        </Combobox>
                    </Transition.Child>
                </Dialog>
            </Transition.Root>
        </>
    );
};

export default SideBarSearch;

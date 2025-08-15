import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    PencilIcon,
    DocumentTextIcon,
    DocumentPlusIcon,
    UserPlusIcon,
    ArrowDownTrayIcon,
    DocumentDuplicateIcon,
    TrashIcon,
    EllipsisHorizontalIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { ExpandedLoad } from 'interfaces/models';
import React, { Fragment } from 'react';

type ActionsDropdownProps = {
    load: ExpandedLoad;
    disabled: boolean;
    editLoadClicked: () => void;
    viewInvoiceClicked?: () => void;
    createInvoiceClicked?: () => void;
    addAssignmentClicked: () => void;
    addExpenseClicked?: () => void;
    downloadCombinedPDF: () => void;
    makeCopyOfLoadClicked: () => void;
    deleteLoadClicked: () => void;
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
    load,
    disabled,
    editLoadClicked,
    viewInvoiceClicked,
    createInvoiceClicked,
    addAssignmentClicked,
    addExpenseClicked,
    downloadCombinedPDF,
    makeCopyOfLoadClicked,
    deleteLoadClicked,
}) => {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500/80 to-indigo-600/80 backdrop-blur-xl rounded-2xl border border-white/20 hover:from-blue-600/90 hover:to-indigo-700/90 hover:border-white/30 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0 transition-all duration-300 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabled}
                >
                    <EllipsisHorizontalIcon className="w-4 h-4 mr-2 text-white/90" aria-hidden="true" />
                    Actions
                    <ChevronDownIcon className="w-4 h-4 ml-2 text-white/80" aria-hidden="true" />
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
                <Menu.Items className="absolute right-0 z-[100] w-64 mt-1 origin-top-right bg-white backdrop-blur-3xl rounded-2xl border border-gray-200 shadow-2xl shadow-black/10 focus:outline-none overflow-hidden ring-1 ring-gray-100">
                    <div className="py-2">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        editLoadClicked();
                                    }}
                                    className={classNames(
                                        'group w-full flex items-center px-3 py-2 text-sm text-left transition-all duration-200 backdrop-blur-xl rounded-lg mx-1 my-0.5',
                                        'transform hover:scale-[1.02] hover:shadow-md hover:shadow-blue-500/20',
                                        active
                                            ? 'bg-blue-500/80 text-white backdrop-blur-2xl scale-[1.02] shadow-md shadow-blue-500/30'
                                            : 'text-gray-900 hover:bg-white/60 hover:backdrop-blur-2xl',
                                    )}
                                >
                                    <PencilIcon
                                        className={classNames(
                                            'w-4 h-4 mr-3 transition-all duration-200',
                                            active
                                                ? 'text-white scale-110'
                                                : 'text-gray-400 group-hover:text-gray-500 group-hover:scale-110',
                                        )}
                                    />
                                    Edit Load
                                </button>
                            )}
                        </Menu.Item>

                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (load.invoice) {
                                            viewInvoiceClicked();
                                        } else {
                                            createInvoiceClicked();
                                        }
                                    }}
                                    className={classNames(
                                        'group w-full flex items-center px-3 py-2 text-sm text-left transition-all duration-200 backdrop-blur-xl rounded-lg mx-1 my-0.5',
                                        'transform hover:scale-[1.02] hover:shadow-md hover:shadow-blue-500/20',
                                        active
                                            ? 'bg-blue-500/80 text-white backdrop-blur-2xl scale-[1.02] shadow-md shadow-blue-500/30'
                                            : 'text-gray-900 hover:bg-white/60 hover:backdrop-blur-2xl',
                                    )}
                                >
                                    {load.invoice ? (
                                        <DocumentTextIcon
                                            className={classNames(
                                                'w-4 h-4 mr-3 transition-all duration-200',
                                                active
                                                    ? 'text-white scale-110'
                                                    : 'text-gray-400 group-hover:text-gray-500 group-hover:scale-110',
                                            )}
                                        />
                                    ) : (
                                        <DocumentPlusIcon
                                            className={classNames(
                                                'w-4 h-4 mr-3 transition-all duration-200',
                                                active
                                                    ? 'text-white scale-110'
                                                    : 'text-gray-400 group-hover:text-gray-500 group-hover:scale-110',
                                            )}
                                        />
                                    )}
                                    {load.invoice ? 'Go to Invoice' : 'Create Invoice'}
                                </button>
                            )}
                        </Menu.Item>

                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addAssignmentClicked();
                                    }}
                                    className={classNames(
                                        'group w-full flex items-center px-3 py-2 text-sm text-left transition-all duration-200 backdrop-blur-xl rounded-lg mx-1 my-0.5',
                                        'transform hover:scale-[1.02] hover:shadow-md hover:shadow-blue-500/20',
                                        active
                                            ? 'bg-blue-500/80 text-white backdrop-blur-2xl scale-[1.02] shadow-md shadow-blue-500/30'
                                            : 'text-gray-900 hover:bg-white/60 hover:backdrop-blur-2xl',
                                    )}
                                >
                                    <UserPlusIcon
                                        className={classNames(
                                            'w-4 h-4 mr-3 transition-all duration-200',
                                            active
                                                ? 'text-white scale-110'
                                                : 'text-gray-400 group-hover:text-gray-500 group-hover:scale-110',
                                        )}
                                    />
                                    Add Assignment
                                </button>
                            )}
                        </Menu.Item>

                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addExpenseClicked?.();
                                    }}
                                    className={classNames(
                                        'group w-full flex items-center px-3 py-2 text-sm text-left transition-all duration-200 backdrop-blur-xl rounded-lg mx-1 my-0.5',
                                        'transform hover:scale-[1.02] hover:shadow-md hover:shadow-green-500/20',
                                        active
                                            ? 'bg-green-500/80 text-white backdrop-blur-2xl scale-[1.02] shadow-md shadow-green-500/30'
                                            : 'text-gray-900 hover:bg-white/60 hover:backdrop-blur-2xl',
                                    )}
                                >
                                    <PlusIcon
                                        className={classNames(
                                            'w-4 h-4 mr-3 transition-all duration-200',
                                            active
                                                ? 'text-white scale-110'
                                                : 'text-green-500 group-hover:text-green-600 group-hover:scale-110',
                                        )}
                                    />
                                    Add Expense
                                </button>
                            )}
                        </Menu.Item>

                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadCombinedPDF();
                                    }}
                                    className={classNames(
                                        'group w-full flex items-center px-3 py-2 text-sm text-left transition-all duration-200 backdrop-blur-xl rounded-lg mx-1 my-0.5',
                                        'transform hover:scale-[1.02] hover:shadow-md hover:shadow-blue-500/20',
                                        active
                                            ? 'bg-blue-500/80 text-white backdrop-blur-2xl scale-[1.02] shadow-md shadow-blue-500/30'
                                            : 'text-gray-900 hover:bg-white/60 hover:backdrop-blur-2xl',
                                    )}
                                >
                                    <ArrowDownTrayIcon
                                        className={classNames(
                                            'w-4 h-4 mr-3 transition-all duration-200',
                                            active
                                                ? 'text-white scale-110'
                                                : 'text-gray-400 group-hover:text-gray-500 group-hover:scale-110',
                                        )}
                                    />
                                    Download PDF
                                </button>
                            )}
                        </Menu.Item>

                        <div className="h-px bg-gray-200 mx-0 my-1" />

                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        makeCopyOfLoadClicked();
                                    }}
                                    className={classNames(
                                        'group w-full flex items-center px-3 py-2 text-sm text-left transition-all duration-200 backdrop-blur-xl rounded-lg mx-1 my-0.5',
                                        'transform hover:scale-[1.02] hover:shadow-md hover:shadow-blue-500/20',
                                        active
                                            ? 'bg-blue-500/80 text-white backdrop-blur-2xl scale-[1.02] shadow-md shadow-blue-500/30'
                                            : 'text-gray-900 hover:bg-white/60 hover:backdrop-blur-2xl',
                                    )}
                                >
                                    <DocumentDuplicateIcon
                                        className={classNames(
                                            'w-4 h-4 mr-3 transition-all duration-200',
                                            active
                                                ? 'text-white scale-110'
                                                : 'text-gray-400 group-hover:text-gray-500 group-hover:scale-110',
                                        )}
                                    />
                                    Make Copy
                                </button>
                            )}
                        </Menu.Item>

                        <div className="h-px bg-red-200/60 mx-0 my-1" />

                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteLoadClicked();
                                    }}
                                    className={classNames(
                                        'group w-full flex items-center px-3 py-2 text-sm text-left transition-all duration-200 backdrop-blur-xl rounded-lg mx-1 my-0.5',
                                        'transform hover:scale-[1.02] hover:shadow-md hover:shadow-red-500/20',
                                        active
                                            ? 'bg-red-500/80 text-white backdrop-blur-2xl scale-[1.02] shadow-md shadow-red-500/30'
                                            : 'text-red-600 hover:bg-red-50/60 hover:backdrop-blur-2xl',
                                    )}
                                >
                                    <TrashIcon
                                        className={classNames(
                                            'w-4 h-4 mr-3 transition-all duration-200',
                                            active
                                                ? 'text-white scale-110'
                                                : 'text-red-500 group-hover:text-red-600 group-hover:scale-110',
                                        )}
                                    />
                                    Delete Load
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default ActionsDropdown;

import React, { Fragment, useEffect, useState } from 'react';
import { ExpandedLoad } from 'interfaces/models';
import { Menu, Transition } from '@headlessui/react';
import classNames from 'classnames';
import { PencilIcon, UserPlusIcon, DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline';

type LoadDetailsToolbarProps = {
    className?: string;
    load: ExpandedLoad;
    disabled: boolean;
    editLoadClicked: () => void;
    viewInvoiceClicked?: () => void;
    createInvoiceClicked?: () => void;
    assignDriverClicked: () => void;
};

const LoadDetailsToolbar: React.FC<LoadDetailsToolbarProps> = ({
    className,
    load,
    disabled,
    editLoadClicked,
    viewInvoiceClicked,
    createInvoiceClicked,
    assignDriverClicked,
}) => {
    return (
        <div className={`top-0 flex flex-row place-content-between md:sticky ${className}`}>
            <div className="hidden md:flex space-x-3">
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-xl rounded-xl border border-slate-400/30 hover:from-slate-700/95 hover:to-slate-800/95 hover:border-slate-300/40 focus:ring-2 focus:ring-slate-400/50 focus:ring-offset-2 focus:ring-offset-slate-100/30 transition-all duration-300 shadow-xl shadow-slate-500/25 disabled:opacity-50 disabled:shadow-none"
                    onClick={editLoadClicked}
                    disabled={disabled}
                >
                    <div className="flex items-center justify-center w-5 h-5 mr-2 rounded-lg bg-white/20 backdrop-blur-sm">
                        <PencilIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    Edit Load
                </button>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-xl rounded-xl border border-slate-400/30 hover:from-slate-700/95 hover:to-slate-800/95 hover:border-slate-300/40 focus:ring-2 focus:ring-slate-400/50 focus:ring-offset-2 focus:ring-offset-slate-100/30 transition-all duration-300 shadow-xl shadow-slate-500/25 disabled:opacity-50 disabled:shadow-none"
                    onClick={assignDriverClicked}
                    disabled={disabled}
                >
                    <div className="flex items-center justify-center w-5 h-5 mr-2 rounded-lg bg-white/20 backdrop-blur-sm">
                        <UserPlusIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    Add Assignment
                </button>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-gradient-to-r from-slate-100/90 to-slate-200/90 backdrop-blur-xl rounded-xl border border-slate-300/40 hover:from-slate-200/95 hover:to-slate-300/95 hover:border-slate-400/50 focus:ring-2 focus:ring-slate-400/30 focus:ring-offset-2 focus:ring-offset-slate-50/30 transition-all duration-300 shadow-xl shadow-slate-400/20 disabled:opacity-50 disabled:shadow-none"
                    onClick={() => {
                        if (load.invoice) {
                            viewInvoiceClicked();
                        } else {
                            createInvoiceClicked();
                        }
                    }}
                    disabled={disabled}
                >
                    <div className="flex items-center justify-center w-5 h-5 mr-2 rounded-lg bg-slate-200/60 backdrop-blur-sm">
                        {load?.invoice ? (
                            <EyeIcon className="w-3.5 h-3.5 text-slate-600" />
                        ) : (
                            <DocumentTextIcon className="w-3.5 h-3.5 text-slate-600" />
                        )}
                    </div>
                    {load?.invoice ? 'Go to Invoice' : 'Create Invoice'}
                </button>
            </div>

            <div className="inline-flex">{/* Status dropdown moved to LoadDetailsInfo component */}</div>
        </div>
    );
};

export default LoadDetailsToolbar;

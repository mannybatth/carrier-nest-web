import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
    EllipsisVerticalIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    ArrowPathIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';

interface ExpenseActionMenuProps {
    expense: {
        id?: string;
        approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
        driverInvoiceId?: string;
    };
    onEdit?: (expenseId: string) => void;
    onApprove?: (expenseId: string) => void;
    onReject?: (expenseId: string) => void;
    onClearStatus?: (expenseId: string) => void;
    onDelete?: (expenseId: string) => void;
    disabled?: boolean;
    size?: 'small' | 'medium'; // For different UI contexts
    // Processing states
    isApproving?: boolean;
    isRejecting?: boolean;
    isClearingStatus?: boolean;
    isDeleting?: boolean;
}

const ExpenseActionMenu: React.FC<ExpenseActionMenuProps> = ({
    expense,
    onEdit,
    onApprove,
    onReject,
    onClearStatus,
    onDelete,
    disabled = false,
    size = 'medium',
    isApproving = false,
    isRejecting = false,
    isClearingStatus = false,
    isDeleting = false,
}) => {
    const isInvoiced = Boolean(expense.driverInvoiceId);
    const isProcessing = isApproving || isRejecting || isClearingStatus || isDeleting;
    const isDisabled = disabled || isInvoiced || isProcessing;

    // Safety check for required properties
    if (!expense.id) {
        return null;
    }

    const buttonClass = size === 'small' ? 'w-6 h-6 p-1' : 'h-[42px] px-3 py-2.5'; // Match edit button height

    const iconClass = size === 'small' ? 'w-4 h-4' : 'w-4 h-4';

    const menuItemClass = size === 'small' ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm';

    const iconContainerClass = size === 'small' ? 'p-1.5 rounded-lg mr-2' : 'p-2 rounded-lg mr-3';

    return (
        <Menu as="div" className="relative inline-block text-left">
            <Menu.Button
                className={`${buttonClass} group relative inline-flex items-center justify-center text-gray-600 bg-gray-50/80 hover:bg-gray-100/80 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:border-gray-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 focus:ring-offset-white/50 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isDisabled}
            >
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 rounded-lg">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                <EllipsisVerticalIcon className={`${iconClass} relative z-10 ${isProcessing ? 'opacity-0' : ''}`} />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white/95 backdrop-blur-xl border border-gray-200/50 divide-y divide-gray-100/50 rounded-xl shadow-lg ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden">
                    <div className="p-1">
                        {/* Edit Action */}
                        {onEdit && (
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={() => onEdit(expense.id)}
                                        className={`${
                                            active
                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900'
                                                : 'text-gray-700'
                                        } group flex items-center w-full ${menuItemClass} font-medium rounded-lg transition-all duration-200`}
                                    >
                                        <div
                                            className={`${iconContainerClass} ${
                                                active ? 'bg-blue-100/80 text-blue-600' : 'bg-gray-100/80 text-gray-500'
                                            } transition-colors duration-200`}
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">Edit Expense</div>
                                            <div className="text-xs text-gray-500 mt-0.5">Modify expense details</div>
                                        </div>
                                    </button>
                                )}
                            </Menu.Item>
                        )}

                        {/* Status Actions */}
                        {expense.approvalStatus === 'PENDING' && (
                            <>
                                {/* Approve Action */}
                                {onApprove && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => onApprove(expense.id)}
                                                disabled={isDisabled}
                                                className={`${
                                                    active
                                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-900'
                                                        : 'text-gray-700'
                                                } group flex items-center w-full ${menuItemClass} font-medium rounded-lg transition-all duration-200 ${
                                                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                            >
                                                <div
                                                    className={`${iconContainerClass} ${
                                                        active
                                                            ? 'bg-green-100/80 text-green-600'
                                                            : 'bg-gray-100/80 text-gray-500'
                                                    } transition-colors duration-200 relative`}
                                                >
                                                    {isApproving ? (
                                                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <CheckIcon className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium">
                                                        {isApproving ? 'Approving...' : 'Approve'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Mark as approved</div>
                                                </div>
                                            </button>
                                        )}
                                    </Menu.Item>
                                )}

                                {/* Reject Action */}
                                {onReject && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => onReject(expense.id)}
                                                disabled={isDisabled}
                                                className={`${
                                                    active
                                                        ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-900'
                                                        : 'text-gray-700'
                                                } group flex items-center w-full ${menuItemClass} font-medium rounded-lg transition-all duration-200 ${
                                                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                            >
                                                <div
                                                    className={`${iconContainerClass} ${
                                                        active
                                                            ? 'bg-orange-100/80 text-orange-600'
                                                            : 'bg-gray-100/80 text-gray-500'
                                                    } transition-colors duration-200 relative`}
                                                >
                                                    {isRejecting ? (
                                                        <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <XMarkIcon className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium">
                                                        {isRejecting ? 'Rejecting...' : 'Reject'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Mark as rejected</div>
                                                </div>
                                            </button>
                                        )}
                                    </Menu.Item>
                                )}
                            </>
                        )}

                        {/* Clear Status Action */}
                        {(expense.approvalStatus === 'APPROVED' || expense.approvalStatus === 'REJECTED') &&
                            onClearStatus && (
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => onClearStatus(expense.id)}
                                            disabled={isDisabled}
                                            className={`${
                                                active
                                                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-900'
                                                    : 'text-gray-700'
                                            } group flex items-center w-full ${menuItemClass} font-medium rounded-lg transition-all duration-200 ${
                                                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <div
                                                className={`${iconContainerClass} ${
                                                    active
                                                        ? 'bg-yellow-100/80 text-yellow-600'
                                                        : 'bg-gray-100/80 text-gray-500'
                                                } transition-colors duration-200 relative`}
                                            >
                                                {isClearingStatus ? (
                                                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <ArrowPathIcon className="h-4 w-4" />
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-medium">
                                                    {isClearingStatus ? 'Clearing...' : 'Clear Status'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">Reset to pending</div>
                                            </div>
                                        </button>
                                    )}
                                </Menu.Item>
                            )}
                    </div>

                    {/* Delete Action - Separate section */}
                    {onDelete && (
                        <div className="p-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={() => onDelete(expense.id)}
                                        disabled={isDisabled}
                                        className={`${
                                            active
                                                ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-900'
                                                : 'text-red-600'
                                        } group flex items-center w-full ${menuItemClass} font-medium rounded-lg transition-all duration-200 ${
                                            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <div
                                            className={`${iconContainerClass} ${
                                                active ? 'bg-red-100/80 text-red-600' : 'bg-red-50/80 text-red-500'
                                            } transition-colors duration-200 relative`}
                                        >
                                            {isDeleting ? (
                                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <TrashIcon className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">{isDeleting ? 'Deleting...' : 'Delete'}</div>
                                            <div className="text-xs text-red-500/80 mt-0.5">Remove permanently</div>
                                        </div>
                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                    )}

                    {/* Invoiced Badge */}
                    {isInvoiced && (
                        <div className="px-3 py-2 bg-blue-50/50">
                            <div className="flex items-center justify-center">
                                <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                    Invoiced
                                </span>
                            </div>
                        </div>
                    )}
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default ExpenseActionMenu;

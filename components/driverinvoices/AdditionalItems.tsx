import React, { useState, useRef } from 'react';
import { CurrencyDollarIcon, PencilIcon } from '@heroicons/react/24/outline';
import { TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

interface LineItem {
    id?: string;
    description: string;
    amount: string | number | any; // Support Decimal types as well
}

interface NewLineItem {
    description: string;
    amount: string;
}

interface AdditionalItemsProps {
    invoice: any; // Accept any invoice type
    setInvoice: React.Dispatch<React.SetStateAction<any>>; // Accept any setter
    newLineItem: NewLineItem;
    setNewLineItem: React.Dispatch<React.SetStateAction<NewLineItem>>;
    handleAddLineItem: () => void;
    handleRemoveLineItem: (id: string) => void;
    formatCurrency: (amount: string) => string;
    onPrevStep: () => void;
    onNextStep: () => void;
    mode?: 'create' | 'edit';
    nextButtonText?: string;
}

const AdditionalItems: React.FC<AdditionalItemsProps> = ({
    invoice,
    setInvoice,
    newLineItem,
    setNewLineItem,
    handleAddLineItem,
    handleRemoveLineItem,
    formatCurrency,
    onPrevStep,
    onNextStep,
    mode = 'create',
    nextButtonText = 'Review & Create Invoice',
}) => {
    // Edit state for line items
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<{ description: string; amount: string }>({
        description: '',
        amount: '',
    });

    // Refs for input fields
    const descriptionInputRef = useRef<HTMLInputElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const handleAddLineItemWithFocus = () => {
        handleAddLineItem();
        // Focus on description field after adding item
        setTimeout(() => {
            descriptionInputRef.current?.focus();
        }, 0);
    };

    const handleEditLineItem = (item: LineItem) => {
        setEditingItemId(item.id!);
        setEditingItem({
            description: item.description,
            amount: item.amount.toString(),
        });
    };

    const handleSaveLineItem = () => {
        if (!editingItemId || !editingItem.description || !editingItem.amount) return;

        setInvoice((prev) => ({
            ...prev,
            lineItems: prev.lineItems.map((item) =>
                item.id === editingItemId
                    ? {
                          ...item,
                          description: editingItem.description,
                          amount: editingItem.amount,
                      }
                    : item,
            ),
        }));

        setEditingItemId(null);
        setEditingItem({ description: '', amount: '' });
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditingItem({ description: '', amount: '' });
    };

    const handleNext = () => {
        onNextStep();
    };
    return (
        <div className="bg-gray-50 p-3 sm:p-6 rounded-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3 sm:gap-0">
                <div className="flex flex-1 flex-col items-start">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">
                        {mode === 'edit' ? 'Edit Additional Items' : 'Additional Items'}
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm font-normal">
                        {mode === 'edit'
                            ? 'Modify invoice details and line items'
                            : 'Add invoice details and additional line items'}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4 sm:space-y-6">
                {/* Invoice Details */}
                <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Invoice Details</h3>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {mode === 'create' && (
                            <div className="bg-gray-50/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-gray-200/40">
                                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                                    Invoice Number
                                </label>
                                <p className="text-xs text-gray-600 mb-3">
                                    Auto incrementing, you may enter invoice# to start your driver invoices at different
                                    counter.
                                </p>
                                <input
                                    type="number"
                                    value={invoice.invoiceNum || ''}
                                    min={1}
                                    step={1}
                                    onChange={(e) =>
                                        setInvoice((prev) => ({
                                            ...prev,
                                            invoiceNum: Number(e.target.value),
                                        }))
                                    }
                                    className="w-full p-3 bg-white backdrop-blur-sm border border-gray-300/60 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all text-sm sm:text-base"
                                    placeholder="Enter invoice number..."
                                />
                            </div>
                        )}

                        {mode === 'edit' && (
                            <div className="bg-gray-50/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-gray-200/40">
                                <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">Invoice Number</div>
                                <div className="text-base sm:text-lg font-bold text-gray-900">
                                    #{invoice.invoiceNum}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:gap-6"></div>

                        <div className="bg-gray-50/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-gray-200/40">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">Notes</label>
                            <textarea
                                value={invoice.notes || ''}
                                onChange={(e) => setInvoice((prev) => ({ ...prev, notes: e.target.value }))}
                                className="w-full p-3 bg-white backdrop-blur-sm border border-gray-300/60 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all text-sm sm:text-base resize-none"
                                rows={3}
                                placeholder="Add any notes about this invoice..."
                            />
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm">
                    <div className="p-4 sm:p-6 border-b border-gray-200/30">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Line Items</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Add, edit or remove line items on this invoice.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-200/30">
                                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide">
                                        Description
                                    </th>
                                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-left text-xs font-semibold text-gray-600 tracking-wide">
                                        Amount
                                    </th>
                                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-right text-xs font-semibold text-gray-600 tracking-wide">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-100/60">
                                {invoice.lineItems.map((item) => (
                                    <tr key={item.id} className="group hover:bg-blue-50/80 transition-all duration-200">
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium text-gray-900">
                                            {editingItemId === item.id ? (
                                                <input
                                                    type="text"
                                                    value={editingItem.description}
                                                    onChange={(e) =>
                                                        setEditingItem((prev) => ({
                                                            ...prev,
                                                            description: e.target.value,
                                                        }))
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (editingItem.description && editingItem.amount) {
                                                                handleSaveLineItem();
                                                            }
                                                        }
                                                        if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    className="w-full p-2 border border-gray-200/50 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-xs sm:text-sm"
                                                    autoFocus
                                                />
                                            ) : (
                                                item.description
                                            )}
                                        </td>
                                        <td
                                            className={`py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold ${
                                                editingItemId === item.id
                                                    ? ''
                                                    : Number(item.amount) >= 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }`}
                                        >
                                            {editingItemId === item.id ? (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingItem((prev) => {
                                                                const currentAmount = prev.amount;
                                                                if (currentAmount.startsWith('-')) {
                                                                    return {
                                                                        ...prev,
                                                                        amount: currentAmount.substring(1),
                                                                    };
                                                                } else {
                                                                    return {
                                                                        ...prev,
                                                                        amount: currentAmount
                                                                            ? `-${currentAmount}`
                                                                            : '-',
                                                                    };
                                                                }
                                                            });
                                                        }}
                                                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                                    >
                                                        {editingItem.amount.startsWith('-') ? (
                                                            <MinusIcon className="w-3 h-3" />
                                                        ) : (
                                                            <PlusIcon className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={editingItem.amount}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (value === '' || value === '-') {
                                                                setEditingItem((prev) => ({
                                                                    ...prev,
                                                                    amount: value,
                                                                }));
                                                                return;
                                                            }
                                                            if (value.startsWith('-')) {
                                                                const numericPart = value.substring(1);
                                                                if (
                                                                    numericPart === '' ||
                                                                    /^\d*\.?\d*$/.test(numericPart)
                                                                ) {
                                                                    setEditingItem((prev) => ({
                                                                        ...prev,
                                                                        amount: value,
                                                                    }));
                                                                }
                                                            } else {
                                                                if (/^\d*\.?\d*$/.test(value)) {
                                                                    setEditingItem((prev) => ({
                                                                        ...prev,
                                                                        amount: value,
                                                                    }));
                                                                }
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (editingItem.description && editingItem.amount) {
                                                                    handleSaveLineItem();
                                                                }
                                                                return;
                                                            }
                                                            if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                handleCancelEdit();
                                                                return;
                                                            }
                                                            // Allow backspace, delete, tab, escape, enter, period, and minus
                                                            if (
                                                                e.key === 'Backspace' ||
                                                                e.key === 'Delete' ||
                                                                e.key === 'Tab' ||
                                                                e.key === 'Escape' ||
                                                                e.key === 'Enter' ||
                                                                e.key === '.' ||
                                                                e.key === '-' ||
                                                                e.key === 'ArrowLeft' ||
                                                                e.key === 'ArrowRight' ||
                                                                e.key === 'Home' ||
                                                                e.key === 'End'
                                                            ) {
                                                                return;
                                                            }
                                                            // Allow Ctrl/Cmd combinations (copy, paste, etc.)
                                                            if (e.ctrlKey || e.metaKey) {
                                                                return;
                                                            }
                                                            // Only allow digits
                                                            if (!/\d/.test(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        className="flex-1 p-2 border border-gray-200/50 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-xs sm:text-sm"
                                                    />
                                                </div>
                                            ) : Number(item.amount) >= 0 ? (
                                                formatCurrency(item.amount.toString())
                                            ) : (
                                                `(${formatCurrency(Math.abs(Number(item.amount)).toString())})`
                                            )}
                                        </td>
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-right">
                                            {editingItemId === item.id ? (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={handleSaveLineItem}
                                                        disabled={!editingItem.description || !editingItem.amount}
                                                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleEditLineItem(item)}
                                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all group-hover:scale-105"
                                                        title="Edit item"
                                                    >
                                                        <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveLineItem(item.id!)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all group-hover:scale-105"
                                                        title="Delete item"
                                                    >
                                                        <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50/30 backdrop-blur-sm">
                                    <td className="py-3 sm:py-4 px-4 sm:px-6">
                                        <input
                                            ref={descriptionInputRef}
                                            type="text"
                                            value={newLineItem.description}
                                            onChange={(e) =>
                                                setNewLineItem((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (newLineItem.description && newLineItem.amount) {
                                                        handleAddLineItemWithFocus();
                                                    } else if (newLineItem.description && !newLineItem.amount) {
                                                        // Focus on amount field if description is filled but amount is empty
                                                        amountInputRef.current?.focus();
                                                    }
                                                }
                                            }}
                                            autoFocus
                                            placeholder="Description"
                                            className="w-full p-3 border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-xs sm:text-sm"
                                        />
                                    </td>
                                    <td className="py-3 sm:py-4 px-4 sm:px-6">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewLineItem((prev) => {
                                                        const currentAmount = prev.amount;
                                                        if (currentAmount.startsWith('-')) {
                                                            // Remove minus sign
                                                            return {
                                                                ...prev,
                                                                amount: currentAmount.substring(1),
                                                            };
                                                        } else {
                                                            // Add minus sign
                                                            return {
                                                                ...prev,
                                                                amount: currentAmount ? `-${currentAmount}` : '-',
                                                            };
                                                        }
                                                    });
                                                }}
                                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                title={
                                                    newLineItem.amount.startsWith('-')
                                                        ? 'Make positive'
                                                        : 'Make negative'
                                                }
                                            >
                                                {newLineItem.amount.startsWith('-') ? (
                                                    <MinusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                ) : (
                                                    <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                )}
                                            </button>
                                            <input
                                                ref={amountInputRef}
                                                type="text"
                                                value={newLineItem.amount}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    // Handle empty field - reset to positive
                                                    if (value === '' || value === '-') {
                                                        setNewLineItem((prev) => ({
                                                            ...prev,
                                                            amount: value, // Keep the '-' if user is typing it
                                                        }));
                                                        return;
                                                    }

                                                    // Handle negative sign at the beginning
                                                    if (value.startsWith('-')) {
                                                        const numericPart = value.substring(1);
                                                        // Only allow valid numeric characters after the minus sign
                                                        if (numericPart === '' || /^\d*\.?\d*$/.test(numericPart)) {
                                                            setNewLineItem((prev) => ({
                                                                ...prev,
                                                                amount: value, // Store the full value including minus
                                                            }));
                                                        }
                                                    } else {
                                                        // Handle positive numbers - only allow valid numeric characters
                                                        if (/^\d*\.?\d*$/.test(value)) {
                                                            setNewLineItem((prev) => ({
                                                                ...prev,
                                                                amount: value,
                                                            }));
                                                        }
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (newLineItem.description && newLineItem.amount) {
                                                            handleAddLineItemWithFocus();
                                                        }
                                                        return;
                                                    }
                                                    // Allow backspace, delete, tab, escape, enter, period, and minus
                                                    if (
                                                        e.key === 'Backspace' ||
                                                        e.key === 'Delete' ||
                                                        e.key === 'Tab' ||
                                                        e.key === 'Escape' ||
                                                        e.key === 'Enter' ||
                                                        e.key === '.' ||
                                                        e.key === '-' ||
                                                        e.key === 'ArrowLeft' ||
                                                        e.key === 'ArrowRight' ||
                                                        e.key === 'Home' ||
                                                        e.key === 'End'
                                                    ) {
                                                        return;
                                                    }
                                                    // Allow Ctrl/Cmd combinations (copy, paste, etc.)
                                                    if (e.ctrlKey || e.metaKey) {
                                                        return;
                                                    }
                                                    // Only allow digits
                                                    if (!/\d/.test(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                placeholder="Amount (use - for negative)"
                                                step="0.01"
                                                className="flex-1 p-3 border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-xs sm:text-sm"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-right">
                                        <button
                                            onClick={handleAddLineItemWithFocus}
                                            disabled={!newLineItem.description || !newLineItem.amount}
                                            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all hover:scale-105 shadow-sm text-xs sm:text-sm"
                                        >
                                            Add
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
                    <button
                        onClick={onPrevStep}
                        className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm sm:text-base"
                    >
                        {nextButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdditionalItems;

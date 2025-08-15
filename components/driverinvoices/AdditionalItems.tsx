import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CurrencyDollarIcon, PencilIcon } from '@heroicons/react/24/outline';
import { TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import Decimal from 'decimal.js';

// Skeleton component for expense loading
const ExpenseSkeleton = () => {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                    <div className="flex items-start justify-between p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200/30 rounded-xl">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="h-4 bg-gray-300 rounded w-36"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                                            <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                                        </div>
                                    </div>
                                    <div className="h-5 bg-gray-300 rounded w-16"></div>
                                </div>
                                <div className="h-3 bg-gray-200 rounded w-full max-w-xs"></div>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

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
    emptyMiles?: { [key: string]: number };
    allDrivers?: any[]; // Available in create mode
    // Expense loading props (received from parent)
    approvedExpenses: any[];
    loadingExpenses: boolean;
    onRefreshExpenses?: () => void; // Function to refresh expenses
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
    emptyMiles = {},
    allDrivers = [],
    approvedExpenses,
    loadingExpenses,
    onRefreshExpenses,
}) => {
    // Edit state for line items - using index as ID for editing
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<{ description: string; amount: string }>({
        description: '',
        amount: '',
    });

    // Base pay guarantee state
    const [basePay, setBasePay] = useState<string>('');
    const [basePayInput, setBasePayInput] = useState<string>('');
    const [isAutoLoaded, setIsAutoLoaded] = useState<boolean>(false);
    const [basePayEnabled, setBasePayEnabled] = useState<boolean>(false); // Toggle for base pay line item - default to false

    // Expenses state (selected expenses - still managed internally)
    const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

    // Helper function to get current driver info
    const getCurrentDriverInfo = () => {
        if (mode === 'edit' && invoice.driver) {
            return invoice.driver;
        } else if (mode === 'create' && allDrivers.length > 0) {
            return allDrivers.find((d) => d.id === invoice.driverId);
        }
        return null;
    };

    const currentDriver = getCurrentDriverInfo();

    // Load saved base pay for this driver on component mount
    useEffect(() => {
        if (invoice.driverId) {
            // Get driver info based on mode
            let driverInfo;
            if (mode === 'edit' && invoice.driver) {
                driverInfo = invoice.driver;
            } else if (mode === 'create' && allDrivers.length > 0) {
                driverInfo = allDrivers.find((d) => d.id === invoice.driverId);
            }

            // Check if driver has a baseGuaranteeAmount set
            const driverBaseGuarantee = driverInfo?.baseGuaranteeAmount;
            const hasBaseGuarantee = driverBaseGuarantee && Number(driverBaseGuarantee) > 0;

            // Set toggle state based on whether driver has base guarantee
            setBasePayEnabled(hasBaseGuarantee);

            // First priority: saved localStorage value
            const savedBasePay = localStorage.getItem(`basePay_${invoice.driverId}`);

            if (savedBasePay && hasBaseGuarantee) {
                const formattedAmount = parseFloat(savedBasePay).toFixed(2);
                setBasePay(formattedAmount);
                setBasePayInput(formattedAmount);
                setIsAutoLoaded(true);
                // Apply the saved base pay automatically after assignments are loaded
                setTimeout(() => {
                    updateBasePayCalculation(formattedAmount);
                }, 100);
            } else if (hasBaseGuarantee) {
                // Second priority: driver's baseGuaranteeAmount
                const formattedAmount = Number(driverBaseGuarantee).toFixed(2);
                setBasePay(formattedAmount);
                setBasePayInput(formattedAmount);
                setIsAutoLoaded(true);
                // Apply the driver's base guarantee automatically after assignments are loaded
                setTimeout(() => {
                    updateBasePayCalculation(formattedAmount);
                }, 100);
            } else {
                // No base guarantee - clear any saved values and disable
                setBasePay('');
                setBasePayInput('');
                setIsAutoLoaded(false);
            }
        }
    }, [invoice.driverId, invoice.fromDate, invoice.toDate, mode, invoice.id]); // Simplified dependencies

    // Initialize selected expenses when editing an existing invoice
    useEffect(() => {
        if (mode === 'edit' && invoice.expenses && invoice.expenses.length > 0) {
            const existingExpenseIds = invoice.expenses
                .map((expense: any) => expense.id)
                .filter((id: any): id is string => typeof id === 'string');
            setSelectedExpenses(new Set(existingExpenseIds));
        }
    }, [mode, invoice.id]); // Changed dependency to invoice.id instead of invoice.expenses

    // Function to update invoice expenses based on current selection
    const updateInvoiceExpenses = (newSelectedExpenses: Set<string>) => {
        setTimeout(() => {
            const expensesToAdd = approvedExpenses.filter((expense) => newSelectedExpenses.has(expense.id));
            setInvoice((prevInvoice) => ({
                ...prevInvoice,
                expenses: expensesToAdd,
            }));
        }, 0);
    };

    // Function to load approved expenses
    // Save base pay to localStorage whenever it changes
    const saveBasePayToStorage = (driverId: string, amount: string) => {
        if (driverId && amount) {
            localStorage.setItem(`basePay_${driverId}`, amount);
        } else if (driverId) {
            localStorage.removeItem(`basePay_${driverId}`);
        }
    };

    // Calculate the current total amount from assignments only (excluding line items)
    const calculateAssignmentTotal = () => {
        return invoice.assignments.reduce((total, assignment) => {
            let calculatedAmount = 0;
            let billedMiles = 0;
            let emptyMilesForAssignment = 0;

            // Get empty miles for this assignment
            if (assignment.chargeType === 'PER_MILE') {
                billedMiles = Number(assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles);

                // Use the emptyMiles from the assignment object if available,
                // otherwise fall back to the state
                if (assignment.emptyMiles && Number(assignment.emptyMiles) > 0) {
                    emptyMilesForAssignment = Number(assignment.emptyMiles);
                } else {
                    // Find empty miles for this assignment from state
                    const emptyMilesKey = Object.keys(emptyMiles).find((key) => key.startsWith(`${assignment.id}-to-`));
                    emptyMilesForAssignment = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;
                }

                // Total miles including empty miles
                const totalMiles = billedMiles + emptyMilesForAssignment;
                calculatedAmount = totalMiles * Number(assignment.chargeValue);
            } else {
                // Non-mile based calculations
                switch (assignment.chargeType) {
                    case 'PER_HOUR':
                        calculatedAmount =
                            Number(assignment.billedDurationHours || assignment.routeLeg.durationHours) *
                            Number(assignment.chargeValue);
                        break;
                    case 'PERCENTAGE_OF_LOAD':
                        calculatedAmount =
                            (Number(assignment.billedLoadRate || assignment.load.rate) *
                                Number(assignment.chargeValue)) /
                            100;
                        break;
                    case 'FIXED_PAY':
                        calculatedAmount = Number(assignment.chargeValue);
                        break;
                }
            }
            return total + calculatedAmount;
        }, 0);
    };

    const assignmentTotal = calculateAssignmentTotal();

    // Function to calculate and update line items based on base pay
    const updateBasePayCalculation = (basePayValue: string) => {
        // Always remove existing base pay adjustment first
        setInvoice((prevInvoice) => {
            const updatedInvoice = { ...prevInvoice };
            const filteredLineItems = updatedInvoice.lineItems.filter(
                (item) => item.description !== 'Base Pay Guarantee Adjustment',
            );
            updatedInvoice.lineItems = filteredLineItems;
            return updatedInvoice;
        });

        // If base pay is disabled or no value, just remove the adjustment
        if (!basePayEnabled || !basePayValue) {
            return;
        }

        const basePayAmount = parseFloat(basePayValue);
        if (isNaN(basePayAmount) || basePayAmount <= 0) {
            // Remove base pay adjustment if invalid value
            setInvoice((prevInvoice) => {
                const updatedInvoice = { ...prevInvoice };
                const filteredLineItems = updatedInvoice.lineItems.filter(
                    (item) => item.description !== 'Base Pay Guarantee Adjustment',
                );
                updatedInvoice.lineItems = filteredLineItems;
                return updatedInvoice;
            });
            return;
        }

        const difference = basePayAmount - assignmentTotal;

        if (difference > 0) {
            // Add base pay adjustment line item if total is less than base pay
            setInvoice((prevInvoice) => {
                const updatedInvoice = { ...prevInvoice };

                // Add new base pay adjustment at the beginning
                const basePayLineItem = {
                    id: `base-pay-${Date.now()}`,
                    description: 'Base Pay Guarantee Adjustment',
                    amount: new Decimal(difference.toFixed(2)),
                };

                updatedInvoice.lineItems = [basePayLineItem, ...updatedInvoice.lineItems];

                return updatedInvoice;
            });
        }
        // If difference <= 0, the adjustment has already been removed at the start of the function
    };

    // Handle input changes without triggering calculations
    const handleBasePayInputChange = (value: string) => {
        // Remove non-numeric characters except decimal point
        const numericValue = value.replace(/[^\d.]/g, '');

        // Ensure only one decimal point
        const parts = numericValue.split('.');
        if (parts.length > 2) {
            return;
        }

        setBasePayInput(numericValue);
        // Clear auto-loaded indicator when user starts typing
        if (isAutoLoaded) {
            setIsAutoLoaded(false);
        }
        // Don't update basePay here to avoid triggering calculations
    };

    // Handle when user finishes editing (blur or Enter)
    const handleBasePayFinish = () => {
        if (basePayInput && !isNaN(parseFloat(basePayInput))) {
            const formatted = parseFloat(basePayInput).toFixed(2);
            setBasePayInput(formatted);
            setBasePay(formatted);
            updateBasePayCalculation(formatted);
            // Save to localStorage
            saveBasePayToStorage(invoice.driverId, formatted);
        } else {
            setBasePay('');
            updateBasePayCalculation('');
            // Remove from localStorage
            saveBasePayToStorage(invoice.driverId, '');
        }
    };

    // Handle Enter key press
    const handleBasePayKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBasePayFinish();
        }
    };

    // Handle base pay guarantee toggle
    const handleBasePayToggle = (enabled: boolean) => {
        setBasePayEnabled(enabled);
        // Immediately update calculation based on new toggle state
        if (basePay) {
            updateBasePayCalculation(basePay);
        }
    };

    // Refs for input fields
    const descriptionInputRef = useRef<HTMLInputElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const handleAddLineItemWithFocus = () => {
        // First blur the amount field to remove focus
        if (amountInputRef.current) {
            amountInputRef.current.blur();
        }

        handleAddLineItem();

        // Focus on description field after adding item with a delay to ensure DOM update
        setTimeout(() => {
            if (descriptionInputRef.current) {
                descriptionInputRef.current.focus();
                descriptionInputRef.current.select(); // Also select the text if any
            }
        }, 150);
    };

    const handleEditLineItem = (item: LineItem, itemIndex: number) => {
        // Use the array index as the editing identifier
        setEditingItemIndex(itemIndex);

        setEditingItem({
            description: item.description,
            amount: item.amount.toString(),
        });
    };

    const handleSaveLineItem = () => {
        // Enhanced validation to check for valid numeric values
        const isValidAmount =
            editingItem.amount !== '' &&
            editingItem.amount !== null &&
            editingItem.amount !== undefined &&
            editingItem.amount !== '-' &&
            !isNaN(Number(editingItem.amount));

        const hasDescription = !!editingItem.description;
        const hasEditingIndex = editingItemIndex !== null;

        if (editingItemIndex === null || !editingItem.description || !isValidAmount) {
            return;
        }

        setInvoice((prev) => ({
            ...prev,
            lineItems: prev.lineItems.map((item, index) => {
                let shouldUpdate = false;

                // Use index-based matching for existing items
                if (editingItemIndex !== null) {
                    shouldUpdate = index === editingItemIndex;
                }

                return shouldUpdate
                    ? {
                          ...item,
                          description: editingItem.description,
                          amount: new Decimal(editingItem.amount),
                      }
                    : item;
            }),
        }));

        setEditingItemIndex(null);
        setEditingItem({ description: '', amount: '' });
    };

    const handleCancelEdit = () => {
        setEditingItemIndex(null);
        setEditingItem({ description: '', amount: '' });
    };

    // Handle deletion by index instead of ID for more reliable deletion
    const handleDeleteByIndex = (index: number) => {
        setInvoice((prev) => ({
            ...prev,
            lineItems: prev.lineItems.filter((_, i) => i !== index),
        }));

        // If we're currently editing the item being deleted, cancel the edit
        if (editingItemIndex === index) {
            setEditingItemIndex(null);
            setEditingItem({ description: '', amount: '' });
        }
        // If we're editing an item after the deleted one, adjust the index
        else if (editingItemIndex !== null && editingItemIndex > index) {
            setEditingItemIndex(editingItemIndex - 1);
        }
    };

    // Debug helper for save button disabled state
    const getSaveButtonDisabledState = (context: string) => {
        const hasDescription = !!editingItem.description;
        const isEmptyAmount = editingItem.amount === '';
        const isNullAmount = editingItem.amount === null;
        const isUndefinedAmount = editingItem.amount === undefined;
        const isDashAmount = editingItem.amount === '-';
        const isNaNAmount = isNaN(Number(editingItem.amount));

        const isDisabled =
            !hasDescription || isEmptyAmount || isNullAmount || isUndefinedAmount || isDashAmount || isNaNAmount;

        return isDisabled;
    };

    const handleNext = () => {
        onNextStep();
    };

    // Handle expense selection
    const handleExpenseToggle = (expenseId: string) => {
        setSelectedExpenses((prev) => {
            const newSelected = new Set(prev);
            if (newSelected.has(expenseId)) {
                newSelected.delete(expenseId);
            } else {
                newSelected.add(expenseId);
            }

            // Update invoice with new selection
            updateInvoiceExpenses(newSelected);

            return newSelected;
        });
    };

    // Handle select all expenses
    const handleSelectAllExpenses = () => {
        const allExpenseIds = approvedExpenses.map((expense) => expense.id);
        const newSelected = new Set(allExpenseIds);
        setSelectedExpenses(newSelected);
        updateInvoiceExpenses(newSelected);
    };

    // Handle clear all expenses
    const handleClearAllExpenses = () => {
        const newSelected = new Set<string>();
        setSelectedExpenses(newSelected);
        updateInvoiceExpenses(newSelected);
    };

    // Format date for display - Parse date correctly to avoid timezone issues
    const formatDate = (dateString: string) => {
        if (!dateString) return '';

        // Parse date correctly to avoid timezone issues (same as InvoiceReview component)
        const parseDate = (date: string | Date | null | undefined) => {
            if (!date) return null;
            if (typeof date === 'string') {
                const parts = date.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const day = parseInt(parts[2], 10);
                    return new Date(year, month, day);
                }
                return new Date(date);
            }
            return date;
        };

        const date = parseDate(dateString);
        return date
            ? date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
              })
            : '';
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

                {/* Driver Expenses */}
                {invoice.driverId && invoice.fromDate && invoice.toDate && (
                    <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl shadow-sm">
                        <div className="p-4 sm:p-6 border-b border-gray-200/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                        Driver Expenses
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onRefreshExpenses && (
                                        <button
                                            onClick={onRefreshExpenses}
                                            disabled={loadingExpenses}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Refresh expenses"
                                        >
                                            <svg
                                                className={`w-3 h-3 ${loadingExpenses ? 'animate-spin' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                />
                                            </svg>
                                            Refresh
                                        </button>
                                    )}
                                    {!loadingExpenses && approvedExpenses.length > 0 && (
                                        <>
                                            <button
                                                onClick={handleSelectAllExpenses}
                                                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                onClick={handleClearAllExpenses}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {mode === 'edit'
                                    ? `Modify driver-paid expenses for this invoice. Currently attached expenses are pre-selected and marked.`
                                    : `Select driver-paid expenses from ${formatDate(invoice.fromDate)} to ${formatDate(
                                          invoice.toDate,
                                      )} to include in this invoice.`}
                            </p>
                        </div>

                        <div className="p-4 sm:p-6">
                            {loadingExpenses ? (
                                <ExpenseSkeleton />
                            ) : approvedExpenses.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-400 mb-2">
                                        <CurrencyDollarIcon className="h-12 w-12 mx-auto" />
                                    </div>
                                    <p className="text-gray-500 text-sm">
                                        No approved driver-paid expenses found for this driver in the selected date
                                        range.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {approvedExpenses.map((expense) => {
                                        return (
                                            <div
                                                key={expense.id}
                                                onClick={() => handleExpenseToggle(expense.id)}
                                                className={`border rounded-lg p-3 transition-colors cursor-pointer ${
                                                    selectedExpenses.has(expense.id)
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedExpenses.has(expense.id)}
                                                        onClick={(e) => e.stopPropagation()} // Prevent double toggle
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded pointer-events-none"
                                                        readOnly
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-900 text-sm">
                                                                    {expense.category?.name || 'Expense'}
                                                                </span>
                                                                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                                                    {expense.status}
                                                                </span>
                                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                                                    Driver Paid
                                                                </span>
                                                                {/* Show if already attached to this invoice */}
                                                                {mode === 'edit' &&
                                                                    expense.driverInvoiceId === invoice.id && (
                                                                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                                                                            Already Attached
                                                                        </span>
                                                                    )}
                                                            </div>
                                                            <span className="font-semibold text-gray-900">
                                                                {formatCurrency(expense.amount.toString())}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1">
                                                            <p className="text-sm text-gray-600">
                                                                {expense.description || 'No description'}
                                                            </p>
                                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                                <span>Date: {formatDate(expense.receiptDate)}</span>
                                                                {expense.vendorName && (
                                                                    <span>Vendor: {expense.vendorName}</span>
                                                                )}
                                                                {expense.approvedBy && (
                                                                    <span>Approved by: {expense.approvedBy.name}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Base Pay Guarantee Section - Show if driver exists */}
                {currentDriver && (
                    <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                        <div className={`flex items-center gap-2 ${basePayEnabled ? 'mb-4 sm:mb-6' : 'mb-2'}`}>
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <div className="flex-1">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Base Pay Guarantee</h3>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                    Ensure minimum pay regardless of assignment value
                                </p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-sm text-gray-600">{basePayEnabled ? 'Enabled' : 'Disabled'}</span>
                                <button
                                    onClick={() => handleBasePayToggle(!basePayEnabled)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        basePayEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            basePayEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Collapsible content - only show when enabled */}
                        {basePayEnabled && (
                            <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/30 rounded-xl p-4 sm:p-6 shadow-sm mt-4">
                                {/* Show notice for drivers without base guarantee */}
                                {(!currentDriver.baseGuaranteeAmount ||
                                    Number(currentDriver.baseGuaranteeAmount) === 0) && (
                                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-amber-800">
                                                {currentDriver.name} does not have a base pay guarantee set in their
                                                profile.
                                            </span>
                                            <Link
                                                href={`/drivers/edit/${currentDriver.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                            >
                                                <PencilIcon className="w-3 h-3 mr-1" />
                                                Edit Driver
                                            </Link>
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">
                                            {currentDriver.baseGuaranteeAmount &&
                                            Number(currentDriver.baseGuaranteeAmount) > 0
                                                ? 'Minimum Guaranteed Pay'
                                                : 'Set Base Pay Guarantee'}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-gray-600">
                                            {currentDriver.baseGuaranteeAmount &&
                                            Number(currentDriver.baseGuaranteeAmount) > 0 ? (
                                                <>
                                                    Driver&apos;s base guarantee: $
                                                    {Number(currentDriver.baseGuaranteeAmount).toFixed(2)}
                                                    <span className="block mt-1 text-gray-700">
                                                        Current assignment total:{' '}
                                                        {formatCurrency(assignmentTotal.toFixed(2))}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    Enter a base pay guarantee amount for this invoice.
                                                    <span className="block mt-1 text-gray-700">
                                                        Current assignment total:{' '}
                                                        {formatCurrency(assignmentTotal.toFixed(2))}
                                                    </span>
                                                </>
                                            )}
                                            {basePayEnabled && basePay && parseFloat(basePay) > assignmentTotal && (
                                                <span className="block mt-1 font-medium text-green-700">
                                                    An adjustment of{' '}
                                                    {formatCurrency((parseFloat(basePay) - assignmentTotal).toFixed(2))}{' '}
                                                    will be added.
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                                $
                                            </span>
                                            <input
                                                type="text"
                                                value={basePayInput}
                                                onChange={(e) => handleBasePayInputChange(e.target.value)}
                                                onBlur={handleBasePayFinish}
                                                onKeyPress={handleBasePayKeyPress}
                                                placeholder={
                                                    currentDriver.baseGuaranteeAmount &&
                                                    Number(currentDriver.baseGuaranteeAmount) > 0
                                                        ? Number(currentDriver.baseGuaranteeAmount).toFixed(2)
                                                        : '0.00'
                                                }
                                                className="w-32 pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        {basePayInput && (
                                            <button
                                                onClick={() => {
                                                    setBasePay('');
                                                    setBasePayInput('');
                                                    setIsAutoLoaded(false);
                                                    updateBasePayCalculation('');
                                                    // Remove from localStorage
                                                    saveBasePayToStorage(invoice.driverId, '');
                                                }}
                                                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
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
                                {invoice.lineItems.map((item, index) => (
                                    <tr
                                        key={`lineItem-${index}`}
                                        className="group hover:bg-blue-50/80 transition-all duration-200"
                                    >
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium text-gray-900">
                                            {editingItemIndex === index ? (
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
                                                            const isValidAmount =
                                                                editingItem.amount !== '' &&
                                                                editingItem.amount !== null &&
                                                                editingItem.amount !== undefined &&
                                                                editingItem.amount !== '-' &&
                                                                !isNaN(Number(editingItem.amount));
                                                            if (editingItem.description && isValidAmount) {
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
                                                editingItemIndex === index
                                                    ? ''
                                                    : Number(item.amount) >= 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }`}
                                        >
                                            {editingItemIndex === index ? (
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
                                                                const isValidAmount =
                                                                    editingItem.amount !== '' &&
                                                                    editingItem.amount !== null &&
                                                                    editingItem.amount !== undefined &&
                                                                    editingItem.amount !== '-' &&
                                                                    !isNaN(Number(editingItem.amount));
                                                                if (editingItem.description && isValidAmount) {
                                                                    handleSaveLineItem();
                                                                }
                                                                return;
                                                            }
                                                            if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                handleCancelEdit();
                                                                return;
                                                            }
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
                                                            if (e.ctrlKey || e.metaKey) {
                                                                return;
                                                            }
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
                                            {editingItemIndex === index ? (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={handleSaveLineItem}
                                                        disabled={getSaveButtonDisabledState('DESKTOP')}
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
                                                        onClick={() => handleEditLineItem(item, index)}
                                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all group-hover:scale-105"
                                                        title="Edit item"
                                                    >
                                                        <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteByIndex(index)}
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
                                                        amountInputRef.current?.focus();
                                                    }
                                                }
                                            }}
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
                                                            return {
                                                                ...prev,
                                                                amount: currentAmount.substring(1),
                                                            };
                                                        } else {
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
                                                    if (value === '' || value === '-') {
                                                        setNewLineItem((prev) => ({
                                                            ...prev,
                                                            amount: value,
                                                        }));
                                                        return;
                                                    }
                                                    if (value.startsWith('-')) {
                                                        const numericPart = value.substring(1);
                                                        if (numericPart === '' || /^\d*\.?\d*$/.test(numericPart)) {
                                                            setNewLineItem((prev) => ({
                                                                ...prev,
                                                                amount: value,
                                                            }));
                                                        }
                                                    } else {
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
                                                    if (e.ctrlKey || e.metaKey) {
                                                        return;
                                                    }
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

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {/* Existing Line Items */}
                        <div className="space-y-3 p-4">
                            {invoice.lineItems.map((item, index) => (
                                <div
                                    key={`lineItem-${index}`}
                                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                Description
                                            </label>
                                            {editingItemIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={editingItem.description}
                                                    onChange={(e) => {
                                                        setEditingItem((prev) => {
                                                            const newState = {
                                                                ...prev,
                                                                description: e.target.value,
                                                            };
                                                            return newState;
                                                        });
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const isValidAmount =
                                                                editingItem.amount !== '' &&
                                                                editingItem.amount !== null &&
                                                                editingItem.amount !== undefined &&
                                                                editingItem.amount !== '-' &&
                                                                !isNaN(Number(editingItem.amount));
                                                            if (editingItem.description && isValidAmount) {
                                                                handleSaveLineItem();
                                                            }
                                                        }
                                                        if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    className="w-full mt-1 p-2 border border-gray-200/50 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-sm"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="mt-1 text-sm font-medium text-gray-900">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                Amount
                                            </label>
                                            {editingItemIndex === index ? (
                                                <div className="flex items-center space-x-2 mt-1">
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
                                                            <MinusIcon className="w-4 h-4" />
                                                        ) : (
                                                            <PlusIcon className="w-4 h-4" />
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
                                                                const isValidAmount =
                                                                    editingItem.amount !== '' &&
                                                                    editingItem.amount !== null &&
                                                                    editingItem.amount !== undefined &&
                                                                    editingItem.amount !== '-' &&
                                                                    !isNaN(Number(editingItem.amount));
                                                                if (editingItem.description && isValidAmount) {
                                                                    handleSaveLineItem();
                                                                }
                                                                return;
                                                            }
                                                            if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                handleCancelEdit();
                                                                return;
                                                            }
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
                                                            if (e.ctrlKey || e.metaKey) {
                                                                return;
                                                            }
                                                            if (!/\d/.test(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        className="flex-1 p-2 border border-gray-200/50 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-sm"
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className={`mt-1 text-sm font-semibold ${
                                                        Number(item.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}
                                                >
                                                    {Number(item.amount) >= 0
                                                        ? formatCurrency(item.amount.toString())
                                                        : `(${formatCurrency(
                                                              Math.abs(Number(item.amount)).toString(),
                                                          )})`}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                                            {editingItemIndex === index ? (
                                                <>
                                                    <button
                                                        onClick={handleSaveLineItem}
                                                        disabled={getSaveButtonDisabledState('MOBILE')}
                                                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEditLineItem(item, index)}
                                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                                        title="Edit item"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteByIndex(index)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                        title="Delete item"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add New Item Form - Mobile */}
                        <div className="p-4 border-t border-gray-200/30">
                            <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Description
                                        </label>
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
                                                        amountInputRef.current?.focus();
                                                    }
                                                }
                                            }}
                                            placeholder="Description"
                                            className="w-full mt-1 p-3 border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Amount
                                        </label>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewLineItem((prev) => {
                                                        const currentAmount = prev.amount;
                                                        if (currentAmount.startsWith('-')) {
                                                            return {
                                                                ...prev,
                                                                amount: currentAmount.substring(1),
                                                            };
                                                        } else {
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
                                                    <MinusIcon className="w-4 h-4" />
                                                ) : (
                                                    <PlusIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                            <input
                                                ref={amountInputRef}
                                                type="text"
                                                value={newLineItem.amount}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || value === '-') {
                                                        setNewLineItem((prev) => ({
                                                            ...prev,
                                                            amount: value,
                                                        }));
                                                        return;
                                                    }
                                                    if (value.startsWith('-')) {
                                                        const numericPart = value.substring(1);
                                                        if (numericPart === '' || /^\d*\.?\d*$/.test(numericPart)) {
                                                            setNewLineItem((prev) => ({
                                                                ...prev,
                                                                amount: value,
                                                            }));
                                                        }
                                                    } else {
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
                                                    if (e.ctrlKey || e.metaKey) {
                                                        return;
                                                    }
                                                    if (!/\d/.test(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                placeholder="Amount (use - for negative)"
                                                className="flex-1 p-3 border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={handleAddLineItemWithFocus}
                                            disabled={!newLineItem.description || !newLineItem.amount}
                                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm text-sm font-medium"
                                        >
                                            Add Line Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
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

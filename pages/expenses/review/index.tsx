import React, { useState, useEffect, useCallback, useRef, Fragment, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Combobox, Transition } from '@headlessui/react';
import {
    CheckIcon,
    XMarkIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    DocumentTextIcon,
    ClockIcon,
    CurrencyDollarIcon,
    CalendarDaysIcon,
    MapPinIcon,
    TruckIcon,
    UserIcon,
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    ArrowPathIcon,
    EyeSlashIcon,
    EyeIcon,
    ChevronUpIcon,
    QuestionMarkCircleIcon,
    CommandLineIcon,
    FireIcon,
    BoltIcon,
    TrophyIcon,
    StarIcon,
    SparklesIcon,
    FunnelIcon,
    TagIcon,
    BuildingOfficeIcon,
    ShareIcon,
    MagnifyingGlassIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

import Layout from '../../../components/layout/Layout';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import { notify } from '../../../components/notifications/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import PDFViewer from '../../../components/PDFViewer';
import ExpenseStatusBadge from '../../../components/expenses/ExpenseStatusBadge';
import { ExpandedExpense } from '../../../interfaces/models';
import { updateExpenseStatus } from '../../../lib/expenses/expense-operations';
import { getAllDrivers } from '../../../lib/rest/driver';
import DateRangePicker from '../../../components/DateRangePicker';

interface BulkReviewFilters {
    paidBy: string;
    categoryIds: string[];
    driverId: string;
    startDate: string;
    endDate: string;
    minAmount: string;
    maxAmount: string;
    status: string;
}

interface ExpenseCategory {
    id: string;
    name: string;
    group: string;
}

interface Driver {
    id: string;
    firstName: string;
    lastName: string;
}

// Category Multi-Select Combobox Component
interface CategoryComboboxProps {
    categories: ExpenseCategory[];
    selectedCategoryIds: string[];
    onChange: (categoryIds: string[]) => void;
    loading?: boolean;
}

const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
    categories,
    selectedCategoryIds,
    onChange,
    loading = false,
}) => {
    const [query, setQuery] = useState('');

    const filteredCategories =
        query === ''
            ? categories
            : categories.filter(
                  (category) =>
                      category.name.toLowerCase().includes(query.toLowerCase()) ||
                      category.group.toLowerCase().includes(query.toLowerCase()),
              );

    const selectedCategories = categories.filter((cat) => selectedCategoryIds.includes(cat.id));

    const toggleCategory = (categoryId: string) => {
        const newSelected = selectedCategoryIds.includes(categoryId)
            ? selectedCategoryIds.filter((id) => id !== categoryId)
            : [...selectedCategoryIds, categoryId];
        onChange(newSelected);
    };

    const clearAll = () => {
        onChange([]);
    };

    return (
        <div className="relative">
            <Combobox value={selectedCategoryIds} onChange={onChange} multiple>
                <div className="relative">
                    {/* Clean input matching other fields */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <Combobox.Input
                            className={`w-full pl-10 pr-10 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm focus:outline-none placeholder-gray-500 ${
                                loading ? 'bg-gray-50 cursor-not-allowed' : ''
                            }`}
                            placeholder={
                                selectedCategories.length > 0
                                    ? `${selectedCategories.length} selected`
                                    : 'Search categories'
                            }
                            onChange={(event) => setQuery(event.target.value)}
                            readOnly={loading}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronUpIcon className="w-4 h-4 text-gray-400 transition-transform duration-200" />
                        </Combobox.Button>
                    </div>

                    {/* Selected categories - Apple-style pills */}
                    <Transition
                        show={selectedCategories.length > 0}
                        enter="transition-all duration-200 ease-out"
                        enterFrom="opacity-0 max-h-0"
                        enterTo="opacity-100 max-h-20"
                        leave="transition-all duration-200 ease-in"
                        leaveFrom="opacity-100 max-h-20"
                        leaveTo="opacity-0 max-h-0"
                    >
                        <div className="mt-3 overflow-hidden">
                            <div className="flex flex-wrap gap-2">
                                {selectedCategories.map((category) => (
                                    <span
                                        key={category.id}
                                        className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-900 rounded-md text-sm font-medium transition-all duration-150 hover:bg-blue-200"
                                    >
                                        {category.name}
                                        <button
                                            onClick={() => toggleCategory(category.id)}
                                            className="ml-1.5 p-0.5 text-blue-700 hover:text-blue-900 hover:bg-blue-300 rounded-full transition-colors duration-150"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                {selectedCategories.length > 1 && (
                                    <button
                                        onClick={clearAll}
                                        className="inline-flex items-center px-2.5 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-150"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        </div>
                    </Transition>

                    {/* Apple-style dropdown */}
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 scale-95 translate-y-1"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-95 translate-y-1"
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options className="absolute z-[100] mt-1 w-full max-h-60 overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-sm focus:outline-none origin-top">
                            {loading ? (
                                <div className="px-4 py-8 text-gray-500 text-center">
                                    <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2"></div>
                                    Loading categories...
                                </div>
                            ) : filteredCategories.length === 0 && query !== '' ? (
                                <div className="px-4 py-8 text-gray-500 text-center">
                                    <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p>No categories found</p>
                                    <p className="text-xs mt-1">Try a different search term</p>
                                </div>
                            ) : (
                                <>
                                    {query === '' && filteredCategories.length > 0 && (
                                        <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                                            Choose categories
                                        </div>
                                    )}
                                    {query !== '' && filteredCategories.length > 0 && (
                                        <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                                            {filteredCategories.length} result
                                            {filteredCategories.length !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    {filteredCategories.map((category, index) => (
                                        <Combobox.Option
                                            key={category.id}
                                            value={category.id}
                                            className={({ active }) =>
                                                `relative cursor-pointer select-none transition-all duration-150 ${
                                                    active ? 'bg-blue-50' : 'hover:bg-gray-50'
                                                }`
                                            }
                                        >
                                            {({ selected, active }) => (
                                                <div
                                                    className="flex items-center justify-between px-3 py-2.5"
                                                    onClick={() => toggleCategory(category.id)}
                                                >
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span
                                                            className={`text-sm leading-tight truncate ${
                                                                selectedCategoryIds.includes(category.id)
                                                                    ? 'font-medium text-gray-900'
                                                                    : 'font-normal text-gray-900'
                                                            }`}
                                                        >
                                                            {category.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500 truncate mt-0.5">
                                                            {category.group}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center ml-3">
                                                        {selectedCategoryIds.includes(category.id) && (
                                                            <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Combobox.Option>
                                    ))}
                                </>
                            )}
                        </Combobox.Options>
                    </Transition>
                </div>
            </Combobox>
        </div>
    );
};

const formatCurrency = (amount: number, currencyCode?: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode || 'USD',
    }).format(amount);
};

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No date set';

    try {
        const [year, month, day] = dateString.split('T')[0].split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (isNaN(date.getTime())) return 'Invalid date';

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (error) {
        return 'Invalid date';
    }
};

type Achievement = {
    id: string;
    name: string;
    desc: string;
    condition: () => boolean;
    icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
};

type BulkExpenseReviewProps = Record<string, never>;

const BulkExpenseReview: PageWithAuth<BulkExpenseReviewProps> = () => {
    const router = useRouter();
    const [expenses, setExpenses] = useState<ExpandedExpense[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

    // Filter popup state
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const [needsInitialSetup, setNeedsInitialSetup] = useState(true);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [filters, setFilters] = useState<BulkReviewFilters>({
        paidBy: '',
        categoryIds: [],
        driverId: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        status: 'all',
    });
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(false);

    const [reviewStats, setReviewStats] = useState({
        approved: 0,
        rejected: 0,
        startTime: Date.now(),
        streak: 0,
        longestStreak: 0,
        totalReviewed: 0,
        averageTime: 0,
        lastActionTime: Date.now(),
    });
    const [gamification, setGamification] = useState({
        level: 1,
        xp: 0,
        showLevelUp: false,
        showAchievement: false,
        currentAchievement: null as Achievement | null,
        speedBonus: false,
        streakBonus: false,
    });
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [nextExpense, setNextExpense] = useState<ExpandedExpense | null>(null);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
    const [totalPending, setTotalPending] = useState(0);
    const [currentBatch, setCurrentBatch] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const BATCH_SIZE = 25;

    // PDF viewer state
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [currentPdfDocument, setCurrentPdfDocument] = useState<any>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Refs for keyboard navigation
    const approveButtonRef = useRef<HTMLButtonElement>(null);
    const rejectButtonRef = useRef<HTMLButtonElement>(null);
    const skipButtonRef = useRef<HTMLButtonElement>(null);

    // Check if URL has filters applied
    const hasURLFilters = useMemo(() => {
        return (
            filters.paidBy !== '' ||
            filters.categoryIds.length > 0 ||
            filters.driverId !== '' ||
            filters.startDate !== '' ||
            filters.endDate !== '' ||
            filters.minAmount !== '' ||
            filters.maxAmount !== '' ||
            filters.status !== 'all'
        );
    }, [filters]);

    // Load filter data
    const loadFilterData = useCallback(async () => {
        setLoadingFilters(true);
        try {
            // Load categories
            const categoriesResponse = await fetch('/api/expense-categories');
            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                // The API returns { categories: [...], grouped: {...} }
                const categoriesArray = categoriesData.categories || [];
                setCategories(categoriesArray);
            }

            // Load drivers
            const driversResponse = await getAllDrivers({ activeOnly: true });
            setDrivers(
                driversResponse.drivers.map((d) => ({
                    id: d.id,
                    firstName: d.name.split(' ')[0] || '',
                    lastName: d.name.split(' ').slice(1).join(' ') || '',
                })),
            );
        } catch (error) {
            console.error('Error loading filter data:', error);
            notify({ title: 'Error loading filter options', type: 'error' });
            // Set empty arrays on error to prevent map errors
            setCategories([]);
            setDrivers([]);
        } finally {
            setLoadingFilters(false);
        }
    }, []);

    // Load filter data on mount
    useEffect(() => {
        if (showFilterPopup) {
            loadFilterData();
        }
    }, [showFilterPopup, loadFilterData]);

    // Get filters from URL parameters
    const getFiltersFromURL = useCallback(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryIdsParam = urlParams.get('categoryIds');
        return {
            paidBy: urlParams.get('paidBy') || '',
            categoryIds: categoryIdsParam ? categoryIdsParam.split(',') : [],
            driverId: urlParams.get('driverId') || '',
            startDate: urlParams.get('startDate') || '',
            endDate: urlParams.get('endDate') || '',
            minAmount: urlParams.get('minAmount') || '',
            maxAmount: urlParams.get('maxAmount') || '',
            status: urlParams.get('status') || 'all',
        };
    }, []);

    // Update URL with current filters
    const updateURLWithFilters = useCallback((newFilters: BulkReviewFilters) => {
        const urlParams = new URLSearchParams();

        // Only add non-empty filter values to URL
        if (newFilters.paidBy) urlParams.set('paidBy', newFilters.paidBy);
        if (newFilters.categoryIds.length > 0) urlParams.set('categoryIds', newFilters.categoryIds.join(','));
        if (newFilters.driverId) urlParams.set('driverId', newFilters.driverId);
        if (newFilters.startDate) urlParams.set('startDate', newFilters.startDate);
        if (newFilters.endDate) urlParams.set('endDate', newFilters.endDate);
        if (newFilters.minAmount) urlParams.set('minAmount', newFilters.minAmount);
        if (newFilters.maxAmount) urlParams.set('maxAmount', newFilters.maxAmount);
        if (newFilters.status && newFilters.status !== 'all') urlParams.set('status', newFilters.status);

        const queryString = urlParams.toString();
        const newURL = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

        // Update URL without triggering a page reload
        window.history.replaceState(null, '', newURL);
    }, []);

    // Helper function to update filters and URL
    const updateFilters = useCallback(
        (updater: (prev: BulkReviewFilters) => BulkReviewFilters) => {
            setFilters((prev) => {
                const newFilters = updater(prev);
                updateURLWithFilters(newFilters);
                return newFilters;
            });
        },
        [updateURLWithFilters],
    );

    // Share current filter URL
    const shareFilterURL = useCallback(async () => {
        try {
            const currentURL = window.location.href;
            await navigator.clipboard.writeText(currentURL);
            notify({ title: 'Filter URL copied to clipboard!', type: 'success' });
        } catch (error) {
            console.error('Failed to copy URL:', error);
            notify({ title: 'Failed to copy URL', type: 'error' });
        }
    }, []);

    // Gamification system
    const calculateXP = (action: 'approve' | 'reject' | 'streak') => {
        const baseXP = action === 'approve' ? 10 : action === 'reject' ? 5 : 0;
        const speedBonus = Date.now() - reviewStats.lastActionTime < 5000 ? 5 : 0;
        const streakBonus = reviewStats.streak >= 5 ? Math.floor(reviewStats.streak / 5) * 3 : 0;
        return baseXP + speedBonus + streakBonus;
    };

    const checkLevelUp = (newXP: number) => {
        const newLevel = Math.floor(newXP / 100) + 1;
        if (newLevel > gamification.level) {
            setGamification((prev) => ({ ...prev, showLevelUp: true, level: newLevel }));
            setTimeout(() => setGamification((prev) => ({ ...prev, showLevelUp: false })), 3000);
        }
    };

    const checkAchievements = (stats: any) => {
        const achievements = [
            {
                id: 'first-review',
                name: 'Getting Started',
                desc: 'Complete your first review',
                condition: () => stats.totalReviewed === 1,
                icon: StarIcon,
            },
            {
                id: 'speed-demon',
                name: 'Speed Demon',
                desc: 'Review 5 expenses in under 30 seconds',
                condition: () => stats.totalReviewed >= 5 && Date.now() - stats.startTime < 30000,
                icon: BoltIcon,
            },
            {
                id: 'streak-master',
                name: 'Streak Master',
                desc: 'Maintain a 10+ streak',
                condition: () => stats.streak >= 10,
                icon: FireIcon,
            },
            {
                id: 'century-club',
                name: 'Century Club',
                desc: 'Review 100+ expenses',
                condition: () => stats.totalReviewed >= 100,
                icon: TrophyIcon,
            },
            {
                id: 'perfectionist',
                name: 'Perfectionist',
                desc: 'Complete 20 reviews without skipping',
                condition: () => stats.totalReviewed >= 20 && stats.approved + stats.rejected === stats.totalReviewed,
                icon: SparklesIcon,
            },
        ];

        const newAchievement = achievements.find((a) => a.condition() && !localStorage.getItem(`achievement-${a.id}`));
        if (newAchievement) {
            localStorage.setItem(`achievement-${newAchievement.id}`, 'true');
            setGamification((prev) => ({
                ...prev,
                showAchievement: true,
                currentAchievement: newAchievement,
            }));
            setTimeout(() => setGamification((prev) => ({ ...prev, showAchievement: false })), 4000);
        }
    };

    // Animated transition between expenses
    const transitionToExpense = useCallback((direction: 'left' | 'right', callback: () => void) => {
        setSlideDirection(direction);
        setIsTransitioning(true);

        // Pre-load next expense data
        setTimeout(() => {
            callback();
            setTimeout(() => {
                setIsTransitioning(false);
            }, 150);
        }, 150);
    }, []);

    const currentExpense = expenses[currentIndex] || null;

    // Determine available actions based on expense status and driver invoice status
    const getAvailableActions = useCallback((expense: ExpandedExpense | null) => {
        if (!expense) return { canApprove: false, canReject: false, canSkip: true, reason: 'No expense loaded' };

        // Check if expense is linked to a driver invoice (assuming driverInvoiceId field exists)
        const hasDriverInvoice = expense.driverInvoiceId || expense.driverAssignment;
        if (hasDriverInvoice) {
            return {
                canApprove: false,
                canReject: false,
                canSkip: true,
                reason: 'Expense is linked to a driver invoice and cannot be modified',
            };
        }

        // Determine actions based on approval status
        switch (expense.approvalStatus?.toUpperCase()) {
            case 'PENDING':
                return {
                    canApprove: true,
                    canReject: true,
                    canSkip: true,
                    reason: null,
                };
            case 'APPROVED':
                return {
                    canApprove: false,
                    canReject: true,
                    canSkip: true,
                    reason: 'Already approved - can only reject if needed',
                };
            case 'REJECTED':
                return {
                    canApprove: true,
                    canReject: false,
                    canSkip: true,
                    reason: 'Previously rejected - can approve if reconsidered',
                };
            default:
                return {
                    canApprove: false,
                    canReject: false,
                    canSkip: true,
                    reason: 'Unknown expense status',
                };
        }
    }, []);

    const availableActions = getAvailableActions(currentExpense);

    // Fetch total pending count
    const fetchTotalPendingCount = useCallback(async (appliedFilters?: BulkReviewFilters) => {
        try {
            const params = new URLSearchParams({
                limit: '1',
                offset: '0',
            });

            if (appliedFilters) {
                // Use the status filter or default to PENDING if 'all' is selected
                const statusValue = appliedFilters.status === 'all' ? 'PENDING' : appliedFilters.status.toUpperCase();
                params.append('status', statusValue);

                if (appliedFilters.paidBy) params.append('paidBy', appliedFilters.paidBy);
                if (appliedFilters.categoryIds.length > 0) {
                    appliedFilters.categoryIds.forEach((categoryId) => {
                        params.append('categoryId', categoryId);
                    });
                }
                if (appliedFilters.driverId) params.append('driverId', appliedFilters.driverId);
                if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
                if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
                if (appliedFilters.minAmount) params.append('minAmount', appliedFilters.minAmount);
                if (appliedFilters.maxAmount) params.append('maxAmount', appliedFilters.maxAmount);
            } else {
                // Default to PENDING when no filters are applied
                params.append('status', 'PENDING');
            }

            const response = await fetch(`/api/expenses?${params}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch total count: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            const total = data.pagination?.total || 0;
            setTotalPending(total);
            return total;
        } catch (error) {
            console.error('Error fetching total pending count:', error);
            setTotalPending(0);
            return 0;
        }
    }, []);

    // Fetch pending expenses in batches
    const fetchPendingExpensesBatch = useCallback(
        async (batchNumber = 0, appendToExisting = false, appliedFilters?: BulkReviewFilters) => {
            try {
                setIsLoadingMore(appendToExisting);
                if (!appendToExisting) {
                    setLoading(true);
                }

                const offset = batchNumber * BATCH_SIZE;
                const params = new URLSearchParams({
                    limit: BATCH_SIZE.toString(),
                    offset: offset.toString(),
                    sortBy: 'createdAt',
                    sortDir: 'desc',
                });

                if (appliedFilters) {
                    // Use the status filter or default to PENDING if 'all' is selected
                    const statusValue =
                        appliedFilters.status === 'all' ? 'PENDING' : appliedFilters.status.toUpperCase();
                    params.append('status', statusValue);

                    if (appliedFilters.paidBy) params.append('paidBy', appliedFilters.paidBy);
                    if (appliedFilters.categoryIds.length > 0) {
                        appliedFilters.categoryIds.forEach((categoryId) => {
                            params.append('categoryId', categoryId);
                        });
                    }
                    if (appliedFilters.driverId) params.append('driverId', appliedFilters.driverId);
                    if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
                    if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
                    if (appliedFilters.minAmount) params.append('minAmount', appliedFilters.minAmount);
                    if (appliedFilters.maxAmount) params.append('maxAmount', appliedFilters.maxAmount);
                } else {
                    // Default to PENDING when no filters are applied
                    params.append('status', 'PENDING');
                }

                const response = await fetch(`/api/expenses?${params}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch expenses: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                const newExpenses = data.expenses || [];

                if (appendToExisting) {
                    setExpenses((prev) => [...prev, ...newExpenses]);
                } else {
                    setExpenses(newExpenses);
                    setCurrentIndex(0);
                    setCurrentBatch(0);
                }

                if (newExpenses.length === 0 && !appendToExisting) {
                    notify({ title: 'No pending expenses to review', type: 'success' });
                }

                return newExpenses.length;
            } catch (error) {
                console.error('Error fetching expenses:', error);
                notify({ title: 'Failed to load pending expenses', type: 'error' });
                return 0;
            } finally {
                setLoading(false);
                setIsLoadingMore(false);
            }
        },
        [],
    );

    // Main fetch function that gets total count and initial batch
    const fetchPendingExpenses = useCallback(
        async (appliedFilters?: BulkReviewFilters) => {
            try {
                const total = await fetchTotalPendingCount(appliedFilters);
                if (total > 0) {
                    await fetchPendingExpensesBatch(0, false, appliedFilters);
                } else {
                    // No expenses found - make sure to stop loading
                    setLoading(false);
                    setExpenses([]);
                    setCurrentIndex(0);
                }
            } catch (error) {
                console.error('Error in fetchPendingExpenses:', error);
                setLoading(false);
                notify({ title: 'Failed to load pending expenses', type: 'error' });
            }
        },
        [fetchTotalPendingCount, fetchPendingExpensesBatch],
    );

    // Start review with filters
    const startReviewWithFilters = useCallback(
        async (appliedFilters: BulkReviewFilters) => {
            setShowFilterPopup(false);
            setNeedsInitialSetup(false);
            setLoading(true);
            setIsFetchingData(true);
            setFilters(appliedFilters);
            updateURLWithFilters(appliedFilters);
            await fetchPendingExpenses(appliedFilters);
            setIsFetchingData(false);
        },
        [fetchPendingExpenses, updateURLWithFilters],
    );

    // Initialize filters from URL on mount
    useEffect(() => {
        const urlFilters = getFiltersFromURL();

        if (
            urlFilters.paidBy !== '' ||
            urlFilters.categoryIds.length > 0 ||
            urlFilters.driverId !== '' ||
            urlFilters.startDate !== '' ||
            urlFilters.endDate !== '' ||
            urlFilters.minAmount !== '' ||
            urlFilters.maxAmount !== ''
        ) {
            setFilters(urlFilters);
            setLoading(true);
            setIsFetchingData(true);
            setNeedsInitialSetup(false);
            fetchPendingExpenses(urlFilters).finally(() => {
                setIsFetchingData(false);
            });
        } else {
            // No URL filters - show filter popup on page load
            setShowFilterPopup(true);
            setNeedsInitialSetup(true);
        }
    }, [getFiltersFromURL, fetchPendingExpenses]);

    // Add a timeout to prevent infinite loading - only when actually fetching data
    useEffect(() => {
        if (isFetchingData) {
            const timeout = setTimeout(() => {
                console.warn('Data fetching timeout reached, stopping loading state');
                setLoading(false);
                setIsFetchingData(false);
                notify({ title: 'Loading timeout - please try refreshing the page', type: 'error' });
            }, 30000); // 30 second timeout

            return () => clearTimeout(timeout);
        }
    }, [isFetchingData]);

    // Load next batch when needed
    const loadNextBatch = useCallback(async () => {
        const nextBatch = currentBatch + 1;
        const loaded = await fetchPendingExpensesBatch(nextBatch, true, filters);
        if (loaded > 0) {
            setCurrentBatch(nextBatch);
        }
        return loaded;
    }, [currentBatch, fetchPendingExpensesBatch, filters]);

    // Load PDF for current expense
    const loadPDF = useCallback(async (storagePathOrUrl: string) => {
        try {
            setPdfLoading(true);

            let response;
            if (storagePathOrUrl.startsWith('http')) {
                response = await fetch(storagePathOrUrl);
            } else {
                response = await fetch(`/api/documents/download?path=${encodeURIComponent(storagePathOrUrl)}`);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            if (blob.type !== 'application/pdf') {
                throw new Error('Document is not a PDF');
            }

            setPdfBlob(blob);
        } catch (error) {
            console.error('Error loading PDF:', error);
            setPdfBlob(null);
        } finally {
            setPdfLoading(false);
        }
    }, []);

    // Load PDF for current expense
    useEffect(() => {
        if (!currentExpense?.documents?.length) {
            setPdfBlob(null);
            setCurrentPdfDocument(null);
            return;
        }

        const pdfDoc = currentExpense.documents.find((docRelation: any) => {
            if (docRelation.document?.fileName?.toLowerCase().endsWith('.pdf')) {
                return true;
            }
            if (docRelation.mimeType === 'application/pdf') {
                return true;
            }
            if (docRelation.fileName?.toLowerCase().endsWith('.pdf')) {
                return true;
            }
            return false;
        });

        if (pdfDoc) {
            setCurrentPdfDocument(pdfDoc);
            const storagePath = pdfDoc.document?.storageUrl;
            if (storagePath) {
                loadPDF(storagePath);
            }
        } else {
            setPdfBlob(null);
            setCurrentPdfDocument(null);
        }
    }, [currentExpense, loadPDF]);

    // Navigate to next expense
    const goToNext = useCallback(async () => {
        if (currentIndex < expenses.length - 1) {
            transitionToExpense('right', () => {
                setCurrentIndex((prev) => prev + 1);
                setRejectionReason('');
                setShowRejectionInput(false);
            });
        } else {
            // Check if we need to load more from current batches or if we're at the end
            const totalLoadedSoFar = (currentBatch + 1) * BATCH_SIZE;
            if (totalLoadedSoFar < totalPending) {
                // Load next batch
                const loaded = await loadNextBatch();
                if (loaded > 0) {
                    transitionToExpense('right', () => {
                        setCurrentIndex((prev) => prev + 1);
                        setRejectionReason('');
                        setShowRejectionInput(false);
                    });
                }
            } else {
                // No more expenses, refresh to check for new ones
                await fetchPendingExpenses(filters);
            }
        }
    }, [
        currentIndex,
        expenses.length,
        currentBatch,
        totalPending,
        loadNextBatch,
        fetchPendingExpenses,
        filters,
        transitionToExpense,
    ]);

    // Navigate to previous expense
    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            transitionToExpense('left', () => {
                setCurrentIndex((prev) => prev - 1);
                setRejectionReason('');
                setShowRejectionInput(false);
            });
        }
    }, [currentIndex, transitionToExpense]);

    // Handle approval
    const handleApprove = useCallback(async () => {
        if (!currentExpense || processing) return;

        try {
            setProcessing(true);
            await updateExpenseStatus({
                expenseId: currentExpense.id,
                status: 'APPROVED',
            });

            notify({ title: 'Expense approved successfully', type: 'success' });

            // Update stats and gamification
            const newStats = {
                ...reviewStats,
                approved: reviewStats.approved + 1,
                totalReviewed: reviewStats.totalReviewed + 1,
                streak: reviewStats.streak + 1,
                longestStreak: Math.max(reviewStats.longestStreak, reviewStats.streak + 1),
                lastActionTime: Date.now(),
            };
            setReviewStats(newStats);

            // Gamification updates
            const xpGained = calculateXP('approve');
            const newXP = gamification.xp + xpGained;
            setGamification((prev) => ({ ...prev, xp: newXP }));
            checkLevelUp(newXP);
            checkAchievements(newStats);

            // Remove approved expense from list with animation
            transitionToExpense('right', async () => {
                setExpenses((prev) => prev.filter((_, index) => index !== currentIndex));
                setTotalPending((prev) => prev - 1);

                // Adjust current index if needed
                if (currentIndex >= expenses.length - 1) {
                    setCurrentIndex(Math.max(0, currentIndex - 1));
                }

                // Check if we need to load more expenses
                const remainingInBatch = expenses.length - 1; // -1 because we just removed one
                const totalLoadedSoFar = (currentBatch + 1) * BATCH_SIZE;

                if (remainingInBatch <= 5 && totalLoadedSoFar < totalPending) {
                    // Load next batch when we're running low
                    await loadNextBatch();
                } else if (remainingInBatch === 0) {
                    // If no more expenses, refresh to check for new ones
                    await fetchPendingExpenses(filters);
                }
            });
        } catch (error) {
            console.error('Error approving expense:', error);
            notify({ title: 'Failed to approve expense', type: 'error' });
        } finally {
            setProcessing(false);
        }
    }, [
        currentExpense,
        processing,
        currentIndex,
        expenses.length,
        currentBatch,
        totalPending,
        loadNextBatch,
        fetchPendingExpenses,
        filters,
        reviewStats,
        gamification,
        transitionToExpense,
    ]);

    // Handle rejection
    const handleReject = useCallback(async () => {
        if (!currentExpense || processing) return;

        try {
            setProcessing(true);
            await updateExpenseStatus({
                expenseId: currentExpense.id,
                status: 'REJECTED',
                rejectionReason: rejectionReason.trim() || undefined,
            });

            notify({ title: 'Expense rejected successfully', type: 'success' });

            // Update stats and gamification
            const newStats = {
                ...reviewStats,
                rejected: reviewStats.rejected + 1,
                totalReviewed: reviewStats.totalReviewed + 1,
                streak: reviewStats.streak + 1,
                longestStreak: Math.max(reviewStats.longestStreak, reviewStats.streak + 1),
                lastActionTime: Date.now(),
            };
            setReviewStats(newStats);

            // Gamification updates
            const xpGained = calculateXP('reject');
            const newXP = gamification.xp + xpGained;
            setGamification((prev) => ({ ...prev, xp: newXP }));
            checkLevelUp(newXP);
            checkAchievements(newStats);

            // Remove rejected expense from list with animation
            transitionToExpense('right', async () => {
                setExpenses((prev) => prev.filter((_, index) => index !== currentIndex));
                setTotalPending((prev) => prev - 1);

                // Adjust current index if needed
                if (currentIndex >= expenses.length - 1) {
                    setCurrentIndex(Math.max(0, currentIndex - 1));
                }

                // Reset rejection state
                setRejectionReason('');
                setShowRejectionInput(false);

                // Check if we need to load more expenses
                const remainingInBatch = expenses.length - 1; // -1 because we just removed one
                const totalLoadedSoFar = (currentBatch + 1) * BATCH_SIZE;

                if (remainingInBatch <= 5 && totalLoadedSoFar < totalPending) {
                    // Load next batch when we're running low
                    await loadNextBatch();
                } else if (remainingInBatch === 0) {
                    // If no more expenses, refresh to check for new ones
                    await fetchPendingExpenses(filters);
                }
            });
        } catch (error) {
            console.error('Error rejecting expense:', error);
            notify({ title: 'Failed to reject expense', type: 'error' });
        } finally {
            setProcessing(false);
        }
    }, [
        currentExpense,
        processing,
        rejectionReason,
        currentIndex,
        expenses.length,
        fetchPendingExpenses,
        filters,
        reviewStats,
        gamification,
        transitionToExpense,
    ]);

    // Handle skip
    const handleSkip = useCallback(() => {
        // Break streak when skipping
        setReviewStats((prev) => ({ ...prev, streak: 0, totalReviewed: prev.totalReviewed + 1 }));
        goToNext();
    }, [goToNext]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (processing) return;

            // Prevent shortcuts when typing in input fields
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.key) {
                case 'a':
                case 'A':
                    event.preventDefault();
                    if (availableActions.canApprove) {
                        handleApprove();
                    }
                    break;
                case 'r':
                case 'R':
                    event.preventDefault();
                    if (availableActions.canReject) {
                        if (showRejectionInput) {
                            handleReject();
                        } else {
                            setShowRejectionInput(true);
                        }
                    }
                    break;
                case 's':
                case 'S':
                    event.preventDefault();
                    if (availableActions.canSkip) {
                        handleSkip();
                    }
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    goToNext();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    goToPrevious();
                    break;
                case 'Escape':
                    event.preventDefault();
                    setShowRejectionInput(false);
                    setRejectionReason('');
                    break;
                case 'd':
                case 'D':
                    event.preventDefault();
                    setIsDocumentVisible((prev) => !prev);
                    break;
                case '?':
                    event.preventDefault();
                    setShowKeyboardHelp((prev) => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [processing, showRejectionInput, handleApprove, handleReject, handleSkip, goToNext, goToPrevious]);

    const getFullAddress = () => {
        if (!currentExpense) return '';

        const parts = [];
        if (currentExpense.street) parts.push(currentExpense.street);
        if (currentExpense.city) parts.push(currentExpense.city);
        if (currentExpense.state) parts.push(currentExpense.state);
        if (currentExpense.postalCode) parts.push(currentExpense.postalCode);
        if (currentExpense.country) parts.push(currentExpense.country);

        if (
            parts.length === 1 &&
            currentExpense.country &&
            !currentExpense.street &&
            !currentExpense.city &&
            !currentExpense.state &&
            !currentExpense.postalCode
        ) {
            return '';
        }

        return parts.join(', ');
    };

    const handleDownloadPDF = () => {
        if (pdfBlob && currentPdfDocument) {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentPdfDocument.document?.fileName || 'expense-document.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleViewInNewTab = () => {
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
                newWindow.onload = () => {
                    URL.revokeObjectURL(url);
                };
            }
        }
    };

    // Filter popup component
    if (showFilterPopup) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Bulk Expense Review</h1>
                    </div>
                }
            >
                <div className="max-w-6xl mx-auto p-6">
                    {/* Breadcrumb */}
                    <div className="mb-6">
                        <BreadCrumb
                            paths={[
                                { label: 'Dashboard', href: '/' },
                                { label: 'Expenses', href: '/expenses' },
                                { label: 'Bulk Review' },
                            ]}
                        />
                    </div>

                    {/* Filter Panel */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Filter Expenses</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">Customize your review preferences</p>
                                </div>
                                <button
                                    onClick={() => {
                                        // If user closes without setting up filters, redirect to expenses page
                                        if (needsInitialSetup) {
                                            router.push('/expenses');
                                        } else {
                                            // Just close the popup if they already have a session
                                            setShowFilterPopup(false);
                                        }
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-full transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Quick Presets */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Filters</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                    <button
                                        onClick={() =>
                                            updateFilters((prev) => ({
                                                ...prev,
                                                paidBy: 'DRIVER',
                                                categoryIds: [],
                                                driverId: '',
                                                startDate: '',
                                                endDate: '',
                                                minAmount: '',
                                                maxAmount: '',
                                            }))
                                        }
                                        className="p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg text-xs font-medium text-gray-700 hover:text-blue-700 transition-all text-center"
                                    >
                                        Driver Paid
                                    </button>
                                    <button
                                        onClick={() =>
                                            updateFilters((prev) => ({
                                                ...prev,
                                                paidBy: 'COMPANY',
                                                categoryIds: [],
                                                driverId: '',
                                                startDate: '',
                                                endDate: '',
                                                minAmount: '',
                                                maxAmount: '',
                                            }))
                                        }
                                        className="p-2.5 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 rounded-lg text-xs font-medium text-gray-700 hover:text-green-700 transition-all text-center"
                                    >
                                        Company Paid
                                    </button>
                                    <button
                                        onClick={() => {
                                            const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                                .toISOString()
                                                .split('T')[0];
                                            updateFilters((prev) => ({
                                                ...prev,
                                                paidBy: '',
                                                categoryIds: [],
                                                driverId: '',
                                                startDate: last7Days,
                                                endDate: '',
                                                minAmount: '',
                                                maxAmount: '',
                                            }));
                                        }}
                                        className="p-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-lg text-xs font-medium text-gray-700 hover:text-purple-700 transition-all text-center"
                                    >
                                        Last 7 Days
                                    </button>
                                    <button
                                        onClick={() => {
                                            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                                                .toISOString()
                                                .split('T')[0];
                                            updateFilters((prev) => ({
                                                ...prev,
                                                paidBy: '',
                                                categoryIds: [],
                                                driverId: '',
                                                startDate: last30Days,
                                                endDate: '',
                                                minAmount: '',
                                                maxAmount: '',
                                            }));
                                        }}
                                        className="p-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg text-xs font-medium text-gray-700 hover:text-indigo-700 transition-all text-center"
                                    >
                                        Last 30 Days
                                    </button>
                                    <button
                                        onClick={() => {
                                            const thisMonth = new Date();
                                            const startOfMonth = new Date(
                                                thisMonth.getFullYear(),
                                                thisMonth.getMonth(),
                                                1,
                                            )
                                                .toISOString()
                                                .split('T')[0];
                                            updateFilters((prev) => ({
                                                ...prev,
                                                paidBy: '',
                                                categoryIds: [],
                                                driverId: '',
                                                startDate: startOfMonth,
                                                endDate: '',
                                                minAmount: '',
                                                maxAmount: '',
                                            }));
                                        }}
                                        className="p-2.5 bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 rounded-lg text-xs font-medium text-gray-700 hover:text-pink-700 transition-all text-center"
                                    >
                                        This Month
                                    </button>
                                    <button
                                        onClick={() =>
                                            updateFilters((prev) => ({
                                                ...prev,
                                                paidBy: '',
                                                categoryIds: [],
                                                driverId: '',
                                                startDate: '',
                                                endDate: '',
                                                minAmount: '100',
                                                maxAmount: '',
                                            }))
                                        }
                                        className="p-2.5 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg text-xs font-medium text-gray-700 hover:text-orange-700 transition-all text-center"
                                    >
                                        High Value
                                    </button>
                                </div>
                            </div>

                            {/* Filter Groups */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Payment Source */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <label className="flex items-center text-sm font-medium text-gray-900 mb-3">
                                        <CurrencyDollarIcon className="w-4 h-4 mr-2 text-gray-600" />
                                        Payment Source
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['', 'COMPANY', 'DRIVER'].map((value, index) => {
                                            const labels = ['All', 'Company', 'Driver'];
                                            const icons = [
                                                null,
                                                <BuildingOfficeIcon key="company" className="w-3.5 h-3.5 mb-1" />,
                                                <UserIcon key="driver" className="w-3.5 h-3.5 mb-1" />,
                                            ];
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() =>
                                                        updateFilters((prev) => ({ ...prev, paidBy: value }))
                                                    }
                                                    className={`p-2.5 rounded-lg text-xs font-medium transition-all flex flex-col items-center ${
                                                        filters.paidBy === value
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {icons[index]}
                                                    {labels[index]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <label className="flex items-center text-sm font-medium text-gray-900 mb-3">
                                        <TagIcon className="w-4 h-4 mr-2 text-gray-600" />
                                        Categories
                                    </label>
                                    <CategoryCombobox
                                        categories={categories}
                                        selectedCategoryIds={filters.categoryIds}
                                        onChange={(categoryIds) => updateFilters((prev) => ({ ...prev, categoryIds }))}
                                        loading={loadingFilters}
                                    />
                                </div>

                                {/* Driver */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <label className="flex items-center text-sm font-medium text-gray-900 mb-3">
                                        <TruckIcon className="w-4 h-4 mr-2 text-gray-600" />
                                        Driver
                                    </label>
                                    <select
                                        value={filters.driverId}
                                        onChange={(e) =>
                                            updateFilters((prev) => ({ ...prev, driverId: e.target.value }))
                                        }
                                        disabled={loadingFilters}
                                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm disabled:bg-gray-50"
                                    >
                                        <option value="">All Drivers</option>
                                        {Array.isArray(drivers) &&
                                            drivers.map((driver) => (
                                                <option key={driver.id} value={driver.id}>
                                                    {driver.firstName} {driver.lastName}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Amount Range */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <label className="flex items-center text-sm font-medium text-gray-900 mb-3">
                                        <CurrencyDollarIcon className="w-4 h-4 mr-2 text-gray-600" />
                                        Amount Range
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            value={filters.minAmount}
                                            onChange={(e) =>
                                                updateFilters((prev) => ({ ...prev, minAmount: e.target.value }))
                                            }
                                            className="p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            value={filters.maxAmount}
                                            onChange={(e) =>
                                                updateFilters((prev) => ({ ...prev, maxAmount: e.target.value }))
                                            }
                                            className="p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <label className="flex items-center text-sm font-medium text-gray-900 mb-3">
                                    <CalendarDaysIcon className="w-4 h-4 mr-2 text-gray-600" />
                                    Date Range
                                </label>
                                <DateRangePicker
                                    variant="apple"
                                    size="md"
                                    placeholder="Select date range"
                                    initialFrom={filters.startDate}
                                    initialTo={filters.endDate}
                                    onChange={(range) => {
                                        const startDate = range.from ? range.from.toISOString().split('T')[0] : '';
                                        const endDate = range.to ? range.to.toISOString().split('T')[0] : '';
                                        updateFilters((prev) => ({
                                            ...prev,
                                            startDate,
                                            endDate,
                                        }));
                                    }}
                                    className="w-full"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <label className="flex items-center text-sm font-medium text-gray-900 mb-4">
                                    <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2 text-gray-600" />
                                    Expense Status
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { value: 'all', label: 'All Statuses', description: 'Show all' },
                                        { value: 'pending', label: 'Pending', description: 'Awaiting approval' },
                                        { value: 'approved', label: 'Approved', description: 'Ready for payment' },
                                        { value: 'rejected', label: 'Rejected', description: 'Needs attention' },
                                    ].map((option) => (
                                        <div key={option.value} className="relative">
                                            <label className="cursor-pointer group block">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value={option.value}
                                                    checked={filters.status === option.value}
                                                    onChange={(e) =>
                                                        updateFilters((prev) => ({ ...prev, status: e.target.value }))
                                                    }
                                                    className="sr-only"
                                                />
                                                <div
                                                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                                        filters.status === option.value
                                                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                            : 'border-gray-200 bg-white group-hover:border-gray-300 group-hover:shadow-sm'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div
                                                            className={`text-sm font-medium transition-colors ${
                                                                filters.status === option.value
                                                                    ? 'text-blue-900'
                                                                    : 'text-gray-900'
                                                            }`}
                                                        >
                                                            {option.label}
                                                        </div>
                                                        <div
                                                            className={`w-4 h-4 rounded-full border-2 transition-all ${
                                                                filters.status === option.value
                                                                    ? 'border-blue-500 bg-blue-500'
                                                                    : 'border-gray-300 bg-white'
                                                            }`}
                                                        >
                                                            {filters.status === option.value && (
                                                                <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`text-xs transition-colors ${
                                                            filters.status === option.value
                                                                ? 'text-blue-700'
                                                                : 'text-gray-500'
                                                        }`}
                                                    >
                                                        {option.description}
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Filters with Transition */}
                            <Transition
                                show={
                                    !!(
                                        filters.paidBy ||
                                        filters.categoryIds.length > 0 ||
                                        filters.driverId ||
                                        filters.minAmount ||
                                        filters.maxAmount ||
                                        filters.startDate ||
                                        filters.endDate ||
                                        (filters.status && filters.status !== 'all')
                                    )
                                }
                                enter="transition-all duration-300 ease-out"
                                enterFrom="opacity-0 max-h-0 overflow-hidden"
                                enterTo="opacity-100 max-h-96"
                                leave="transition-all duration-300 ease-in"
                                leaveFrom="opacity-100 max-h-96"
                                leaveTo="opacity-0 max-h-0 overflow-hidden"
                            >
                                <div className="bg-blue-50 rounded-xl p-4 mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium text-blue-900">Active Filters</h4>
                                        <button
                                            onClick={shareFilterURL}
                                            className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                                        >
                                            <ShareIcon className="w-3 h-3 mr-1" />
                                            Share
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {filters.paidBy && (
                                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                                                {filters.paidBy === 'COMPANY' ? 'Company' : 'Driver'}
                                                <button
                                                    onClick={() => updateFilters((prev) => ({ ...prev, paidBy: '' }))}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                        {filters.categoryIds.length > 0 && (
                                            <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs">
                                                {filters.categoryIds.length} categories
                                                <button
                                                    onClick={() =>
                                                        updateFilters((prev) => ({ ...prev, categoryIds: [] }))
                                                    }
                                                    className="ml-1 text-orange-600 hover:text-orange-800"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                        {filters.driverId && (
                                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs">
                                                {Array.isArray(drivers) &&
                                                    (() => {
                                                        const driver = drivers.find((d) => d.id === filters.driverId);
                                                        return driver
                                                            ? `${driver.firstName} ${driver.lastName}`
                                                            : 'Driver';
                                                    })()}
                                                <button
                                                    onClick={() => updateFilters((prev) => ({ ...prev, driverId: '' }))}
                                                    className="ml-1 text-purple-600 hover:text-purple-800"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                        {(filters.minAmount || filters.maxAmount) && (
                                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
                                                ${filters.minAmount || '0'} - ${filters.maxAmount || '∞'}
                                                <button
                                                    onClick={() =>
                                                        updateFilters((prev) => ({
                                                            ...prev,
                                                            minAmount: '',
                                                            maxAmount: '',
                                                        }))
                                                    }
                                                    className="ml-1 text-green-600 hover:text-green-800"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                        {(filters.startDate || filters.endDate) && (
                                            <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs">
                                                {filters.startDate
                                                    ? new Date(filters.startDate).toLocaleDateString()
                                                    : '∞'}{' '}
                                                to{' '}
                                                {filters.endDate ? new Date(filters.endDate).toLocaleDateString() : '∞'}
                                                <button
                                                    onClick={() =>
                                                        updateFilters((prev) => ({
                                                            ...prev,
                                                            startDate: '',
                                                            endDate: '',
                                                        }))
                                                    }
                                                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                        {filters.status && filters.status !== 'all' && (
                                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">
                                                {filters.status === 'pending' && 'Pending Review'}
                                                {filters.status === 'approved' && 'Approved'}
                                                {filters.status === 'rejected' && 'Rejected'}
                                                <button
                                                    onClick={() =>
                                                        updateFilters((prev) => ({ ...prev, status: 'all' }))
                                                    }
                                                    className="ml-1 text-gray-600 hover:text-gray-800"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Transition>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-6 py-4 bg-white">
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={() => {
                                        const clearedFilters = {
                                            paidBy: '',
                                            categoryIds: [],
                                            driverId: '',
                                            startDate: '',
                                            endDate: '',
                                            minAmount: '',
                                            maxAmount: '',
                                            status: 'all',
                                        };
                                        setFilters(clearedFilters);
                                        updateURLWithFilters(clearedFilters);
                                    }}
                                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Clear All
                                </button>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() =>
                                            startReviewWithFilters({
                                                paidBy: '',
                                                categoryIds: [],
                                                driverId: '',
                                                startDate: '',
                                                endDate: '',
                                                minAmount: '',
                                                maxAmount: '',
                                                status: 'all',
                                            })
                                        }
                                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Review All
                                    </button>
                                    <button
                                        onClick={() => startReviewWithFilters(filters)}
                                        disabled={loadingFilters}
                                        className="px-6 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loadingFilters ? 'Loading...' : 'Start Review'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center justify-between">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Bulk Expense Review</h1>
                        <button
                            onClick={() => {
                                setShowFilterPopup(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-200"
                        >
                            <FunnelIcon className="w-4 h-4 mr-2" />
                            Filters
                        </button>
                    </div>
                }
            >
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-6"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Loading Review Queue</h3>
                        <p className="text-gray-500 mb-4">Fetching pending expenses for review...</p>
                        {totalPending > 0 && (
                            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-sm text-blue-700">
                                    <span className="font-semibold">{totalPending}</span> expenses pending review
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Layout>
        );
    }

    if (!currentExpense) {
        return (
            <Layout
                smHeaderComponent={
                    <div className="flex items-center justify-between">
                        <h1 className="flex-1 text-xl font-semibold text-gray-900">Bulk Expense Review</h1>
                        <button
                            onClick={() => {
                                setShowFilterPopup(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-200"
                        >
                            <FunnelIcon className="w-4 h-4 mr-2" />
                            Filters
                        </button>
                    </div>
                }
            >
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
                    <div className="text-center space-y-8 max-w-lg mx-4">
                        <div className="relative">
                            <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/25 animate-pulse">
                                <CheckIcon className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                                <TrophyIcon className="w-5 h-5 text-yellow-800" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-5xl font-light text-gray-900 tracking-wide mb-4">🎉 All Done!</h2>
                            <p className="text-xl text-gray-600 font-light mb-6">
                                You&apos;ve completed the review queue!
                            </p>
                            {reviewStats.approved + reviewStats.rejected > 0 && (
                                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/40 mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Summary</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-green-600 mb-1">
                                                {reviewStats.approved}
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center justify-center">
                                                <CheckIcon className="w-4 h-4 mr-1" />
                                                Approved
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-red-600 mb-1">
                                                {reviewStats.rejected}
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center justify-center">
                                                <XMarkIcon className="w-4 h-4 mr-1" />
                                                Rejected
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-blue-600 mb-1">
                                                {Math.round((Date.now() - reviewStats.startTime) / 60000)}m
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center justify-center">
                                                <ClockIcon className="w-4 h-4 mr-1" />
                                                Time
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-purple-600 mb-1">
                                                {gamification.level}
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center justify-center">
                                                <TrophyIcon className="w-4 h-4 mr-1" />
                                                Level
                                            </div>
                                        </div>
                                    </div>

                                    {reviewStats.longestStreak > 0 && (
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <div className="flex items-center justify-center space-x-2 text-orange-600">
                                                <FireIcon className="w-5 h-5" />
                                                <span className="font-semibold">
                                                    Best Streak: {reviewStats.longestStreak}
                                                </span>
                                                <FireIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => setShowFilterPopup(true)}
                                    className="inline-flex items-center px-6 py-3 text-base font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 hover:border-blue-300 focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-2 transition-all duration-200"
                                >
                                    <FunnelIcon className="w-5 h-5 mr-2" />
                                    Setup New Filters
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center px-8 py-4 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-2xl border border-blue-400/50 hover:border-blue-300/60 focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transform hover:scale-105"
                                >
                                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                                    Review More
                                </button>
                            </div>
                            <div>
                                <Link href="/expenses" className="text-gray-500 hover:text-gray-700 transition-colors">
                                    Back to Expenses
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold text-gray-900">Bulk Review</h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Filters Button - Always Visible */}
                        <button
                            onClick={() => {
                                setShowFilterPopup(true);
                            }}
                            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                                hasURLFilters
                                    ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                                    : 'text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            <FunnelIcon className="w-4 h-4 mr-2" />
                            Filters
                            {hasURLFilters && (
                                <span className="ml-1 inline-flex items-center justify-center w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                        </button>

                        {/* Quick stats for mobile */}
                        <div className="sm:hidden flex items-center space-x-2 text-xs text-gray-500">
                            <span>L{gamification.level}</span>
                            {reviewStats.streak > 0 && <span>{reviewStats.streak}🔥</span>}
                        </div>

                        {/* Progress counter */}
                        <div className="text-sm text-gray-500">
                            <span className="font-medium">{currentIndex + 1}</span>
                            <span className="mx-1">/</span>
                            <span>{expenses.length}</span>
                            {totalPending > expenses.length && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    {totalPending} total pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            }
        >
            {/* Main content container */}
            <div className="h-screen flex flex-col">
                {/* Header with progress and shortcuts */}
                <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
                        {/* Breadcrumb */}
                        <div className="flex-shrink-0">
                            <BreadCrumb
                                paths={[
                                    { label: 'Dashboard', href: '/' },
                                    { label: 'Expenses', href: '/expenses' },
                                    { label: 'Bulk Review' },
                                ]}
                            />
                        </div>

                        {/* Enhanced Keyboard shortcuts */}
                        <div className="hidden lg:flex items-center space-x-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2">
                                <div className="flex items-center space-x-6">
                                    <div
                                        className={`flex items-center space-x-1 transition-opacity ${
                                            availableActions.canApprove ? 'opacity-100' : 'opacity-40'
                                        }`}
                                    >
                                        <kbd
                                            className={`inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${
                                                availableActions.canApprove
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >
                                            A
                                        </kbd>
                                        <span className="text-sm font-medium text-gray-700">
                                            {currentExpense?.approvalStatus?.toUpperCase() === 'REJECTED'
                                                ? 'Reconsider'
                                                : 'Approve'}
                                        </span>
                                    </div>
                                    <div
                                        className={`flex items-center space-x-1 transition-opacity ${
                                            availableActions.canReject ? 'opacity-100' : 'opacity-40'
                                        }`}
                                    >
                                        <kbd
                                            className={`inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${
                                                availableActions.canReject
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >
                                            R
                                        </kbd>
                                        <span className="text-sm font-medium text-gray-700">Reject</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <kbd className="inline-flex items-center px-2 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-xs font-semibold shadow-sm">
                                            S
                                        </kbd>
                                        <span className="text-sm font-medium text-gray-700">Skip</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <kbd className="inline-flex items-center px-2 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold shadow-sm">
                                            ← →
                                        </kbd>
                                        <span className="text-sm font-medium text-gray-700">Navigate</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowKeyboardHelp(true)}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm"
                            >
                                <QuestionMarkCircleIcon className="w-4 h-4 mr-2" />
                                All Shortcuts
                            </button>
                        </div>

                        {/* Mobile shortcuts indicator */}
                        <div className="lg:hidden">
                            <button
                                onClick={() => setShowKeyboardHelp(true)}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                            >
                                <QuestionMarkCircleIcon className="w-4 h-4 mr-2" />
                                Shortcuts
                            </button>
                        </div>
                    </div>

                    {/* Main Progress Bar */}
                    <div className="mt-3 sm:mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                            <span className="font-medium">Progress</span>
                            <span className="text-xs sm:text-sm text-gray-500 text-right">
                                <span className="hidden sm:inline">
                                    {Math.round(((currentIndex + 1) / Math.max(expenses.length, 1)) * 100)}% of current
                                    batch ({currentIndex + 1}/{expenses.length})
                                </span>
                                <span className="sm:hidden">
                                    {currentIndex + 1}/{expenses.length}
                                </span>
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${((currentIndex + 1) / Math.max(expenses.length, 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Main content area */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Document Section - Mobile responsive */}
                    {isDocumentVisible && (
                        <div
                            className={`${
                                isDocumentVisible ? 'lg:w-[45%]' : 'w-0'
                            } bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out h-64 sm:h-80 lg:h-auto`}
                        >
                            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base sm:text-lg font-medium text-gray-900">Document</h3>
                                    <div className="flex items-center space-x-2">
                                        {pdfBlob && (
                                            <>
                                                <button
                                                    onClick={handleDownloadPDF}
                                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                                                    title="Download PDF"
                                                >
                                                    <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                                <button
                                                    onClick={handleViewInNewTab}
                                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                                                    title="Open in new tab"
                                                >
                                                    <ArrowTopRightOnSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setIsDocumentVisible(false)}
                                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 lg:hidden"
                                            title="Hide document"
                                        >
                                            <EyeSlashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col p-3 sm:p-6 max-h-[calc(100vh-200px)] lg:max-h-[calc(100vh-150px)]">
                                <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-0 max-h-full">
                                    {pdfLoading ? (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                            <div className="text-center">
                                                <ArrowPathIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 mx-auto mb-2 animate-spin" />
                                                <p className="text-xs sm:text-sm font-medium text-gray-500">
                                                    Loading document...
                                                </p>
                                            </div>
                                        </div>
                                    ) : pdfBlob ? (
                                        <div className="h-full max-h-full overflow-hidden">
                                            <PDFViewer fileBlob={pdfBlob} />
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                            <div className="text-center">
                                                <DocumentTextIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" />
                                                <p className="text-xs sm:text-sm font-medium text-gray-500">
                                                    No document available
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    This expense has no receipt attached
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Details Section */}
                    <div
                        className={`${
                            isDocumentVisible ? 'lg:w-[55%]' : 'w-full'
                        } flex flex-col transition-all duration-300 ease-in-out`}
                    >
                        {/* Show document button when hidden on desktop */}
                        {!isDocumentVisible && (
                            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
                                <button
                                    onClick={() => setIsDocumentVisible(true)}
                                    className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                                >
                                    <EyeIcon className="w-4 h-4 mr-2" />
                                    Show Document
                                </button>
                            </div>
                        )}

                        {/* Expense details */}
                        <div className="flex-1 overflow-y-auto bg-white">
                            <div
                                className={`transition-all duration-300 ease-in-out ${
                                    isTransitioning
                                        ? slideDirection === 'right'
                                            ? 'transform translate-x-full opacity-0'
                                            : 'transform -translate-x-full opacity-0'
                                        : 'transform translate-x-0 opacity-100'
                                }`}
                            >
                                <div className="h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
                                    {/* Header section */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6">
                                        <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 sm:mb-4">
                                            <div className="flex items-center space-x-3 sm:space-x-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                                                    <span className="text-base sm:text-lg font-bold text-blue-600">
                                                        {currentExpense.category.name.charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                                                        {currentExpense.vendorName || currentExpense.category.name}
                                                    </h2>
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right flex-shrink-0">
                                                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                                    {formatCurrency(
                                                        Number(currentExpense.amount),
                                                        currentExpense.currencyCode,
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <ExpenseStatusBadge status={currentExpense.approvalStatus} />
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 shadow-sm">
                                                        {currentExpense.paidBy === 'COMPANY' ? 'Company' : 'Driver'}
                                                    </span>
                                                    {/* Driver invoice restriction indicator */}
                                                    {(currentExpense.driverInvoiceId ||
                                                        currentExpense.driverAssignment) && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 shadow-sm">
                                                            <svg
                                                                className="w-3 h-3 mr-1"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                            Locked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main details grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        {/* Left column - Primary details */}
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 rounded-xl p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                                    Expense Details
                                                </h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Date</span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {formatDate(
                                                                currentExpense.receiptDate instanceof Date
                                                                    ? currentExpense.receiptDate.toISOString()
                                                                    : currentExpense.receiptDate,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Category</span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {currentExpense.category.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Submitted</span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {formatDate(currentExpense.createdAt.toString())}
                                                        </span>
                                                    </div>
                                                    {currentExpense.createdBy && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-gray-600">Submitted by</span>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {currentExpense.createdBy.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Related information */}
                                            {(currentExpense.load ||
                                                currentExpense.driver ||
                                                currentExpense.equipment) && (
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                                        Related Information
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {currentExpense.load && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600 flex items-center">
                                                                    <TruckIcon className="w-4 h-4 mr-2" />
                                                                    Load
                                                                </span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {currentExpense.load.refNum}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {currentExpense.driver && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600 flex items-center">
                                                                    <UserIcon className="w-4 h-4 mr-2" />
                                                                    Driver
                                                                </span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {currentExpense.driver.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {currentExpense.equipment && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600">Equipment</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {currentExpense.equipment.equipmentNumber ||
                                                                        `${currentExpense.equipment.make} ${currentExpense.equipment.model}`.trim()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Restrictions Info */}
                                            {availableActions.reason && (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                                    <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                                                        <svg
                                                            className="w-4 h-4 mr-2"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        Action Restrictions
                                                    </h3>
                                                    <p className="text-sm text-yellow-700">{availableActions.reason}</p>
                                                    {(currentExpense.driverInvoiceId ||
                                                        currentExpense.driverAssignment) && (
                                                        <div className="mt-2 text-xs text-yellow-600">
                                                            This expense is part of a driver invoice and cannot be
                                                            modified independently.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Status-specific guidance */}
                                            {currentExpense.approvalStatus && !availableActions.reason && (
                                                <div className="bg-blue-50 rounded-xl p-4">
                                                    <h3 className="text-sm font-semibold text-blue-900 mb-2">
                                                        Status Guidance
                                                    </h3>
                                                    <div className="text-sm text-blue-700">
                                                        {currentExpense.approvalStatus.toUpperCase() === 'PENDING' && (
                                                            <p>
                                                                This expense is awaiting review. You can approve or
                                                                reject it.
                                                            </p>
                                                        )}
                                                        {currentExpense.approvalStatus.toUpperCase() === 'APPROVED' && (
                                                            <p>
                                                                This expense has been approved. You can reject it if
                                                                necessary.
                                                            </p>
                                                        )}
                                                        {currentExpense.approvalStatus.toUpperCase() === 'REJECTED' && (
                                                            <p>
                                                                This expense was previously rejected. You can reconsider
                                                                and approve it if the issues have been resolved.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right column - Description and location */}
                                        <div className="space-y-4">
                                            {/* Description */}
                                            {currentExpense.description && (
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                                        Description
                                                    </h3>
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {currentExpense.description}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Location */}
                                            {getFullAddress() && (
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                                        <MapPinIcon className="w-4 h-4 mr-2" />
                                                        Location
                                                    </h3>
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {getFullAddress()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rejection reason input */}
                        {showRejectionInput && (
                            <div className="flex-shrink-0 bg-red-50 border-t border-red-200 p-6">
                                <div className="max-w-md mx-auto">
                                    <label
                                        htmlFor="rejection-reason"
                                        className="block text-sm font-medium text-red-700 mb-2"
                                    >
                                        Reason for rejection (optional)
                                    </label>
                                    <textarea
                                        id="rejection-reason"
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Optionally explain why this expense is being rejected..."
                                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                        disabled={processing}
                                        autoFocus
                                    />
                                    <div className="mt-3 flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setShowRejectionInput(false);
                                                setRejectionReason('');
                                            }}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                            disabled={processing}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleReject}
                                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                                                    Rejecting...
                                                </>
                                            ) : (
                                                <>
                                                    <XMarkIcon className="w-4 h-4 mr-2" />
                                                    Reject Expense
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-4 sm:space-y-0">
                                {/* Navigation - Stack on mobile */}
                                <div className="flex items-center justify-center sm:justify-start space-x-3">
                                    <button
                                        onClick={goToPrevious}
                                        disabled={currentIndex === 0}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                        Previous
                                    </button>
                                    <button
                                        onClick={goToNext}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        Next
                                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                                    </button>
                                </div>

                                {/* Quick stats - Hide on small mobile */}
                                {reviewStats.approved + reviewStats.rejected > 0 && (
                                    <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
                                        <span className="flex items-center space-x-1">
                                            <CheckIcon className="w-4 h-4 text-green-500" />
                                            <span className="font-medium">{reviewStats.approved}</span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                            <XMarkIcon className="w-4 h-4 text-red-500" />
                                            <span className="font-medium">{reviewStats.rejected}</span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                            <ClockIcon className="w-4 h-4 text-blue-500" />
                                            <span className="font-medium">
                                                {Math.round((Date.now() - reviewStats.startTime) / 60000)}m
                                            </span>
                                        </span>
                                        {reviewStats.streak > 0 && (
                                            <span className="flex items-center space-x-1">
                                                <FireIcon className="w-4 h-4 text-orange-500" />
                                                <span className="font-medium">{reviewStats.streak}</span>
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons - Full width on mobile */}
                                <div className="flex items-center space-x-3">
                                    {/* Info message for restricted actions */}
                                    {availableActions.reason &&
                                        !availableActions.canApprove &&
                                        !availableActions.canReject && (
                                            <div className="flex-1 sm:flex-none text-center sm:text-left">
                                                <p className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                                                    {availableActions.reason}
                                                </p>
                                            </div>
                                        )}

                                    <button
                                        ref={skipButtonRef}
                                        onClick={handleSkip}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 active:scale-95"
                                        disabled={processing}
                                    >
                                        Skip
                                    </button>

                                    {/* Reject Button - Show only if allowed */}
                                    {availableActions.canReject && (
                                        <button
                                            ref={rejectButtonRef}
                                            onClick={() => {
                                                if (showRejectionInput) {
                                                    handleReject();
                                                } else {
                                                    setShowRejectionInput(true);
                                                }
                                            }}
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transform hover:scale-105 active:scale-95"
                                            disabled={processing}
                                        >
                                            {processing && showRejectionInput ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                                                    <span className="hidden sm:inline">Rejecting...</span>
                                                    <span className="sm:hidden">...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XMarkIcon className="w-4 h-4 mr-2" />
                                                    Reject
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* Approve Button - Show only if allowed */}
                                    {availableActions.canApprove && (
                                        <button
                                            ref={approveButtonRef}
                                            onClick={handleApprove}
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 sm:px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 focus:ring-4 focus:ring-green-500/20 transform hover:scale-105 active:scale-95"
                                            disabled={processing}
                                        >
                                            {processing && !showRejectionInput ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                                                    <span className="hidden sm:inline">
                                                        {currentExpense?.approvalStatus?.toUpperCase() === 'REJECTED'
                                                            ? 'Reconsidering...'
                                                            : 'Approving...'}
                                                    </span>
                                                    <span className="sm:hidden">...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckIcon className="w-4 h-4 mr-2" />
                                                    <span className="font-semibold">
                                                        {currentExpense?.approvalStatus?.toUpperCase() === 'REJECTED'
                                                            ? 'Reconsider'
                                                            : 'Approve'}
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* Status indicator for restricted expenses */}
                                    {availableActions.reason && (
                                        <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-500">
                                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                            <span>Restricted</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Level Up Notification */}
            {gamification.showLevelUp && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="animate-bounce">
                        <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-8 py-6 rounded-3xl shadow-2xl transform scale-110">
                            <div className="text-center">
                                <TrophyIcon className="w-12 h-12 mx-auto mb-3 text-yellow-300" />
                                <h3 className="text-2xl font-bold mb-2">Level Up!</h3>
                                <p className="text-lg">You reached Level {gamification.level}!</p>
                                <div className="mt-3 flex items-center justify-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} className="w-5 h-5 text-yellow-300 fill-current" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievement Notification */}
            {gamification.showAchievement && gamification.currentAchievement && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-sm">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                                    <gamification.currentAchievement.icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                    🏆 {gamification.currentAchievement.name}
                                </h4>
                                <p className="text-sm text-gray-600">{gamification.currentAchievement.desc}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Help Modal */}
            {showKeyboardHelp && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <CommandLineIcon className="w-5 h-5 text-blue-600 mr-2" />
                                    <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
                                </div>
                                <button
                                    onClick={() => setShowKeyboardHelp(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-4 max-h-96 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Actions</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Approve expense</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">A</kbd>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Reject expense</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">R</kbd>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Skip to next</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">S</kbd>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Navigation</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Previous expense</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Next expense</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→</kbd>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">View</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Toggle document panel</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">D</kbd>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Show shortcuts</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">?</kbd>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">Cancel rejection</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Esc</kbd>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <p className="text-xs text-gray-500 text-center">
                                Shortcuts work when not typing in input fields
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

BulkExpenseReview.authenticationEnabled = true;

export default BulkExpenseReview;

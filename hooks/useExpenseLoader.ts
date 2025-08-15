import { useState, useRef, useCallback } from 'react';
import { ExpandedDriverInvoice } from 'interfaces/models';

export const useExpenseLoader = () => {
    const [approvedExpenses, setApprovedExpenses] = useState<any[]>([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const expensesLoadedRef = useRef<string | null>(null);
    const isLoadingExpensesRef = useRef(false);

    const loadApprovedExpenses = useCallback(
        async (
            driverId: string,
            receiptStartDate: Date | null,
            receiptEndDate: Date | null,
            invoice?: ExpandedDriverInvoice,
            mode?: 'create' | 'edit',
            forceRefresh?: boolean,
        ) => {
            if (!driverId || !receiptStartDate || !receiptEndDate) {
                setApprovedExpenses([]);
                return;
            }

            // Create unique key for this combination to prevent duplicate calls
            const loadKey = `${driverId}-${receiptStartDate?.toISOString()}-${receiptEndDate?.toISOString()}-${
                mode || 'create'
            }`;

            // If already loaded this combination or currently loading, don't reload unless forced
            if (!forceRefresh && (expensesLoadedRef.current === loadKey || isLoadingExpensesRef.current)) {
                return;
            }

            try {
                setLoadingExpenses(true);
                isLoadingExpensesRef.current = true;

                const params = new URLSearchParams({
                    driverId: driverId,
                    receiptStartDate: receiptStartDate.toISOString().split('T')[0],
                    receiptEndDate: receiptEndDate.toISOString().split('T')[0],
                    status: 'APPROVED',
                    excludeAttached: 'true',
                    paidBy: 'DRIVER', // Only get driver-paid expenses
                });

                // If editing an existing invoice, allow expenses attached to this invoice
                if (invoice?.id) {
                    params.set('allowedInvoiceId', invoice.id);
                }

                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                const response = await fetch(`/api/expenses?${params.toString()}`, {
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Failed to fetch expenses: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // Check if the response has the expected structure
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid response format from expenses API');
                }

                // For edit mode, ensure that currently attached expenses are included even if they fall outside date range
                let allExpenses = data.expenses || [];

                if (mode === 'edit' && invoice?.expenses && invoice.expenses.length > 0) {
                    // Get currently attached expense IDs
                    const attachedExpenseIds = invoice.expenses.map((exp: any) => exp.id);

                    // Filter out any attached expenses that might already be in the list to avoid duplicates
                    allExpenses = allExpenses.filter((exp: any) => !attachedExpenseIds.includes(exp.id));

                    // Add the currently attached expenses to ensure they appear in the list
                    allExpenses = [...allExpenses, ...invoice.expenses];

                    // Sort by receipt date descending
                    allExpenses.sort(
                        (a: any, b: any) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime(),
                    );
                }

                setApprovedExpenses(allExpenses);
                expensesLoadedRef.current = loadKey; // Mark this combination as loaded
            } catch (error) {
                console.error('Error loading approved expenses:', error);
                setApprovedExpenses([]);

                // If it's an abort error (timeout), don't mark as loaded so it can retry
                if ((error as any).name !== 'AbortError') {
                    expensesLoadedRef.current = loadKey; // Mark as loaded even on error to prevent infinite retries
                }
            } finally {
                setLoadingExpenses(false);
                isLoadingExpensesRef.current = false;
            }
        },
        [],
    );

    const resetExpenses = useCallback(() => {
        setApprovedExpenses([]);
        setLoadingExpenses(false);
        expensesLoadedRef.current = null;
        isLoadingExpensesRef.current = false;
    }, []);

    const clearLoadedCache = useCallback(() => {
        expensesLoadedRef.current = null;
    }, []);

    return {
        approvedExpenses,
        loadingExpenses,
        loadApprovedExpenses,
        resetExpenses,
        clearLoadedCache,
    };
};

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { ExpandedExpense } from '../../interfaces/models';

type ExpenseContextType = {
    expense: ExpandedExpense | null;
    setExpense: React.Dispatch<React.SetStateAction<ExpandedExpense | null>>;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const ExpenseContext = createContext<ExpenseContextType>({
    expense: null,
    setExpense: () => null,
    loading: true,
    error: null,
    refetch: async () => {
        console.warn('refetch called on default context');
    },
});

type ExpenseProviderProps = {
    children: React.ReactNode;
    expenseId: string;
};

export function ExpenseProvider({ children, expenseId }: ExpenseProviderProps) {
    const [expense, setExpense] = useState<ExpandedExpense | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load expense data
    const loadExpenseData = useCallback(async () => {
        if (!expenseId) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/expenses/${expenseId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch expense');
            }

            const expenseData = await response.json();
            setExpense(expenseData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load expense data');
        } finally {
            setLoading(false);
        }
    }, [expenseId]);

    // Refetch function for manual refresh
    const refetch = useCallback(async () => {
        await loadExpenseData();
    }, [loadExpenseData]);

    useEffect(() => {
        loadExpenseData();
    }, [loadExpenseData]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(
        () => ({
            expense,
            setExpense,
            loading,
            error,
            refetch,
        }),
        [expense, setExpense, loading, error, refetch],
    );

    return <ExpenseContext.Provider value={contextValue}>{children}</ExpenseContext.Provider>;
}

export function useExpenseContext() {
    return useContext(ExpenseContext);
}

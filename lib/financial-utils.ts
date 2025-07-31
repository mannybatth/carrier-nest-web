/**
 * Financial calculation utilities for consistent precision across frontend and backend
 * Matches Prisma.Decimal behavior for financial calculations
 */

/**
 * Assignment interface for financial calculations
 */
interface AssignmentCalculation {
    chargeType?: 'FIXED_PAY' | 'PER_MILE' | 'PER_HOUR' | 'PERCENTAGE_OF_LOAD' | string;
    chargeValue?: number | string | null | undefined | { toString(): string }; // Support Prisma.Decimal
    billedDistanceMiles?: number | string | null | undefined | { toString(): string };
    billedDurationHours?: number | string | null | undefined | { toString(): string };
    billedLoadRate?: number | string | null | undefined | { toString(): string };
    routeLeg?: {
        distanceMiles?: number | string | null | undefined | { toString(): string };
        durationHours?: number | string | null | undefined | { toString(): string };
    };
    load?: {
        rate?: number | string | null | undefined | { toString(): string };
    };
}

/**
 * Performs financial calculation with proper rounding to 2 decimal places
 * Uses banker's rounding (round half up) to match backend Prisma.Decimal behavior
 * @param value - The number to round
 * @returns Rounded number to 2 decimal places
 */
export const financialCalculation = (value: number): number => {
    // Handle edge cases
    if (!isFinite(value) || isNaN(value)) {
        return 0;
    }

    // Round to 2 decimal places using Math.round (round half up)
    // This matches Prisma.Decimal.ROUND_HALF_UP behavior
    return Math.round(value * 100) / 100;
};

/**
 * Safely converts any value to a number, returning 0 if invalid
 * @param value - The value to convert (supports Prisma.Decimal)
 * @returns A valid number or 0
 */
export const safeNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    // Handle Prisma.Decimal or objects with toString method
    if (typeof value === 'object' && value !== null && 'toString' in value) {
        const num = Number(value.toString());
        return isNaN(num) ? 0 : num;
    }

    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

/**
 * Adds two financial values with proper rounding
 * @param a - First value
 * @param b - Second value
 * @returns Sum rounded to 2 decimal places
 */
export const financialAdd = (a: number, b: number): number => {
    return financialCalculation(safeNumber(a) + safeNumber(b));
};

/**
 * Multiplies two financial values with proper rounding
 * @param a - First value
 * @param b - Second value
 * @returns Product rounded to 2 decimal places
 */
export const financialMultiply = (a: number, b: number): number => {
    return financialCalculation(safeNumber(a) * safeNumber(b));
};

/**
 * Divides two financial values with proper rounding
 * @param a - Dividend
 * @param b - Divisor
 * @returns Quotient rounded to 2 decimal places, or 0 if divisor is 0
 */
export const financialDivide = (a: number, b: number): number => {
    const divisor = safeNumber(b);
    if (divisor === 0) {
        return 0;
    }
    return financialCalculation(safeNumber(a) / divisor);
};

/**
 * Calculates assignment amount based on charge type with financial precision
 * @param assignment - Assignment object with charge details
 * @param emptyMiles - Empty miles for per-mile calculations
 * @returns Calculated amount with proper financial rounding
 */
export const calculateAssignmentAmount = (assignment: AssignmentCalculation, emptyMiles = 0): number => {
    const chargeValue = safeNumber(assignment.chargeValue);
    const chargeType = assignment.chargeType;

    // Handle missing or invalid charge type
    if (!chargeType) {
        return 0;
    }

    switch (chargeType) {
        case 'FIXED_PAY':
            return financialCalculation(chargeValue);

        case 'PER_MILE':
            const baseMiles = safeNumber(assignment.billedDistanceMiles || assignment.routeLeg?.distanceMiles);
            const totalMiles = baseMiles + emptyMiles;
            return financialMultiply(totalMiles, chargeValue);

        case 'PER_HOUR':
            const hours = safeNumber(assignment.billedDurationHours || assignment.routeLeg?.durationHours);
            return financialMultiply(hours, chargeValue);

        case 'PERCENTAGE_OF_LOAD':
            const loadRate = safeNumber(assignment.billedLoadRate || assignment.load?.rate);
            const percentage = financialDivide(chargeValue, 100);
            return financialMultiply(loadRate, percentage);

        default:
            return 0;
    }
};

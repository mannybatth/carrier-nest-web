import { startOfMonth, isAfter } from 'date-fns';
import { BASIC_PLAN_AI_RATECON_IMPORTS, PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER } from 'lib/constants';
import prisma from 'lib/prisma';
import { isProPlan } from 'lib/subscription';

/**
 * Determines if a rate confirmation (ratecon) can be imported for a given carrier.
 *
 * This function checks the carrier's subscription plan and the number of ratecon imports
 * already performed in the current month. If the carrier is on a Pro plan, the maximum
 * number of imports allowed is `PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER` times the number of drivers.
 * For other plans, the maximum number of imports allowed is `BASIC_PLAN_AI_RATECON_IMPORTS`.
 * If the carrier's import count has been reset for the current month, it will reset the count
 * and update the last import reset date.
 *
 * @param carrierId - The unique identifier of the carrier.
 * @param shouldIncrement - If true, increments the import count when checking. Defaults to false.
 * @returns A promise that resolves to a boolean indicating whether the ratecon can be imported.
 * @throws Will throw an error if the carrier is not found.
 */
export async function canImportRatecon({
    carrierId,
    shouldIncrement = false,
}: {
    carrierId: string;
    shouldIncrement?: boolean;
}): Promise<boolean> {
    const carrier = await prisma.carrier.findUnique({
        where: { id: carrierId },
        include: { subscription: true },
    });

    if (!carrier) {
        throw new Error('Carrier not found');
    }

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);

    // Reset count if lastImportReset is null or if it's from a previous month
    if (!carrier.lastImportReset || isAfter(startOfCurrentMonth, carrier.lastImportReset)) {
        await prisma.carrier.update({
            where: { id: carrierId },
            data: {
                rateconImportsCount: 0,
                lastImportReset: now,
            },
        });
        carrier.rateconImportsCount = 0;
    }

    const maxImports =
        isProPlan(carrier.subscription) && carrier.subscription?.numberOfDrivers
            ? PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER * carrier.subscription.numberOfDrivers
            : BASIC_PLAN_AI_RATECON_IMPORTS;

    if (carrier.rateconImportsCount < maxImports) {
        if (shouldIncrement) {
            await prisma.carrier.update({
                where: { id: carrierId },
                data: {
                    rateconImportsCount: { increment: 1 },
                },
            });
        }
        return true;
    }

    return false;
}

import { Driver } from '@prisma/client';
import { ExpandedCarrier } from '../../interfaces/models';

/**
 * Calculate available seats for driver activation
 * This matches the logic used in the drivers listing page
 */
export const calculateAvailableSeats = (
    activeDrivers: Driver[],
    defaultCarrier: ExpandedCarrier | null,
): { availableSeats: number; totalSeats: number; usedSeats: number } => {
    const totalSeats = defaultCarrier?.subscription?.numberOfDrivers || 1;
    const usedSeats = activeDrivers.filter((d) => d.active).length;
    const availableSeats = Math.max(0, totalSeats - usedSeats);

    return {
        availableSeats,
        totalSeats,
        usedSeats,
    };
};

/**
 * Get all drivers to calculate subscription seats consistently
 * This ensures both pages use the same data source
 */
export const getAllDriversForSeatCalculation = async (): Promise<Driver[]> => {
    try {
        const response = await fetch('/api/drivers?limit=1000'); // High limit to get all drivers
        if (response.ok) {
            const data = await response.json();
            return data.data?.drivers || [];
        } else {
            console.error('Failed to fetch drivers for seat calculation');
            return [];
        }
    } catch (error) {
        console.error('Error fetching drivers for seat calculation:', error);
        return [];
    }
};

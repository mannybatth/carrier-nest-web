// Utility functions for TimeRangeSelector

export interface TimeRangeValue {
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    isRange: boolean; // true for range, false for specific time
}

/**
 * Convert TimeRangeValue to a string representation for storage
 */
export const timeRangeToString = (timeRange: TimeRangeValue): string => {
    if (timeRange.isRange) {
        return `${timeRange.startTime}-${timeRange.endTime}`;
    }
    return timeRange.startTime;
};

/**
 * Parse a string time representation back to TimeRangeValue
 */
export const stringToTimeRange = (timeString: string): TimeRangeValue => {
    if (timeString.includes('-')) {
        const [startTime, endTime] = timeString.split('-');
        return {
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            isRange: true,
        };
    }

    return {
        startTime: timeString,
        endTime: timeString,
        isRange: false,
    };
};

/**
 * Validate time format (HH:MM)
 */
export const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};

/**
 * Convert time to minutes from midnight
 */
export const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Convert minutes from midnight to time string
 */
export const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Format time for display in 12 or 24 hour format
 */
export const formatDisplayTime = (time: string, is24Hour = true): string => {
    if (is24Hour) return time;

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Calculate duration between two times in hours
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    let duration = endMinutes - startMinutes;

    // Handle overnight duration
    if (duration < 0) {
        duration += 24 * 60; // Add 24 hours
    }

    return Math.round((duration / 60) * 10) / 10; // Round to 1 decimal place
};

/**
 * Get common time presets
 */
export const getTimePresets = (): Array<{ label: string; value: TimeRangeValue }> => [
    {
        label: '6-9 AM',
        value: { startTime: '06:00', endTime: '09:00', isRange: true },
    },
    {
        label: '10-1 PM',
        value: { startTime: '10:00', endTime: '13:00', isRange: true },
    },
    {
        label: '2-5 PM',
        value: { startTime: '14:00', endTime: '17:00', isRange: true },
    },
];

/**
 * Swap pickup and dropoff times
 */
export const swapTimeRanges = (
    pickupTime: TimeRangeValue,
    dropoffTime: TimeRangeValue,
): { pickup: TimeRangeValue; dropoff: TimeRangeValue } => {
    return {
        pickup: dropoffTime,
        dropoff: pickupTime,
    };
};

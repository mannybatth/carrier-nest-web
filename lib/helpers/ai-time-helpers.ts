// Helper functions for AI time processing with TimeRangeSelector integration

import { type TimeRangeValue, stringToTimeRange } from './time-range-utils';

/**
 * Convert AI-extracted time string to TimeRangeValue format
 * Expected AI input formats:
 * - "14:30" (specific time) → { startTime: "14:30", endTime: "", isRange: false }
 * - "08:00-16:00" (range) → { startTime: "08:00", endTime: "16:00", isRange: true }
 * - "08:00 - 16:00" (range with spaces) → { startTime: "08:00", endTime: "16:00", isRange: true }
 * - "9:00 AM - 5:00 PM" (legacy format) → { startTime: "09:00", endTime: "17:00", isRange: true }
 * - "0800-1600" (military time without colons) → { startTime: "08:00", endTime: "16:00", isRange: true }
 * - "8am-5pm" (casual format) → { startTime: "08:00", endTime: "17:00", isRange: true }
 * - "8:00-17:00" (mixed 12/24 hour) → { startTime: "08:00", endTime: "17:00", isRange: true }
 */
export const convertAITimeToTimeRange = (aiTime: string): TimeRangeValue => {
    if (!aiTime || typeof aiTime !== 'string') {
        return { startTime: '', endTime: '', isRange: false };
    }

    const cleanTime = aiTime.trim();

    // Handle range formats (with various separators)
    if (cleanTime.includes('-') || cleanTime.includes('–') || cleanTime.includes('to') || cleanTime.includes(' - ')) {
        // Normalize different range separators
        const normalizedTime = cleanTime
            .replace(/\s*–\s*/, '-') // En dash
            .replace(/\s*to\s*/i, '-') // "to" separator
            .replace(/\s*-\s*/, '-'); // Regular dash with spaces

        // Handle "0800-1600" format (military time without colons)
        const militaryRangeMatch = normalizedTime.match(/^(\d{3,4})-(\d{3,4})$/);
        if (militaryRangeMatch) {
            const startTime = addColonToMilitaryTime(militaryRangeMatch[1]);
            const endTime = addColonToMilitaryTime(militaryRangeMatch[2]);
            if (startTime && endTime) {
                return {
                    startTime: ensureTwoDigitTime(startTime),
                    endTime: ensureTwoDigitTime(endTime),
                    isRange: true,
                };
            }
        }

        // Handle "8am-5pm" format
        const casualRangeMatch = normalizedTime.match(/^(\d{1,2})\s*(am|pm)-(\d{1,2})\s*(am|pm)$/i);
        if (casualRangeMatch) {
            const startHour = casualRangeMatch[1];
            const startPeriod = casualRangeMatch[2].toUpperCase();
            const endHour = casualRangeMatch[3];
            const endPeriod = casualRangeMatch[4].toUpperCase();

            const startTime = convertTo24Hour(`${startHour}:00 ${startPeriod}`);
            const endTime = convertTo24Hour(`${endHour}:00 ${endPeriod}`);

            if (startTime && endTime) {
                return {
                    startTime: ensureTwoDigitTime(startTime),
                    endTime: ensureTwoDigitTime(endTime),
                    isRange: true,
                };
            }
        }

        // Check if it's standard format "HH:MM-HH:MM"
        if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(normalizedTime)) {
            return stringToTimeRange(normalizedTime);
        }

        // Handle format with spaces "HH:MM - HH:MM" or mixed formats
        const parts = cleanTime.split(/\s*[-–]\s*|\s+to\s+/i);
        if (parts.length === 2) {
            const startTime = convertTo24Hour(parts[0].trim());
            const endTime = convertTo24Hour(parts[1].trim());

            if (startTime && endTime) {
                return {
                    startTime: ensureTwoDigitTime(startTime),
                    endTime: ensureTwoDigitTime(endTime),
                    isRange: true,
                };
            }
        }
    }

    // Handle "between X and Y" format
    const betweenMatch = cleanTime.match(/between\s+(.+?)\s+and\s+(.+)/i);
    if (betweenMatch) {
        const startTime = convertTo24Hour(betweenMatch[1].trim());
        const endTime = convertTo24Hour(betweenMatch[2].trim());

        if (startTime && endTime) {
            return {
                startTime: ensureTwoDigitTime(startTime),
                endTime: ensureTwoDigitTime(endTime),
                isRange: true,
            };
        }
    }

    // Handle single time
    const convertedTime = convertTo24Hour(cleanTime);
    if (convertedTime) {
        return {
            startTime: ensureTwoDigitTime(convertedTime),
            endTime: '',
            isRange: false,
        };
    }

    // Return empty if couldn't parse
    return { startTime: '', endTime: '', isRange: false };
};

/**
 * Convert military time without colons to HH:MM format
 * Examples: "0800" → "08:00", "930" → "09:30", "1430" → "14:30"
 */
const addColonToMilitaryTime = (timeStr: string): string | null => {
    if (!timeStr || typeof timeStr !== 'string') return null;

    const cleanTime = timeStr.trim();

    // Handle 3-4 digit military time
    if (/^\d{3,4}$/.test(cleanTime)) {
        if (cleanTime.length === 3) {
            // "930" → "9:30"
            return `${cleanTime[0]}:${cleanTime.slice(1)}`;
        } else if (cleanTime.length === 4) {
            // "0800" → "08:00"
            return `${cleanTime.slice(0, 2)}:${cleanTime.slice(2)}`;
        }
    }

    return null;
};

/**
 * Convert 12-hour time to 24-hour format
 * Enhanced to handle various formats including casual time expressions
 */
const convertTo24Hour = (timeStr: string): string | null => {
    if (!timeStr) return null;

    const cleanTime = timeStr.trim().toUpperCase();

    // Already in 24-hour format (HH:MM)
    if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
        const [hours, minutes] = cleanTime.split(':');
        const hour = parseInt(hours);
        // Validate hour range for 24-hour format
        if (hour >= 0 && hour <= 23) {
            return cleanTime;
        }
    }

    // Handle casual formats like "8am", "5pm", "12noon", etc.
    const casualMatch = cleanTime.match(/^(\d{1,2})\s*(AM|PM|A|P|NOON|MIDNIGHT)$/);
    if (casualMatch) {
        let hours = parseInt(casualMatch[1]);
        const period = casualMatch[2];

        if (period === 'NOON' && hours === 12) {
            return '12:00';
        } else if (period === 'MIDNIGHT' && hours === 12) {
            return '00:00';
        } else if (period === 'PM' || period === 'P') {
            if (hours !== 12) hours += 12;
            return `${hours}:00`;
        } else if (period === 'AM' || period === 'A') {
            if (hours === 12) hours = 0;
            return `${hours}:00`;
        }
    }

    // Handle 12-hour format with minutes (HH:MM AM/PM)
    const twelveHourMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|A|P)$/);
    if (twelveHourMatch) {
        let hours = parseInt(twelveHourMatch[1]);
        const minutes = parseInt(twelveHourMatch[2]);
        const period = twelveHourMatch[3];

        if ((period === 'PM' || period === 'P') && hours !== 12) {
            hours += 12;
        } else if ((period === 'AM' || period === 'A') && hours === 12) {
            hours = 0;
        }

        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    // Handle format without colons but with AM/PM (e.g., "830AM", "1230PM")
    const noColonMatch = cleanTime.match(/^(\d{3,4})\s*(AM|PM|A|P)$/);
    if (noColonMatch) {
        const timeNum = noColonMatch[1];
        const period = noColonMatch[2];

        let hours: number;
        let minutes: number;

        if (timeNum.length === 3) {
            // "830" → 8:30
            hours = parseInt(timeNum[0]);
            minutes = parseInt(timeNum.slice(1));
        } else if (timeNum.length === 4) {
            // "1230" → 12:30
            hours = parseInt(timeNum.slice(0, 2));
            minutes = parseInt(timeNum.slice(2));
        } else {
            return null;
        }

        if ((period === 'PM' || period === 'P') && hours !== 12) {
            hours += 12;
        } else if ((period === 'AM' || period === 'A') && hours === 12) {
            hours = 0;
        }

        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    // Handle military time without colons (0800, 1430, etc.)
    if (/^\d{3,4}$/.test(cleanTime)) {
        const militaryTime = addColonToMilitaryTime(cleanTime);
        if (militaryTime) {
            const [hours] = militaryTime.split(':');
            const hour = parseInt(hours);
            // Validate military time range
            if (hour >= 0 && hour <= 23) {
                return militaryTime;
            }
        }
    }

    // Handle time with just hours (assume 24-hour format if > 12, otherwise could be either)
    const hourOnlyMatch = cleanTime.match(/^(\d{1,2})$/);
    if (hourOnlyMatch) {
        const hour = parseInt(hourOnlyMatch[1]);
        if (hour >= 0 && hour <= 23) {
            return `${hour}:00`;
        }
    }

    return null;
};

/**
 * Ensure time format has two digits for hours
 */
const ensureTwoDigitTime = (time: string): string => {
    if (!time) return time;

    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
};

/**
 * Convert TimeRangeValue back to simple string for backward compatibility
 * This is used when the form expects a simple time string
 */
export const timeRangeToSimpleString = (timeRange: TimeRangeValue): string => {
    if (!timeRange.startTime) return '';

    if (timeRange.isRange && timeRange.endTime) {
        return `${timeRange.startTime}-${timeRange.endTime}`;
    }

    return timeRange.startTime;
};

/**
 * Add colon to time string if missing (legacy support)
 * Examples: "1430" → "14:30", "930" → "9:30"
 */
export const addColonToTimeString = (timeStr: string): string => {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;

    const cleanTime = timeStr.trim();

    // Already has colon
    if (cleanTime.includes(':')) return cleanTime;

    // Handle numeric time strings
    if (/^\d{3,4}$/.test(cleanTime)) {
        if (cleanTime.length === 3) {
            return `${cleanTime[0]}:${cleanTime.slice(1)}`;
        } else if (cleanTime.length === 4) {
            return `${cleanTime.slice(0, 2)}:${cleanTime.slice(2)}`;
        }
    }

    return timeStr;
};

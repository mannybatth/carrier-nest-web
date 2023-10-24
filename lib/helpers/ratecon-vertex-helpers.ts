import { parse, format } from 'date-fns';

export function convertRateToNumber(rate: string | number): number {
    if (typeof rate === 'string') {
        // Remove commas and parse the string as a float
        const amount = rate.replace(/[^0-9.]/g, '');
        return parseFloat(amount);
    }
    return rate;
}

export function addColonToTimeString(time: string): string {
    // If the string already contains a colon, return it as is
    if (time.includes(':')) {
        return cleanupTimeString(time);
    }

    try {
        // Parse the string into a Date object
        const parsedDate = parse(time, 'HHmm', new Date());

        // Format the Date object back into a string with the desired format
        return cleanupTimeString(format(parsedDate, 'HH:mm'));
    } catch (error) {
        console.log(`Failed to parse time string: ${time}`);
        return cleanupTimeString(time);
    }
}

export function cleanupTimeString(input: string): string {
    const match = input.match(/(\d{1,2}:\d{2} [APMapm]{2})[\s\S]*?(\d{1,2}:\d{2} [APMapm]{2})/);

    if (match && match.length === 3) {
        return `${match[1]} - ${match[2]}`;
    } else {
        return input;
    }
}

import parse from 'date-fns/parse';
import isMatch from 'date-fns/isMatch';

export const parseDate = (value: string) => {
    const formats = [
        'M/dd/yy',
        'MM/dd/yy',
        'M/dd/yyyy',
        'MM/dd/yyyy',
        'dd/M/yy',
        'dd/MM/yy',
        'dd/M/yyyy',
        'dd/MM/yyyy',
        'yy/MM/dd',
        'yyyy/MM/dd',
        'MM/d yyyy',
        'MMM d yyyy',
        'MMMM d yyyy', // Full month name, e.g., "December 7 2020".
        'd MMM yyyy',
        'd MMMM yyyy', // Day first, e.g., "7 Dec 2020"
        'dd-MMM-yyyy',
        'd-MMMM-yyyy', // With hyphens
        'MMM d, yyyy',
        'MMMM d, yyyy', // With commas, e.g., "Dec 7, 2020"
        'd-MMM-yyyy',
        'd-MMMM-yyyy', // Day first with hyphens, e.g., "7-Dec-2020"
    ];

    for (const format of formats) {
        if (isMatch(value, format)) {
            return parse(value, format, new Date());
        }
    }

    throw new Error(`Invalid date format: ${value}`);
};

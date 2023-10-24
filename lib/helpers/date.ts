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
        'MMMM d yyyy',
        'd MMM yyyy',
        'd MMMM yyyy',
        'dd-MMM-yyyy',
        'd-MMMM-yyyy',
        'MMM d, yyyy',
        'MMMM d, yyyy',
        'd-MMM-yyyy',
        'd-MMMM-yyyy',
        'yyyy-MM-dd',
        'yy-MM-dd',
        'd-MM-yyyy',
        'dd-MM-yyyy',
    ];

    for (const format of formats) {
        if (isMatch(value, format)) {
            return parse(value, format, new Date());
        }
    }

    throw new Error(`Invalid date format: ${value}`);
};

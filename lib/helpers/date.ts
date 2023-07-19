import parse from 'date-fns/parse';
import isMatch from 'date-fns/isMatch';

export const parseDate = (value: string) => {
    if (isMatch(value, 'M/dd/yy')) {
        return parse(value, 'M/dd/yy', new Date());
    } else if (isMatch(value, 'MM/dd/yy')) {
        return parse(value, 'MM/dd/yy', new Date());
    } else if (isMatch(value, 'M/dd/yyyy')) {
        return parse(value, 'M/dd/yyyy', new Date());
    } else if (isMatch(value, 'MM/dd/yyyy')) {
        return parse(value, 'MM/dd/yyyy', new Date());
    } else if (isMatch(value, 'dd/M/yy')) {
        return parse(value, 'dd/M/yy', new Date());
    } else if (isMatch(value, 'dd/MM/yy')) {
        return parse(value, 'dd/MM/yy', new Date());
    } else if (isMatch(value, 'dd/M/yyyy')) {
        return parse(value, 'dd/M/yyyy', new Date());
    } else if (isMatch(value, 'dd/MM/yyyy')) {
        return parse(value, 'dd/MM/yyyy', new Date());
    } else if (isMatch(value, 'yy/MM/dd')) {
        return parse(value, 'yy/MM/dd', new Date());
    } else if (isMatch(value, 'yyyy/MM/dd')) {
        return parse(value, 'yyyy/MM/dd', new Date());
    } else {
        throw new Error(`Invalid date format: ${value}`);
    }
};

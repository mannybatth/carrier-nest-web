import React, { ChangeEvent, ComponentPropsWithoutRef, ReactElement, useState } from 'react';

const isValid = (val) => {
    const regexp = /^\d{0,2}?\:?\d{0,2}$/;

    const [hoursStr, minutesStr] = val.split(':');

    if (!regexp.test(val)) {
        return false;
    }

    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    const isValidHour = (hour) => Number.isInteger(hour) && hour >= 0 && hour < 24;
    const isValidMinutes = (minutes) =>
        (Number.isInteger(minutes) && hours >= 0 && hours < 24) || Number.isNaN(minutes);

    if (!isValidHour(hours) || !isValidMinutes(minutes)) {
        return false;
    }

    if (minutes < 10 && Number(minutesStr[0]) > 5) {
        return false;
    }

    const valArr = val.indexOf(':') !== -1 ? val.split(':') : [val];

    // check mm and HH
    if (valArr[0] && valArr[0].length && (parseInt(valArr[0], 10) < 0 || parseInt(valArr[0], 10) > 23)) {
        return false;
    }

    if (valArr[1] && valArr[1].length && (parseInt(valArr[1], 10) < 0 || parseInt(valArr[1], 10) > 59)) {
        return false;
    }

    return true;
};

type Props = {
    initialValue: string;
    input?: ReactElement;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
} & ComponentPropsWithoutRef<'input'>;

const TimeInput: React.FC<Props> = ({ initialValue, input, onChange, ...props }: Props) => {
    const [value, setValue] = useState(initialValue || '');

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        let newValue = event.target.value;
        if (newValue == value) {
            return;
        }
        if (isValid(newValue)) {
            if (newValue.length === 2 && value.length !== 3 && newValue.indexOf(':') === -1) {
                newValue = newValue + ':';
            }

            if (newValue.length === 2 && value.length === 3) {
                newValue = newValue.slice(0, 1);
            }

            if (newValue.length > 5) {
                return false;
            }

            setValue(newValue);

            if (newValue.length === 5) {
                event.target.value = newValue;
                onChange(event);
            }
        }
    };

    if (input) {
        return React.cloneElement(input, {
            ...props,
            onChange: handleChange,
            value,
        });
    }

    return <input {...props} onChange={handleChange} type="text" value={value} />;
};

export default TimeInput;

import classNames from 'classnames';
import React, { ChangeEvent, ComponentProps } from 'react';

const isValidMoney = (value: string, allowNegative = false): boolean => {
    const regex = allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/;
    return regex.test(value);
};

type Props = {
    value: string;
    allowNegative?: boolean;
} & ComponentProps<'input'>;

const MoneyInput: React.FC<Props> = ({ value, allowNegative, onChange, ...props }) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        if (isValidMoney(newValue, allowNegative)) {
            event.target.value = newValue;
            onChange(event);
        }
    };

    return (
        <div className="relative w-full rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
                {...props}
                value={value}
                onChange={handleChange}
                type="number"
                step="any"
                className={classNames(
                    props.className,
                    'block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pl-7 sm:text-sm',
                )}
                placeholder="0.00"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 sm:text-sm" id="price-currency">
                    USD
                </span>
            </div>
        </div>
    );
};

export default MoneyInput;

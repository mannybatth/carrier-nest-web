import React, { ChangeEvent, ComponentPropsWithoutRef } from 'react';

const isValidMoney = (value: string): boolean => {
    const regex = /^\d+(\.\d{1,2})?$/;
    return regex.test(value);
};

type Props = {
    value: number | string;
} & ComponentPropsWithoutRef<'input'>;

const MoneyInput: React.FC<Props> = ({ value, onChange, ...props }: Props) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        if (isValidMoney(newValue)) {
            event.target.value = newValue;
            onChange(event);
        }
    };

    return (
        <div className="relative mt-1 rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
                {...props}
                value={value}
                onChange={handleChange}
                type="number"
                className="block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pl-7 sm:text-sm"
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

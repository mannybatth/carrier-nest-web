import classNames from 'classnames';
import React, { ChangeEvent, ComponentProps, useState, useRef, useEffect } from 'react';

type Props = {
    value: string;
    allowNegative?: boolean;
} & ComponentProps<'input'>;

const MoneyInput: React.FC<Props> = ({ value, allowNegative = false, onChange, ...props }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [internalValue, setInternalValue] = useState(value);

    // Update internal value when prop value changes
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    // Validates if a character should be allowed
    const isValidChar = (char: string, currentValue: string, position: number): boolean => {
        // Always allow control characters
        if (char.length !== 1) return true;

        // Allow digits
        if (/\d/.test(char)) return true;

        // Allow decimal point
        if (char === '.') {
            // Only one decimal point allowed
            if (currentValue.includes('.')) return false;
            return true;
        }

        // Allow minus sign only at the beginning
        if (char === '-' && allowNegative) {
            return position === 0 && !currentValue.includes('-');
        }

        return false;
    };

    // Validates the complete value format
    const isValidCurrencyFormat = (inputValue: string): boolean => {
        if (inputValue === '') return true;
        if (inputValue === '.') return true; // Allow typing just decimal point
        if (inputValue === '-' && allowNegative) return true; // Allow typing just minus

        // Regex for valid currency:
        // - Optional minus sign
        // - Either: digits followed by optional decimal and 0-2 digits
        // - Or: decimal point followed by 1-2 digits
        const currencyRegex = allowNegative
            ? /^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/
            : /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;

        return currencyRegex.test(inputValue);
    };

    // Handle key down for better control
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        const { key } = event;
        const input = event.currentTarget;
        const { value: currentValue, selectionStart, selectionEnd } = input;

        // Allow control keys
        const controlKeys = [
            'Backspace',
            'Delete',
            'Tab',
            'Escape',
            'Enter',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'PageUp',
            'PageDown',
        ];

        if (controlKeys.includes(key)) return;

        // Handle Ctrl/Cmd combinations
        if (event.ctrlKey || event.metaKey) {
            if (['a', 'c', 'v', 'x', 'z', 'y'].includes(key.toLowerCase())) {
                return; // Allow copy, paste, select all, etc.
            }
        }

        // Get the new value after this keypress
        const start = selectionStart || 0;
        const end = selectionEnd || 0;
        const newValue = currentValue.slice(0, start) + key + currentValue.slice(end);

        // Check if this character/position is valid
        if (!isValidChar(key, currentValue, start)) {
            event.preventDefault();
            return;
        }

        // Check if the resulting value would be valid
        if (!isValidCurrencyFormat(newValue)) {
            event.preventDefault();
            return;
        }

        // Special handling for decimal places - don't allow more than 2
        if (key === '.' || /\d/.test(key)) {
            const decimalIndex = newValue.indexOf('.');
            if (decimalIndex !== -1) {
                const decimalPart = newValue.slice(decimalIndex + 1);
                if (decimalPart.length > 2) {
                    event.preventDefault();
                    return;
                }
            }
        }
    };

    // Handle paste events
    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();

        const pastedText = event.clipboardData.getData('text');
        const input = event.currentTarget;
        const { value: currentValue, selectionStart, selectionEnd } = input;

        const start = selectionStart || 0;
        const end = selectionEnd || 0;
        const newValue = currentValue.slice(0, start) + pastedText + currentValue.slice(end);

        // Only allow paste if result is valid currency format
        if (isValidCurrencyFormat(newValue)) {
            setInternalValue(newValue);

            // Create synthetic change event
            const changeEvent = {
                target: { value: newValue },
                currentTarget: { value: newValue },
            } as ChangeEvent<HTMLInputElement>;

            onChange?.(changeEvent);
        }
    };

    // Handle input changes
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;

        // Always allow empty string
        if (newValue === '') {
            setInternalValue('');
            onChange?.(event);
            return;
        }

        // Validate currency format
        if (isValidCurrencyFormat(newValue)) {
            setInternalValue(newValue);
            onChange?.(event);
        } else {
            // Reset to internal value if invalid
            if (inputRef.current) {
                inputRef.current.value = internalValue;
            }
        }
    };

    return (
        <div className="relative w-full shadow-sm">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
                {...props}
                ref={inputRef}
                value={internalValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                onWheel={(e) => e.currentTarget.blur()} // Prevent value change on scroll
                className={classNames(
                    props.className,
                    'block w-full pr-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 pl-7 sm:text-sm',
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

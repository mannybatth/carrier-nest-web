'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

type DateRangePickerProps = {
    onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
    className?: string;
    placeholder?: string;
    initialFrom?: Date | string;
    initialTo?: Date | string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'apple';
    required?: boolean;
    error?: boolean;
};

export default function DateRangePicker({
    onChange,
    className = '',
    placeholder = 'Select date range',
    initialFrom,
    initialTo,
    disabled = false,
    size = 'md',
    variant = 'default',
    required = false,
    error = false,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPositioned, setIsPositioned] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false); // Track if user is actively selecting

    // Ref to prevent infinite loops when updating from props
    const isUpdatingFromPropsRef = useRef(false);

    const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>(() => {
        const parseDate = (date: Date | string | undefined) => {
            if (!date) return undefined;
            if (typeof date === 'string') {
                // Parse date string correctly to avoid timezone issues
                // Split YYYY-MM-DD format and create date with local timezone
                const parts = date.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const day = parseInt(parts[2], 10);
                    return new Date(year, month, day);
                }
                // Fallback to regular parsing for other formats
                return new Date(date);
            }
            return date;
        };

        return {
            from: parseDate(initialFrom),
            to: parseDate(initialTo),
        };
    });

    const [currentMonth, setCurrentMonth] = useState(() => {
        // Initialize currentMonth based on the selected range
        const parseDate = (date: Date | string | undefined) => {
            if (!date) return undefined;
            if (typeof date === 'string') {
                // Parse date string correctly to avoid timezone issues
                const parts = date.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const day = parseInt(parts[2], 10);
                    return new Date(year, month, day);
                }
                return new Date(date);
            }
            return date;
        };

        const parsedFrom = parseDate(initialFrom);
        const parsedTo = parseDate(initialTo);

        // Use the 'from' date if available, otherwise 'to' date, otherwise current date
        if (parsedFrom && !isNaN(parsedFrom.getTime())) {
            return new Date(parsedFrom.getFullYear(), parsedFrom.getMonth(), 1);
        } else if (parsedTo && !isNaN(parsedTo.getTime())) {
            return new Date(parsedTo.getFullYear(), parsedTo.getMonth(), 1);
        }

        return new Date();
    });
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; position: 'top' | 'bottom' }>(
        {
            top: 0,
            left: 0,
            position: 'bottom',
        },
    );
    const pickerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click and scroll
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Don't close if clicking inside the picker input or the dropdown
            if (
                (pickerRef.current && pickerRef.current.contains(target)) ||
                (dropdownRef.current && dropdownRef.current.contains(target))
            ) {
                return;
            }

            // Don't close if user is actively selecting a range (has from but no to)
            if (isSelecting || (range.from && !range.to)) {
                return;
            }

            setIsOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            // Don't close if user is actively selecting a range
            if (isOpen && !isSelecting && !(range.from && !range.to)) {
                setIsOpen(false);
            }
        };

        const handleResize = () => {
            // Don't close if user is actively selecting a range
            if (isOpen && !isSelecting && !(range.from && !range.to)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            window.addEventListener('scroll', handleScroll, true); // true for capture phase to catch all scroll events
            window.addEventListener('resize', handleResize);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen, isSelecting, range.from, range.to]);

    // Update range when initial props change (e.g., when user steps back in stepper)
    useEffect(() => {
        // Prevent infinite loops
        if (isUpdatingFromPropsRef.current) return;

        const parseDate = (date: Date | string | undefined) => {
            if (!date) return undefined;
            if (typeof date === 'string') {
                // Parse date string correctly to avoid timezone issues
                // Split YYYY-MM-DD format and create date with local timezone
                const parts = date.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const day = parseInt(parts[2], 10);
                    return new Date(year, month, day);
                }
                // Fallback to regular parsing for other formats
                return new Date(date);
            }
            return date;
        };

        const newFrom = parseDate(initialFrom);
        const newTo = parseDate(initialTo);

        // Only update if the dates actually changed (compare by time value to avoid reference issues)
        setRange((currentRange) => {
            const fromChanged =
                (!newFrom && currentRange.from) ||
                (newFrom && !currentRange.from) ||
                (newFrom && currentRange.from && newFrom.getTime() !== currentRange.from.getTime());

            const toChanged =
                (!newTo && currentRange.to) ||
                (newTo && !currentRange.to) ||
                (newTo && currentRange.to && newTo.getTime() !== currentRange.to.getTime());

            if (fromChanged || toChanged) {
                isUpdatingFromPropsRef.current = true;
                // Reset the flag after a short delay
                setTimeout(() => {
                    isUpdatingFromPropsRef.current = false;
                }, 0);
                return { from: newFrom, to: newTo };
            }
            return currentRange;
        });
    }, [initialFrom, initialTo]);

    // Calculate dropdown position when opening
    const calculateDropdownPosition = useCallback((): { top: number; left: number; position: 'top' | 'bottom' } => {
        if (pickerRef.current) {
            const rect = pickerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 400; // Approximate height of dropdown

            const position: 'top' | 'bottom' =
                spaceBelow < dropdownHeight && spaceAbove > dropdownHeight ? 'top' : 'bottom';
            const top = position === 'top' ? rect.top - dropdownHeight : rect.bottom + 8;
            const left = rect.left;

            return {
                top,
                left,
                position,
            };
        }
        return { top: 0, left: 0, position: 'bottom' };
    }, []);

    // Update dropdown position when opening
    useEffect(() => {
        if (isOpen && pickerRef.current) {
            const newPosition = calculateDropdownPosition();
            setDropdownPosition(newPosition);
            // Small delay to allow position to be set before making visible
            setTimeout(() => setIsPositioned(true), 10);
        } else {
            setIsPositioned(false);
        }
    }, [isOpen, calculateDropdownPosition]);

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'h-8 px-2 text-xs';
            case 'lg':
                return 'h-12 px-4 text-base';
            default:
                return 'h-10 px-3 text-sm';
        }
    };

    const getVariantClasses = () => {
        const hasError = error || (required && !range.from && !range.to);

        if (variant === 'apple') {
            return {
                input: `${getSizeClasses()} w-full items-center rounded-xl bg-white/95 backdrop-blur-xl border transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer ${
                    hasError
                        ? 'border-red-300/60 focus:ring-red-500/40 focus:border-red-500/60 shadow-sm hover:shadow-md'
                        : 'border-gray-200/30 focus:ring-blue-500/40 focus:border-blue-500/60 shadow-sm hover:shadow-md'
                }`,
                dropdown: `fixed z-[9999] rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200/30 shadow-2xl p-6 w-[340px] max-w-[90vw] transition-all duration-200 ease-out`,
                button: 'px-4 py-2 text-sm font-medium bg-white/90 backdrop-blur-sm border border-gray-200/30 rounded-xl shadow-sm hover:shadow-md hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40',
                applyButton:
                    'rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg',
                clearButton: 'text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200',
            };
        }

        return {
            input: `${getSizeClasses()} w-full items-center rounded-md bg-white focus:outline-none focus:ring-2 cursor-pointer transition-colors ${
                hasError
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-200 focus:ring-gray-200'
            }`,
            dropdown: `fixed z-[9999] rounded-md border border-gray-200 bg-white p-4 shadow-lg w-[300px] max-w-[90vw] transition-all duration-200 ease-out`,
            button: 'px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition',
            applyButton: 'rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800',
            clearButton: 'text-sm text-gray-500 hover:text-gray-700',
        };
    };

    const variantClasses = getVariantClasses();

    const classNames = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

    // Use a ref to track the previous range to prevent unnecessary onChange calls
    const prevRangeRef = useRef<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

    useEffect(() => {
        // Don't trigger onChange if we're updating from props
        if (isUpdatingFromPropsRef.current) return;

        // Only call onChange if the range has actually changed by comparing timestamps
        const fromChanged =
            (!prevRangeRef.current.from && range.from) ||
            (prevRangeRef.current.from && !range.from) ||
            (prevRangeRef.current.from && range.from && prevRangeRef.current.from.getTime() !== range.from.getTime());

        const toChanged =
            (!prevRangeRef.current.to && range.to) ||
            (prevRangeRef.current.to && !range.to) ||
            (prevRangeRef.current.to && range.to && prevRangeRef.current.to.getTime() !== range.to.getTime());

        if (fromChanged || toChanged) {
            prevRangeRef.current = { from: range.from, to: range.to };
            onChange?.(range);
        }
    }, [range.from, range.to]);

    // Separate effect for updating currentMonth to avoid dependency on onChange
    useEffect(() => {
        if (range.from && !isNaN(range.from.getTime())) {
            const rangeMonth = new Date(range.from.getFullYear(), range.from.getMonth(), 1);

            setCurrentMonth((prevMonth) => {
                const prevMonthTime = prevMonth.getTime();
                const rangeMonthTime = rangeMonth.getTime();

                // Only update if we're showing a different month
                return prevMonthTime !== rangeMonthTime ? rangeMonth : prevMonth;
            });
        }
    }, [range.from]);

    const formatDate = (date: Date) =>
        date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

    const formatDateRange = () => {
        if (!range.from && !range.to) return '';
        if (range.from && !range.to) return formatDate(range.from);
        return `${formatDate(range.from!)} - ${formatDate(range.to!)}`;
    };

    const handleDateClick = useCallback(
        (date: Date) => {
            if (!range.from || (range.from && range.to)) {
                // Starting a new selection - ensure calendar stays open
                setRange({ from: date, to: undefined });
                setIsSelecting(true); // Mark as actively selecting
            } else {
                // Completing the range
                if (date < range.from) {
                    setRange({ from: date, to: range.from });
                } else {
                    setRange({ from: range.from, to: date });
                }
                setIsSelecting(false); // Range selection complete
                // Auto-close calendar when end date is selected
                setTimeout(() => {
                    setIsOpen(false);
                }, 100); // Small delay to show the selection before closing
            }
        },
        [range.from, range.to],
    );

    const selectThisWeek = useCallback(() => {
        const now = new Date();
        const day = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        setRange({ from: start, to: end });
        setIsSelecting(false);
        setIsOpen(false);
    }, []);

    const selectLastWeek = useCallback(() => {
        const now = new Date();
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        setRange({ from: lastWeekStart, to: lastWeekEnd });
        setIsSelecting(false);
        setIsOpen(false);
    }, []);

    const selectLastMonth = useCallback(() => {
        const now = new Date();
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        lastMonthStart.setHours(0, 0, 0, 0);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        setRange({ from: lastMonthStart, to: lastMonthEnd });
        setIsSelecting(false);
        setIsOpen(false);
    }, []);

    const selectThisMonth = useCallback(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        setRange({ from: start, to: end });
        setIsSelecting(false);
        setIsOpen(false);
    }, []);

    const isDateInRange = (date: Date) => {
        if (!range.from) return false;
        if (!range.to && hoverDate && date > range.from && date <= hoverDate) return true;
        return Boolean(range.from && range.to && date >= range.from && date <= range.to);
    };

    const isDateSelected = (date: Date) =>
        (range.from && date.toDateString() === range.from.toDateString()) ||
        (range.to && date.toDateString() === range.to.toDateString());

    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const renderCalendar = () => {
        const y = currentMonth.getFullYear();
        const m = currentMonth.getMonth();
        const totalDays = daysInMonth(y, m);
        const offset = firstDayOfMonth(y, m);
        const cells: JSX.Element[] = [];

        for (let i = 0; i < offset; i++) {
            cells.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(y, m, d);
            const selected = isDateSelected(date);
            const inRange = isDateInRange(date);

            const dayClass = classNames(
                'h-8 w-8 rounded-full text-sm flex items-center justify-center relative transition-all duration-200',
                selected && (variant === 'apple' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-900 text-white'),
                !selected && inRange && (variant === 'apple' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100'),
                !selected && !inRange && (variant === 'apple' ? 'hover:bg-gray-50' : 'hover:bg-gray-200'),
            );

            cells.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => !range.to && range.from && setHoverDate(date)}
                    className={dayClass}
                >
                    {d}
                </button>,
            );
        }

        return cells;
    };

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const renderDropdown = () => {
        if (!isOpen || disabled) return null;

        const dropdown = (
            <div
                ref={dropdownRef}
                className={classNames(
                    variantClasses.dropdown,
                    isPositioned ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                )}
                style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    transformOrigin: dropdownPosition.position === 'top' ? 'bottom' : 'top',
                }}
            >
                <div className="mb-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={selectThisWeek} className={variantClasses.button}>
                        This Week
                    </button>
                    <button type="button" onClick={selectLastWeek} className={variantClasses.button}>
                        Last Week
                    </button>
                    <button type="button" onClick={selectThisMonth} className={variantClasses.button}>
                        This Month
                    </button>
                    <button type="button" onClick={selectLastMonth} className={variantClasses.button}>
                        Last Month
                    </button>
                </div>
                <div className="mb-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={prevMonth}
                        className={classNames(
                            'rounded-full p-1 transition-colors duration-200',
                            variant === 'apple' ? 'hover:bg-gray-50' : 'hover:bg-gray-100',
                        )}
                    >
                        <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <div className={classNames('font-medium', variant === 'apple' ? 'text-gray-900' : 'text-gray-700')}>
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                        type="button"
                        onClick={nextMonth}
                        className={classNames(
                            'rounded-full p-1 transition-colors duration-200',
                            variant === 'apple' ? 'hover:bg-gray-50' : 'hover:bg-gray-100',
                        )}
                    >
                        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <div key={d} className="text-xs font-medium text-gray-500 mb-1">
                            {d}
                        </div>
                    ))}
                    {renderCalendar()}
                </div>

                <div className="mt-4 flex justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            setRange({ from: undefined, to: undefined });
                            setIsSelecting(false);
                        }}
                        className={variantClasses.clearButton}
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsSelecting(false);
                            setIsOpen(false);
                        }}
                        className={variantClasses.applyButton}
                    >
                        Apply
                    </button>
                </div>
            </div>
        );

        // Use portal to render dropdown at document body level
        if (typeof window !== 'undefined') {
            return createPortal(dropdown, document.body);
        }

        return dropdown;
    };

    const handleToggleOpen = useCallback(() => {
        if (disabled) return;

        if (!isOpen) {
            // Calculate position before opening to prevent jump
            const newPosition = calculateDropdownPosition();
            setDropdownPosition(newPosition);
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [disabled, isOpen, calculateDropdownPosition]);

    return (
        <>
            <div ref={pickerRef} className={classNames('relative', className)}>
                <div
                    onClick={handleToggleOpen}
                    className={classNames('flex', variantClasses.input, disabled && 'opacity-50 cursor-not-allowed')}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" />
                    <span className={classNames('flex-grow', !range.from && 'text-gray-500')}>
                        {formatDateRange() || placeholder}
                    </span>
                </div>
            </div>
            {renderDropdown()}
        </>
    );
}

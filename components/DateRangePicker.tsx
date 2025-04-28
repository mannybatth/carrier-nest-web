'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

type DateRangePickerProps = {
    onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
    className?: string;
    placeholder?: string;
};

export default function DateRangePicker({
    onChange,
    className = '',
    placeholder = 'Select date range',
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    });
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const classNames = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

    useEffect(() => {
        onChange?.(range);
    }, [range, onChange]);

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

    const handleDateClick = (date: Date) => {
        if (!range.from || (range.from && range.to)) {
            setRange({ from: date, to: undefined });
        } else {
            if (date < range.from) {
                setRange({ from: date, to: range.from });
            } else {
                setRange({ from: range.from, to: date });
            }
        }
    };

    const selectThisWeek = () => {
        const now = new Date();
        const day = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        setRange({ from: start, to: end });
        setIsOpen(false);
    };

    const selectThisMonth = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        setRange({ from: start, to: end });
        setIsOpen(false);
    };

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
                'h-8 w-8 rounded-full text-sm flex items-center justify-center relative',
                selected && 'bg-gray-900 text-white',
                !selected && inRange && 'bg-gray-100',
                'hover:bg-gray-200',
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

    return (
        <div ref={pickerRef} className={classNames('relative', className)}>
            <div
                onClick={() => setIsOpen((o) => !o)}
                className={classNames(
                    'flex h-10 w-full items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer',
                )}
            >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" />
                <span className={classNames('flex-grow', !range.from && 'text-gray-500')}>
                    {formatDateRange() || placeholder}
                </span>
            </div>

            {isOpen && (
                <div className="absolute mt-1 right-0 z-10 rounded-md border border-gray-200 bg-white p-4 shadow-lg w-[300px]">
                    <div className="mb-4 flex space-x-2">
                        <button
                            type="button"
                            onClick={selectThisWeek}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition"
                        >
                            This Week
                        </button>
                        <button
                            type="button"
                            onClick={selectThisMonth}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition"
                        >
                            This Month
                        </button>
                    </div>
                    <div className="mb-4 flex items-center justify-between">
                        <button type="button" onClick={prevMonth} className="rounded-full p-1 hover:bg-gray-100">
                            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <div className="font-medium">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <button type="button" onClick={nextMonth} className="rounded-full p-1 hover:bg-gray-100">
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
                            onClick={() => setRange({ from: undefined, to: undefined })}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

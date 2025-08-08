'use client';

import React, { Fragment, useState, useEffect, useRef } from 'react';
import { Popover, Transition, Switch } from '@headlessui/react';
import { ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import {
    type TimeRangeValue,
    timeToMinutes,
    minutesToTime,
    formatDisplayTime,
    getTimePresets,
    isValidTimeFormat,
} from '../lib/helpers/time-range-utils';

interface TimeRangeSelectorProps {
    value?: TimeRangeValue;
    onChange: (value: TimeRangeValue) => void;
    initialValue?: TimeRangeValue; // For reset in edit mode
    placeholder?: string;
    label?: string;
    name?: string;
    is24Hour?: boolean;
    onToggleFormat?: (is24Hour: boolean) => void;
    className?: string;
    error?: string;
    onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
    value,
    onChange,
    initialValue,
    placeholder = '(e.g. 14:00 or 09:00-17:00)',
    label = 'Time',
    name,
    is24Hour = true,
    onToggleFormat,
    className = '',
    error,
    onMouseEnter,
    onMouseLeave,
}) => {
    const [localValue, setLocalValue] = useState<TimeRangeValue>(
        value || { startTime: '', endTime: '', isRange: false },
    );
    const [startTimeInput, setStartTimeInput] = useState('');
    const [endTimeInput, setEndTimeInput] = useState('');
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const startTimeInputRef = useRef<HTMLInputElement>(null);
    const endTimeInputRef = useRef<HTMLInputElement>(null);
    const timePresets = getTimePresets();

    // Create hover handlers that simulate input element behavior
    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
        if (onMouseEnter) {
            // Create a synthetic event that looks like an input element event
            const syntheticEvent = {
                ...event,
                target: {
                    ...event.target,
                    name: name || '',
                    value: getDisplayText() || '',
                } as HTMLInputElement,
                currentTarget: {
                    ...event.currentTarget,
                    name: name || '',
                    value: getDisplayText() || '',
                    style: event.currentTarget.style,
                } as HTMLInputElement,
            } as React.MouseEvent<HTMLInputElement>;

            onMouseEnter(syntheticEvent);
        }
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
        if (onMouseLeave) {
            // Create a synthetic event that looks like an input element event
            const syntheticEvent = {
                ...event,
                target: {
                    ...event.target,
                    name: name || '',
                    value: getDisplayText() || '',
                } as HTMLInputElement,
                currentTarget: {
                    ...event.currentTarget,
                    name: name || '',
                    value: getDisplayText() || '',
                    style: event.currentTarget.style,
                } as HTMLInputElement,
            } as React.MouseEvent<HTMLInputElement>;

            onMouseLeave(syntheticEvent);
        }
    };

    useEffect(() => {
        if (value) {
            setLocalValue(value);
            setStartTimeInput(value.startTime || '');
            setEndTimeInput(value.endTime || '');
        }
    }, [value]);

    // Get display text for the input field
    const getDisplayText = (): string => {
        if (!localValue.startTime && !localValue.endTime) {
            return '';
        }

        if (localValue.isRange && localValue.startTime && localValue.endTime) {
            return `${formatDisplayTime(localValue.startTime, is24Hour)} - ${formatDisplayTime(
                localValue.endTime,
                is24Hour,
            )} (24H)`;
        } else if (localValue.startTime) {
            return `${formatDisplayTime(localValue.startTime, is24Hour)} (24H)`;
        }
        return '';
    };

    // Auto-detect if it should be a range based on input
    const updateTimeValue = (newValue: Partial<TimeRangeValue>) => {
        const updated = { ...localValue, ...newValue };

        // Auto-toggle range mode if both times are provided and different
        if (updated.startTime && updated.endTime && updated.startTime !== updated.endTime) {
            updated.isRange = true;
        } else if (updated.startTime && !updated.endTime) {
            updated.isRange = false;
        }

        setLocalValue(updated);
        onChange(updated);
    };

    // Handle direct time input with single digit parsing
    const handleTimeInput = (type: 'start' | 'end', inputValue: string) => {
        if (type === 'start') {
            setStartTimeInput(inputValue);
            if (isValidTimeFormat(inputValue) || inputValue === '') {
                updateTimeValue({ startTime: inputValue });
            }
        } else {
            setEndTimeInput(inputValue);
            if (isValidTimeFormat(inputValue) || inputValue === '') {
                updateTimeValue({ endTime: inputValue });
            }
        }
    };

    // Parse single digit input and format to HH:00
    const parseAndFormatTime = (type: 'start' | 'end', inputValue: string) => {
        let formattedTime = inputValue.trim();

        // Handle single digit (e.g., "8" -> "08:00")
        if (/^\d$/.test(formattedTime)) {
            const hour = parseInt(formattedTime, 10);
            if (hour >= 0 && hour <= 9) {
                formattedTime = `0${hour}:00`;
            }
        }
        // Handle double digit hour only (e.g., "14" -> "14:00")
        else if (/^\d{2}$/.test(formattedTime)) {
            const hour = parseInt(formattedTime, 10);
            if (hour >= 0 && hour <= 23) {
                formattedTime = `${hour}:00`;
            }
        }

        // Update the input and value if format is valid
        if (isValidTimeFormat(formattedTime)) {
            if (type === 'start') {
                setStartTimeInput(formattedTime);
                updateTimeValue({ startTime: formattedTime });
            } else {
                setEndTimeInput(formattedTime);
                updateTimeValue({ endTime: formattedTime });
            }
        }
    };

    // Handle key press for Tab/Enter
    const handleKeyPress = (type: 'start' | 'end', event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Tab') {
            const inputValue = (event.target as HTMLInputElement).value;
            parseAndFormatTime(type, inputValue);
            // Let Tab flow naturally - don't prevent default
        } else if (event.key === 'Enter') {
            const inputValue = (event.target as HTMLInputElement).value;
            parseAndFormatTime(type, inputValue);

            // Move focus to next input or close popup
            if (type === 'start' && localValue.isRange && endTimeInputRef.current) {
                endTimeInputRef.current.focus();
            }
        }
    };

    // Handle blur (out of focus)
    const handleBlur = (type: 'start' | 'end', event: React.FocusEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        parseAndFormatTime(type, inputValue);
    };

    // Handle slider interaction
    const handleSliderInteraction = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const minutes = Math.round(percentage * (24 * 60)); // 0 to 1440 minutes (24 hours)
        const newTime = minutesToTime(minutes);

        if (isDragging === 'start') {
            const endMinutes = localValue.endTime ? timeToMinutes(localValue.endTime) : 1440;
            const startMinutes = Math.min(minutes, endMinutes - 15); // Ensure at least 15 min gap
            const updatedTime = minutesToTime(startMinutes);
            setStartTimeInput(updatedTime);
            updateTimeValue({ startTime: updatedTime });
        } else if (isDragging === 'end') {
            const startMinutes = localValue.startTime ? timeToMinutes(localValue.startTime) : 0;
            const endMinutes = Math.max(minutes, startMinutes + 15); // Ensure at least 15 min gap
            const updatedTime = minutesToTime(endMinutes);
            setEndTimeInput(updatedTime);
            updateTimeValue({ endTime: updatedTime });
        } else if (!localValue.isRange) {
            // Single time selection
            setStartTimeInput(newTime);
            updateTimeValue({ startTime: newTime });
        }
    };

    // Handle mouse down on slider handles
    const handleMouseDown = (handle: 'start' | 'end') => (event: React.MouseEvent) => {
        event.preventDefault();
        if (localValue.isRange) {
            setIsDragging(handle);
        }
    };

    // Handle mouse up and move events
    useEffect(() => {
        const handleMouseUp = () => {
            setIsDragging(null);
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (isDragging && sliderRef.current) {
                const rect = sliderRef.current.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                const minutes = Math.round(percentage * (24 * 60));

                if (isDragging === 'start') {
                    const endMinutes = localValue.endTime ? timeToMinutes(localValue.endTime) : 1440;
                    const startMinutes = Math.min(minutes, endMinutes - 15);
                    const updatedTime = minutesToTime(startMinutes);
                    setStartTimeInput(updatedTime);
                    updateTimeValue({ startTime: updatedTime });
                } else if (isDragging === 'end') {
                    const startMinutes = localValue.startTime ? timeToMinutes(localValue.startTime) : 0;
                    const endMinutes = Math.max(minutes, startMinutes + 15);
                    const updatedTime = minutesToTime(endMinutes);
                    setEndTimeInput(updatedTime);
                    updateTimeValue({ endTime: updatedTime });
                }
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, localValue, updateTimeValue]);

    // Calculate positions for slider handles
    const getStartPosition = () => {
        if (!localValue.startTime) return 0;
        const minutes = timeToMinutes(localValue.startTime);
        return (minutes / (24 * 60)) * 100;
    };

    const getEndPosition = () => {
        if (!localValue.endTime) return 100;
        const minutes = timeToMinutes(localValue.endTime);
        return (minutes / (24 * 60)) * 100;
    };

    // Toggle between specific time and range
    const toggleTimeRange = (isRange: boolean) => {
        const updatedValue = {
            ...localValue,
            isRange,
        };
        setLocalValue(updatedValue);
        onChange(updatedValue);
    };

    // Reset time range
    const resetTimeRange = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // If in edit mode and initialValue is provided, reset to initial value
        // Otherwise, reset to empty state
        const resetValue = initialValue || { startTime: '', endTime: '', isRange: false };

        setLocalValue(resetValue);
        setStartTimeInput(resetValue.startTime || '');
        setEndTimeInput(resetValue.endTime || '');
        onChange(resetValue);
    };

    // Generate hour markers for display
    const hourMarkers = Array.from({ length: 25 }, (_, i) => i);

    return (
        <div className={`relative ${className}`}>
            <label className="block text-sm text-gray-500 mb-2">{label}</label>

            <Popover className="relative">
                {({ open }) => (
                    <>
                        <Popover.Button
                            className={classNames(
                                'w-full px-4 py-3 bg-gray-50 border border-gray-300 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer',
                                open && 'ring-2 ring-blue-500 bg-white',
                                error && 'ring-2 ring-red-500',
                            )}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onFocus={(e) => {
                                // Open popup when tabbing to the field
                                if (!open) {
                                    e.currentTarget.click(); // Trigger popup open
                                }
                            }}
                            onKeyDown={(e) => {
                                // Open popup on Enter or Space key
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    // Headless UI will handle opening the popup
                                }
                                // Let Tab flow naturally to next field
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className={getDisplayText() ? 'text-gray-900' : 'text-gray-400'}>
                                    {getDisplayText() || placeholder}
                                </span>
                                <div className="flex items-center space-x-2">
                                    <ClockIcon className="h-5 w-5 text-gray-400" />
                                    <ChevronDownIcon
                                        className={classNames(
                                            'h-5 w-5 text-gray-400 transition-transform duration-200',
                                            open && 'rotate-180',
                                        )}
                                    />
                                </div>
                            </div>
                        </Popover.Button>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-300"
                            enterFrom="opacity-0 translate-y-2 scale-95"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="transition ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-2 scale-95"
                            afterEnter={() => {
                                // Focus the start time input when popup opens
                                setTimeout(() => startTimeInputRef.current?.focus(), 50);
                            }}
                        >
                            <Popover.Panel
                                className="absolute bottom-full left-0 z-50 w-full mb-3"
                                onKeyDown={(e) => {
                                    // Handle Escape key to close popup
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Popover will handle closing
                                    }
                                }}
                            >
                                <div className="relative">
                                    {/* Liquid Glass Container with Silver Background and Border */}
                                    <div
                                        className="bg-gray-100/95 backdrop-blur-2xl border-2 border-gray-300/60 rounded-lg shadow-2xl p-6
                                                   transition-all duration-500 ease-out"
                                        style={{
                                            background:
                                                'linear-gradient(145deg, rgba(229,231,235,0.95) 0%, rgba(243,244,246,0.9) 100%)',
                                            backdropFilter: 'blur(20px) saturate(180%)',
                                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                            boxShadow: `
                                                0 25px 50px -12px rgba(0, 0, 0, 0.25),
                                                0 0 0 1px rgba(255, 255, 255, 0.1),
                                                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                                                inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                                            `,
                                        }}
                                    >
                                        {/* Time Range Toggle */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {localValue.isRange ? 'Time Range' : 'Specific Time'}
                                                </span>
                                                <Switch
                                                    checked={localValue.isRange}
                                                    onChange={toggleTimeRange}
                                                    className={classNames(
                                                        localValue.isRange ? 'bg-blue-600' : 'bg-gray-300',
                                                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2',
                                                    )}
                                                >
                                                    <span
                                                        className={classNames(
                                                            localValue.isRange ? 'translate-x-4' : 'translate-x-0',
                                                            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out',
                                                        )}
                                                    />
                                                </Switch>
                                            </div>

                                            {/* Reset Button */}
                                            {(localValue.startTime || localValue.endTime) && (
                                                <button
                                                    onClick={resetTimeRange}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600
                                                         bg-white hover:bg-red-50 rounded-md transition-all duration-200
                                                         border-2 border-gray-200 hover:border-red-200 shadow-sm"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>

                                        {/* Direct Time Inputs */}
                                        <div className="mb-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-600 mb-2">
                                                        {localValue.isRange ? 'Start Time' : 'Time'}
                                                    </label>
                                                    <input
                                                        ref={startTimeInputRef}
                                                        type="text"
                                                        value={startTimeInput}
                                                        onChange={(e) => handleTimeInput('start', e.target.value)}
                                                        onKeyDown={(e) => handleKeyPress('start', e)}
                                                        onBlur={(e) => handleBlur('start', e)}
                                                        placeholder="HH:MM"
                                                        className="w-full px-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-md
                                                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400
                                                             transition-all duration-200 hover:border-gray-300 placeholder-gray-400 shadow-sm"
                                                    />
                                                </div>

                                                {localValue.isRange ? (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-600 mb-2">
                                                            End Time
                                                        </label>
                                                        <input
                                                            ref={endTimeInputRef}
                                                            type="text"
                                                            value={endTimeInput}
                                                            onChange={(e) => handleTimeInput('end', e.target.value)}
                                                            onKeyDown={(e) => handleKeyPress('end', e)}
                                                            onBlur={(e) => handleBlur('end', e)}
                                                            placeholder="HH:MM"
                                                            className="w-full px-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-md
                                                                 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400
                                                                 transition-all duration-200 hover:border-gray-300 placeholder-gray-400 shadow-sm"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div></div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Preset buttons - only show when no time values are set */}
                                        {!localValue.startTime && !localValue.endTime && (
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                {timePresets.map((preset, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const updatedValue = preset.value;
                                                            setLocalValue(updatedValue);
                                                            setStartTimeInput(updatedValue.startTime);
                                                            setEndTimeInput(updatedValue.endTime);
                                                            onChange(updatedValue);
                                                        }}
                                                        className="px-3 py-2.5 text-xs font-medium bg-white border-2 border-gray-200
                                                             rounded-md hover:bg-gray-50 active:bg-gray-100 transition-all duration-200
                                                             text-gray-700 hover:text-gray-900 shadow-sm hover:shadow-md active:scale-95
                                                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:border-gray-300"
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Time Slider */}
                                        <div className="mb-3">
                                            {/* Hour markers */}
                                            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                                                {hourMarkers
                                                    .filter((_, i) => i % 6 === 0)
                                                    .map((hour) => (
                                                        <span key={hour} className="text-xs">
                                                            {is24Hour
                                                                ? `${hour.toString().padStart(2, '0')}:00`
                                                                : hour === 0
                                                                ? '12A'
                                                                : hour === 12
                                                                ? '12P'
                                                                : hour < 12
                                                                ? `${hour}A`
                                                                : `${hour - 12}P`}
                                                        </span>
                                                    ))}
                                            </div>

                                            {/* Slider */}
                                            <div
                                                ref={sliderRef}
                                                className="relative h-5 bg-gray-200 rounded-full cursor-pointer"
                                                onClick={handleSliderInteraction}
                                            >
                                                {/* Range track */}
                                                {localValue.isRange && localValue.startTime && localValue.endTime && (
                                                    <div
                                                        className="absolute top-0.5 h-4 bg-blue-500 rounded-full"
                                                        style={{
                                                            left: `${getStartPosition()}%`,
                                                            width: `${getEndPosition() - getStartPosition()}%`,
                                                        }}
                                                    />
                                                )}

                                                {/* Start handle */}
                                                {localValue.startTime && (
                                                    <div
                                                        className={classNames(
                                                            'absolute top-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-grab shadow-sm transform -translate-x-1/2',
                                                            isDragging === 'start' && 'cursor-grabbing scale-110',
                                                        )}
                                                        style={{ left: `${getStartPosition()}%` }}
                                                        onMouseDown={handleMouseDown('start')}
                                                    >
                                                        <div className="absolute inset-0.5 bg-blue-500 rounded-full" />
                                                    </div>
                                                )}

                                                {/* End handle (only for range) */}
                                                {localValue.isRange && localValue.endTime && (
                                                    <div
                                                        className={classNames(
                                                            'absolute top-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-grab shadow-sm transform -translate-x-1/2',
                                                            isDragging === 'end' && 'cursor-grabbing scale-110',
                                                        )}
                                                        style={{ left: `${getEndPosition()}%` }}
                                                        onMouseDown={handleMouseDown('end')}
                                                    >
                                                        <div className="absolute inset-0.5 bg-blue-500 rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 24/12 Hour Toggle */}
                                        {onToggleFormat && (
                                            <div className="flex items-center justify-between mb-4 pb-4 border-t border-gray-300 pt-4">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {is24Hour ? '24-Hour' : '12-Hour'} Format
                                                </span>
                                                <Switch
                                                    checked={is24Hour}
                                                    onChange={onToggleFormat}
                                                    className={classNames(
                                                        is24Hour ? 'bg-blue-600' : 'bg-gray-300',
                                                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2',
                                                    )}
                                                >
                                                    <span
                                                        className={classNames(
                                                            is24Hour ? 'translate-x-4' : 'translate-x-0',
                                                            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out',
                                                        )}
                                                    />
                                                </Switch>
                                            </div>
                                        )}

                                        {/* Time Display */}
                                        {localValue.startTime && (
                                            <div className="border-t border-gray-300 pt-4 mt-4">
                                                <div className="text-center">
                                                    <div className="text-lg font-medium text-gray-900 mb-1 font-mono tracking-wide">
                                                        {localValue.isRange && localValue.endTime ? (
                                                            <>
                                                                <span className="text-blue-600">
                                                                    {formatDisplayTime(localValue.startTime, is24Hour)}
                                                                </span>
                                                                <span className="mx-2 text-gray-400">—</span>
                                                                <span className="text-blue-600">
                                                                    {formatDisplayTime(localValue.endTime, is24Hour)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-blue-600">
                                                                {formatDisplayTime(localValue.startTime, is24Hour)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popover.Panel>
                        </Transition>
                    </>
                )}
            </Popover>

            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};

export default TimeRangeSelector;

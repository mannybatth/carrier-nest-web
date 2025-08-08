import React, { useState } from 'react';
import TimeRangeSelector from '../../components/TimeRangeSelector';
import { type TimeRangeValue, swapTimeRanges } from '../../lib/helpers/time-range-utils';

const TimeRangeSelectorExample: React.FC = () => {
    const [pickupTime, setPickupTime] = useState<TimeRangeValue>();
    const [dropoffTime, setDropoffTime] = useState<TimeRangeValue>();
    const [is24Hour, setIs24Hour] = useState(true);

    const swapTimes = () => {
        if (pickupTime && dropoffTime) {
            const { pickup, dropoff } = swapTimeRanges(pickupTime, dropoffTime);
            setPickupTime(pickup);
            setDropoffTime(dropoff);
        }
    };

    const getTimeString = (timeValue: TimeRangeValue | undefined): string => {
        if (!timeValue?.startTime) return 'Not set';
        if (timeValue.isRange && timeValue.endTime) {
            return `${timeValue.startTime} - ${timeValue.endTime} (Range)`;
        }
        return `${timeValue.startTime} (Specific)`;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Time Range Selector Demo</h1>

                    <div className="space-y-8">
                        {/* Pickup Time */}
                        <TimeRangeSelector
                            value={pickupTime}
                            onChange={setPickupTime}
                            label="Pick Up Time (24H)"
                            placeholder="(e.g. 09:00 or 09:00-17:00)"
                            is24Hour={is24Hour}
                            onToggleFormat={setIs24Hour}
                        />

                        {/* Drop Off Time */}
                        <TimeRangeSelector
                            value={dropoffTime}
                            onChange={setDropoffTime}
                            label="Drop Off Time (24H)"
                            placeholder="(e.g. 14:00 or 14:00-18:00)"
                            is24Hour={is24Hour}
                            onToggleFormat={setIs24Hour}
                        />

                        {/* Swap Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={swapTimes}
                                disabled={!pickupTime?.startTime || !dropoffTime?.startTime}
                                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Swap Pickup & Drop Off Times
                            </button>
                        </div>

                        {/* Current Values Display */}
                        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Values:</h3>
                            <div className="space-y-2 text-sm text-gray-700">
                                <div>
                                    <strong>Pickup Time:</strong> {getTimeString(pickupTime)}
                                </div>
                                <div>
                                    <strong>Drop Off Time:</strong> {getTimeString(dropoffTime)}
                                </div>
                                <div>
                                    <strong>Format:</strong> {is24Hour ? '24 Hour' : '12 Hour'}
                                </div>
                            </div>
                        </div>

                        {/* Usage Information */}
                        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Features:</h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li>• Type times directly in HH:MM format (e.g., 09:30, 14:15)</li>
                                <li>• Use the visual slider to drag and adjust times</li>
                                <li>• Auto-toggle between specific time and range based on input</li>
                                <li>• Switch between 12-hour and 24-hour format display</li>
                                <li>• Quick preset buttons: 6-9 AM, 10-1 PM, 2-5 PM (3-hour ranges)</li>
                                <li>• Real-time duration calculation for ranges</li>
                                <li>• Popup stays open when selecting presets</li>
                                <li>• Start and end times shown in single row layout</li>
                                <li>• Reset button to clear all time selections</li>
                                <li>• Always-visible slider for consistent interaction</li>
                                <li>• Form validation and error display support</li>
                                <li>• Drag slider handles to fine-tune time ranges</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeRangeSelectorExample;

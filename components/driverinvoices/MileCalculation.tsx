import React, { useState } from 'react';
import { ExpandedDriverAssignment } from 'interfaces/models';
import DriverRouteMap from 'components/DriverRouteMap';
import { Prisma } from '@prisma/client';

interface MileCalculationProps {
    assignments: ExpandedDriverAssignment[];
    emptyMiles: { [key: string]: number };
    emptyMilesInput: { [key: string]: string };
    selectedAssignmentId: string | null;
    onAssignmentSelect: (assignmentId: string | null) => void;
    onEmptyMilesUpdate: (updatedEmptyMiles: { [key: string]: number }) => void;
    setEmptyMilesInput: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    setEmptyMiles: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
    calculateHaversineDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

const MileCalculation: React.FC<MileCalculationProps> = ({
    assignments,
    emptyMiles,
    emptyMilesInput,
    selectedAssignmentId,
    onAssignmentSelect,
    onEmptyMilesUpdate,
    setEmptyMilesInput,
    setEmptyMiles,
    calculateHaversineDistance,
}) => {
    return (
        <div className="bg-gray-50 p-3 sm:p-6 rounded-lg relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3 sm:gap-0">
                <div className="flex flex-1 flex-col items-start">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">
                        Calculate Mile-Based Compensation
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm font-normal">
                        Review assignment routes and calculate empty miles between assignments for accurate
                        compensation.
                    </p>
                </div>
            </div>

            {/* Split layout: Map on left, Details on right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
                {/* Interactive Mapbox Route Map - Left Side */}
                <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl min-h-[400px] lg:min-h-[600px] relative">
                    <DriverRouteMap
                        assignments={assignments.filter((a) => a.chargeType === 'PER_MILE')}
                        emptyMiles={emptyMiles}
                        selectedAssignmentId={selectedAssignmentId}
                        onAssignmentSelect={onAssignmentSelect}
                        onEmptyMilesUpdate={onEmptyMilesUpdate}
                    />
                </div>

                {/* Assignment Details - Right Side */}
                <div className="space-y-3 sm:space-y-4">
                    {/* Assignment Route Summary */}
                    <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm lg:min-h-[600px]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Assignment Routes Summary
                                {selectedAssignmentId && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                        Filtered
                                    </span>
                                )}
                            </h3>
                            {selectedAssignmentId && (
                                <button
                                    onClick={() => onAssignmentSelect(null)}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
                                >
                                    Show All
                                </button>
                            )}
                        </div>

                        <div className="space-y-3 lg:overflow-y-auto lg:max-h-[480px]">
                            {/* Sort assignments by date/time */}
                            {assignments
                                .filter((assignment) => assignment.chargeType === 'PER_MILE')
                                .sort((a, b) => {
                                    const dateA = new Date(a.routeLeg.startedAt || a.routeLeg.createdAt);
                                    const dateB = new Date(b.routeLeg.startedAt || b.routeLeg.createdAt);
                                    return dateA.getTime() - dateB.getTime();
                                })
                                .map((assignment, index, sortedAssignments) => {
                                    const routeLocations = assignment.routeLeg.locations;
                                    const startLocation = routeLocations[0];
                                    const endLocation = routeLocations[routeLocations.length - 1];

                                    // Calculate empty miles to next assignment
                                    let emptyMilesToNext = 0;
                                    let nextAssignment = null;

                                    if (index < sortedAssignments.length - 1) {
                                        nextAssignment = sortedAssignments[index + 1];
                                        const nextStartLocation = nextAssignment.routeLeg.locations[0];

                                        // Calculate distance between current end and next start
                                        const endLat = endLocation.loadStop?.latitude || endLocation.location?.latitude;
                                        const endLon =
                                            endLocation.loadStop?.longitude || endLocation.location?.longitude;
                                        const nextStartLat =
                                            nextStartLocation.loadStop?.latitude ||
                                            nextStartLocation.location?.latitude;
                                        const nextStartLon =
                                            nextStartLocation.loadStop?.longitude ||
                                            nextStartLocation.location?.longitude;

                                        if (endLat && endLon && nextStartLat && nextStartLon) {
                                            const distance = calculateHaversineDistance(
                                                endLat,
                                                endLon,
                                                nextStartLat,
                                                nextStartLon,
                                            );
                                            emptyMilesToNext = Math.round(distance * 100) / 100;
                                        }
                                    }

                                    const assignmentMiles = Number(
                                        assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles,
                                    );
                                    const emptyMilesKey = `${assignment.id}-to-${nextAssignment?.id || 'end'}`;

                                    // Assignment colors (same as map)
                                    const assignmentColors = [
                                        '#3b82f6',
                                        '#10b981',
                                        '#f59e0b',
                                        '#ef4444',
                                        '#8b5cf6',
                                        '#06b6d4',
                                        '#84cc16',
                                        '#f97316',
                                        '#ec4899',
                                        '#6366f1',
                                    ];
                                    const color = assignmentColors[index % assignmentColors.length];

                                    return (
                                        <div key={`assignment-${assignment.id}`}>
                                            {/* Assignment Card */}
                                            <div
                                                className={`bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 border transition-all duration-200 cursor-pointer ${
                                                    selectedAssignmentId === assignment.id
                                                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                                                        : 'border-gray-200/40 hover:border-blue-200/60'
                                                }`}
                                                onClick={() => {
                                                    if (selectedAssignmentId === assignment.id) {
                                                        onAssignmentSelect(null);
                                                    } else {
                                                        onAssignmentSelect(assignment.id);
                                                    }
                                                }}
                                            >
                                                {/* Assignment Header with Total Earnings */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div
                                                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm"
                                                            style={{ backgroundColor: color }}
                                                        >
                                                            <span className="text-white text-xs sm:text-sm font-bold">
                                                                {index + 1}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                                Assignment #{index + 1}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {assignment.load.refNum}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Total Earnings - Moved to Top Right */}
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-600 mb-1">Total</div>
                                                        <div className="text-sm font-bold text-green-600">
                                                            $
                                                            {(() => {
                                                                const emptyMilesForThisAssignment =
                                                                    emptyMiles[emptyMilesKey] || 0;
                                                                const totalMiles =
                                                                    assignmentMiles + emptyMilesForThisAssignment;
                                                                return (
                                                                    totalMiles * Number(assignment.chargeValue)
                                                                ).toFixed(2);
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Route Information */}
                                                <div className="space-y-2 sm:space-y-3">
                                                    {/* Distance & Rate */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                        <div className="bg-gray-50/80 rounded-xl p-2 sm:p-3">
                                                            <div className="text-xs text-gray-600 mb-1">Distance</div>
                                                            <div className="text-xs sm:text-sm font-semibold text-gray-900">
                                                                {assignmentMiles.toFixed(2)} miles
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50/80 rounded-xl p-2 sm:p-3">
                                                            <div className="text-xs text-gray-600 mb-1">Rate</div>
                                                            <div className="text-xs sm:text-sm font-semibold text-green-600">
                                                                ${String(assignment.chargeValue)}/mile
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Route Details */}
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-medium text-gray-700">Route</div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                            <div className="bg-green-50/80 p-2 rounded-lg">
                                                                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                                                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 flex items-center justify-center">
                                                                        <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full"></div>
                                                                    </div>
                                                                    <span className="font-medium text-green-800">
                                                                        Pickup
                                                                    </span>
                                                                </div>
                                                                <p className="text-green-700 truncate font-medium text-xs sm:text-sm">
                                                                    {startLocation.loadStop?.name ||
                                                                        startLocation.location?.name}
                                                                </p>
                                                                <p className="text-green-600 text-xs">
                                                                    {startLocation.loadStop?.city ||
                                                                        startLocation.location?.city}
                                                                    ,{' '}
                                                                    {startLocation.loadStop?.state ||
                                                                        startLocation.location?.state}
                                                                </p>
                                                            </div>
                                                            <div className="bg-red-50/80 p-2 rounded-lg">
                                                                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                                                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 flex items-center justify-center">
                                                                        <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full"></div>
                                                                    </div>
                                                                    <span className="font-medium text-red-800">
                                                                        Delivery
                                                                    </span>
                                                                </div>
                                                                <p className="text-red-700 truncate font-medium text-xs sm:text-sm">
                                                                    {endLocation.loadStop?.name ||
                                                                        endLocation.location?.name}
                                                                </p>
                                                                <p className="text-red-600 text-xs">
                                                                    {endLocation.loadStop?.city ||
                                                                        endLocation.location?.city}
                                                                    ,{' '}
                                                                    {endLocation.loadStop?.state ||
                                                                        endLocation.location?.state}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Start Time */}
                                                    <div className="bg-blue-50/80 rounded-xl p-2">
                                                        <div className="text-xs text-blue-600 mb-1">Started</div>
                                                        <div className="text-xs font-medium text-blue-800">
                                                            {new Date(
                                                                assignment.routeLeg.startedAt ||
                                                                    assignment.routeLeg.createdAt,
                                                            ).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Empty Miles Card (positioned between assignments) */}
                                            {index < sortedAssignments.length - 1 && (
                                                <div className="my-3">
                                                    <div className="bg-amber-50/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200/30">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                                            </div>
                                                            <h4 className="text-sm font-medium text-amber-800">
                                                                Empty Miles to Next Assignment
                                                            </h4>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-amber-700 text-sm">Distance:</span>
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={
                                                                        emptyMilesInput[emptyMilesKey] !== undefined
                                                                            ? emptyMilesInput[emptyMilesKey]
                                                                            : (emptyMiles[emptyMilesKey] !== undefined
                                                                                  ? emptyMiles[emptyMilesKey]
                                                                                  : emptyMilesToNext || 0
                                                                              ).toString()
                                                                    }
                                                                    onChange={(e) => {
                                                                        setEmptyMilesInput((prev) => ({
                                                                            ...prev,
                                                                            [emptyMilesKey]: e.target.value,
                                                                        }));
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const inputValue = e.target.value.trim();
                                                                        const value =
                                                                            inputValue === ''
                                                                                ? 0
                                                                                : parseFloat(inputValue);

                                                                        if (!isNaN(value)) {
                                                                            setEmptyMiles((prev) => ({
                                                                                ...prev,
                                                                                [emptyMilesKey]: value,
                                                                            }));
                                                                        }

                                                                        setEmptyMilesInput((prev) => {
                                                                            const updated = { ...prev };
                                                                            delete updated[emptyMilesKey];
                                                                            return updated;
                                                                        });
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.currentTarget.blur();
                                                                        }
                                                                    }}
                                                                    className="w-20 px-2 py-1 border border-amber-300 rounded-lg text-sm bg-white/80 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                                />
                                                                <span className="text-amber-700 text-sm font-medium">
                                                                    miles
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-amber-600 mt-2 truncate">
                                                            To:{' '}
                                                            {nextAssignment?.routeLeg.locations[0].loadStop?.name ||
                                                                nextAssignment?.routeLeg.locations[0].location?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                            {/* Empty Miles Card for Last Assignment (Return to Base) */}
                            {assignments.filter((a) => a.chargeType === 'PER_MILE').length > 0 &&
                                (() => {
                                    const mileBasedAssignments = assignments.filter((a) => a.chargeType === 'PER_MILE');
                                    const sortedAssignments = mileBasedAssignments.sort((a, b) => {
                                        const dateA = new Date(a.routeLeg.startedAt || a.routeLeg.createdAt);
                                        const dateB = new Date(b.routeLeg.startedAt || b.routeLeg.createdAt);
                                        return dateA.getTime() - dateB.getTime();
                                    });
                                    const lastAssignment = sortedAssignments[sortedAssignments.length - 1];
                                    const emptyMilesKey = `${lastAssignment.id}-to-end`;

                                    return (
                                        <div className="mt-3">
                                            <div className="bg-orange-50/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200/30">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                    </div>
                                                    <h4 className="text-sm font-medium text-orange-800">
                                                        Empty Miles After Last Assignment
                                                    </h4>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-orange-700 text-sm">
                                                        Distance (Return/Deadhead):
                                                    </span>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={
                                                                emptyMilesInput[emptyMilesKey] !== undefined
                                                                    ? emptyMilesInput[emptyMilesKey]
                                                                    : (emptyMiles[emptyMilesKey] !== undefined
                                                                          ? emptyMiles[emptyMilesKey]
                                                                          : 0
                                                                      ).toString()
                                                            }
                                                            onChange={(e) => {
                                                                setEmptyMilesInput((prev) => ({
                                                                    ...prev,
                                                                    [emptyMilesKey]: e.target.value,
                                                                }));
                                                            }}
                                                            onBlur={(e) => {
                                                                const inputValue = e.target.value.trim();
                                                                const value =
                                                                    inputValue === '' ? 0 : parseFloat(inputValue);

                                                                if (!isNaN(value)) {
                                                                    setEmptyMiles((prev) => ({
                                                                        ...prev,
                                                                        [emptyMilesKey]: value,
                                                                    }));
                                                                }

                                                                setEmptyMilesInput((prev) => {
                                                                    const updated = { ...prev };
                                                                    delete updated[emptyMilesKey];
                                                                    return updated;
                                                                });
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.currentTarget.blur();
                                                                }
                                                            }}
                                                            className="w-20 px-2 py-1 border border-orange-300 rounded-lg text-sm bg-white/80 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                        />
                                                        <span className="text-orange-700 text-sm font-medium">
                                                            miles
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-orange-600 mt-2">
                                                    Empty miles after completing final assignment (return to base,
                                                    deadhead, etc.)
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MileCalculation;

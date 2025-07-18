import React from 'react';
import { ExpandedDriverAssignment } from 'interfaces/models';

interface AssignmentCardProps {
    assignment: ExpandedDriverAssignment;
    index: number;
    color: string;
    isSelected: boolean;
    assignmentMiles: number;
    nextAssignment?: ExpandedDriverAssignment | null;
    emptyMiles: { [key: string]: number };
    emptyMilesToNext?: number;
    onAssignmentSelect?: (assignmentId: string | null) => void;
    onEmptyMilesUpdate?: (emptyMiles: { [key: string]: number }) => void;
    isMobile?: boolean;
    isLastAssignment?: boolean;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
    assignment,
    index,
    color,
    isSelected,
    assignmentMiles,
    nextAssignment,
    emptyMiles,
    emptyMilesToNext = 0,
    onAssignmentSelect,
    onEmptyMilesUpdate,
    isMobile = false,
    isLastAssignment = false,
}) => {
    // Get route locations
    const routeLocations = assignment.routeLeg.locations;
    const startLocation = routeLocations[0];
    const endLocation = routeLocations[routeLocations.length - 1];

    const emptyMilesKey = `${assignment.id}-to-${nextAssignment?.id || 'end'}`;

    const handleClick = () => {
        if (onAssignmentSelect) {
            if (isSelected) {
                onAssignmentSelect(null);
            } else {
                onAssignmentSelect(assignment.id);
            }
        }
    };

    const handleEmptyMilesChange = (value: number) => {
        if (onEmptyMilesUpdate) {
            onEmptyMilesUpdate({
                ...emptyMiles,
                [emptyMilesKey]: value,
            });
        }
    };

    if (isMobile) {
        return (
            <React.Fragment key={`mobile-assignment-${assignment.id}`}>
                {/* Mobile Assignment Card - Compact Style */}
                <div className="flex-shrink-0 w-[85vw]">
                    <div
                        onClick={handleClick}
                        className={`bg-white/90 backdrop-blur-sm rounded-lg p-2 border transition-all duration-200 cursor-pointer h-full flex flex-col ${
                            isSelected
                                ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                                : 'border-gray-200/40 hover:border-blue-200/60'
                        }`}
                    >
                        {/* Assignment Header with Total Earnings */}
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                                    style={{ backgroundColor: color }}
                                >
                                    <span className="text-white text-xs font-bold">{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-xs">Assignment #{index + 1}</h4>
                                    <p className="text-xs text-gray-500 truncate">{assignment.load.refNum}</p>
                                </div>
                            </div>
                            {/* Total Earnings */}
                            <div className="text-right">
                                <div className="text-xs text-gray-600 mb-0.5">Total</div>
                                <div className="text-sm font-bold text-green-600">
                                    $
                                    {(() => {
                                        const emptyMilesForThisAssignment = emptyMiles[emptyMilesKey] || 0;
                                        const totalMiles = assignmentMiles + emptyMilesForThisAssignment;
                                        return (totalMiles * Number(assignment.chargeValue)).toFixed(2);
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Route Information */}
                        <div className="space-y-1.5 mb-2">
                            {/* Distance & Rate */}
                            <div className="grid grid-cols-2 gap-1.5">
                                <div className="bg-gray-50/80 rounded-lg p-1.5">
                                    <div className="text-xs text-gray-600 mb-0.5">Distance</div>
                                    <div className="text-xs font-semibold text-gray-900">
                                        {assignmentMiles.toFixed(2)} miles
                                    </div>
                                </div>
                                <div className="bg-gray-50/80 rounded-lg p-1.5">
                                    <div className="text-xs text-gray-600 mb-0.5">Rate</div>
                                    <div className="text-xs font-semibold text-green-600">
                                        ${String(assignment.chargeValue)}/mile
                                    </div>
                                </div>
                            </div>

                            {/* Route Details */}
                            <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-700">Route</div>
                                <div className="grid grid-cols-2 gap-1.5 text-xs">
                                    <div className="bg-green-50/80 p-1.5 rounded-lg">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex items-center justify-center">
                                                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                                            </div>
                                            <span className="font-medium text-green-800">Pickup</span>
                                        </div>
                                        <p className="text-green-700 truncate font-medium text-xs">
                                            {startLocation.loadStop?.name || startLocation.location?.name}
                                        </p>
                                        <p className="text-green-600 text-xs">
                                            {startLocation.loadStop?.city || startLocation.location?.city},{' '}
                                            {startLocation.loadStop?.state || startLocation.location?.state}
                                        </p>
                                    </div>
                                    <div className="bg-red-50/80 p-1.5 rounded-lg">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex items-center justify-center">
                                                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                                            </div>
                                            <span className="font-medium text-red-800">Delivery</span>
                                        </div>
                                        <p className="text-red-700 truncate font-medium text-xs">
                                            {endLocation.loadStop?.name || endLocation.location?.name}
                                        </p>
                                        <p className="text-red-600 text-xs">
                                            {endLocation.loadStop?.city || endLocation.location?.city},{' '}
                                            {endLocation.loadStop?.state || endLocation.location?.state}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Empty Miles Card - Compact Mobile Style */}
                {(nextAssignment || isLastAssignment) && (
                    <div className="flex-shrink-0 w-auto min-w-[140px]">
                        <div
                            className={`backdrop-blur-sm rounded-lg p-2 border transition-all duration-200 ${
                                nextAssignment
                                    ? 'bg-amber-50/80 border-amber-200/30'
                                    : 'bg-orange-50/80 border-orange-200/30'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div
                                    className={`w-3 h-3 rounded-full flex items-center justify-center ${
                                        nextAssignment ? 'bg-amber-500' : 'bg-orange-500'
                                    }`}
                                >
                                    <div className="w-1 h-1 bg-white rounded-full"></div>
                                </div>
                                <h4
                                    className={`text-xs font-medium ${
                                        nextAssignment ? 'text-amber-800' : 'text-orange-800'
                                    }`}
                                >
                                    {nextAssignment ? 'Empty' : 'Deadhead'}
                                </h4>
                            </div>
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs ${nextAssignment ? 'text-amber-700' : 'text-orange-700'}`}>
                                    Distance:
                                </span>
                                <div className="flex items-center space-x-1">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            emptyMiles[emptyMilesKey] !== undefined
                                                ? emptyMiles[emptyMilesKey]
                                                : emptyMilesToNext || 0
                                        }
                                        onChange={(e) => {
                                            handleEmptyMilesChange(parseFloat(e.target.value) || 0);
                                        }}
                                        className={`w-12 px-1 py-0.5 border rounded text-xs bg-white/80 focus:ring-1 focus:border-transparent ${
                                            nextAssignment
                                                ? 'border-amber-300 focus:ring-amber-500'
                                                : 'border-orange-300 focus:ring-orange-500'
                                        }`}
                                    />
                                    <span
                                        className={`text-xs font-medium ${
                                            nextAssignment ? 'text-amber-700' : 'text-orange-700'
                                        }`}
                                    >
                                        mi
                                    </span>
                                </div>
                            </div>
                            <p className={`text-xs truncate ${nextAssignment ? 'text-amber-600' : 'text-orange-600'}`}>
                                {nextAssignment ? `To #${index + 2}` : 'Back to base'}
                            </p>
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    }

    // Desktop version - Mile Calculation Style
    return (
        <div key={`assignment-${assignment.id}`}>
            {/* Assignment Card - Mile Calculation Style */}
            <div
                onClick={handleClick}
                className={`bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 border transition-all duration-200 cursor-pointer ${
                    isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                        : 'border-gray-200/40 hover:border-blue-200/60'
                }`}
            >
                {/* Assignment Header with Total Earnings */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: color }}
                        >
                            <span className="text-white text-xs sm:text-sm font-bold">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">Assignment #{index + 1}</h4>
                            <p className="text-xs text-gray-500 truncate">{assignment.load.refNum}</p>
                        </div>
                    </div>

                    {/* Total Earnings */}
                    <div className="text-right">
                        <div className="text-xs text-gray-600 mb-1">Total</div>
                        <div className="text-sm font-bold text-green-600">
                            $
                            {(() => {
                                const emptyMilesForThisAssignment = emptyMiles[emptyMilesKey] || 0;
                                const totalMiles = assignmentMiles + emptyMilesForThisAssignment;
                                return (totalMiles * Number(assignment.chargeValue)).toFixed(2);
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
                                    <span className="font-medium text-green-800">Pickup</span>
                                </div>
                                <p className="text-green-700 truncate font-medium text-xs sm:text-sm">
                                    {startLocation.loadStop?.name || startLocation.location?.name}
                                </p>
                                <p className="text-green-600 text-xs">
                                    {startLocation.loadStop?.city || startLocation.location?.city},{' '}
                                    {startLocation.loadStop?.state || startLocation.location?.state}
                                </p>
                            </div>
                            <div className="bg-red-50/80 p-2 rounded-lg">
                                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 flex items-center justify-center">
                                        <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full"></div>
                                    </div>
                                    <span className="font-medium text-red-800">Delivery</span>
                                </div>
                                <p className="text-red-700 truncate font-medium text-xs sm:text-sm">
                                    {endLocation.loadStop?.name || endLocation.location?.name}
                                </p>
                                <p className="text-red-600 text-xs">
                                    {endLocation.loadStop?.city || endLocation.location?.city},{' '}
                                    {endLocation.loadStop?.state || endLocation.location?.state}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty Miles Card - Mile Calculation Style */}
            {(nextAssignment || isLastAssignment) && (
                <div className="mt-3">
                    <div
                        className={`backdrop-blur-sm rounded-xl p-4 border ${
                            nextAssignment
                                ? 'bg-amber-50/80 border-amber-200/30'
                                : 'bg-orange-50/80 border-orange-200/30'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    nextAssignment ? 'bg-amber-500' : 'bg-orange-500'
                                }`}
                            >
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                            <h4
                                className={`text-sm font-medium ${
                                    nextAssignment ? 'text-amber-800' : 'text-orange-800'
                                }`}
                            >
                                {nextAssignment
                                    ? 'Empty Miles to Next Assignment'
                                    : 'Empty Miles After Last Assignment'}
                            </h4>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm ${nextAssignment ? 'text-amber-700' : 'text-orange-700'}`}>
                                {nextAssignment ? 'Distance:' : 'Distance (Return/Deadhead):'}
                            </span>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                        emptyMiles[emptyMilesKey] !== undefined
                                            ? emptyMiles[emptyMilesKey]
                                            : emptyMilesToNext || 0
                                    }
                                    onChange={(e) => {
                                        handleEmptyMilesChange(parseFloat(e.target.value) || 0);
                                    }}
                                    className={`w-20 px-2 py-1 border rounded-lg text-sm bg-white/80 focus:ring-2 focus:border-transparent ${
                                        nextAssignment
                                            ? 'border-amber-300 focus:ring-amber-500'
                                            : 'border-orange-300 focus:ring-orange-500'
                                    }`}
                                />
                                <span
                                    className={`text-sm font-medium ${
                                        nextAssignment ? 'text-amber-700' : 'text-orange-700'
                                    }`}
                                >
                                    miles
                                </span>
                            </div>
                        </div>
                        <p className={`text-xs mt-2 truncate ${nextAssignment ? 'text-amber-600' : 'text-orange-600'}`}>
                            {nextAssignment
                                ? `To: ${
                                      nextAssignment.routeLeg.locations[0].loadStop?.name ||
                                      nextAssignment.routeLeg.locations[0].location?.name
                                  }`
                                : 'Empty miles after completing final assignment (return to base, deadhead, etc.)'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

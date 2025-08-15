import React from 'react';
import { ExpandedDriverAssignment } from 'interfaces/models';

interface CompensationSummaryProps {
    assignments: ExpandedDriverAssignment[];
    emptyMiles: { [key: string]: number };
}

const CompensationSummary: React.FC<CompensationSummaryProps> = ({ assignments, emptyMiles }) => {
    return (
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/30 rounded-2xl p-6 shadow-sm mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Compensation Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-green-50/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border border-green-200/30">
                    <p className="text-xs sm:text-sm font-semibold text-green-800 mb-2">Assignment Miles</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-900">
                        {assignments
                            .filter((a) => a.chargeType === 'PER_MILE')
                            .reduce((total, a) => total + Number(a.billedDistanceMiles || a.routeLeg.distanceMiles), 0)
                            .toFixed(1)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Total Distance</p>
                </div>
                <div className="bg-amber-50/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border border-amber-200/30">
                    <p className="text-xs sm:text-sm font-semibold text-amber-800 mb-2">Empty Miles</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-900">
                        {assignments
                            .filter((a) => a.chargeType === 'PER_MILE')
                            .reduce((total, a) => {
                                // Get empty miles for this assignment
                                let emptyMilesForAssignment = 0;

                                // Use the emptyMiles from the assignment object if available,
                                // otherwise fall back to the state
                                if (a.emptyMiles && Number(a.emptyMiles) > 0) {
                                    emptyMilesForAssignment = Number(a.emptyMiles);
                                } else {
                                    // Find empty miles for this assignment from state
                                    const emptyMilesKey = Object.keys(emptyMiles).find((key) =>
                                        key.startsWith(`${a.id}-to-`),
                                    );
                                    emptyMilesForAssignment = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;
                                }

                                return total + emptyMilesForAssignment;
                            }, 0)
                            .toFixed(1)}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">Total Empty Miles</p>
                </div>
                <div className="bg-purple-50/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border border-purple-200/30">
                    <p className="text-xs sm:text-sm font-semibold text-purple-800 mb-2">Total Miles</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-900">
                        {(() => {
                            const assignmentMiles = assignments
                                .filter((a) => a.chargeType === 'PER_MILE')
                                .reduce(
                                    (total, a) => total + Number(a.billedDistanceMiles || a.routeLeg.distanceMiles),
                                    0,
                                );

                            const totalEmptyMiles = assignments
                                .filter((a) => a.chargeType === 'PER_MILE')
                                .reduce((total, a) => {
                                    // Get empty miles for this assignment
                                    let emptyMilesForAssignment = 0;

                                    // Use the emptyMiles from the assignment object if available,
                                    // otherwise fall back to the state
                                    if (a.emptyMiles && Number(a.emptyMiles) > 0) {
                                        emptyMilesForAssignment = Number(a.emptyMiles);
                                    } else {
                                        // Find empty miles for this assignment from state
                                        const emptyMilesKey = Object.keys(emptyMiles).find((key) =>
                                            key.startsWith(`${a.id}-to-`),
                                        );
                                        emptyMilesForAssignment = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;
                                    }

                                    return total + emptyMilesForAssignment;
                                }, 0);

                            return (assignmentMiles + totalEmptyMiles).toFixed(1);
                        })()}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">Combined Distance</p>
                </div>
                <div className="bg-blue-50/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl text-center border border-blue-200/30">
                    <p className="text-xs sm:text-sm font-semibold text-blue-800 mb-2">Total Pay</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">
                        $
                        {assignments
                            .filter((a) => a.chargeType === 'PER_MILE')
                            .reduce((total, a) => {
                                const billedMiles = Number(a.billedDistanceMiles || a.routeLeg.distanceMiles);

                                // Get empty miles for this assignment
                                let emptyMilesForAssignment = 0;

                                // Use the emptyMiles from the assignment object if available,
                                // otherwise fall back to the state
                                if (a.emptyMiles && Number(a.emptyMiles) > 0) {
                                    emptyMilesForAssignment = Number(a.emptyMiles);
                                } else {
                                    // Find empty miles for this assignment from state
                                    const emptyMilesKey = Object.keys(emptyMiles).find((key) =>
                                        key.startsWith(`${a.id}-to-`),
                                    );
                                    emptyMilesForAssignment = emptyMilesKey ? emptyMiles[emptyMilesKey] : 0;
                                }

                                const totalMiles = billedMiles + emptyMilesForAssignment;
                                return total + totalMiles * Number(a.chargeValue);
                            }, 0)
                            .toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Including Empty Miles</p>
                </div>
            </div>

            {/* Empty Miles Compensation Info */}
            <div className="bg-gray-50/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/30">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <h4 className="text-sm font-medium text-gray-800">Empty Miles Compensation</h4>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                    Empty miles are automatically included in assignment calculations.
                </p>
                <p className="text-xs text-gray-500">
                    Total compensation includes both loaded miles and empty miles at the same per-mile rate.
                </p>
            </div>
        </div>
    );
};

export default CompensationSummary;

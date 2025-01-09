import React from 'react';
import HoverPopover from './HoverPopover';
import { ExpandedDriverAssignment } from '../interfaces/models';
import { calculateDriverPay, formatCurrency } from '../lib/helpers/calculateDriverPay';
import RouteLegStatusBadge from './loads/RouteLegStatusBadge';

const calculateAssignmentTotalPay = (assignment: ExpandedDriverAssignment) => {
    return calculateDriverPay({
        chargeType: assignment.chargeType,
        chargeValue: assignment.chargeValue,
        distanceMiles: assignment.billedDistanceMiles ?? assignment.routeLeg?.distanceMiles ?? 0,
        durationHours: assignment.billedDurationHours ?? assignment.routeLeg?.durationHours ?? 0,
        loadRate: assignment.billedLoadRate ?? assignment.load.rate,
    });
};

const calculateRouteLegTotalCost = (assignment: ExpandedDriverAssignment) => {
    const routeLeg = assignment.routeLeg;
    if (!routeLeg) return 0;
    const driverAssignments = routeLeg.driverAssignments as ExpandedDriverAssignment[];
    return driverAssignments.reduce((total, driverAssignment) => {
        driverAssignment.load = assignment.load;
        driverAssignment.routeLeg = routeLeg;
        return total + calculateAssignmentTotalPay(driverAssignment).toNumber();
    }, 0);
};

const LoadPopover: React.FC<{ trigger: React.ReactNode; assignment: ExpandedDriverAssignment }> = ({
    trigger,
    assignment,
}) => {
    return (
        <HoverPopover
            trigger={trigger}
            content={
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">Assignment for Load # {assignment.load?.refNum}</p>
                    <div className="text-sm text-gray-600">
                        <p className="mb-1">
                            Status: <RouteLegStatusBadge routeLeg={assignment.routeLeg} />
                        </p>
                        <p>Load Rate: {formatCurrency(assignment.load?.rate)}</p>
                        <p>
                            Total Driver{assignment.routeLeg?.driverAssignments.length > 1 ? 's' : ''} Pay:{' '}
                            {formatCurrency(calculateRouteLegTotalCost(assignment))}
                        </p>
                    </div>
                    <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-900">Drivers</p>
                        <div className="text-sm font-normal">
                            {assignment.routeLeg?.driverAssignments
                                .map((driverAssignment) => driverAssignment.driver.name)
                                .join(', ')}
                        </div>
                    </div>
                    <div className="mt-3">
                        <p className="mb-2 text-sm font-semibold text-gray-900">Route Locations</p>
                        <div className="space-y-2">
                            {assignment.routeLeg?.locations.map((location, index) => {
                                const item = location.loadStop || location.location;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-2 border rounded-md bg-gray-50"
                                    >
                                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                                            {index + 1}
                                        </span>
                                        <span className="text-xs text-gray-600">
                                            {item?.city}, {item?.state}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            }
        />
    );
};

export default LoadPopover;

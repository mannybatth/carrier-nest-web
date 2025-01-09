import { Prisma } from '@prisma/client';
import React from 'react';
import { ExpandedDriverAssignment, ExpandedLoad } from '../interfaces/models';
import { calculateDriverPay, formatCurrency } from '../lib/helpers/calculateDriverPay';
import HoverPopover from './HoverPopover';
import RouteLegStatusBadge from './loads/RouteLegStatusBadge';

const calculateAssignmentTotalPay = (assignment: ExpandedDriverAssignment, loadRate: Prisma.Decimal) => {
    return calculateDriverPay({
        chargeType: assignment.chargeType,
        chargeValue: assignment.chargeValue,
        distanceMiles: assignment.billedDistanceMiles ?? assignment.routeLeg?.distanceMiles ?? 0,
        durationHours: assignment.billedDurationHours ?? assignment.routeLeg?.durationHours ?? 0,
        loadRate: assignment.billedLoadRate ?? loadRate,
    });
};

const calculateRouteLegTotalCost = (assignment: ExpandedDriverAssignment, load: ExpandedLoad) => {
    const routeLeg = assignment.routeLeg;
    if (!routeLeg) return 0;
    const driverAssignments = routeLeg.driverAssignments as ExpandedDriverAssignment[];
    return driverAssignments.reduce((total, driverAssignment) => {
        driverAssignment.load = load as ExpandedDriverAssignment['load'];
        driverAssignment.routeLeg = routeLeg;
        return total + calculateAssignmentTotalPay(driverAssignment, load.rate).toNumber();
    }, 0);
};

const LoadPopover: React.FC<{
    trigger: React.ReactNode;
    assignment: ExpandedDriverAssignment;
    load: ExpandedLoad;
}> = ({ trigger, assignment, load }) => {
    return (
        <HoverPopover
            trigger={trigger}
            content={
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">Assignment for Load # {load?.refNum}</p>
                    <div className="text-sm text-gray-600">
                        <p className="mb-1">
                            Status: <RouteLegStatusBadge routeLeg={assignment.routeLeg} />
                        </p>
                        <p>Load Rate: {formatCurrency(load?.rate)}</p>
                        <p>
                            Total Driver{assignment.routeLeg?.driverAssignments.length > 1 ? 's' : ''} Pay:{' '}
                            {formatCurrency(calculateRouteLegTotalCost(assignment, load))}
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

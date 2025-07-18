import { useState, useEffect, useCallback } from 'react';
import { ExpandedDriverAssignment } from 'interfaces/models';

interface UseMileCalculationProps {
    assignments: ExpandedDriverAssignment[];
    calculateHaversineDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

export const useMileCalculation = ({ assignments, calculateHaversineDistance }: UseMileCalculationProps) => {
    const [emptyMiles, setEmptyMiles] = useState<{ [key: string]: number }>({});
    const [emptyMilesInput, setEmptyMilesInput] = useState<{ [key: string]: string }>({});
    const [totalEmptyMiles, setTotalEmptyMiles] = useState(0);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

    // Calculate empty miles when mile-based assignments change
    useEffect(() => {
        const mileBasedAssignments = assignments.filter((a) => a.chargeType === 'PER_MILE');
        if (mileBasedAssignments.length < 1) {
            setEmptyMiles({});
            setTotalEmptyMiles(0);
            return;
        }

        // Sort assignments by date
        const sortedAssignments = mileBasedAssignments.sort((a, b) => {
            const dateA = new Date(a.routeLeg.startedAt || a.routeLeg.createdAt);
            const dateB = new Date(b.routeLeg.startedAt || b.routeLeg.createdAt);
            return dateA.getTime() - dateB.getTime();
        });

        const newEmptyMiles: { [key: string]: number } = {};
        let totalEmpty = 0;

        // Calculate empty miles between assignments
        for (let i = 0; i < sortedAssignments.length - 1; i++) {
            const currentAssignment = sortedAssignments[i];
            const nextAssignment = sortedAssignments[i + 1];
            const emptyMilesKey = `${currentAssignment.id}-to-${nextAssignment.id}`;

            // Check if this assignment already has empty miles assigned
            if (currentAssignment.emptyMiles && Number(currentAssignment.emptyMiles) > 0) {
                // Use existing empty miles from the assignment
                newEmptyMiles[emptyMilesKey] = Number(currentAssignment.emptyMiles);
                totalEmpty += newEmptyMiles[emptyMilesKey];
            } else {
                // Calculate empty miles using distance
                const currentEndLocation =
                    currentAssignment.routeLeg.locations[currentAssignment.routeLeg.locations.length - 1];
                const currentEndLat = currentEndLocation.loadStop?.latitude || currentEndLocation.location?.latitude;
                const currentEndLng = currentEndLocation.loadStop?.longitude || currentEndLocation.location?.longitude;

                const nextStartLocation = nextAssignment.routeLeg.locations[0];
                const nextStartLat = nextStartLocation.loadStop?.latitude || nextStartLocation.location?.latitude;
                const nextStartLng = nextStartLocation.loadStop?.longitude || nextStartLocation.location?.longitude;

                if (currentEndLat && currentEndLng && nextStartLat && nextStartLng) {
                    const distance = calculateHaversineDistance(
                        currentEndLat,
                        currentEndLng,
                        nextStartLat,
                        nextStartLng,
                    );
                    newEmptyMiles[emptyMilesKey] = Math.round(distance * 100) / 100;
                    totalEmpty += newEmptyMiles[emptyMilesKey];
                }
            }
        }

        // Add empty miles entry for the last assignment (return to base/deadhead)
        if (sortedAssignments.length > 0) {
            const lastAssignment = sortedAssignments[sortedAssignments.length - 1];
            const emptyMilesKey = `${lastAssignment.id}-to-end`;

            // Check if the last assignment has empty miles assigned
            if (lastAssignment.emptyMiles && Number(lastAssignment.emptyMiles) > 0) {
                // Use existing empty miles from the assignment
                newEmptyMiles[emptyMilesKey] = Number(lastAssignment.emptyMiles);
                totalEmpty += newEmptyMiles[emptyMilesKey];
            } else {
                // Default to 0, user can adjust
                newEmptyMiles[emptyMilesKey] = 0;
            }
        }

        setEmptyMiles(newEmptyMiles);
        setTotalEmptyMiles(Math.round(totalEmpty * 100) / 100);
    }, [assignments]); // Removed calculateHaversineDistance from dependencies since it's a stable imported function

    // Define the empty miles update callback
    const handleEmptyMilesUpdate = useCallback((updatedEmptyMiles: { [key: string]: number }) => {
        setEmptyMiles(updatedEmptyMiles);

        // Calculate total empty miles
        const total = Object.values(updatedEmptyMiles).reduce((sum, miles) => sum + miles, 0);
        setTotalEmptyMiles(Math.round(total * 100) / 100);
    }, []);

    // Function to restore empty miles from assignments when returning to mile calculation step
    const restoreEmptyMilesFromAssignments = useCallback(() => {
        const restoredEmptyMiles: { [key: string]: number } = {};
        let totalEmpty = 0;

        // Sort assignments by date
        const mileBasedAssignments = assignments.filter((assignment) => assignment.chargeType === 'PER_MILE');
        const sortedAssignments = mileBasedAssignments.sort((a, b) => {
            const dateA = new Date(a.routeLeg.startedAt || a.routeLeg.createdAt);
            const dateB = new Date(b.routeLeg.startedAt || b.routeLeg.createdAt);
            return dateA.getTime() - dateB.getTime();
        });

        // Restore empty miles between assignments
        for (let i = 0; i < sortedAssignments.length - 1; i++) {
            const currentAssignment = sortedAssignments[i];
            const nextAssignment = sortedAssignments[i + 1];
            const emptyMilesKey = `${currentAssignment.id}-to-${nextAssignment.id}`;

            // Restore from assignment object if available
            if (currentAssignment.emptyMiles && Number(currentAssignment.emptyMiles) > 0) {
                restoredEmptyMiles[emptyMilesKey] = Number(currentAssignment.emptyMiles);
                totalEmpty += Number(currentAssignment.emptyMiles);
            } else {
                // Calculate default distance
                const currentEndLocation =
                    currentAssignment.routeLeg.locations[currentAssignment.routeLeg.locations.length - 1];
                const nextStartLocation = nextAssignment.routeLeg.locations[0];

                const currentEndLat = currentEndLocation.loadStop?.latitude || currentEndLocation.location?.latitude;
                const currentEndLng = currentEndLocation.loadStop?.longitude || currentEndLocation.location?.longitude;
                const nextStartLat = nextStartLocation.loadStop?.latitude || nextStartLocation.location?.latitude;
                const nextStartLng = nextStartLocation.loadStop?.longitude || nextStartLocation.location?.longitude;

                if (currentEndLat && currentEndLng && nextStartLat && nextStartLng) {
                    const distance = calculateHaversineDistance(
                        currentEndLat,
                        currentEndLng,
                        nextStartLat,
                        nextStartLng,
                    );
                    restoredEmptyMiles[emptyMilesKey] = Math.round(distance * 100) / 100;
                    totalEmpty += restoredEmptyMiles[emptyMilesKey];
                }
            }
        }

        // Restore empty miles for the last assignment (return to base/deadhead)
        if (sortedAssignments.length > 0) {
            const lastAssignment = sortedAssignments[sortedAssignments.length - 1];
            const emptyMilesKey = `${lastAssignment.id}-to-end`;

            // Restore from assignment object if available, otherwise default to 0
            if (lastAssignment.emptyMiles && Number(lastAssignment.emptyMiles) > 0) {
                restoredEmptyMiles[emptyMilesKey] = Number(lastAssignment.emptyMiles);
                totalEmpty += Number(lastAssignment.emptyMiles);
            } else {
                // Default to 0 for last assignment empty miles
                restoredEmptyMiles[emptyMilesKey] = 0;
            }
        }

        setEmptyMiles(restoredEmptyMiles);
        setTotalEmptyMiles(Math.round(totalEmpty * 100) / 100);
    }, [assignments]); // Removed calculateHaversineDistance from dependencies since it's a stable imported function

    return {
        emptyMiles,
        setEmptyMiles,
        emptyMilesInput,
        setEmptyMilesInput,
        totalEmptyMiles,
        selectedAssignmentId,
        setSelectedAssignmentId,
        handleEmptyMilesUpdate,
        restoreEmptyMilesFromAssignments,
    };
};

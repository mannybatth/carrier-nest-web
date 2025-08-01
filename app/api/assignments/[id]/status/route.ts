import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import prisma from '../../../../../lib/prisma';
import { AssignmentNotificationHelper } from '../../../../../lib/helpers/AssignmentNotificationHelper';
import { RouteLegStatus } from '@prisma/client';

export const PUT = auth(async (req: NextAuthRequest) => {
    const session = req.auth;
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const assignmentId = searchParams.get('assignmentId');
        const { status: newStatus, location, metadata } = await req.json();

        if (!assignmentId) {
            return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
        }

        if (!newStatus) {
            return NextResponse.json({ error: 'New status required' }, { status: 400 });
        }

        // Get the assignment with current status for comparison
        const assignment = await prisma.driverAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                driver: { select: { id: true, name: true } },
                routeLeg: {
                    include: {
                        route: {
                            include: {
                                load: { select: { id: true, refNum: true, carrierId: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!assignment) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        // Check if user has permission to update this assignment
        const isDriver = session.user.driverId === assignment.driver.id;
        const isCarrierUser = session.user.defaultCarrierId === assignment.routeLeg.route.load.carrierId;

        if (!isDriver && !isCarrierUser) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const currentStatus = assignment.routeLeg.status;
        const routeLegId = assignment.routeLeg.id;
        const loadId = assignment.routeLeg.route.load.id;
        const carrierId = assignment.routeLeg.route.load.carrierId;

        // Prevent duplicate status updates (same status)
        // But allow legitimate status changes back and forth (e.g., ASSIGNED → IN_PROGRESS → ASSIGNED)
        if (currentStatus === newStatus) {
            return NextResponse.json({
                message: 'Status unchanged - already at requested status',
                assignment: assignment,
                statusChange: {
                    from: currentStatus,
                    to: newStatus,
                    unchanged: true,
                },
            });
        }

        // Update the route leg status
        const updatedRouteLeg = await prisma.routeLeg.update({
            where: { id: routeLegId },
            data: {
                status: newStatus as RouteLegStatus,
                ...(location && {
                    currentLocation: location,
                }),
            },
        });

        // Determine who made the change
        const changedBy = isDriver ? assignment.driver.name : session.user.name || 'User';
        const changedByType = isDriver ? 'Driver' : 'Admin';

        // Create comprehensive notification data
        const notificationParams = {
            assignmentId: assignment.id,
            routeLegId: routeLegId,
            loadId: loadId,
            carrierId: carrierId,
            driverId: assignment.driver.id,
            driverName: assignment.driver.name,
            loadNum: assignment.routeLeg.route.load.refNum || `Load-${loadId}`,
            fromStatus: currentStatus,
            toStatus: newStatus,
            changedBy: changedBy,
            changedByType: changedByType,
            metadata: metadata, // Any additional context from the driver app
        };

        // Send appropriate notifications based on the new status
        try {
            switch (newStatus) {
                case RouteLegStatus.IN_PROGRESS:
                    await AssignmentNotificationHelper.notifyAssignmentStarted({
                        assignmentId: assignment.id,
                        routeLegId: routeLegId,
                        loadId: loadId,
                        carrierId: carrierId,
                        driverId: assignment.driver.id,
                        driverName: assignment.driver.name,
                        loadNum: assignment.routeLeg.route.load.refNum || `Load-${loadId}`,
                    });
                    break;

                case RouteLegStatus.COMPLETED:
                    await AssignmentNotificationHelper.notifyAssignmentCompleted({
                        assignmentId: assignment.id,
                        routeLegId: routeLegId,
                        loadId: loadId,
                        carrierId: carrierId,
                        driverId: assignment.driver.id,
                        driverName: assignment.driver.name,
                        loadNum: assignment.routeLeg.route.load.refNum || `Load-${loadId}`,
                    });
                    break;

                default:
                    // For all other status changes, send a generic status change notification
                    await AssignmentNotificationHelper.notifyStatusChange(notificationParams);
                    break;
            }
        } catch (notificationError) {
            // Log notification errors but don't fail the status update
            console.error('Error sending status change notification:', notificationError);
        }

        // Return the updated assignment with new status
        const updatedAssignment = await prisma.driverAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                driver: { select: { id: true, name: true } },
                routeLeg: {
                    include: {
                        route: {
                            include: {
                                load: {
                                    select: {
                                        id: true,
                                        refNum: true,
                                        carrierId: true,
                                        status: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({
            message: 'Status updated successfully',
            assignment: updatedAssignment,
            statusChange: {
                from: currentStatus,
                to: newStatus,
                changedBy: changedBy,
                changedByType: changedByType,
                timestamp: new Date(),
            },
        });
    } catch (error) {
        console.error('Error updating assignment status:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
});

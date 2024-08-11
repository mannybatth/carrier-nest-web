import { Driver } from '@prisma/client';
import { ExpandedRouteLegLocation } from './models';

export interface RouteLegData {
    drivers: Driver[];
    locations: ExpandedRouteLegLocation[];
    driverInstructions: string;
    scheduledDate: string;
    scheduledTime: string;
    routeLegDistance?: number;
    routeLegDuration?: number;
}

export interface CreateAssignmentRequest {
    routeLegData: RouteLegData;
    sendSms: boolean;
    loadId: string;
}

export interface UpdateAssignmentRequest {
    routeLegId: string;
    routeLegData: RouteLegData;
    sendSms: boolean;
    loadId: string;
}

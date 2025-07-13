import { ChargeType, Driver } from '@prisma/client';
import { ExpandedRouteLegLocation } from './models';

export interface DriverWithCharge {
    driver: Partial<Driver>;
    chargeType?: ChargeType;
    chargeValue?: number;
}

export interface RouteLegData {
    driversWithCharge: DriverWithCharge[];
    locations: ExpandedRouteLegLocation[];
    driverInstructions: string;
    scheduledDate: string;
    scheduledTime: string;
    distanceMiles?: number;
    durationHours?: number;
    routeEncoded?: string;
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

import { ChargeType, Driver } from '@prisma/client';
import { ExpandedRouteLegLocation } from './models';

export interface DriverWithCharge {
    driver: Driver;
    chargeType?: ChargeType;
    chargeValue?: number;
}

export interface RouteLegData {
    driversWithCharge: DriverWithCharge[];
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

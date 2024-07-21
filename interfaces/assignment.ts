interface RouteLegLocation {
    id: string;
    type: 'loadStop' | 'location';
}

interface RouteLegData {
    driverIds: string[];
    locations: RouteLegLocation[];
    driverInstructions: string;
    scheduledDate: string;
    scheduledTime: string;
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

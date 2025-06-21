// ELD Provider related interfaces and types

export interface ELDProvider {
    id: string;
    name: string;
    logo: string;
    description: string;
    isPopular?: boolean;
    status?: 'connected' | 'disconnected' | 'error';
    lastSync?: string;
    website?: string;
    supportedFeatures?: string[];
}

export interface ELDConnection {
    id: string;
    providerId: string;
    userId: string;
    apiKey: string;
    secretKey?: string;
    serverUrl?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastSyncAt?: string;
    syncStatus: 'success' | 'error' | 'pending';
    errorMessage?: string;
}

export interface ELDCredentials {
    apiKey: string;
    secretKey: string;
    serverUrl?: string;
    additionalParams?: Record<string, string>;
}

export interface ELDSyncData {
    drivers: ELDDriverData[];
    vehicles: ELDVehicleData[];
    logs: ELDLogData[];
    violations: ELDViolationData[];
}

export interface ELDDriverData {
    driverId: string;
    name: string;
    licenseNumber: string;
    status: 'active' | 'inactive' | 'on_duty' | 'off_duty';
    currentLocation?: {
        latitude: number;
        longitude: number;
        timestamp: string;
    };
    hoursOfService?: {
        drive: number;
        duty: number;
        rest: number;
        cycle: number;
    };
}

export interface ELDVehicleData {
    vehicleId: string;
    name: string;
    vin: string;
    licensePlate: string;
    status: 'active' | 'inactive' | 'maintenance';
    currentLocation?: {
        latitude: number;
        longitude: number;
        timestamp: string;
    };
    odometer?: number;
    engineHours?: number;
}

export interface ELDLogData {
    logId: string;
    driverId: string;
    vehicleId: string;
    date: string;
    events: ELDLogEvent[];
    totalDriveTime: number;
    totalDutyTime: number;
    violations?: string[];
}

export interface ELDLogEvent {
    eventId: string;
    eventType: 'duty_status_change' | 'location_update' | 'engine_start' | 'engine_stop';
    timestamp: string;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    dutyStatus?: 'on_duty' | 'off_duty' | 'driving' | 'sleeper_berth';
    notes?: string;
}

export interface ELDViolationData {
    violationId: string;
    driverId: string;
    vehicleId?: string;
    type: 'hos_violation' | 'missing_log' | 'malfunction' | 'data_diagnostic';
    severity: 'warning' | 'violation' | 'critical';
    description: string;
    timestamp: string;
    resolved: boolean;
    resolvedAt?: string;
}

export interface ELDProviderConfig {
    baseUrl: string;
    authType: 'api_key' | 'oauth' | 'basic_auth';
    requiredCredentials: string[];
    endpoints: {
        drivers: string;
        vehicles: string;
        logs: string;
        violations: string;
    };
    rateLimit?: {
        requestsPerMinute: number;
        requestsPerHour: number;
    };
    syncInterval?: number; // in minutes
}

export interface ELDApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

export interface ELDSyncResult {
    providerId: string;
    syncedAt: string;
    success: boolean;
    recordsSynced: {
        drivers: number;
        vehicles: number;
        logs: number;
        violations: number;
    };
    errors?: string[];
}

export interface ELDQueryParams {
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    driverId?: string;
    vehicleId?: string;
    status?: string;
    limit?: number;
    offset?: number;
    page?: number;
}

// Base ELD Provider Adapter Interface
// This provides a standardized interface for all ELD provider integrations

import type {
    ELDDriverData,
    ELDVehicleData,
    ELDLogData,
    ELDViolationData,
    ELDCredentials,
    ELDApiResponse,
    ELDSyncResult,
    ELDProviderConfig,
} from '../../../../interfaces/eld';

/**
 * Normalized pagination interface for all providers
 */
export interface NormalizedPagination {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

/**
 * Common query parameters for data fetching
 */
export interface ELDQueryParams {
    startDate?: string;
    endDate?: string;
    driverId?: string;
    vehicleId?: string;
    status?: string;
    limit?: number;
    offset?: number;
    [key: string]: any;
}

/**
 * Normalized response format for all ELD operations
 */
export interface NormalizedELDResponse<T> {
    success: boolean;
    data: T;
    pagination?: NormalizedPagination;
    metadata?: {
        syncedAt: string;
        providerId: string;
        recordCount: number;
    };
    errors?: Array<{
        code: string;
        message: string;
        field?: string;
    }>;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
    success: boolean;
    message: string;
    details?: {
        responseTime: number;
        apiVersion?: string;
        permissions?: string[];
    };
}

/**
 * Provider capabilities and feature support
 */
export interface ProviderCapabilities {
    realTimeTracking: boolean;
    hosCompliance: boolean;
    driverManagement: boolean;
    vehicleManagement: boolean;
    reportGeneration: boolean;
    webhookSupport: boolean;
    bulkOperations: boolean;
    customFields: boolean;
}

/**
 * Abstract base class that all ELD provider adapters must implement
 * This ensures consistent behavior across all provider integrations
 */
export abstract class ELDProviderAdapter {
    protected config: ELDProviderConfig;
    protected credentials: ELDCredentials;
    protected providerId: string;

    constructor(providerId: string, config: ELDProviderConfig, credentials: ELDCredentials) {
        this.providerId = providerId;
        this.config = config;
        this.credentials = credentials;
    }

    // Core abstract methods that every provider must implement

    /**
     * Test the connection to the ELD provider
     */
    abstract testConnection(): Promise<ConnectionTestResult>;

    /**
     * Get provider capabilities and supported features
     */
    abstract getCapabilities(): ProviderCapabilities;

    /**
     * Fetch drivers from the ELD provider
     */
    abstract getDrivers(params?: ELDQueryParams): Promise<NormalizedELDResponse<ELDDriverData[]>>;

    /**
     * Get a specific driver by ID
     */
    abstract getDriverById(driverId: string): Promise<NormalizedELDResponse<ELDDriverData>>;

    /**
     * Fetch vehicles from the ELD provider
     */
    abstract getVehicles(params?: ELDQueryParams): Promise<NormalizedELDResponse<ELDVehicleData[]>>;

    /**
     * Get a specific vehicle by ID
     */
    abstract getVehicleById(vehicleId: string): Promise<NormalizedELDResponse<ELDVehicleData>>;

    /**
     * Fetch driver logs from the ELD provider
     */
    abstract getLogs(params?: ELDQueryParams): Promise<NormalizedELDResponse<ELDLogData[]>>;

    /**
     * Get logs for a specific driver
     */
    abstract getLogsByDriverId(driverId: string, params?: ELDQueryParams): Promise<NormalizedELDResponse<ELDLogData[]>>;

    /**
     * Fetch violations from the ELD provider
     */
    abstract getViolations(params?: ELDQueryParams): Promise<NormalizedELDResponse<ELDViolationData[]>>;

    /**
     * Perform a full synchronization of all data
     */
    abstract syncAllData(params?: ELDQueryParams): Promise<ELDSyncResult>;

    // Common utility methods implemented in base class

    /**
     * Get the provider ID
     */
    getProviderId(): string {
        return this.providerId;
    }

    /**
     * Get the provider configuration
     */
    getConfig(): ELDProviderConfig {
        return this.config;
    }

    /**
     * Validate credentials format
     */
    protected validateCredentials(): boolean {
        const required = this.config.requiredCredentials;
        return required.every((field) => {
            if (field === 'apiKey') return !!this.credentials.apiKey;
            if (field === 'secretKey') return !!this.credentials.secretKey;
            if (field === 'serverUrl') return !!this.credentials.serverUrl;
            return this.credentials.additionalParams?.[field] !== undefined;
        });
    }

    /**
     * Create standardized headers for API requests
     */
    protected createAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'CarrierNest-ELD-Integration/1.0',
        };

        switch (this.config.authType) {
            case 'api_key':
                headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
                break;
            case 'basic_auth':
                const auth = Buffer.from(`${this.credentials.apiKey}:${this.credentials.secretKey}`).toString('base64');
                headers['Authorization'] = `Basic ${auth}`;
                break;
            case 'oauth':
                headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
                break;
        }

        return headers;
    }

    /**
     * Handle API errors consistently across providers
     */
    protected handleApiError(error: any, operation: string): NormalizedELDResponse<any> {
        console.error(`ELD Provider ${this.providerId} - ${operation} error:`, error);

        let errorMessage = 'Unknown error occurred';
        let errorCode = 'UNKNOWN_ERROR';

        if (error.response) {
            // HTTP error response
            errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
            errorCode = `HTTP_${error.response.status}`;
        } else if (error.message) {
            // Network or other error
            errorMessage = error.message;
            errorCode = 'NETWORK_ERROR';
        }

        return {
            success: false,
            data: null,
            errors: [
                {
                    code: errorCode,
                    message: errorMessage,
                },
            ],
        };
    }

    /**
     * Apply rate limiting before making requests
     */
    protected async applyRateLimit(): Promise<void> {
        if (this.config.rateLimit) {
            // Simple rate limiting implementation
            // In production, this would use Redis or a more sophisticated rate limiter
            const now = Date.now();
            const key = `eld_rate_limit_${this.providerId}`;

            // This is a placeholder - implement actual rate limiting logic
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    /**
     * Create standardized metadata for responses
     */
    protected createMetadata(recordCount: number): { syncedAt: string; providerId: string; recordCount: number } {
        return {
            syncedAt: new Date().toISOString(),
            providerId: this.providerId,
            recordCount,
        };
    }

    /**
     * Normalize external pagination to internal format
     */
    protected normalizePagination(page: number, limit: number, total: number): NormalizedPagination {
        return {
            page,
            limit,
            total,
            hasMore: page * limit < total,
        };
    }
}

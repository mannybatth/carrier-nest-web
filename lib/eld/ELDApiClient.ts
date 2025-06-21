// ELD API Client - Frontend service for interacting with ELD backend APIs
// Provides typed interfaces for all ELD operations

import type {
    ELDProvider,
    ELDCredentials,
    ELDDriverData,
    ELDVehicleData,
    ELDLogData,
    ELDViolationData,
    ELDSyncResult,
    ELDQueryParams,
} from '../../interfaces/eld';

import type { NormalizedELDResponse, ConnectionTestResult } from '../../lib/eld/adapters/base/ELDProviderAdapter';

/**
 * API response wrapper for consistent error handling
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    details?: string;
}

/**
 * ELD API Client class for frontend interactions
 */
export class ELDApiClient {
    private baseUrl: string;

    constructor(baseUrl = '/api/eld') {
        this.baseUrl = baseUrl;
    }

    /**
     * Create authorization header with credentials
     */
    private createAuthHeader(credentials: ELDCredentials): string {
        const credentialsString = JSON.stringify(credentials);
        return `Bearer ${Buffer.from(credentialsString).toString('base64')}`;
    }

    /**
     * Generic API request handler
     */
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                    details: data.details,
                };
            }

            return data;
        } catch (error) {
            return {
                success: false,
                error: 'Network error',
                details: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get list of available ELD providers
     */
    async getProviders(): Promise<
        ApiResponse<
            Array<{
                id: string;
                name: string;
                description: string;
                version: string;
                isActive: boolean;
                capabilities: any;
                endpoints: any;
            }>
        >
    > {
        return this.request('/providers');
    }

    /**
     * Test connection to an ELD provider
     */
    async testConnection(providerId: string, credentials: ELDCredentials): Promise<ApiResponse<ConnectionTestResult>> {
        return this.request('/test-connection', {
            method: 'POST',
            body: JSON.stringify({
                providerId,
                credentials,
            }),
        });
    }

    /**
     * Sync data from an ELD provider
     */
    async syncData(
        providerId: string,
        credentials: ELDCredentials,
        params?: ELDQueryParams,
        syncType: 'full' | 'drivers' | 'vehicles' | 'logs' | 'violations' = 'full',
    ): Promise<ApiResponse<ELDSyncResult>> {
        return this.request('/sync', {
            method: 'POST',
            body: JSON.stringify({
                providerId,
                credentials,
                params,
                syncType,
            }),
        });
    }

    /**
     * Get drivers from an ELD provider
     */
    async getDrivers(
        providerId: string,
        credentials: ELDCredentials,
        params?: ELDQueryParams,
    ): Promise<ApiResponse<NormalizedELDResponse<ELDDriverData[]>>> {
        const queryString = params
            ? new URLSearchParams(
                  Object.entries(params)
                      .filter(([, value]) => value !== undefined)
                      .map(([key, value]) => [key, String(value)]),
              ).toString()
            : '';

        return this.request(`/${providerId}/drivers${queryString ? `?${queryString}` : ''}`, {
            headers: {
                Authorization: this.createAuthHeader(credentials),
            },
        });
    }

    /**
     * Get vehicles from an ELD provider
     */
    async getVehicles(
        providerId: string,
        credentials: ELDCredentials,
        params?: ELDQueryParams,
    ): Promise<ApiResponse<NormalizedELDResponse<ELDVehicleData[]>>> {
        const queryString = params
            ? new URLSearchParams(
                  Object.entries(params)
                      .filter(([, value]) => value !== undefined)
                      .map(([key, value]) => [key, String(value)]),
              ).toString()
            : '';

        return this.request(`/${providerId}/vehicles${queryString ? `?${queryString}` : ''}`, {
            headers: {
                Authorization: this.createAuthHeader(credentials),
            },
        });
    }

    /**
     * Get logs from an ELD provider
     */
    async getLogs(
        providerId: string,
        credentials: ELDCredentials,
        params?: ELDQueryParams,
    ): Promise<ApiResponse<NormalizedELDResponse<ELDLogData[]>>> {
        const queryString = params
            ? new URLSearchParams(
                  Object.entries(params)
                      .filter(([, value]) => value !== undefined)
                      .map(([key, value]) => [key, String(value)]),
              ).toString()
            : '';

        return this.request(`/${providerId}/logs${queryString ? `?${queryString}` : ''}`, {
            headers: {
                Authorization: this.createAuthHeader(credentials),
            },
        });
    }

    /**
     * Get violations from an ELD provider
     */
    async getViolations(
        providerId: string,
        credentials: ELDCredentials,
        params?: ELDQueryParams,
    ): Promise<ApiResponse<NormalizedELDResponse<ELDViolationData[]>>> {
        const queryString = params
            ? new URLSearchParams(
                  Object.entries(params)
                      .filter(([, value]) => value !== undefined)
                      .map(([key, value]) => [key, String(value)]),
              ).toString()
            : '';

        return this.request(`/${providerId}/violations${queryString ? `?${queryString}` : ''}`, {
            headers: {
                Authorization: this.createAuthHeader(credentials),
            },
        });
    }

    /**
     * Get current ELD connection for the carrier
     */
    async getConnection(): Promise<
        ApiResponse<{
            id: string;
            providerId: string;
            providerName: string;
            isActive: boolean;
            lastSyncAt: string | null;
            syncStatus: string;
            errorMessage: string | null;
            createdAt: string;
            updatedAt: string;
        } | null>
    > {
        return this.request('/connections');
    }

    /**
     * Create or update ELD connection
     */
    async createConnection(
        providerId: string,
        providerName: string,
        credentials: ELDCredentials,
    ): Promise<
        ApiResponse<{
            id: string;
            providerId: string;
            providerName: string;
            isActive: boolean;
            syncStatus: string;
            createdAt: string;
            updatedAt: string;
        }>
    > {
        return this.request('/connections', {
            method: 'POST',
            body: JSON.stringify({
                providerId,
                providerName,
                credentials,
            }),
        });
    }

    /**
     * Delete ELD connection
     */
    async deleteConnection(): Promise<ApiResponse<{ message: string }>> {
        return this.request('/connections', {
            method: 'DELETE',
        });
    }

    /**
     * Trigger manual sync
     */
    async triggerManualSync(): Promise<ApiResponse<{ message: string }>> {
        return this.request('/manual-sync', {
            method: 'POST',
        });
    }

    /**
     * Get sync status
     */
    async getSyncStatus(): Promise<
        ApiResponse<{
            status: string;
            lastSyncAt: string | null;
            errorMessage: string | null;
            nextSyncEstimate: string | null;
        }>
    > {
        return this.request('/manual-sync');
    }
}

/**
 * Singleton instance of ELD API Client
 */
let eldApiClientInstance: ELDApiClient | null = null;

/**
 * Get the singleton ELD API Client instance
 */
export function getELDApiClient(): ELDApiClient {
    if (!eldApiClientInstance) {
        eldApiClientInstance = new ELDApiClient();
    }
    return eldApiClientInstance;
}

/**
 * React hooks for ELD API operations
 */
export const useELDApi = () => {
    const client = getELDApiClient();

    return {
        testConnection: client.testConnection.bind(client),
        syncData: client.syncData.bind(client),
        getDrivers: client.getDrivers.bind(client),
        getVehicles: client.getVehicles.bind(client),
        getLogs: client.getLogs.bind(client),
        getViolations: client.getViolations.bind(client),
        getProviders: client.getProviders.bind(client),
        getConnection: client.getConnection.bind(client),
        createConnection: client.createConnection.bind(client),
        deleteConnection: client.deleteConnection.bind(client),
        triggerManualSync: client.triggerManualSync.bind(client),
        getSyncStatus: client.getSyncStatus.bind(client),
    };
};

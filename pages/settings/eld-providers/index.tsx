import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    Cog6ToothIcon,
    TrashIcon,
    ArrowPathIcon,
    LinkIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import {
    CheckCircleIcon as CheckCircleIconSolid,
    ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from '@heroicons/react/24/solid';
import type { ELDProvider, ELDCredentials } from '../../../interfaces/eld';
import ELDProviderCard from '../../../components/eld/ELDProviderCard';
import ELDConnectionModal from '../../../components/eld/ELDConnectionModal';
import SettingsLayout from '../../../components/layout/SettingsLayout';
import { PageWithAuth } from '../../../interfaces/auth';
//import { useELDApi } from '../../../lib/eld/ELDApiClient';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { notify } from '../../../components/Notification';

// Provider brand colors for consistent design
const getProviderBrandColor = (providerId: string) => {
    const colors = {
        samsara: 'bg-blue-500',
        motive: 'bg-green-500',
        geotab: 'bg-indigo-500',
        omnitracs: 'bg-purple-500',
        peoplenet: 'bg-orange-500',
        'fleet-complete': 'bg-teal-500',
    };
    return colors[providerId] || 'bg-gray-500';
};

// Available ELD providers with cleaner icons and descriptions
const availableELDProviders: ELDProvider[] = [
    {
        id: 'samsara',
        name: 'Samsara',
        logo: '',
        description: 'Complete fleet visibility and safety platform',
        isPopular: true,
        status: 'disconnected',
        website: 'https://cloud.samsara.com',
    },
    {
        id: 'motive',
        name: 'Motive',
        logo: '',
        description: 'AI-powered fleet management and compliance',
        isPopular: true,
        status: 'disconnected',
        website: 'https://gomotive.com',
    },
    {
        id: 'geotab',
        name: 'Geotab',
        logo: '',
        description: 'Advanced telematics and fleet analytics',
        isPopular: true,
        status: 'disconnected',
        website: 'https://geotab.com',
    },
    {
        id: 'omnitracs',
        name: 'Omnitracs',
        logo: '',
        description: 'Transportation management solutions',
        isPopular: true,
        status: 'disconnected',
        website: 'https://omnitracs.com',
    },
    {
        id: 'peoplenet',
        name: 'PeopleNet',
        logo: '',
        description: 'Connected fleet technology by Trimble',
        status: 'disconnected',
        website: 'https://peoplenet.com',
    },
    {
        id: 'fleet-complete',
        name: 'Fleet Complete',
        logo: '',
        description: 'Connected vehicle technology platform',
        status: 'disconnected',
        website: 'https://fleetcomplete.com',
    },
];

const ELDProvidersPage: PageWithAuth = () => {
    const [providers, setProviders] = useState<ELDProvider[]>(availableELDProviders);
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<ELDProvider | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentConnection, setCurrentConnection] = useState<any>(null);

    const eldApi = undefined; //useELDApi();

    // Load current connection on component mount
    useEffect(() => {
        loadCurrentConnection();
    }, []);

    const loadCurrentConnection = async () => {
        try {
            setLoading(true);
            const response = await eldApi?.getConnection();

            if (response.success && response.data) {
                setCurrentConnection(response.data);

                // Update providers list to show connected status
                setProviders((prev) =>
                    prev.map((provider) => ({
                        ...provider,
                        status:
                            provider.id === response.data.providerId
                                ? response.data.syncStatus === 'ERROR'
                                    ? 'error'
                                    : 'connected'
                                : 'disconnected',
                        lastSync:
                            provider.id === response.data.providerId
                                ? response.data.lastSyncAt
                                    ? formatLastSync(response.data.lastSyncAt)
                                    : 'Never'
                                : undefined,
                    })),
                );
            } else {
                // No connection found
                setCurrentConnection(null);
                setProviders((prev) =>
                    prev.map((provider) => ({
                        ...provider,
                        status: 'disconnected',
                        lastSync: undefined,
                    })),
                );
            }
        } catch (error) {
            console.error('Failed to load ELD connection:', error);
            notify({
                title: 'Error loading connection',
                message: 'Failed to load current ELD connection status',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const formatLastSync = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }
    };

    // Find the currently connected provider (only one allowed)
    const connectedProvider = providers.find((p) => p.status === 'connected' || p.status === 'error');
    const disconnectedProviders = providers.filter((p) => p.status === 'disconnected');

    const handleConnect = (provider: ELDProvider) => {
        setSelectedProvider(provider);
        setShowConnectionModal(true);
    };

    const handleConnectionSubmit = async (credentials: ELDCredentials): Promise<boolean> => {
        if (!selectedProvider) return false;

        try {
            const response = await eldApi?.createConnection(selectedProvider.id, selectedProvider.name, credentials);

            if (response.success) {
                notify({
                    title: 'Connection successful',
                    message: `Successfully connected to ${selectedProvider.name}`,
                    type: 'success',
                });

                // Reload connection status
                await loadCurrentConnection();
                return true;
            } else {
                notify({
                    title: 'Connection failed',
                    message: response.error || 'Failed to connect to provider',
                    type: 'error',
                });
                return false;
            }
        } catch (error) {
            console.error('Connection error:', error);
            notify({
                title: 'Connection error',
                message: 'An unexpected error occurred while connecting',
                type: 'error',
            });
            return false;
        }
    };

    const handleDisconnect = async (providerId: string) => {
        try {
            const response = await eldApi?.deleteConnection();

            if (response.success) {
                notify({
                    title: 'Disconnected successfully',
                    message: 'ELD provider has been disconnected',
                    type: 'success',
                });

                // Reload connection status
                await loadCurrentConnection();
            } else {
                notify({
                    title: 'Disconnect failed',
                    message: response.error || 'Failed to disconnect provider',
                    type: 'error',
                });
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            notify({
                title: 'Disconnect error',
                message: 'An unexpected error occurred while disconnecting',
                type: 'error',
            });
        }
    };

    const handleSettings = (providerId: string) => {
        // TODO: Implement settings modal/page for sync schedules, preferences, etc.
        notify({
            title: 'Settings',
            message: 'Provider settings will be available in a future update',
            type: 'success',
        });
        console.log('Opening settings for provider:', providerId);
    };

    const handleSync = async () => {
        if (!currentConnection) return;

        try {
            const response = await eldApi?.triggerManualSync();

            if (response.success) {
                notify({
                    title: 'Sync started',
                    message: 'Data synchronization has been initiated',
                    type: 'success',
                });

                // Reload connection status after a short delay
                setTimeout(() => {
                    loadCurrentConnection();
                }, 2000);
            } else {
                notify({
                    title: 'Sync failed',
                    message: response.error || 'Failed to start data synchronization',
                    type: 'error',
                });
            }
        } catch (error) {
            console.error('Sync error:', error);
            notify({
                title: 'Sync error',
                message: 'An unexpected error occurred while starting sync',
                type: 'error',
            });
        }
    };

    if (loading) {
        return (
            <SettingsLayout title="ELD Providers" maxWidth="4xl">
                <div className="relative min-h-[400px]">
                    <LoadingOverlay message="Loading ELD providers..." />
                </div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout title="ELD Providers" maxWidth="4xl">
            <>
                <Head>
                    <title>ELD Providers - CarrierNest</title>
                    <meta name="description" content="Connect and manage your ELD providers" />
                </Head>

                {/* Clean Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">ELD Providers</h1>
                    <p className="text-gray-600 text-base max-w-2xl">
                        Connect your Electronic Logging Device provider to automatically sync driver hours, vehicle
                        inspections, and compliance data.
                    </p>
                </div>

                {/* Connected Provider Status */}
                {connectedProvider && (
                    <div className="mb-8">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-green-200 flex items-center justify-center shadow-sm">
                                            <div
                                                className={`w-6 h-6 rounded-md ${getProviderBrandColor(
                                                    connectedProvider.id,
                                                )}`}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                                            {connectedProvider.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-3">{connectedProvider.description}</p>
                                        <div className="flex items-center space-x-2">
                                            {connectedProvider.status === 'error' ? (
                                                <ExclamationTriangleIconSolid className="h-4 w-4 text-amber-500" />
                                            ) : (
                                                <CheckCircleIconSolid className="h-4 w-4 text-green-500" />
                                            )}
                                            <span
                                                className={`text-sm font-medium ${
                                                    connectedProvider.status === 'error'
                                                        ? 'text-amber-700'
                                                        : 'text-green-700'
                                                }`}
                                            >
                                                {connectedProvider.status === 'error'
                                                    ? 'Connection Error'
                                                    : `Connected • Last sync: ${connectedProvider.lastSync || 'Never'}`}
                                            </span>
                                        </div>
                                        {connectedProvider.status === 'error' && currentConnection?.errorMessage && (
                                            <p className="text-sm text-amber-600 mt-2">
                                                {currentConnection.errorMessage}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleSync}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                                        Sync
                                    </button>
                                    <button
                                        onClick={() => handleSettings(connectedProvider.id)}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <Cog6ToothIcon className="h-4 w-4 mr-2" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => handleDisconnect(connectedProvider.id)}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No Provider Connected State */}
                {!connectedProvider && (
                    <div className="mb-8">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-white rounded-xl border border-blue-200 flex items-center justify-center shadow-sm">
                                        <LinkIcon className="h-6 w-6 text-blue-500" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                                        No ELD Provider Connected
                                    </h3>
                                    <p className="text-gray-600 max-w-lg">
                                        Connect an ELD provider to automatically sync driver hours, vehicle inspections,
                                        and ensure compliance with FMCSA regulations.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Available Providers */}
                <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                        {connectedProvider ? 'Switch Provider' : 'Available Providers'}
                    </h2>

                    {/* Popular Providers */}
                    <div className="mb-8">
                        <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                                Popular
                            </span>
                            Most used by carriers
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {disconnectedProviders
                                .filter((p) => p.isPopular)
                                .map((provider) => (
                                    <ELDProviderCard
                                        key={provider.id}
                                        provider={provider}
                                        onConnect={handleConnect}
                                        onDisconnect={handleDisconnect}
                                        onSettings={handleSettings}
                                        variant="card"
                                    />
                                ))}
                        </div>
                    </div>

                    {/* Other Providers */}
                    {disconnectedProviders.filter((p) => !p.isPopular).length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-4">Other Providers</h3>
                            <div className="space-y-3">
                                {disconnectedProviders
                                    .filter((p) => !p.isPopular)
                                    .map((provider) => (
                                        <ELDProviderCard
                                            key={provider.id}
                                            provider={provider}
                                            onConnect={handleConnect}
                                            onDisconnect={handleDisconnect}
                                            onSettings={handleSettings}
                                            variant="list"
                                        />
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Connection Modal */}
                {showConnectionModal && selectedProvider && (
                    <ELDConnectionModal
                        provider={selectedProvider}
                        onClose={() => {
                            setShowConnectionModal(false);
                            setSelectedProvider(null);
                        }}
                        onConnect={handleConnectionSubmit}
                    />
                )}
            </>
        </SettingsLayout>
    );
};

// Add authentication configuration
ELDProvidersPage.authenticationEnabled = true;

export default ELDProvidersPage;

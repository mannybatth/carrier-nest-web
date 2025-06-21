import React from 'react';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    Cog6ToothIcon,
    TrashIcon,
    ArrowTopRightOnSquareIcon,
    PlusIcon,
    LinkIcon,
} from '@heroicons/react/24/outline';
import {
    CheckCircleIcon as CheckCircleIconSolid,
    ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from '@heroicons/react/24/solid';
import type { ELDProvider } from '../../interfaces/eld';

interface ELDProviderCardProps {
    provider: ELDProvider;
    onConnect: (provider: ELDProvider) => void;
    onDisconnect: (providerId: string) => void;
    onSettings?: (providerId: string) => void;
    variant?: 'card' | 'list';
}

// Provider brand colors for clean minimal design
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

const ELDProviderCard: React.FC<ELDProviderCardProps> = ({
    provider,
    onConnect,
    onDisconnect,
    onSettings,
    variant = 'card',
}) => {
    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'connected':
                return <CheckCircleIconSolid className="h-4 w-4 text-green-500" />;
            case 'error':
                return <ExclamationTriangleIconSolid className="h-4 w-4 text-amber-500" />;
            default:
                return <div className="h-4 w-4 rounded-full bg-gray-300" />;
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case 'connected':
                return 'Connected';
            case 'error':
                return 'Connection Error';
            default:
                return 'Not Connected';
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'connected':
                return 'text-green-600';
            case 'error':
                return 'text-amber-600';
            default:
                return 'text-gray-500';
        }
    };

    // List variant - cleaner horizontal layout for "Other Providers"
    if (variant === 'list') {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                            <div
                                className={`w-10 h-10 rounded-lg ${getProviderBrandColor(
                                    provider.id,
                                )} flex items-center justify-center`}
                            >
                                <LinkIcon className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium text-gray-900 truncate">{provider.name}</h3>
                            <p className="text-sm text-gray-600 truncate">{provider.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                                {getStatusIcon(provider.status)}
                                <span className={`text-sm font-medium ${getStatusColor(provider.status)}`}>
                                    {getStatusText(provider.status)}
                                </span>
                                {provider.lastSync && (
                                    <span className="text-xs text-gray-400">• {provider.lastSync}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                        {provider.status === 'connected' ? (
                            <>
                                <button
                                    onClick={() => onSettings?.(provider.id)}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Cog6ToothIcon className="h-4 w-4 mr-2" />
                                    Settings
                                </button>
                                <button
                                    onClick={() => onDisconnect(provider.id)}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Remove
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => onConnect(provider)}
                                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                    provider.status === 'error'
                                        ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                        : 'text-white bg-blue-600 border-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                <PlusIcon className="h-4 w-4 mr-2" />
                                {provider.status === 'error' ? 'Reconnect' : 'Connect'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Card variant - clean vertical layout for "Popular Providers" grid
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div
                        className={`w-12 h-12 rounded-xl ${getProviderBrandColor(
                            provider.id,
                        )} flex items-center justify-center`}
                    >
                        <LinkIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-medium text-gray-900">{provider.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                            {getStatusIcon(provider.status)}
                            <span className={`text-sm font-medium ${getStatusColor(provider.status)}`}>
                                {getStatusText(provider.status)}
                            </span>
                        </div>
                    </div>
                </div>
                {provider.status === 'connected' && (
                    <button
                        onClick={() => onDisconnect(provider.id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Disconnect provider"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Description */}
            <div className="flex-1 mb-4">
                <p className="text-sm text-gray-600 leading-relaxed">{provider.description}</p>
            </div>

            {/* Last Sync Info */}
            {provider.lastSync && (
                <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">Last sync: {provider.lastSync}</p>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-2 mt-auto">
                {provider.status === 'connected' ? (
                    <>
                        <button
                            onClick={() => onSettings?.(provider.id)}
                            className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <Cog6ToothIcon className="h-4 w-4 mr-2" />
                            Settings
                        </button>
                        <button
                            onClick={() => window.open(provider.website, '_blank')}
                            className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                            Open Dashboard
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => onConnect(provider)}
                        className={`w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                            provider.status === 'error'
                                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                : 'text-white bg-blue-600 border-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {provider.status === 'error' ? 'Reconnect' : 'Connect'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ELDProviderCard;

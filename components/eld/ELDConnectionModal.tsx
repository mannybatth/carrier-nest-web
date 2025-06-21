import React, { useState } from 'react';
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    EyeSlashIcon,
    LinkIcon,
} from '@heroicons/react/24/outline';
import {
    CheckCircleIcon as CheckCircleIconSolid,
    ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from '@heroicons/react/24/solid';
import type { ELDProvider, ELDCredentials } from '../../interfaces/eld';
import { useELDApi } from '../../lib/eld/ELDApiClient';

interface ELDConnectionModalProps {
    provider: ELDProvider;
    onClose: () => void;
    onConnect: (credentials: ELDCredentials) => Promise<boolean>;
}

type ConnectionStep = 'credentials' | 'authenticating' | 'success' | 'error';

// Provider brand colors for consistency
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

const ELDConnectionModal: React.FC<ELDConnectionModalProps> = ({ provider, onClose, onConnect }) => {
    const [step, setStep] = useState<ConnectionStep>('credentials');
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [credentials, setCredentials] = useState<ELDCredentials>({
        apiKey: '',
        secretKey: '',
        serverUrl: '',
    });
    const [errorMessage, setErrorMessage] = useState('');
    const [connectionDetails, setConnectionDetails] = useState<any>(null);

    const eldApi = useELDApi();

    const handleConnect = async () => {
        if (!credentials.apiKey || !credentials.secretKey) {
            return;
        }

        setStep('authenticating');
        setErrorMessage('');

        try {
            // Test connection using the backend API
            const testResult = await eldApi.testConnection(provider.id, credentials);

            if (testResult.success && testResult.data?.success) {
                setConnectionDetails(testResult.data.details);
                setStep('success');

                // Call the parent onConnect handler
                const parentSuccess = await onConnect(credentials);

                if (parentSuccess) {
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                } else {
                    setStep('error');
                    setErrorMessage('Connection successful but failed to save configuration');
                }
            } else {
                setStep('error');
                setErrorMessage(testResult.data?.message || testResult.error || 'Connection failed');
            }
        } catch (error) {
            setStep('error');
            setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
        }
    };

    const handleRetry = () => {
        setStep('credentials');
        setErrorMessage('');
    };

    const getProviderSpecificFields = () => {
        // Return provider-specific credential fields
        switch (provider.id) {
            case 'samsara':
                return {
                    apiKeyLabel: 'API Token',
                    apiKeyPlaceholder: 'Enter your Samsara API token',
                    secretKeyLabel: 'Organization ID',
                    secretKeyPlaceholder: 'Enter your Organization ID',
                    showServerUrl: false,
                };
            case 'omnitracs':
                return {
                    apiKeyLabel: 'API Key',
                    apiKeyPlaceholder: 'Enter your Omnitracs API key',
                    secretKeyLabel: 'API Secret',
                    secretKeyPlaceholder: 'Enter your API secret',
                    showServerUrl: true,
                };
            case 'keeptruckin':
                return {
                    apiKeyLabel: 'Access Token',
                    apiKeyPlaceholder: 'Enter your Motive access token',
                    secretKeyLabel: 'Client Secret',
                    secretKeyPlaceholder: 'Enter your client secret',
                    showServerUrl: false,
                };
            default:
                return {
                    apiKeyLabel: 'API Key',
                    apiKeyPlaceholder: 'Enter your API key',
                    secretKeyLabel: 'Secret Key',
                    secretKeyPlaceholder: 'Enter your secret key',
                    showServerUrl: true,
                };
        }
    };

    const fieldConfig = getProviderSpecificFields();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div
                            className={`w-10 h-10 rounded-xl ${getProviderBrandColor(
                                provider.id,
                            )} flex items-center justify-center shadow-sm`}
                        >
                            <LinkIcon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Connect {provider.name}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {step === 'credentials' && (
                    <div className="space-y-5">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <p className="text-sm text-blue-800">
                                You'll need your {provider.name} API credentials to establish the connection.
                                {provider.website && (
                                    <span>
                                        {' '}
                                        Visit your{' '}
                                        <a
                                            href={provider.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium underline hover:text-blue-900 transition-colors"
                                        >
                                            {provider.name} dashboard
                                        </a>{' '}
                                        to get these credentials.
                                    </span>
                                )}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {fieldConfig.apiKeyLabel}
                            </label>
                            <input
                                type="text"
                                value={credentials.apiKey}
                                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                placeholder={fieldConfig.apiKeyPlaceholder}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {fieldConfig.secretKeyLabel}
                            </label>
                            <div className="relative">
                                <input
                                    type={showSecretKey ? 'text' : 'password'}
                                    value={credentials.secretKey}
                                    onChange={(e) => setCredentials({ ...credentials, secretKey: e.target.value })}
                                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                    placeholder={fieldConfig.secretKeyPlaceholder}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecretKey(!showSecretKey)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showSecretKey ? (
                                        <EyeSlashIcon className="h-4 w-4" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {fieldConfig.showServerUrl && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Server URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={credentials.serverUrl}
                                    onChange={(e) => setCredentials({ ...credentials, serverUrl: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                    placeholder="https://api.example.com"
                                />
                            </div>
                        )}

                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-start space-x-3">
                                    <ExclamationTriangleIconSolid className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{errorMessage}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-3 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnect}
                                disabled={!credentials.apiKey || !credentials.secretKey}
                                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                )}

                {step === 'authenticating' && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-700 font-medium">Connecting to {provider.name}...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-12">
                        <CheckCircleIconSolid className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">Successfully Connected!</p>
                        <p className="text-gray-600 mb-6">Your {provider.name} account is now connected and syncing.</p>

                        {connectionDetails && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
                                <h4 className="text-sm font-medium text-green-800 mb-3">Connection Details</h4>
                                <div className="space-y-2 text-sm text-green-700">
                                    <div className="flex justify-between">
                                        <span>Response Time:</span>
                                        <span className="font-medium">{connectionDetails.responseTime}ms</span>
                                    </div>
                                    {connectionDetails.apiVersion && (
                                        <div className="flex justify-between">
                                            <span>API Version:</span>
                                            <span className="font-medium">{connectionDetails.apiVersion}</span>
                                        </div>
                                    )}
                                    {connectionDetails.permissions && (
                                        <div className="flex justify-between">
                                            <span>Permissions:</span>
                                            <span className="font-medium">
                                                {connectionDetails.permissions.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'error' && (
                    <div className="text-center py-12">
                        <ExclamationTriangleIconSolid className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">Connection Failed</p>
                        <p className="text-gray-600 mb-6">
                            {errorMessage || 'Please check your credentials and try again.'}
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRetry}
                                className="flex-1 px-4 py-3 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ELDConnectionModal;

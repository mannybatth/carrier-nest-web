import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import SettingsLayout from '../../../components/layout/SettingsLayout';
import { Switch } from '@headlessui/react';
import {
    BellIcon,
    EnvelopeIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { PageWithAuth } from '../../../interfaces/auth';

interface NotificationPreference {
    id: string;
    type: string;
    enabled: boolean;
    emailEnabled: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
}

interface NotificationTypeConfig {
    type: string;
    title: string;
    description: string;
    note: string;
    category: string;
    icon: React.ComponentType<any>;
    iconColor: string;
    priority: 'high' | 'medium' | 'low';
}

const notificationTypes: NotificationTypeConfig[] = [
    // Assignment notifications
    {
        type: 'ASSIGNMENT_STARTED',
        title: 'Assignment Started',
        description: 'Driver begins a new assignment',
        note: 'Instant alerts when drivers start their routes to keep you informed of operations.',
        category: 'Assignments',
        icon: CheckCircleIcon,
        iconColor: 'text-green-500',
        priority: 'high',
    },
    {
        type: 'ASSIGNMENT_COMPLETED',
        title: 'Assignment Completed',
        description: 'Driver completes an assignment',
        note: 'Get notified immediately when deliveries are completed successfully.',
        category: 'Assignments',
        icon: CheckCircleIcon,
        iconColor: 'text-green-500',
        priority: 'high',
    },
    {
        type: 'ASSIGNMENT_UPDATED',
        title: 'Assignment Updated',
        description: 'Assignment details are modified',
        note: 'Stay informed when assignment details change, ensuring everyone is up to date.',
        category: 'Assignments',
        icon: InformationCircleIcon,
        iconColor: 'text-blue-500',
        priority: 'medium',
    },
    // Document notifications
    {
        type: 'DOCUMENT_UPLOADED',
        title: 'Document Uploaded',
        description: 'Driver uploads a document',
        note: 'Receive notifications when drivers submit required documents and paperwork.',
        category: 'Documents',
        icon: InformationCircleIcon,
        iconColor: 'text-blue-500',
        priority: 'medium',
    },
    {
        type: 'DOCUMENT_DELETED',
        title: 'Document Deleted',
        description: 'A document is removed from an assignment',
        note: 'Get notified when documents are deleted from assignments for compliance tracking.',
        category: 'Documents',
        icon: InformationCircleIcon,
        iconColor: 'text-red-500',
        priority: 'medium',
    },
    // Invoice notifications
    {
        type: 'INVOICE_APPROVED',
        title: 'Invoice Approved',
        description: 'Invoice is approved for payment',
        note: 'Get notified when invoices are approved and ready for payment processing.',
        category: 'Invoices',
        icon: CheckCircleIcon,
        iconColor: 'text-green-500',
        priority: 'high',
    },
];

const NotificationPreferences: PageWithAuth = () => {
    const { data: session } = useSession();
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Snackbar state
    const [snackbar, setSnackbar] = useState<{
        show: boolean;
        message: string;
        type: 'success' | 'error' | 'saving';
    }>({
        show: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        fetchPreferences();
    }, [session]);

    // Snackbar functions
    const showSnackbar = (message: string, type: 'success' | 'error' | 'saving') => {
        setSnackbar({ show: true, message, type });
        if (type !== 'saving') {
            setTimeout(() => {
                setSnackbar((prev) => ({ ...prev, show: false }));
            }, 3000);
        }
    };

    const hideSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, show: false }));
    };

    const fetchPreferences = async () => {
        if (!session?.user?.defaultCarrierId) {
            setLoading(false);
            return;
        }

        try {
            const url = `/api/notifications/preferences?carrierId=${session.user.defaultCarrierId}`;

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch preferences:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (type: string, field: keyof NotificationPreference, value: boolean) => {
        // Show saving snackbar immediately
        const fieldName = field === 'enabled' ? 'Push notifications' : 'Email notifications';
        const action = value ? 'enabled' : 'disabled';
        showSnackbar(`Saving ${fieldName.toLowerCase()}...`, 'saving');

        const updatedPreferences = preferences.map((pref) => (pref.type === type ? { ...pref, [field]: value } : pref));

        // If no preference exists for this type, create a new one
        if (!preferences.find((p) => p.type === type)) {
            updatedPreferences.push({
                id: '',
                type,
                enabled: field === 'enabled' ? value : false,
                emailEnabled: field === 'emailEnabled' ? value : false,
                smsEnabled: false,
                pushEnabled: field === 'pushEnabled' ? value : false,
            });
        }
        setPreferences(updatedPreferences);
        await savePreferences(updatedPreferences, `${fieldName} ${action}`);
    };

    const savePreferences = async (prefsToSave: NotificationPreference[], successMessage?: string) => {
        setSaving(true);
        setSaveStatus('saving');

        try {
            const payload = {
                preferences: prefsToSave,
                carrierId: session?.user?.defaultCarrierId,
            };

            const response = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
                setSaveStatus('saved');

                // Show success snackbar
                hideSnackbar();
                setTimeout(() => {
                    showSnackbar(successMessage || 'Preferences saved successfully', 'success');
                }, 100);

                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                const errorText = await response.text();
                console.error('Save failed:', response.status, errorText);
                setSaveStatus('error');
                hideSnackbar();
                setTimeout(() => {
                    showSnackbar('Failed to save preferences', 'error');
                }, 100);
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            setSaveStatus('error');
            hideSnackbar();
            setTimeout(() => {
                showSnackbar('Failed to save preferences', 'error');
            }, 100);
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setSaving(false);
        }
    };

    const getPreferenceForType = (type: string): NotificationPreference => {
        return (
            preferences.find((p) => p.type === type) || {
                id: '',
                type,
                enabled: false,
                emailEnabled: false,
                smsEnabled: false,
                pushEnabled: false,
            }
        );
    };

    const groupedTypes = notificationTypes.reduce((acc, type) => {
        if (!acc[type.category]) {
            acc[type.category] = [];
        }
        acc[type.category].push(type);
        return acc;
    }, {} as Record<string, NotificationTypeConfig[]>);

    if (loading) {
        return (
            <SettingsLayout title="Notification Preferences">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout title="Notifications">
            {/* Liquid Glass Background */}
            <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60">
                <div className="max-w-4xl mx-auto px-3 md:px-6 lg:px-8 py-6">
                    {/* Apple-style Header with Liquid Glass */}
                    <div className="mb-8 md:mb-10">
                        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-lg shadow-gray-200/50">
                            <div className="flex items-center mb-3">
                                <div className="relative">
                                    {/* Enhanced Bell Icon Container with improved shadows and gradients */}
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 rounded-2xl flex items-center justify-center mr-3 shadow-2xl shadow-blue-500/40 backdrop-blur-sm border border-blue-400/30 ring-1 ring-white/20">
                                        <BellIcon className="w-6 h-6 text-white drop-shadow-lg" />
                                    </div>
                                    {/* Subtle glow effect */}
                                    <div className="absolute inset-0 w-12 h-12 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-2xl blur-xl -z-10"></div>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                        Notifications
                                    </h1>
                                    <p className="text-gray-600 text-sm font-medium">Fleet Management Settings</p>
                                </div>
                            </div>
                            <p className="text-gray-600 text-base leading-relaxed max-w-2xl">
                                Customize how you receive notifications about assignments, documents, and fleet
                                activities. Configure push and email preferences for each notification type.
                            </p>
                        </div>
                    </div>

                    {/* Save Status with Liquid Glass styling */}
                    {(saveStatus !== 'idle' || saving) && (
                        <div className="mb-6">
                            <div
                                className={classNames(
                                    'px-4 py-3 rounded-xl backdrop-blur-xl text-sm font-semibold flex items-center shadow-lg border border-white/20',
                                    saving && 'bg-blue-500/20 backdrop-blur-xl text-blue-900 border-blue-200/30',
                                    saveStatus === 'saved' &&
                                        'bg-green-500/20 backdrop-blur-xl text-green-900 border-green-200/30',
                                    saveStatus === 'error' &&
                                        'bg-red-500/20 backdrop-blur-xl text-red-900 border-red-200/30',
                                )}
                            >
                                {saving && (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-3 flex-shrink-0"></div>
                                        <span>Saving your preferences...</span>
                                    </>
                                )}
                                {saveStatus === 'saved' && (
                                    <>
                                        <CheckCircleIcon className="h-5 w-5 md:h-6 md:w-6 mr-3 flex-shrink-0" />
                                        <span>Your preferences have been saved successfully</span>
                                    </>
                                )}
                                {saveStatus === 'error' && (
                                    <>
                                        <ExclamationTriangleIcon className="h-5 w-5 md:h-6 md:w-6 mr-3 flex-shrink-0" />
                                        <span>Unable to save preferences. Please try again.</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notification Categories with Liquid Glass */}
                    <div className="space-y-6">
                        {Object.entries(groupedTypes).map(([category, types]) => (
                            <div
                                key={category}
                                className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 overflow-hidden shadow-lg shadow-gray-200/40"
                            >
                                {/* Category Header with Glass Effect */}
                                <div className="px-6 py-4 bg-gradient-to-r from-gray-50/60 to-white/40 backdrop-blur-sm border-b border-white/20">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <h2 className="text-lg font-medium text-gray-900">{category}</h2>

                                        {/* Progress indicator with glass styling */}
                                        <div className="flex items-center">
                                            <div className="bg-white/50 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
                                                <span className="text-sm text-gray-700 font-semibold">
                                                    {
                                                        types.filter(
                                                            (type) =>
                                                                getPreferenceForType(type.type).enabled ||
                                                                getPreferenceForType(type.type).emailEnabled,
                                                        ).length
                                                    }{' '}
                                                    of {types.length} enabled
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notification Types with Enhanced Glass Design */}
                                <div className="divide-y divide-gray-200/40">
                                    {types.map((type, index) => {
                                        const preference = getPreferenceForType(type.type);
                                        const IconComponent = type.icon;

                                        return (
                                            <div
                                                key={type.type}
                                                className="px-6 py-5 hover:bg-white/40 hover:backdrop-blur-sm transition-all duration-300"
                                            >
                                                {/* Enhanced Layout with Glass Elements */}
                                                <div className="space-y-4">
                                                    {/* Header: Icon, Title, Description */}
                                                    <div className="flex items-start space-x-3">
                                                        {/* Enhanced Icon with Glass Effect */}
                                                        <div
                                                            className={classNames(
                                                                'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg',
                                                                type.priority === 'high' &&
                                                                    'bg-gradient-to-br from-emerald-400/30 to-emerald-500/40 shadow-emerald-200/50',
                                                                type.priority === 'medium' &&
                                                                    'bg-gradient-to-br from-blue-400/30 to-blue-500/40 shadow-blue-200/50',
                                                                type.priority === 'low' &&
                                                                    'bg-gradient-to-br from-gray-400/30 to-gray-500/40 shadow-gray-200/50',
                                                            )}
                                                        >
                                                            <IconComponent
                                                                className={classNames('w-5 h-5', type.iconColor)}
                                                            />
                                                        </div>

                                                        {/* Enhanced Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-base font-medium text-gray-900 leading-tight mb-1">
                                                                {type.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                                {type.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Glass Note Section */}
                                                    <div className="bg-white/50 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                                                        <p className="text-sm text-gray-600 leading-relaxed">
                                                            💡 {type.note}
                                                        </p>
                                                    </div>

                                                    {/* Enhanced Toggle Controls with Glass Design */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {/* Push Toggle with Glass Effect */}
                                                        <div className="flex items-center justify-between bg-blue-400/20 backdrop-blur-sm rounded-xl border border-blue-200/30 px-3 py-3 hover:bg-blue-400/30 transition-all duration-300 shadow-sm">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-6 h-6 bg-blue-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-blue-300/30">
                                                                    <BellIcon className="w-3 h-3 text-blue-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-sm font-medium text-gray-900 block leading-tight">
                                                                        Push Notifications
                                                                    </span>
                                                                    <span className="text-xs text-gray-600 leading-tight">
                                                                        Instant alerts
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Switch
                                                                checked={preference.enabled}
                                                                onChange={(value) =>
                                                                    updatePreference(type.type, 'enabled', value)
                                                                }
                                                                className={classNames(
                                                                    preference.enabled ? 'bg-blue-500' : 'bg-gray-300',
                                                                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                                                                )}
                                                            >
                                                                <span
                                                                    className={classNames(
                                                                        preference.enabled
                                                                            ? 'translate-x-5'
                                                                            : 'translate-x-0',
                                                                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                                                                    )}
                                                                />
                                                            </Switch>
                                                        </div>

                                                        {/* Email Toggle with Glass Effect */}
                                                        <div className="flex items-center justify-between bg-green-400/20 backdrop-blur-sm rounded-xl border border-green-200/30 px-3 py-3 hover:bg-green-400/30 transition-all duration-300 shadow-sm">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-6 h-6 bg-green-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-green-300/30">
                                                                    <EnvelopeIcon className="w-3 h-3 text-green-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-sm font-medium text-gray-900 block leading-tight">
                                                                        Email Notifications
                                                                    </span>
                                                                    <span className="text-xs text-gray-600 leading-tight">
                                                                        Detailed reports
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Switch
                                                                checked={preference.emailEnabled}
                                                                onChange={(value) =>
                                                                    updatePreference(type.type, 'emailEnabled', value)
                                                                }
                                                                className={classNames(
                                                                    preference.emailEnabled
                                                                        ? 'bg-green-500'
                                                                        : 'bg-gray-300',
                                                                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                                                                )}
                                                            >
                                                                <span
                                                                    className={classNames(
                                                                        preference.emailEnabled
                                                                            ? 'translate-x-5'
                                                                            : 'translate-x-0',
                                                                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                                                                    )}
                                                                />
                                                            </Switch>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Enhanced Footer Note with Liquid Glass */}
                    <div className="mt-6 bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg shadow-blue-200/30">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-blue-200/30">
                                <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-medium text-blue-900 mb-3">How Notifications Work</h3>
                                <div className="text-sm text-blue-800 leading-relaxed space-y-2">
                                    <div className="bg-white/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                                        <p>
                                            <strong className="text-blue-900">Push notifications</strong> appear
                                            instantly on your device and in the app for immediate awareness.
                                        </p>
                                    </div>
                                    <div className="bg-white/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                                        <p>
                                            <strong className="text-blue-900">Email notifications</strong> are sent to
                                            your registered email address with detailed information and context.
                                        </p>
                                    </div>
                                    <div className="bg-white/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                                        <p>
                                            <strong className="text-blue-900">Your preferences</strong> are saved
                                            automatically and apply across all your devices and platforms.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Apple-style Snackbar with Liquid Glass */}
            {snackbar.show && (
                <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-3 duration-500">
                    <div
                        className={classNames(
                            'flex items-center px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border border-white/20 max-w-sm mx-auto',
                            snackbar.type === 'saving' &&
                                'bg-blue-500/90 backdrop-blur-xl text-white shadow-blue-500/25',
                            snackbar.type === 'success' &&
                                'bg-green-500/90 backdrop-blur-xl text-white shadow-green-500/25',
                            snackbar.type === 'error' && 'bg-red-500/90 backdrop-blur-xl text-white shadow-red-500/25',
                        )}
                    >
                        {snackbar.type === 'saving' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 flex-shrink-0"></div>
                        )}
                        {snackbar.type === 'success' && <CheckCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />}
                        {snackbar.type === 'error' && (
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        )}
                        <span className="text-sm font-semibold leading-tight">{snackbar.message}</span>
                    </div>
                </div>
            )}
        </SettingsLayout>
    );
};

// Add authentication configuration
NotificationPreferences.authenticationEnabled = true;

export default NotificationPreferences;

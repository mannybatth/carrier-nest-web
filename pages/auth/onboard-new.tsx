import {
    XCircleIcon,
    TruckIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import type { NextPage } from 'next';
import { signIn } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appUrl } from 'lib/constants';

type InvitationData = {
    email: string;
    carrierName: string;
    inviterName: string;
    role: string;
    expires: string;
};

type ValidationResponse = {
    valid: boolean;
    error?: string;
    invitation?: InvitationData;
};

type CompletionResponse = {
    success: boolean;
    error?: string;
    message?: string;
    user?: {
        id: string;
        name: string;
        email: string;
        hasAccount: boolean;
    };
};

type Props = {
    token: string | null;
};

const Onboard: NextPage<Props> = ({ token }: Props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);
    const [name, setName] = useState('');

    useEffect(() => {
        document.documentElement.classList.add('h-full');
        return () => {
            document.documentElement.classList.remove('h-full');
        };
    }, []);

    useEffect(() => {
        if (!token) {
            setError('Invalid invitation link');
            setLoading(false);
            return;
        }

        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const response = await fetch(`/api/team/invitation/validate?token=${token}`);
            const data: ValidationResponse = await response.json();

            if (data.valid && data.invitation) {
                setInvitation(data.invitation);
                setError(null);
            } else {
                setError(data.error || 'Invalid invitation');
            }
        } catch (err) {
            console.error('Error validating invitation:', err);
            setError('Failed to validate invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!name.trim()) {
            setError('Please enter your full name');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/team/invitation/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    name: name.trim(),
                }),
            });

            const data: CompletionResponse = await response.json();

            if (data.success) {
                setCompleted(true);
                // Auto-redirect to sign in after 3 seconds
                setTimeout(() => {
                    router.push('/auth/signin?callbackUrl=' + encodeURIComponent(appUrl));
                }, 3000);
            } else {
                setError(data.error || 'Failed to complete onboarding');
            }
        } catch (err) {
            console.error('Error completing onboarding:', err);
            setError('Failed to complete onboarding');
        } finally {
            setSubmitting(false);
        }
    };

    const formatExpiryTime = (expiresString: string) => {
        const expires = new Date(expiresString);
        const now = new Date();
        const diffMs = expires.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins <= 0) {
            return 'Expired';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} remaining`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} remaining`;
        }
    };

    const getRoleDisplayName = (role: string) => {
        const roleMap: Record<string, string> = {
            ADMIN: 'Administrator',
            DISPATCHER: 'Dispatcher',
            ACCOUNTING: 'Accounting',
            DRIVER: 'Driver',
        };
        return roleMap[role] || role;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Validating invitation...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center">
                    <div className="mb-6">
                        <div className="flex items-center justify-center">
                            <img
                                src="/logo_truck.svg"
                                alt="CarrierNest Logo"
                                className="w-[75px] mx-auto mb-4 md:w-[100px] md:mb-6 lg:w-[125px] lg:mb-8"
                            />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">CarrierNest</h1>
                    <p className="mt-2 text-sm text-gray-600">Complete your team invitation</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md mx-4">
                <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
                    {completed ? (
                        /* Success State */
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                                <CheckCircleIcon className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to the team!</h2>
                            <p className="text-gray-600 mb-6">
                                Your account has been successfully created. You can now sign in to access your
                                dashboard.
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Email:</span> {invitation?.email}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Company:</span> {invitation?.carrierName}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Role:</span>{' '}
                                    {invitation?.role ? getRoleDisplayName(invitation.role) : 'Team Member'}
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/auth/signin?callbackUrl=' + encodeURIComponent(appUrl))}
                                className="w-full flex justify-center items-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors duration-200"
                            >
                                Continue to Sign In
                                <ArrowRightIcon className="ml-2 w-4 h-4" />
                            </button>
                            <p className="text-xs text-gray-500 mt-4">Redirecting automatically in 3 seconds...</p>
                        </div>
                    ) : error ? (
                        /* Error State */
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
                                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                            <p className="text-gray-600 mb-6">
                                This invitation link may have expired or already been used. Please contact your team
                                administrator for a new invitation.
                            </p>
                            <div className="space-y-3">
                                <Link
                                    href="/auth/signin"
                                    className="w-full flex justify-center items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors duration-200"
                                >
                                    Sign In to Existing Account
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="w-full flex justify-center items-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors duration-200"
                                >
                                    Create New Account
                                    <ArrowRightIcon className="ml-2 w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ) : invitation ? (
                        /* Onboarding Form */
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Join {invitation.carrierName}</h2>
                            <p className="text-gray-600 mb-6">
                                You&apos;ve been invited by{' '}
                                <span className="font-medium">{invitation.inviterName}</span> to join their team as a{' '}
                                {getRoleDisplayName(invitation.role)}.
                            </p>

                            {/* Invitation Details */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <TruckIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <h3 className="text-sm font-medium text-blue-900 mb-2">Invitation Details</h3>
                                        <div className="space-y-1 text-sm text-blue-800">
                                            <p>
                                                <span className="font-medium">Company:</span> {invitation.carrierName}
                                            </p>
                                            <p>
                                                <span className="font-medium">Email:</span> {invitation.email}
                                            </p>
                                            <p>
                                                <span className="font-medium">Role:</span>{' '}
                                                {getRoleDisplayName(invitation.role)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Expires:</span>{' '}
                                                {formatExpiryTime(invitation.expires)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Onboarding Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:ring-orange-500 focus:ring-1 transition-colors duration-200"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        This will be displayed to your teammates
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !name.trim()}
                                    className="group relative flex w-full justify-center items-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    {submitting ? (
                                        <>
                                            <svg
                                                className="mr-2 w-4 h-4 text-white animate-spin"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Joining team...
                                        </>
                                    ) : (
                                        <>
                                            Join Team
                                            <ArrowRightIcon className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Help Text */}
                            <div className="mt-6 text-center">
                                <p className="text-xs text-gray-500">
                                    After joining, you&apos;ll receive an email to set up your account and password.
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { query } = context;
    const token = (query.token as string) || null;

    return {
        props: {
            token,
        },
    };
};

export default Onboard;

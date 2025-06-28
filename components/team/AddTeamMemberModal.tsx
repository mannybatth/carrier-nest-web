import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
    XMarkIcon,
    UserPlusIcon,
    EnvelopeIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { UserRole, getRoleLabel, getRoleDescription } from '../../interfaces/models';
import { checkEmailAvailability } from '../../lib/rest/team';
import { useDebounce } from '../../lib/debounce';

interface AddTeamMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; email: string; role?: UserRole; sendInvite: boolean }) => void;
}

interface FormData {
    name: string;
    email: string;
    role: UserRole;
    sendInvite: boolean;
}

interface EmailValidationState {
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
    canAdd: boolean;
    exists: boolean;
    isCurrentMember: boolean;
    hasAccount: boolean;
    hasThirdPartyAuth: boolean;
    authProviders: string[];
    otherCarriers: string[];
    associatedCarriers: string[];
    hasPendingInvitation: boolean;
    invitation?: {
        lastEmailSent: string;
        emailCount: number;
        canSendEmail: boolean;
        remainingCooldown: number;
        expires: string;
    };
}

const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [loading, setLoading] = useState(false);
    const [emailValidation, setEmailValidation] = useState<EmailValidationState>({
        isChecking: false,
        isValid: null,
        message: '',
        canAdd: true,
        exists: false,
        isCurrentMember: false,
        hasAccount: false,
        hasThirdPartyAuth: false,
        authProviders: [],
        otherCarriers: [],
        associatedCarriers: [],
        hasPendingInvitation: false,
        invitation: undefined,
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
    } = useForm<FormData>({
        defaultValues: {
            role: UserRole.DISPATCHER,
            sendInvite: true,
        },
    });

    const watchedEmail = watch('email');
    const debouncedEmail = useDebounce(watchedEmail, 500);

    // Email validation effect
    useEffect(() => {
        const validateEmail = async () => {
            if (!debouncedEmail || !debouncedEmail.includes('@')) {
                setEmailValidation({
                    isChecking: false,
                    isValid: null,
                    message: '',
                    canAdd: true,
                    exists: false,
                    isCurrentMember: false,
                    hasAccount: false,
                    hasThirdPartyAuth: false,
                    authProviders: [],
                    otherCarriers: [],
                    associatedCarriers: [],
                    hasPendingInvitation: false,
                    invitation: undefined,
                });
                return;
            }

            setEmailValidation((prev) => ({ ...prev, isChecking: true }));

            try {
                const result = await checkEmailAvailability(debouncedEmail);
                setEmailValidation({
                    isChecking: false,
                    isValid: result.canAdd,
                    message: result.message,
                    canAdd: result.canAdd,
                    exists: result.exists,
                    isCurrentMember: result.isCurrentMember || false,
                    hasAccount: result.hasAccount || false,
                    hasThirdPartyAuth: result.hasThirdPartyAuth || false,
                    authProviders: result.authProviders || [],
                    otherCarriers: result.otherCarriers || [],
                    associatedCarriers: result.associatedCarriers || [],
                    hasPendingInvitation: result.hasPendingInvitation || false,
                    invitation: result.invitation,
                });
            } catch (error) {
                setEmailValidation({
                    isChecking: false,
                    isValid: false,
                    message: 'Failed to validate email',
                    canAdd: false,
                    exists: false,
                    isCurrentMember: false,
                    hasAccount: false,
                    hasThirdPartyAuth: false,
                    authProviders: [],
                    otherCarriers: [],
                    associatedCarriers: [],
                    hasPendingInvitation: false,
                    invitation: undefined,
                });
            }
        };

        validateEmail();
    }, [debouncedEmail]);

    const handleFormSubmit = async (data: FormData) => {
        // Prevent submission if email validation failed
        if (!emailValidation.canAdd) {
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                name: data.name,
                email: data.email,
                role: data.role,
                sendInvite: data.sendInvite,
            });
            reset();
            setEmailValidation({
                isChecking: false,
                isValid: null,
                message: '',
                canAdd: true,
                exists: false,
                isCurrentMember: false,
                hasAccount: false,
                hasThirdPartyAuth: false,
                authProviders: [],
                otherCarriers: [],
                associatedCarriers: [],
                hasPendingInvitation: false,
                invitation: undefined,
            });
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        reset();
        setEmailValidation({
            isChecking: false,
            isValid: null,
            message: '',
            canAdd: true,
            exists: false,
            isCurrentMember: false,
            hasAccount: false,
            hasThirdPartyAuth: false,
            authProviders: [],
            otherCarriers: [],
            associatedCarriers: [],
            hasPendingInvitation: false,
            invitation: undefined,
        });
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle transition-all"
                                style={{
                                    boxShadow:
                                        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                            <UserPlusIcon className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <Dialog.Title
                                                as="h3"
                                                className="text-xl font-semibold text-gray-900 tracking-tight"
                                            >
                                                Add Team Member
                                            </Dialog.Title>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Invite someone to join your team
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        onClick={handleClose}
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                                    {/* Name Field */}
                                    <div>
                                        <label
                                            htmlFor="name"
                                            className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2"
                                        >
                                            Full Name
                                        </label>
                                        <input
                                            {...register('name', {
                                                required: 'Name is required',
                                                minLength: {
                                                    value: 2,
                                                    message: 'Name must be at least 2 characters',
                                                },
                                            })}
                                            type="text"
                                            id="name"
                                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                            placeholder="Enter full name"
                                        />
                                        {errors.name && (
                                            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                                        )}
                                    </div>

                                    {/* Email Field */}
                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2"
                                        >
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <input
                                                {...register('email', {
                                                    required: 'Email is required',
                                                    pattern: {
                                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                        message: 'Invalid email address',
                                                    },
                                                })}
                                                type="email"
                                                id="email"
                                                className={`w-full bg-gray-50 border-0 rounded-xl pl-12 pr-12 py-3 text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all ${
                                                    emailValidation.isValid === false
                                                        ? 'ring-2 ring-red-500/20 bg-red-50'
                                                        : emailValidation.isValid === true
                                                        ? 'ring-2 ring-green-500/20 bg-green-50'
                                                        : ''
                                                }`}
                                                placeholder="Enter email address"
                                            />
                                            {/* Validation Icon */}
                                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                                {emailValidation.isChecking ? (
                                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                ) : emailValidation.isValid === true ? (
                                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                                ) : emailValidation.isValid === false ? (
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Validation Messages */}
                                        {errors.email && (
                                            <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                                        )}

                                        {!errors.email && emailValidation.message && debouncedEmail && (
                                            <div
                                                className={`mt-2 p-3 rounded-lg ${
                                                    emailValidation.isCurrentMember
                                                        ? 'bg-red-50 border border-red-200'
                                                        : !emailValidation.canAdd
                                                        ? 'bg-red-50 border border-red-200'
                                                        : emailValidation.exists
                                                        ? 'bg-amber-50 border border-amber-200'
                                                        : 'bg-green-50 border border-green-200'
                                                }`}
                                            >
                                                <div className="flex items-start space-x-2">
                                                    {emailValidation.isCurrentMember ? (
                                                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                    ) : !emailValidation.canAdd ? (
                                                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                    ) : emailValidation.exists ? (
                                                        <InformationCircleIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                    ) : (
                                                        <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1">
                                                        <p
                                                            className={`text-sm font-medium ${
                                                                emailValidation.isCurrentMember
                                                                    ? 'text-red-700'
                                                                    : !emailValidation.canAdd
                                                                    ? 'text-red-700'
                                                                    : emailValidation.exists
                                                                    ? 'text-amber-700'
                                                                    : 'text-green-700'
                                                            }`}
                                                        >
                                                            {emailValidation.message}
                                                        </p>

                                                        {/* Third-party authentication info */}
                                                        {emailValidation.hasThirdPartyAuth &&
                                                            emailValidation.authProviders.length > 0 && (
                                                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                                                    <p className="text-xs font-medium text-blue-800">
                                                                        🔐 User can sign in with:{' '}
                                                                        {emailValidation.authProviders.join(', ')}
                                                                    </p>
                                                                    <p className="text-xs text-blue-600 mt-1">
                                                                        They can use their existing account to access
                                                                        your team.
                                                                    </p>
                                                                </div>
                                                            )}

                                                        {/* Pending invitation info */}
                                                        {emailValidation.hasPendingInvitation &&
                                                            emailValidation.invitation && (
                                                                <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                                                                    <p className="text-xs font-medium text-purple-800">
                                                                        📧 Invitation Status
                                                                    </p>
                                                                    <div className="text-xs text-purple-600 mt-1 space-y-1">
                                                                        <p>
                                                                            Last sent:{' '}
                                                                            {new Date(
                                                                                emailValidation.invitation.lastEmailSent,
                                                                            ).toLocaleString()}
                                                                        </p>
                                                                        <p>
                                                                            Email count:{' '}
                                                                            {emailValidation.invitation.emailCount}
                                                                        </p>
                                                                        {!emailValidation.invitation.canSendEmail && (
                                                                            <p className="text-red-600 font-medium">
                                                                                ⏱️ Wait{' '}
                                                                                {
                                                                                    emailValidation.invitation
                                                                                        .remainingCooldown
                                                                                }{' '}
                                                                                minute(s) to send another email
                                                                            </p>
                                                                        )}
                                                                        {emailValidation.invitation.canSendEmail && (
                                                                            <p className="text-green-600 font-medium">
                                                                                ✅ Ready to send another invitation
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {emailValidation.exists &&
                                                            emailValidation.canAdd &&
                                                            emailValidation.otherCarriers.length > 0 && (
                                                                <p className="text-xs text-amber-600 mt-1">
                                                                    This user will be added to your team and will have
                                                                    access to both carriers.
                                                                </p>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Role Field */}
                                    <div>
                                        <label
                                            htmlFor="role"
                                            className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2"
                                        >
                                            Role
                                        </label>
                                        <select
                                            {...register('role')}
                                            id="role"
                                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white appearance-none cursor-pointer transition-all"
                                        >
                                            <option value={UserRole.ADMIN}>{getRoleLabel(UserRole.ADMIN)}</option>
                                            <option value={UserRole.DISPATCHER}>
                                                {getRoleLabel(UserRole.DISPATCHER)}
                                            </option>
                                            <option value={UserRole.ACCOUNTING}>
                                                {getRoleLabel(UserRole.ACCOUNTING)}
                                            </option>
                                        </select>
                                        <p className="mt-2 text-xs text-gray-500">
                                            {getRoleDescription(watch('role'))}
                                        </p>
                                    </div>

                                    {/* Send Invite Section */}
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <div className="flex items-start space-x-3">
                                            <input
                                                {...register('sendInvite')}
                                                id="sendInvite"
                                                type="checkbox"
                                                className="mt-0.5 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500/20 focus:ring-2"
                                            />
                                            <div className="flex-1">
                                                <label
                                                    htmlFor="sendInvite"
                                                    className="text-sm font-medium text-gray-900"
                                                >
                                                    Send invitation email
                                                </label>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    An email will be sent to {watchedEmail || 'the provided email'} with
                                                    instructions to join your team.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-6">
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="flex-1 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={
                                                loading ||
                                                !emailValidation.canAdd ||
                                                emailValidation.isChecking ||
                                                (emailValidation.hasPendingInvitation &&
                                                    emailValidation.invitation &&
                                                    !emailValidation.invitation.canSendEmail &&
                                                    watch('sendInvite'))
                                            }
                                            className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                    Adding...
                                                </>
                                            ) : emailValidation.hasPendingInvitation &&
                                              emailValidation.invitation &&
                                              !emailValidation.invitation.canSendEmail &&
                                              watch('sendInvite') ? (
                                                <>⏱️ Wait {emailValidation.invitation.remainingCooldown}min</>
                                            ) : (
                                                <>
                                                    <UserPlusIcon className="w-4 h-4 mr-2" />
                                                    {emailValidation.exists ? 'Invite to Team' : 'Add Member'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AddTeamMemberModal;

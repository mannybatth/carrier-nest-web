import React, { useState } from 'react';
import {
    TrashIcon,
    UserCircleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    PaperAirplaneIcon,
    PencilIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { ExpandedUser, UserRole, getRoleDescription } from '../../interfaces/models';

interface TeamMembersCardProps {
    teamMembers: ExpandedUser[];
    loading: boolean;
    onDeleteMember: (memberId: string) => void;
    onRoleChange: (memberId: string, newRole: UserRole) => Promise<void>;
    onSendVerificationEmail: (memberEmail: string) => Promise<void>;
    onUpdateMember: (memberId: string, data: { name?: string; email?: string }) => Promise<void>;
    deletingMembers?: Set<string>;
}

const TeamMembersCard: React.FC<TeamMembersCardProps> = ({
    teamMembers,
    loading,
    onDeleteMember,
    onRoleChange,
    onSendVerificationEmail,
    onUpdateMember,
    deletingMembers = new Set(),
}) => {
    const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());
    const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
    const [editingNames, setEditingNames] = useState<Set<string>>(new Set());
    const [editingNameValues, setEditingNameValues] = useState<Record<string, string>>({});
    const [updatingNames, setUpdatingNames] = useState<Set<string>>(new Set());

    // Helper function to determine if a user is the original admin
    const isOriginalAdmin = (member: ExpandedUser) => {
        // Find all admin users in the team
        const adminUsers = teamMembers.filter((user) => user.role === UserRole.ADMIN || user.isSiteAdmin);

        // If this user is not an admin, they're not the original admin
        const memberIsAdmin = member.role === UserRole.ADMIN || member.isSiteAdmin;
        if (!memberIsAdmin) return false;

        // If there's only one admin, they're the original admin
        if (adminUsers.length === 1) return true;

        // Find the earliest admin (or earliest user if no specific admins)
        const sortedUsers = [...teamMembers].sort(
            (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
        );

        const sortedAdmins = adminUsers.sort(
            (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
        );

        const earliestAdmin = sortedAdmins[0];
        const firstUser = sortedUsers[0];

        return member.id === earliestAdmin?.id || (adminUsers.length === 0 && member.id === firstUser?.id);
    };

    const handleRoleChange = async (memberId: string, newRole: UserRole) => {
        setUpdatingRoles((prev) => new Set(prev).add(memberId));
        try {
            await onRoleChange(memberId, newRole);
        } finally {
            setUpdatingRoles((prev) => {
                const next = new Set(prev);
                next.delete(memberId);
                return next;
            });
        }
    };

    const handleSendVerificationEmail = async (memberEmail: string) => {
        setSendingEmails((prev) => new Set(prev).add(memberEmail));
        try {
            await onSendVerificationEmail(memberEmail);
        } finally {
            setSendingEmails((prev) => {
                const next = new Set(prev);
                next.delete(memberEmail);
                return next;
            });
        }
    };

    const startEditingName = (memberId: string, currentName: string) => {
        setEditingNames((prev) => new Set(prev).add(memberId));
        setEditingNameValues((prev) => ({ ...prev, [memberId]: currentName || '' }));
    };

    const cancelEditingName = (memberId: string) => {
        setEditingNames((prev) => {
            const next = new Set(prev);
            next.delete(memberId);
            return next;
        });
        setEditingNameValues((prev) => {
            const next = { ...prev };
            delete next[memberId];
            return next;
        });
    };

    const saveNameEdit = async (memberId: string) => {
        const newName = editingNameValues[memberId]?.trim();
        if (!newName) return;

        setUpdatingNames((prev) => new Set(prev).add(memberId));
        try {
            await onUpdateMember(memberId, { name: newName });
            cancelEditingName(memberId);
        } catch (error) {
            console.error('Error updating name:', error);
        } finally {
            setUpdatingNames((prev) => {
                const next = new Set(prev);
                next.delete(memberId);
                return next;
            });
        }
    };

    const handleNameKeyPress = (e: React.KeyboardEvent, memberId: string) => {
        if (e.key === 'Enter') {
            saveNameEdit(memberId);
        } else if (e.key === 'Escape') {
            cancelEditingName(memberId);
        }
    };

    const formatLastActivity = (member: ExpandedUser) => {
        const lastActivityDate = member.updatedAt;
        if (!lastActivityDate) return 'Never';

        const dateObj = typeof lastActivityDate === 'string' ? new Date(lastActivityDate) : lastActivityDate;
        const now = new Date();
        const diffInMs = now.getTime() - dateObj.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 5) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: diffInDays > 365 ? 'numeric' : undefined,
        });
    };

    const getUserStatus = (member: ExpandedUser) => {
        // Check if user has authentication accounts (they've actually signed up/signed in)
        const hasAccount = member.accounts && member.accounts.length > 0;

        // Check if user has emailVerified (the actual verification status)
        const isEmailVerified = member.emailVerified !== null && member.emailVerified !== undefined;

        // Check if user has a name (indicates they've completed onboarding form)
        const hasCompletedOnboarding = member.name && member.name.trim().length > 0;

        // A user is "Active" only if they have verified their email OR have third-party auth
        // Having a name alone doesn't make them active - they need to verify their email
        const isActive = isEmailVerified || hasAccount;

        // Different status based on verification state
        if (isActive) {
            return {
                label: 'Active',
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                dotColor: 'bg-green-500',
            };
        } else if (hasCompletedOnboarding) {
            return {
                label: 'Pending Verification',
                color: 'text-orange-600',
                bgColor: 'bg-orange-50',
                dotColor: 'bg-orange-500',
            };
        } else {
            return {
                label: 'Invited',
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
                dotColor: 'bg-amber-500',
            };
        }
    };

    const getUserRole = (member: ExpandedUser) => {
        if (member.role) return member.role as UserRole;
        return member.isSiteAdmin ? UserRole.ADMIN : UserRole.DISPATCHER;
    };

    const getRoleInfo = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN:
                return { label: 'Admin', color: 'text-blue-600', bgColor: 'bg-blue-50' };
            case UserRole.DISPATCHER:
                return { label: 'Dispatcher', color: 'text-green-600', bgColor: 'bg-green-50' };
            case UserRole.ACCOUNTING:
                return { label: 'Accounting', color: 'text-purple-600', bgColor: 'bg-purple-50' };
            default:
                return { label: 'User', color: 'text-gray-600', bgColor: 'bg-gray-50' };
        }
    };

    const getInitials = (name: string, email: string) => {
        if (name) {
            return name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        // If no name, use first letter of email
        return email ? email[0].toUpperCase() : 'U';
    };

    // Loading state - Clean skeleton with Apple design
    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
                        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}
                    >
                        {/* Header skeleton */}
                        <div className="flex items-start space-x-4 mb-6">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                                <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-3"></div>
                                <div className="flex space-x-2">
                                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                                </div>
                            </div>
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
                        </div>
                        {/* Content skeleton */}
                        <div className="space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-12 bg-gray-200 rounded-xl"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-12 bg-gray-200 rounded-xl"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (teamMembers.length === 0) {
        return (
            <div
                className="bg-white rounded-2xl border border-gray-100 p-16 text-center"
                style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}
            >
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No team members</h3>
                <p className="text-gray-500 text-base leading-relaxed max-w-md mx-auto">
                    Get started by adding your first team member. You can manage roles and permissions for each member.
                </p>
            </div>
        );
    }

    // Team member cards
    return (
        <div className="space-y-4">
            {teamMembers.map((member) => {
                const status = getUserStatus(member);
                const role = getUserRole(member);
                const roleInfo = getRoleInfo(role);

                return (
                    <div
                        key={member.id}
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:border-gray-200 hover:shadow-lg group"
                        style={{
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        {/* Main Card Content */}
                        <div className="p-6">
                            {/* Header Section - User Info */}
                            <div className="flex items-start space-x-4 mb-6">
                                {/* Avatar with Status Indicator */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-base ring-4 ring-white shadow-sm">
                                        {member.image ? (
                                            <img
                                                className="w-12 h-12 rounded-full object-cover"
                                                src={member.image}
                                                alt={member.name || member.email || 'User'}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    if (e.currentTarget.nextElementSibling) {
                                                        (
                                                            e.currentTarget.nextElementSibling as HTMLElement
                                                        ).style.display = 'flex';
                                                    }
                                                }}
                                            />
                                        ) : null}
                                        <span className={member.image ? 'hidden' : 'block'}>
                                            {getInitials(member.name || '', member.email || '')}
                                        </span>
                                    </div>
                                    {/* Status indicator */}
                                    <div
                                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${status.dotColor} shadow-sm`}
                                    ></div>
                                </div>

                                {/* User Details */}
                                <div className="flex-1 min-w-0">
                                    {/* Name Section */}
                                    <div className="mb-2">
                                        {editingNames.has(member.id!) ? (
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value={editingNameValues[member.id!] || ''}
                                                    onChange={(e) =>
                                                        setEditingNameValues((prev) => ({
                                                            ...prev,
                                                            [member.id!]: e.target.value,
                                                        }))
                                                    }
                                                    onKeyDown={(e) => handleNameKeyPress(e, member.id!)}
                                                    onBlur={() => {
                                                        if (editingNameValues[member.id!]?.trim()) {
                                                            saveNameEdit(member.id!);
                                                        } else {
                                                            cancelEditingName(member.id!);
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-2 text-base font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Enter name"
                                                    autoFocus
                                                    disabled={updatingNames.has(member.id!)}
                                                />
                                                <button
                                                    onClick={() => saveNameEdit(member.id!)}
                                                    disabled={
                                                        updatingNames.has(member.id!) ||
                                                        !editingNameValues[member.id!]?.trim()
                                                    }
                                                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                                    title="Save"
                                                >
                                                    {updatingNames.has(member.id!) ? (
                                                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => cancelEditingName(member.id!)}
                                                    disabled={updatingNames.has(member.id!)}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                                                    title="Cancel"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2 group/name">
                                                <h3
                                                    className={`text-base font-semibold leading-6 ${
                                                        member.name ? 'text-gray-900' : 'text-gray-400 italic'
                                                    }`}
                                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                                >
                                                    {member.name || 'Click to set name'}
                                                </h3>
                                                <button
                                                    onClick={() => startEditingName(member.id!, member.name || '')}
                                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-all opacity-0 group-hover/name:opacity-100 flex-shrink-0"
                                                    title="Edit name"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <p
                                        className="text-sm text-gray-500 mb-3 leading-5"
                                        style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                    >
                                        {member.email || 'No email'}
                                    </p>

                                    {/* Status and Badges */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}
                                        >
                                            {status.label}
                                        </span>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color} ${roleInfo.bgColor}`}
                                        >
                                            {roleInfo.label}
                                        </span>
                                        {isOriginalAdmin(member) && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Original Admin
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400 hidden sm:inline">
                                            • {formatLastActivity(member)}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions - Delete Button */}
                                <div className="flex-shrink-0">
                                    <button
                                        onClick={() => onDeleteMember(member.id!)}
                                        disabled={deletingMembers.has(member.id!) || isOriginalAdmin(member)}
                                        className={`p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed ${
                                            isOriginalAdmin(member)
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                        }`}
                                        title={
                                            isOriginalAdmin(member) ? 'Cannot remove original admin' : 'Remove member'
                                        }
                                    >
                                        {deletingMembers.has(member.id!) ? (
                                            <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                                        ) : (
                                            <TrashIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Role Management Section */}
                            <div className="space-y-4">
                                {/* Role Selector */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Role
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={role}
                                            onChange={(e) => handleRoleChange(member.id!, e.target.value as UserRole)}
                                            disabled={updatingRoles.has(member.id!) || isOriginalAdmin(member)}
                                            className={`w-full border-0 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 appearance-none transition-all ${
                                                isOriginalAdmin(member)
                                                    ? 'bg-gray-100 cursor-not-allowed'
                                                    : 'bg-gray-50 focus:bg-white hover:bg-gray-100'
                                            }`}
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            <option value={UserRole.ADMIN}>Admin</option>
                                            <option value={UserRole.DISPATCHER}>Dispatcher</option>
                                            <option value={UserRole.ACCOUNTING}>Accounting</option>
                                        </select>
                                        <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        {updatingRoles.has(member.id!) && (
                                            <div className="absolute right-11 top-1/2 transform -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                        {isOriginalAdmin(member)
                                            ? 'Original admin role cannot be changed'
                                            : getRoleDescription(role)}
                                    </p>
                                </div>

                                {/* Action Button */}
                                <div>
                                    {status.label === 'Invited' || status.label === 'Pending Verification' ? (
                                        <button
                                            onClick={() => handleSendVerificationEmail(member.email!)}
                                            disabled={sendingEmails.has(member.email!)}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                        >
                                            {sendingEmails.has(member.email!) ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 flex-shrink-0"></div>
                                                    <span>Sending...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PaperAirplaneIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                                    <span>
                                                        {status.label === 'Pending Verification'
                                                            ? 'Resend Verification'
                                                            : 'Send Verification'}
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-center px-4 py-3 bg-green-50 text-green-600 rounded-xl text-sm font-medium border border-green-100">
                                            <CheckCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                            <span>Verified & Active</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TeamMembersCard;

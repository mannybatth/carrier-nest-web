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

    // Loading state - Clean skeleton
    if (loading) {
        return (
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-xl p-5 animate-pulse border border-gray-100"
                        style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}
                    >
                        {/* Header skeleton */}
                        <div className="flex items-center space-x-4 mb-5">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                        {/* Content skeleton */}
                        <div className="space-y-4">
                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                            <div className="flex space-x-3">
                                <div className="h-9 bg-gray-200 rounded flex-1"></div>
                                <div className="h-9 bg-gray-200 rounded flex-1"></div>
                            </div>
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
                className="bg-white rounded-xl p-12 text-center border border-gray-100"
                style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}
            >
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
                    Get started by adding your first team member. You can manage roles and permissions for each member.
                </p>
            </div>
        );
    }

    // Team member cards
    return (
        <div className="space-y-6">
            {teamMembers.map((member) => {
                const status = getUserStatus(member);
                const role = getUserRole(member);
                const roleInfo = getRoleInfo(role);

                return (
                    <div
                        key={member.id}
                        className="bg-white rounded-xl p-5 group hover:scale-[1.005] transition-all duration-200 border border-gray-100"
                        style={
                            {
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                '--hover-shadow': '0 4px 12px rgba(0, 0, 0, 0.08)',
                            } as React.CSSProperties
                        }
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = 'var(--hover-shadow)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                        }}
                    >
                        {/* Header with user info */}
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                        {member.image ? (
                                            <img
                                                className="w-10 h-10 rounded-full object-cover"
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
                                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${status.dotColor}`}
                                    ></div>
                                </div>

                                {/* User details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            {editingNames.has(member.id!) ? (
                                                <div className="flex items-center space-x-2 flex-1">
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
                                                        className="flex-1 px-2 py-1 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                                        title="Cancel"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 group/name flex-1 min-w-0">
                                                    <h3
                                                        className={`font-medium truncate text-sm ${
                                                            member.name ? 'text-gray-900' : 'text-gray-400 italic'
                                                        }`}
                                                    >
                                                        {member.name || 'Click to set name'}
                                                    </h3>
                                                    <button
                                                        onClick={() => startEditingName(member.id!, member.name || '')}
                                                        className="p-0.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0"
                                                        title="Edit name"
                                                    >
                                                        <PencilIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bgColor} flex-shrink-0`}
                                        >
                                            {status.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mb-2">{member.email || 'No email'}</p>
                                    <div className="flex items-center space-x-2">
                                        <span
                                            className={`px-2 py-0.5 rounded-md text-xs font-medium ${roleInfo.color} ${roleInfo.bgColor}`}
                                        >
                                            {roleInfo.label}
                                        </span>
                                        <span className="text-xs text-gray-300">•</span>
                                        <span className="text-xs text-gray-400">{formatLastActivity(member)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Delete button */}
                            <button
                                onClick={() => onDeleteMember(member.id!)}
                                disabled={deletingMembers.has(member.id!) || isOriginalAdmin(member)}
                                className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                                    isOriginalAdmin(member)
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                }`}
                                title={isOriginalAdmin(member) ? 'Cannot remove original admin' : 'Remove member'}
                            >
                                {deletingMembers.has(member.id!) ? (
                                    <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                                ) : (
                                    <TrashIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Role selector */}
                        <div className="mb-5">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                Role
                                {isOriginalAdmin(member) && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Original Admin
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => handleRoleChange(member.id!, e.target.value as UserRole)}
                                    disabled={updatingRoles.has(member.id!) || isOriginalAdmin(member)}
                                    className={`w-full border-0 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 appearance-none ${
                                        isOriginalAdmin(member)
                                            ? 'bg-gray-100 cursor-not-allowed'
                                            : 'bg-gray-50 focus:bg-white'
                                    }`}
                                    style={{ backgroundImage: 'none' }}
                                >
                                    <option value={UserRole.ADMIN}>Admin</option>
                                    <option value={UserRole.DISPATCHER}>Dispatcher</option>
                                    <option value={UserRole.ACCOUNTING}>Accounting</option>
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                {updatingRoles.has(member.id!) && (
                                    <div className="absolute right-9 top-1/2 transform -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {isOriginalAdmin(member)
                                    ? 'Original admin role cannot be changed'
                                    : getRoleDescription(role)}
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {status.label === 'Invited' || status.label === 'Pending Verification' ? (
                                <button
                                    onClick={() => handleSendVerificationEmail(member.email!)}
                                    disabled={sendingEmails.has(member.email!)}
                                    className="flex-1 flex items-center justify-center px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sendingEmails.has(member.email!) ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                                            {status.label === 'Pending Verification'
                                                ? 'Resend Verification'
                                                : 'Send Verification'}
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="flex-1 flex items-center justify-center px-3 py-2.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
                                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                                    Verified
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TeamMembersCard;

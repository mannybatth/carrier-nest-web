'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Tab } from '@headlessui/react';
import { ChevronDownIcon, UserPlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import SettingsLayout from '../../../components/layout/SettingsLayout';
import { PageWithAuth } from '../../../interfaces/auth';
import TeamMembersCard from '../../../components/team/TeamMembersCard';
import AddTeamMemberModal from '../../../components/team/AddTeamMemberModal';
import { notify } from '../../../components/notifications/Notification';
import { Sort } from '../../../interfaces/table';
import { ExpandedUser, UserRole, getRoleLabel } from '../../../interfaces/models';
import { sortFromQuery } from '../../../lib/helpers/query';
import { useLocalStorage } from '../../../lib/useLocalStorage';
import {
    getAllTeamMembers,
    createTeamMember,
    deactivateTeamMember,
    reactivateTeamMember,
    getDeactivatedTeamMembers,
    updateTeamMember,
    sendVerificationEmail,
} from '../../../lib/rest/team';
import SimpleDialog from '../../../components/dialogs/SimpleDialog';

const TeamSettings: PageWithAuth = () => {
    const router = useRouter();
    const searchParams = new URLSearchParams(router.query as any);

    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 20;
    const offsetProp = Number(searchParams.get('offset')) || 0;

    // State management
    const [lastTeamTableLimit, setLastTeamTableLimit] = useLocalStorage('lastTeamTableLimit', limitProp);
    const [loading, setLoading] = useState(true);
    const [loadingDeactivated, setLoadingDeactivated] = useState(false);
    const [teamMembers, setTeamMembers] = useState<ExpandedUser[]>([]);
    const [deactivatedMembers, setDeactivatedMembers] = useState<ExpandedUser[]>([]);
    const [metadata, setMetadata] = useState<any>(null);
    const [showDeactivated, setShowDeactivated] = useState(false);

    // Modal and selection state
    const [showAddModal, setShowAddModal] = useState(false);
    const [openDeactivateConfirmation, setOpenDeactivateConfirmation] = useState(false);
    const [memberToDeactivate, setMemberToDeactivate] = useState<string | null>(null);
    const [deactivatingMember, setDeactivatingMember] = useState(false);
    const [deactivatingMembers, setDeactivatingMembers] = useState<Set<string>>(new Set());
    const [reactivatingMembers, setReactivatingMembers] = useState<Set<string>>(new Set());

    // Pagination state
    const [sort, setSort] = useState<Sort>(sortProps);
    const [limit, setLimit] = useState(limitProp);
    const [offset, setOffset] = useState(offsetProp);

    // Load team members on mount and when sort/pagination changes
    useEffect(() => {
        loadTeamMembers();
        if (showDeactivated) {
            loadDeactivatedMembers();
        }
    }, []);

    useEffect(() => {
        if (sort || limit || offset) {
            reloadTeamMembers({ sort, limit, offset });
        }
    }, [sort, limit, offset]);

    const loadTeamMembers = async () => {
        setLoading(true);
        try {
            const { teamMembers: members, metadata: meta } = await getAllTeamMembers({
                limit,
                offset,
                sort,
            });
            setTeamMembers(members);
            setMetadata(meta);
        } catch (error) {
            console.error('Error loading team members:', error);
            notify({ title: 'Error', message: 'Failed to load team members', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const loadDeactivatedMembers = async () => {
        setLoadingDeactivated(true);
        try {
            const { deactivatedUsers } = await getDeactivatedTeamMembers();
            setDeactivatedMembers(deactivatedUsers);
        } catch (error) {
            console.error('Error loading deactivated members:', error);
            notify({ title: 'Error', message: 'Failed to load deactivated members', type: 'error' });
        } finally {
            setLoadingDeactivated(false);
        }
    };

    const reloadTeamMembers = async ({ sort, limit, offset }: { sort?: Sort; limit: number; offset: number }) => {
        setLoading(true);

        try {
            const { teamMembers: members, metadata: meta } = await getAllTeamMembers({
                limit,
                offset,
                sort,
            });
            setTeamMembers(members);
            setMetadata(meta);
        } catch (error) {
            console.error('Error reloading team members:', error);
            notify({ title: 'Error', message: 'Failed to reload team members', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddTeamMember = async (memberData: {
        name: string;
        email: string;
        role?: UserRole;
        sendInvite: boolean;
    }) => {
        try {
            const result = await createTeamMember(memberData);

            // Handle different response scenarios
            if (result.pendingInvitation) {
                // User already has pending invitation
                notify({
                    title: 'Invitation Updated',
                    message: result.invitationSent
                        ? `Invitation email sent to ${memberData.email}. They have a pending invitation.`
                        : `User ${memberData.email} already has a pending invitation.`,
                    type: 'success',
                });
            } else if (result.teamMember && result.hasThirdPartyAuth) {
                // Existing user with third-party auth
                notify({
                    title: 'Team member invited',
                    message: `${
                        result.teamMember.name
                    } has been invited to join your team. They can sign in with ${result.authProviders?.join(' or ')}.`,
                    type: 'success',
                });
            } else if (result.teamMember) {
                // New team member added
                notify({
                    title: 'Team member added',
                    message: result.invitationSent
                        ? `${result.teamMember.name} has been added to your team and invited via email.`
                        : `${result.teamMember.name} has been added to your team.`,
                    type: 'success',
                });
            }

            // Show additional info about email timestamps if available
            if (result.lastEmailSent && result.emailCount && result.emailCount > 1) {
                setTimeout(() => {
                    notify({
                        title: 'Email History',
                        message: `This is email #${result.emailCount}. Last sent: ${new Date(
                            result.lastEmailSent,
                        ).toLocaleString()}`,
                        type: 'success',
                    });
                }, 2000);
            }

            setShowAddModal(false);
            reloadTeamMembers({ sort, limit, offset });
        } catch (error) {
            console.error('Error adding team member:', error);

            // Handle specific error types
            if (error.message.includes('wait') || error.message.includes('minute')) {
                notify({
                    title: 'Rate Limited',
                    message: error.message,
                    type: 'error',
                });
            } else if (error.message.includes('already a member')) {
                notify({
                    title: 'Already Member',
                    message: error.message,
                    type: 'success',
                });
            } else if (
                error.message.includes('already taken') ||
                error.message.includes('already associated with another carrier')
            ) {
                notify({
                    title: 'Email Already Taken',
                    message: error.message,
                    type: 'error',
                });
            } else {
                notify({
                    title: 'Error',
                    message: error.message || 'Failed to add team member',
                    type: 'error',
                });
            }
        }
    };

    const handleDeactivateTeamMember = async (memberId: string) => {
        setDeactivatingMember(true);
        setDeactivatingMembers((prev) => new Set(prev).add(memberId));
        try {
            const result = await deactivateTeamMember(memberId);
            notify({
                title: 'Team member deactivated',
                message: result.deactivated
                    ? 'Team member has been deactivated and removed from all carriers'
                    : 'Team member has been removed from this carrier',
            });
            setOpenDeactivateConfirmation(false);
            setMemberToDeactivate(null);
            reloadTeamMembers({ sort, limit, offset });
            if (showDeactivated) {
                loadDeactivatedMembers();
            }
        } catch (error) {
            console.error('Error deactivating team member:', error);
            notify({ title: 'Error', message: error.message || 'Failed to deactivate team member', type: 'error' });
        } finally {
            setDeactivatingMember(false);
            setDeactivatingMembers((prev) => {
                const next = new Set(prev);
                next.delete(memberId);
                return next;
            });
        }
    };

    const handleReactivateTeamMember = async (memberId: string) => {
        setReactivatingMembers((prev) => new Set(prev).add(memberId));
        try {
            await reactivateTeamMember(memberId);
            notify({
                title: 'Team member reactivated',
                message: 'Team member has been reactivated and added back to your team',
            });
            loadDeactivatedMembers();
            reloadTeamMembers({ sort, limit, offset });
        } catch (error) {
            console.error('Error reactivating team member:', error);
            notify({ title: 'Error', message: error.message || 'Failed to reactivate team member', type: 'error' });
        } finally {
            setReactivatingMembers((prev) => {
                const next = new Set(prev);
                next.delete(memberId);
                return next;
            });
        }
    };

    const handleRoleChange = async (memberId: string, newRole: UserRole) => {
        try {
            await updateTeamMember(memberId, { role: newRole });
            notify({
                title: 'Role updated',
                message: `Team member role has been changed to ${getRoleLabel(newRole)}`,
                type: 'success',
            });
            // Update the local state immediately for better UX
            setTeamMembers((prev) =>
                prev.map((member) => (member.id === memberId ? { ...member, role: newRole } : member)),
            );
        } catch (error) {
            console.error('Error updating team member role:', error);
            notify({ title: 'Error', message: error.message || 'Failed to update team member role', type: 'error' });
        }
    };

    const handleSendVerificationEmail = async (memberEmail: string) => {
        try {
            await sendVerificationEmail(memberEmail);
            notify({
                title: 'Verification email sent',
                message: `A verification email has been sent to ${memberEmail}`,
                type: 'success',
            });
        } catch (error) {
            console.error('Error sending verification email:', error);
            notify({
                title: 'Error',
                message: error.message || 'Failed to send verification email',
                type: 'error',
            });
        }
    };

    const handleUpdateMember = async (memberId: string, data: { name?: string; email?: string }) => {
        try {
            const updatedMember = await updateTeamMember(memberId, data);
            notify({
                title: 'Member updated',
                message: 'Team member has been updated successfully',
                type: 'success',
            });
            // Update the local state immediately for better UX
            setTeamMembers((prev) =>
                prev.map((member) => (member.id === memberId ? { ...member, ...updatedMember } : member)),
            );
        } catch (error) {
            console.error('Error updating team member:', error);
            notify({
                title: 'Error',
                message: error.message || 'Failed to update team member',
                type: 'error',
            });
        }
    };

    const changeSort = (newSort: Sort) => {
        setSort(newSort);
        setOffset(0); // Reset to first page when sorting changes
    };

    const nextPage = () => {
        if (metadata?.next) {
            setLimit(metadata.next.limit);
            setOffset(metadata.next.offset);
        }
    };

    const previousPage = () => {
        if (metadata?.previous) {
            setLimit(metadata.previous.limit);
            setOffset(metadata.previous.offset);
        }
    };

    return (
        <SettingsLayout title="Team Management">
            <>
                {/* Add Team Member Modal */}
                <AddTeamMemberModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddTeamMember}
                />

                {/* Deactivate Confirmation Dialog */}
                <SimpleDialog
                    show={openDeactivateConfirmation}
                    title="Deactivate Team Member"
                    description="Are you sure you want to deactivate this team member? They will lose access to your carrier account, but their data will be preserved. You can reactivate them later."
                    primaryButtonText="Deactivate"
                    primaryButtonAction={() => {
                        if (memberToDeactivate) {
                            handleDeactivateTeamMember(memberToDeactivate);
                        }
                    }}
                    secondaryButtonAction={() => {
                        setOpenDeactivateConfirmation(false);
                        setMemberToDeactivate(null);
                    }}
                    onClose={() => {
                        if (!deactivatingMember) {
                            setOpenDeactivateConfirmation(false);
                            setMemberToDeactivate(null);
                        }
                    }}
                    loading={deactivatingMember}
                    loadingText="Deactivating member..."
                />

                {/* Header Section - Clean and minimal */}
                <div className="mb-8">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Team Management</h1>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Manage your team members and their access to your carrier account.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Team Stats - Clean design without icons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="text-center space-y-2">
                            <p className="text-3xl font-bold text-gray-900">
                                {loading ? (
                                    <div className="w-10 h-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                                ) : (
                                    teamMembers.length + deactivatedMembers.length
                                )}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">Total Members</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="text-center space-y-2">
                            <p className="text-3xl font-bold text-green-600">
                                {loading ? (
                                    <div className="w-10 h-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                                ) : (
                                    teamMembers.filter((member) => {
                                        const hasAccount = member.accounts && member.accounts.length > 0;
                                        const isEmailVerified =
                                            member.emailVerified !== null && member.emailVerified !== undefined;
                                        return isEmailVerified || hasAccount;
                                    }).length
                                )}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">Active</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="text-center space-y-2">
                            <p className="text-3xl font-bold text-amber-600">
                                {loading ? (
                                    <div className="w-10 h-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                                ) : (
                                    teamMembers.filter((member) => {
                                        const hasAccount = member.accounts && member.accounts.length > 0;
                                        const isEmailVerified =
                                            member.emailVerified !== null && member.emailVerified !== undefined;
                                        const isActive = isEmailVerified || hasAccount;
                                        return !isActive;
                                    }).length
                                )}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">Pending</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="text-center space-y-2">
                            <p className="text-3xl font-bold text-red-600">{deactivatedMembers.length}</p>
                            <p className="text-sm text-gray-600 font-medium">Deactivated</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Section - Improved layout */}
                <div
                    className="bg-white rounded-2xl p-8 mb-6 border border-gray-200"
                    style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Quick Actions</h3>
                            <p className="text-gray-600 text-base leading-relaxed max-w-2xl">
                                Add new team members to your carrier account. Invite colleagues to collaborate and
                                manage access permissions.
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-lg whitespace-nowrap text-base"
                            >
                                <UserPlusIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                                Add New Member
                            </button>
                        </div>
                    </div>
                </div>

                {/* Subtle Tab Switch Section */}
                <div className="mb-8">
                    <Tab.Group
                        selectedIndex={showDeactivated ? 1 : 0}
                        onChange={(index) => {
                            const shouldShowDeactivated = index === 1;
                            setShowDeactivated(shouldShowDeactivated);
                            if (shouldShowDeactivated) {
                                loadDeactivatedMembers();
                            }
                        }}
                    >
                        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 max-w-md">
                            <Tab
                                className={({ selected }) =>
                                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 focus:outline-none ${
                                        selected
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                                    }`
                                }
                            >
                                Active Members
                            </Tab>
                            <Tab
                                className={({ selected }) =>
                                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 focus:outline-none ${
                                        selected
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                                    }`
                                }
                            >
                                Deactivated
                            </Tab>
                        </Tab.List>
                    </Tab.Group>
                </div>

                {/* Team Members */}
                <TeamMembersCard
                    teamMembers={showDeactivated ? deactivatedMembers : teamMembers}
                    loading={showDeactivated ? loadingDeactivated : loading}
                    onDeleteMember={(memberId) => {
                        setMemberToDeactivate(memberId);
                        setOpenDeactivateConfirmation(true);
                    }}
                    onReactivateMember={showDeactivated ? handleReactivateTeamMember : undefined}
                    onRoleChange={handleRoleChange}
                    onSendVerificationEmail={handleSendVerificationEmail}
                    onUpdateMember={handleUpdateMember}
                    deletingMembers={deactivatingMembers}
                    showDeactivated={showDeactivated}
                    reactivatingMembers={reactivatingMembers}
                />

                {/* Pagination - Clean and minimal */}
                {metadata && (metadata.previous || metadata.next) && (
                    <div
                        className="bg-white rounded-2xl p-6 mt-6"
                        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-900">{offset + 1}</span> to{' '}
                                <span className="font-medium text-gray-900">
                                    {Math.min(offset + limit, metadata.total)}
                                </span>{' '}
                                of <span className="font-medium text-gray-900">{metadata.total}</span> members
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={previousPage}
                                    disabled={!metadata.previous}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400 rounded-xl transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={nextPage}
                                    disabled={!metadata.next}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400 rounded-xl transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        </SettingsLayout>
    );
};

TeamSettings.authenticationEnabled = true;

export default TeamSettings;

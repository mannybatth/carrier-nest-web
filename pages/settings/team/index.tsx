'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import SettingsLayout from '../../../components/layout/SettingsLayout';
import { PageWithAuth } from '../../../interfaces/auth';
import TeamMembersCard from '../../../components/team/TeamMembersCard';
import AddTeamMemberModal from '../../../components/team/AddTeamMemberModal';
import { notify } from '../../../components/Notification';
import { Sort } from '../../../interfaces/table';
import { ExpandedUser, UserRole, getRoleLabel } from '../../../interfaces/models';
import { sortFromQuery } from '../../../lib/helpers/query';
import { useLocalStorage } from '../../../lib/useLocalStorage';
import {
    getAllTeamMembers,
    createTeamMember,
    deleteTeamMember,
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
    const [teamMembers, setTeamMembers] = useState<ExpandedUser[]>([]);
    const [metadata, setMetadata] = useState<any>(null);

    // Modal and selection state
    const [showAddModal, setShowAddModal] = useState(false);
    const [openDeleteConfirmation, setOpenDeleteConfirmation] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
    const [deletingMember, setDeletingMember] = useState(false);
    const [deletingMembers, setDeletingMembers] = useState<Set<string>>(new Set());

    // Pagination state
    const [sort, setSort] = useState<Sort>(sortProps);
    const [limit, setLimit] = useState(limitProp);
    const [offset, setOffset] = useState(offsetProp);

    // Load team members on mount and when sort/pagination changes
    useEffect(() => {
        loadTeamMembers();
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

    const handleDeleteTeamMember = async (memberId: string) => {
        setDeletingMember(true);
        setDeletingMembers((prev) => new Set(prev).add(memberId));
        try {
            await deleteTeamMember(memberId);
            notify({ title: 'Team member removed', message: 'Team member has been removed from your team' });
            setOpenDeleteConfirmation(false);
            setMemberToDelete(null);
            reloadTeamMembers({ sort, limit, offset });
        } catch (error) {
            console.error('Error deleting team member:', error);
            notify({ title: 'Error', message: error.message || 'Failed to remove team member', type: 'error' });
        } finally {
            setDeletingMember(false);
            setDeletingMembers((prev) => {
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

                {/* Delete Confirmation Dialog */}
                <SimpleDialog
                    show={openDeleteConfirmation}
                    title="Remove Team Member"
                    description="Are you sure you want to remove this team member? They will lose access to your carrier account."
                    primaryButtonText="Remove"
                    primaryButtonAction={() => {
                        if (memberToDelete) {
                            handleDeleteTeamMember(memberToDelete);
                        }
                    }}
                    secondaryButtonAction={() => {
                        setOpenDeleteConfirmation(false);
                        setMemberToDelete(null);
                    }}
                    onClose={() => {
                        if (!deletingMember) {
                            setOpenDeleteConfirmation(false);
                            setMemberToDelete(null);
                        }
                    }}
                    loading={deletingMember}
                    loadingText="Removing member..."
                />

                {/* Header Section - Clean and minimal */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Team</h1>
                            <p className="text-gray-500 leading-relaxed">
                                Manage your team members and their access to your carrier account.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        >
                            <UserPlusIcon className="w-5 h-5 mr-2" />
                            Add Member
                        </button>
                    </div>
                </div>

                {/* Team Stats - Apple-style metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                <UserPlusIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Members</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {loading ? (
                                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        teamMembers.length
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Active</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {loading ? (
                                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        teamMembers.filter((member) => {
                                            const hasAccount = member.accounts && member.accounts.length > 0;
                                            const hasCompletedOnboarding = member.name && member.name.trim().length > 0;
                                            return hasAccount || hasCompletedOnboarding;
                                        }).length
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Pending</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {loading ? (
                                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        teamMembers.filter((member) => {
                                            const hasAccount = member.accounts && member.accounts.length > 0;
                                            const hasCompletedOnboarding = member.name && member.name.trim().length > 0;
                                            return !hasAccount && !hasCompletedOnboarding;
                                        }).length
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Members */}
                <TeamMembersCard
                    teamMembers={teamMembers}
                    loading={loading}
                    onDeleteMember={(memberId) => {
                        setMemberToDelete(memberId);
                        setOpenDeleteConfirmation(true);
                    }}
                    onRoleChange={handleRoleChange}
                    onSendVerificationEmail={handleSendVerificationEmail}
                    onUpdateMember={handleUpdateMember}
                    deletingMembers={deletingMembers}
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

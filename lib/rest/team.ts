import { ExpandedUser, JSONResponse, UserRole } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import { apiUrl } from '../constants';

export interface GetTeamMembersParams {
    limit?: number;
    offset?: number;
    sort?: Sort;
}

export interface CreateTeamMemberData {
    name: string;
    email: string;
    role?: UserRole;
    sendInvite?: boolean;
}

export interface EmailStatusResponse {
    exists: boolean;
    canAdd: boolean;
    isCurrentMember?: boolean;
    hasAccount?: boolean;
    hasThirdPartyAuth?: boolean;
    authProviders?: string[];
    otherCarriers?: string[];
    associatedCarriers?: string[];
    hasPendingInvitation?: boolean;
    invitation?: {
        lastEmailSent: string;
        emailCount: number;
        canSendEmail: boolean;
        remainingCooldown: number;
        expires: string;
    };
    message: string;
}

export interface TeamMemberResponse {
    teamMember: ExpandedUser | null;
    invitationSent: boolean;
    lastEmailSent?: string;
    emailCount?: number;
    pendingInvitation?: boolean;
    hasThirdPartyAuth?: boolean;
    authProviders?: string[];
}

export const getAllTeamMembers = async (params: GetTeamMembersParams = {}) => {
    const { limit = 20, offset = 0, sort } = params;

    const searchParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
    });

    if (sort?.key) {
        searchParams.append('sortBy', sort.key);
        searchParams.append('sortDir', sort.order);
    }

    const response = await fetch(`${apiUrl}/team?${searchParams.toString()}`);
    const result: JSONResponse<{ teamMembers: ExpandedUser[]; metadata: any }> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data;
};

export const createTeamMember = async (memberData: CreateTeamMemberData): Promise<TeamMemberResponse> => {
    const response = await fetch(`${apiUrl}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
    });

    const result: JSONResponse<TeamMemberResponse> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data;
};

export const deleteTeamMember = async (memberId: string) => {
    const response = await fetch(`${apiUrl}/team/${memberId}`, {
        method: 'DELETE',
    });

    const result: JSONResponse<any> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data;
};

export const deactivateTeamMember = async (memberId: string) => {
    const response = await fetch(`${apiUrl}/team/${memberId}`, {
        method: 'DELETE',
    });

    const result: JSONResponse<any> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data;
};

export const reactivateTeamMember = async (memberId: string) => {
    const response = await fetch(`${apiUrl}/team/${memberId}/reactivate`, {
        method: 'POST',
    });

    const result: JSONResponse<any> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data;
};

export const getDeactivatedTeamMembers = async () => {
    const response = await fetch(`${apiUrl}/team/deactivated`);
    const result: JSONResponse<{ deactivatedUsers: ExpandedUser[]; count: number }> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data;
};

export const updateTeamMember = async (memberId: string, memberData: Partial<CreateTeamMemberData>) => {
    const response = await fetch(`${apiUrl}/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
    });

    const result: JSONResponse<{ teamMember: ExpandedUser }> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data.teamMember;
};

export const sendVerificationEmail = async (email: string) => {
    const response = await fetch(`${apiUrl}/team/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    const result: JSONResponse<any> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return true;
};

export const checkEmailAvailability = async (email: string): Promise<EmailStatusResponse> => {
    const response = await fetch(`${apiUrl}/team/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    const result: JSONResponse<EmailStatusResponse> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(', '));
    }

    return result.data;
};

export const checkEmailStatus = async (email: string) => {
    const response = await fetch(`${apiUrl}/team/check-email-status?email=${encodeURIComponent(email)}`);

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || 'Failed to check email status');
    }

    return result;
};

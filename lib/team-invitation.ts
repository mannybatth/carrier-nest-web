import crypto from 'crypto';

/**
 * Generate a secure random token for team invitations
 */
export function generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create an invitation URL with token
 */
export function createInvitationUrl(token: string, baseUrl: string): string {
    return `${baseUrl}/auth/onboard?token=${token}`;
}

/**
 * Validate token format
 */
export function isValidTokenFormat(token: string): boolean {
    return /^[a-f0-9]{64}$/.test(token);
}

/**
 * Check if invitation has expired
 */
export function isInvitationExpired(expires: Date): boolean {
    return new Date() > expires;
}

/**
 * Create expiration date (1 hour from now)
 */
export function createInvitationExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    return expiry;
}

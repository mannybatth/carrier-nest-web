import prisma from 'lib/prisma';
import NextAuth, { Session } from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Nodemailer from 'next-auth/providers/nodemailer';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import Twilio from 'twilio';
import { sendVerificationRequest } from 'lib/verification-request';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { AdapterUser } from 'next-auth/adapters';
import { JWT } from 'next-auth/jwt';
import { appUrl } from 'lib/constants';
import {
    checkPhoneVerificationRateLimit,
    incrementPhoneVerificationFailure,
    incrementPhoneVerificationAttempt,
} from 'lib/api/phone-verification-rate-limit';

// Environment validation
const requiredEnvVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error(`[AUTH] Missing required environment variables: ${missingEnvVars.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER || '+18883429736';

// Initialize Twilio client with error handling
let twilioClient: Twilio.Twilio;
try {
    twilioClient = Twilio(accountSid, authToken);
} catch (error) {
    console.error('[AUTH] Failed to initialize Twilio client:', error);
    throw new Error('Failed to initialize SMS service');
}

// Production-ready logging focused on critical events only
const logger = {
    error: (message: string, metadata: Record<string, any> = {}) => {
        console.error(`[AUTH:ERROR] ${message}`, metadata);
    },
    security: (message: string, metadata: Record<string, any> = {}) => {
        console.warn(`[AUTH:SECURITY] ${message}`, metadata);
    },
};

export const { auth, handlers, signIn, signOut } = NextAuth({
    // Production-ready configuration
    debug: process.env.NODE_ENV === 'development',
    trustHost: true,
    secret: process.env.NEXTAUTH_SECRET,

    // Security enhancements
    useSecureCookies: process.env.NODE_ENV === 'production',

    providers: [
        Nodemailer({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: process.env.EMAIL_SERVER_PORT,
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM,
            sendVerificationRequest({ identifier: email, url, provider: { server, from } }) {
                return sendVerificationRequest({
                    identifier: email,
                    url,
                    provider: { server, from },
                });
            },
            // maxAge: 24 * 60 * 60, // How long email links are valid for (default 24h)
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            redirectProxyUrl: `${appUrl}/api/auth`,
        }),
        MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            id: 'driver_auth',
            name: 'driver_auth',
            type: 'credentials',
            credentials: {
                phoneNumber: {
                    label: 'Phone number',
                    type: 'text',
                },
                carrierCode: {
                    label: 'Carrier code',
                    type: 'text',
                },
                code: {
                    label: 'Verification code',
                    type: 'text',
                },
            },
            async authorize(credentials) {
                const { phoneNumber, carrierCode, code } = credentials as {
                    phoneNumber: string;
                    carrierCode: string;
                    code: string;
                };

                // Simple rate limiting check using phone number as identifier
                // This is a simplified approach since NextAuth doesn't provide request context
                const rateKey = `phone_verify:${phoneNumber}`;

                // Check rate limit before processing (simplified check without IP)
                try {
                    const rateLimitResult = await checkPhoneVerificationRateLimit(
                        rateKey, // Use phone as identifier since we don't have IP in NextAuth context
                        phoneNumber,
                    );

                    if (!rateLimitResult.allowed) {
                        const reason = rateLimitResult.reason || 'Rate limit exceeded';
                        const blockedUntil = rateLimitResult.blockedUntil
                            ? new Date(rateLimitResult.blockedUntil).toLocaleTimeString()
                            : 'later';

                        logger.security('Rate limit exceeded - request blocked', {
                            phoneNumber,
                            reason,
                            blockedUntil,
                        });

                        // Immediately terminate the request with appropriate error message
                        if (rateLimitResult.reason === 'IP rate limit exceeded') {
                            throw new Error(
                                'Too many verification attempts from this location. Please wait before trying again.',
                            );
                        } else {
                            throw new Error('Too many attempts. Please try again later.');
                        }
                    }
                } catch (error) {
                    // If it's a rate limit error, re-throw it to terminate the request
                    if (
                        error.message.includes('Too many attempts') ||
                        error.message.includes('verification attempts')
                    ) {
                        throw error;
                    }
                    // Continue with authentication if rate limit check fails for other reasons
                }

                // Fetch the driver from your database using the phone number.
                const driver = await getDriverByPhoneNumber(phoneNumber, carrierCode);

                if (!driver) {
                    // If the driver is not found, log security event and throw error.
                    logger.security('Failed login attempt - driver not found', { phoneNumber, carrierCode });
                    throw new Error('Driver not found');
                }

                // Check if the driver is active before proceeding with authentication
                if (!driver.active) {
                    // Log security event for deactivated driver attempt
                    logger.security('Deactivated driver login attempt blocked', {
                        driverId: driver.id,
                        phoneNumber,
                    });
                    // For deactivated drivers, return null to trigger CredentialsSignin error
                    // This will redirect to signin page with proper error handling
                    return null;
                }

                // Remove verbose "successful verification" logging                // If no code is provided, it means the driver is requesting an SMS code.
                if (!code) {
                    const isDemoDriver = driver.email === 'demo@driver.com' && carrierCode === 'demo';
                    if (!isDemoDriver) {
                        // Double-check rate limit before sending SMS
                        try {
                            const smsRateLimitResult = await checkPhoneVerificationRateLimit(rateKey, phoneNumber);
                            if (!smsRateLimitResult.allowed) {
                                const reason = smsRateLimitResult.reason || 'Rate limit exceeded';
                                console.warn(
                                    `[DRIVER_AUTH] SMS SENDING BLOCKED - Rate limit exceeded for phone: ${phoneNumber}, Reason: ${reason}`,
                                );
                                throw new Error('Too many verification attempts. Please try again later.');
                            }
                        } catch (error) {
                            // If it's a rate limit error, re-throw it to terminate
                            if (
                                error.message.includes('Too many attempts') ||
                                error.message.includes('verification attempts')
                            ) {
                                throw error;
                            }
                            // Continue silently if rate limit check fails
                        }

                        // Track SMS sending attempt for IP rate limiting
                        try {
                            await incrementPhoneVerificationAttempt(rateKey, phoneNumber);
                        } catch (error) {
                            // Continue silently if tracking fails
                        }

                        const generatedCode = generateRandomCode();

                        // Use optimized SMS sending with retry logic
                        try {
                            await sendSmsWithRetry(phoneNumber, `Your login code is: ${generatedCode}`);

                            // Store the generated code only after successful SMS sending
                            await storeCodeForDriver(driver.id, generatedCode);
                        } catch (smsError) {
                            logger.error('Failed to send SMS verification code', {
                                driverId: driver.id,
                                phoneNumber,
                                error: smsError.message,
                            });
                            throw new Error('Failed to send verification code. Please try again.');
                        }
                    } else {
                        // Process login of demo driver without PIN verification
                        return {
                            id: driver.id,
                            driverId: driver.id,
                            phoneNumber: driver.phone,
                            carrierId: driver.carrierId,
                        };
                    }

                    // Notify the frontend that an SMS has been sent.
                    return {}; // No session is created yet.
                }

                // If a code is provided, verify it against the stored code in the database.
                const isValidCode = await verifyCodeForDriver(driver.id, code);

                if (!isValidCode) {
                    logger.security('Invalid verification code attempt', {
                        driverId: driver.id,
                        phoneNumber,
                    });

                    // Record failed verification attempt for rate limiting
                    try {
                        await incrementPhoneVerificationFailure(rateKey, phoneNumber);
                    } catch (error) {
                        logger.error('Failed to record verification failure', { phoneNumber, error: error.message });
                    }

                    throw new Error('Invalid code');
                }

                // Remove verbose success logging
                return { id: driver.id, driverId: driver.id, phoneNumber: driver.phone, carrierId: driver.carrierId };
            },
        }),
        Credentials({
            id: 'demo_login',
            name: 'demo_login',
            type: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
            },
            async authorize(credentials, req) {
                const { email } = credentials;
                if (email === 'demo@user.com') {
                    const user = await prisma.user.findFirst({
                        where: { email, defaultCarrier: { carrierCode: 'demo' } },
                    });
                    return user;
                }

                // For other emails, deny access
                return null;
            },
        }),
    ],
    adapter: PrismaAdapter(prisma),
    callbacks: {
        async jwt({ token, user, account, profile, trigger, session }) {
            // console.log('------------------');
            // console.log('callbacks jwt token:', token);
            // console.log('callbacks jwt user:', user);
            // console.log('callbacks jwt account:', account);
            // console.log('callbacks jwt profile:', profile);
            // console.log('callbacks jwt trigger:', trigger);
            // console.log('callbacks jwt session:', session);
            // console.log('------------------');

            if (user) {
                token.user = user as AuthUser;
                if (token.user.driverId) token.driverId = token.user.driverId; // Store the driver's ID in the JWT
                if (token.user.phoneNumber) token.phoneNumber = token.user.phoneNumber; // Store the driver's phone number in the JWT
                if (token.user.carrierId) token.carrierId = token.user.carrierId; // Store the driver's carrier ID in the JWT
            }

            if (trigger === 'update') {
                console.log('jwt trigger update');
                if (token.driverId) {
                    // For drivers, fetch from Driver table
                    const freshDriver = await prisma.driver.findUnique({
                        where: { id: token.user.id },
                    });
                    if (freshDriver) {
                        // Map driver to AuthUser format
                        token.user = {
                            id: freshDriver.id,
                            name: freshDriver.name,
                            email: freshDriver.email,
                            driverId: freshDriver.id,
                            phoneNumber: freshDriver.phone,
                            carrierId: freshDriver.carrierId,
                        } as AuthUser;
                    }
                } else {
                    // For regular users, fetch from User table
                    const freshUser = await prisma.user.findUnique({
                        where: { id: token.user.id },
                    });
                    if (freshUser) {
                        token.user = freshUser as AuthUser;
                    }
                }
            }

            // Check if user/driver is still active on every JWT refresh
            if (token.user?.id) {
                // Check if this is a driver authentication (has driverId)
                if (token.driverId) {
                    // For drivers, check the Driver table
                    const currentDriver = await prisma.driver.findUnique({
                        where: { id: token.user.id },
                        select: { active: true },
                    });

                    // If driver is deactivated, mark the token as invalid
                    if (!currentDriver || !currentDriver.active) {
                        console.log(`Driver ${token.user.id} is deactivated, marking token as invalid`);
                        token.isDeactivated = true;
                        token.error = 'ACCOUNT_DEACTIVATED';
                    } else {
                        // Remove any previous deactivation flags
                        delete token.isDeactivated;
                        delete token.error;
                    }
                } else {
                    // For regular users, check the User table
                    const currentUser = await prisma.user.findUnique({
                        where: { id: token.user.id },
                        select: { isActive: true, deactivatedAt: true },
                    });

                    // If user is deactivated, mark the token as invalid
                    if (!currentUser || !currentUser.isActive) {
                        console.log(`User ${token.user.id} is deactivated, marking token as invalid`);
                        token.isDeactivated = true;
                        token.error = 'ACCOUNT_DEACTIVATED';
                    } else {
                        // Remove any previous deactivation flags
                        delete token.isDeactivated;
                        delete token.error;
                    }
                }
            }

            return token;
        },
        async session({
            session,
            user,
            token,
            trigger,
        }: {
            session: Session;
            user: AdapterUser;
            token: JWT;
            trigger?: string;
        }) {
            // console.log('------------------');
            // console.log('callbacks session:', session);
            // console.log('callbacks session user:', user);
            // console.log('callbacks session token:', token);
            // console.log('------------------');

            if (trigger === 'update') {
                console.log('session trigger update');
            }

            // Check if token indicates deactivated user
            if (token.isDeactivated || token.error === 'ACCOUNT_DEACTIVATED') {
                console.log('Session callback: User is deactivated, returning null session');
                return null;
            }

            if (user) {
                session.user = user as AuthUser;
            } else if (token?.user) {
                session.user = token.user as AuthUser;
            }
            return session;
        },
        async signIn({ user, account, profile, email, credentials }) {
            // console.log('------------------');
            // console.log('callbacks signIn user:', user);
            // console.log('callbacks signIn account:', account);
            // console.log('callbacks signIn profile:', profile);
            // console.log('callbacks signIn email:', email);
            // console.log('callbacks signIn credentials:', credentials);
            // console.log('------------------');

            // Check if user account is deactivated during sign-in
            if (user?.id) {
                const currentUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { isActive: true, deactivatedAt: true },
                });

                if (currentUser && !currentUser.isActive) {
                    console.log(`Deactivated user ${user.id} attempted to sign in`);
                    // Return false to prevent sign-in and redirect to signin page with error
                    return '/auth/signin?error=ACCOUNT_DEACTIVATED';
                }
            }

            return true;
        },
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours for security
        updateAge: 4 * 60 * 60, // Update session every 4 hours
    },
    jwt: {
        maxAge: 24 * 60 * 60, // 24 hours matching session
    },
    events: {
        signIn: async ({ user, account, profile, isNewUser }) => {
            // console.log('------------------');
            // console.log('signIn user:', user);
            // console.log('signIn account:', account);
            // console.log('signIn profile:', profile);
            // console.log('signIn isNewUser:', isNewUser);
            // console.log('------------------');
        },
        signOut: async (message) => {
            // console.log('------------------');
            // console.log('signOut session:', session);
            // console.log('signOut token:', token);
            // console.log('------------------');
        },
        createUser: async ({ user }) => {
            // console.log('------------------');
            // console.log('createUser user:', user);
            // console.log('------------------');
        },
        updateUser: async ({ user }) => {
            // console.log('------------------');
            // console.log('updateUser user:', user);
            // console.log('------------------');
        },
        linkAccount: async ({ user, account }) => {
            // console.log('------------------');
            // console.log('linkAccount user:', user);
            // console.log('linkAccount account:', account);
            // console.log('------------------');
        },
        session: async ({ session, token }) => {
            // console.log('------------------');
            // console.log('session', session);
            // console.log('session token:', token);
            // console.log('------------------');
        },
    },
    pages: {
        signIn: '/auth/signin',
        verifyRequest: '/auth/verify-request',
        error: '/auth/error',
    },
    logger: {
        error(error) {
            // Handle CredentialsSignin errors with clean logging
            if (error.name === 'CredentialsSignin') {
                // Log clean driver authentication failures
                console.log(`[DRIVER_AUTH] Sign-in attempt failed - credentials rejected`);
                return;
            }
            // Log all other errors normally
            console.error(`[auth][error]`, error);
        },
        warn(code) {
            console.warn(`[auth][warn] ${code}`);
        },
        debug(code, metadata) {
            console.debug(`[auth][debug] ${code}`, metadata);
        },
    },
});

async function getDriverByPhoneNumber(phoneNumber: string, carrierCode: string) {
    try {
        const driver = await prisma.driver.findFirst({
            where: {
                phone: phoneNumber,
                carrier: {
                    carrierCode: carrierCode,
                },
            },
            select: {
                id: true,
                phone: true,
                email: true,
                active: true,
                carrierId: true,
                smsCode: true,
                smsCodeExpiry: true,
                carrier: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        return driver;
    } catch (error) {
        logger.error('Database error during driver lookup', { phoneNumber, carrierCode, error: error.message });
        throw new Error('Database error during authentication');
    }
}

function generateRandomCode(): string {
    // Use cryptographically secure random for production
    const crypto = require('crypto');
    const code = crypto.randomInt(100000, 999999).toString();
    return code;
}

async function storeCodeForDriver(driverId: string, code: string) {
    try {
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + 10); // Set to expire in 10 minutes

        const result = await prisma.driver.update({
            where: {
                id: driverId,
            },
            data: {
                smsCode: code,
                smsCodeExpiry: expirationTime,
            },
            select: {
                id: true,
                smsCodeExpiry: true,
            },
        });

        return result;
    } catch (error) {
        logger.error('Failed to store SMS code', { driverId, error: error.message });
        throw new Error('Failed to store verification code');
    }
}

async function verifyCodeForDriver(driverId: string, code: string): Promise<boolean> {
    try {
        // Fetch the driver's stored SMS code and its expiration time
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            select: {
                id: true,
                smsCode: true,
                smsCodeExpiry: true,
                email: true,
                carrier: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        if (!driver) {
            logger.error('Driver not found during code verification', { driverId });
            throw new Error('Driver not found');
        }

        // Add bypass for demo@driver.com - only log for security monitoring
        if (driver.email === 'demo@driver.com' && driver.carrier.email === 'demo@carrier.com') {
            return true;
        }

        if (!driver.smsCode || !driver.smsCodeExpiry) {
            return false;
        }

        const currentTime = new Date();
        const isExpired = currentTime > driver.smsCodeExpiry;

        if (isExpired) {
            // Clean up expired code
            await prisma.driver.update({
                where: { id: driverId },
                data: {
                    smsCode: null,
                    smsCodeExpiry: null,
                },
            });

            return false;
        }

        const isValidCode = driver.smsCode === code;

        if (isValidCode) {
            // Clear the code after successful verification
            await prisma.driver.update({
                where: { id: driverId },
                data: {
                    smsCode: null,
                    smsCodeExpiry: null,
                },
            });
        }

        return isValidCode;
    } catch (error) {
        logger.error('Database error during SMS code verification', { driverId, error: error.message });
        throw new Error('Failed to verify SMS code');
    }
}

// Optimized SMS sending with retry logic and better error handling
async function sendSmsWithRetry(phoneNumber: string, message: string, maxRetries = 3): Promise<void> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await twilioClient.messages.create({
                body: message,
                from: twilioFromNumber,
                to: phoneNumber,
            });

            // SMS sent successfully - only log failures and security events
            return;
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                // Exponential backoff: wait 1s, then 2s, then 4s
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    logger.error('SMS sending failed after all retries', {
        phoneNumber,
        maxRetries,
        error: lastError?.message,
    });
    throw new Error('Failed to send SMS after multiple attempts');
}

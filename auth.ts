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

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = Twilio(accountSid, authToken);

export const { auth, handlers, signIn, signOut } = NextAuth({
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

                // Fetch the driver from your database using the phone number.
                const driver = await getDriverByPhoneNumber(phoneNumber, carrierCode);

                if (!driver) {
                    // If the driver is not found, throw an error.
                    console.log(`[DRIVER_AUTH] Driver not found - Phone: ${phoneNumber}, Carrier: ${carrierCode}`);
                    throw new Error('Driver not found');
                }

                // Check if the driver is active before proceeding with authentication
                if (!driver.active) {
                    // Log clean message for deactivated driver attempt
                    console.log(
                        `[DRIVER_AUTH] Deactivated driver attempted sign-in - Driver ID: ${driver.id}, Phone: ${phoneNumber}`,
                    );
                    // For deactivated drivers, return null to trigger CredentialsSignin error
                    // This will redirect to signin page with proper error handling
                    return null;
                }

                // Log successful driver verification for active drivers
                console.log(`[DRIVER_AUTH] Active driver verified - Driver ID: ${driver.id}, Phone: ${phoneNumber}`);

                // If no code is provided, it means the driver is requesting an SMS code.
                if (!code) {
                    const isDemoDriver = driver.email === 'demo@driver.com' && carrierCode === 'demo';
                    if (!isDemoDriver) {
                        const generatedCode = generateRandomCode();

                        await twilioClient.messages.create({
                            body: `Your login code is: ${generatedCode}`,
                            from: '+18883429736',
                            to: phoneNumber,
                        });
                        // Store the generated code in the database linked to the driver's phone number
                        // with a short expiration time.
                        await storeCodeForDriver(driver.id, generatedCode);
                        console.log(
                            `[DRIVER_AUTH] SMS verification code sent - Driver ID: ${driver.id}, Phone: ${phoneNumber}`,
                        );
                    } else {
                        // Process login of demo driver without PIN verification
                        console.log(`[DRIVER_AUTH] Demo driver authenticated - Driver ID: ${driver.id}`);
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
                    console.log(
                        `[DRIVER_AUTH] Invalid verification code - Driver ID: ${driver.id}, Phone: ${phoneNumber}`,
                    );
                    throw new Error('Invalid code');
                }

                // If the code is valid, return the driver object which will be used to create a session.
                console.log(
                    `[DRIVER_AUTH] Driver authentication successful - Driver ID: ${driver.id}, Phone: ${phoneNumber}`,
                );
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    jwt: {
        maxAge: 6 * 30 * 24 * 60 * 60, // 180 days
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
    return await prisma.driver.findFirst({
        where: {
            phone: phoneNumber,
            carrier: {
                carrierCode: carrierCode,
            },
        },
    });
}

function generateRandomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeCodeForDriver(driverId: string, code: string) {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 10); // Set to expire in 10 minutes

    return await prisma.driver.update({
        where: {
            id: driverId,
        },
        data: {
            smsCode: code,
            smsCodeExpiry: expirationTime,
        },
    });
}

async function verifyCodeForDriver(driverId: string, code: string): Promise<boolean> {
    // Fetch the driver's stored SMS code and its expiration time
    const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: {
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
        throw new Error('Driver not found');
    }

    // Add bypass for demo@driver.com
    if (driver.email === 'demo@driver.com' && driver.carrier.email === 'demo@carrier.com') {
        return true;
    }

    // Check if the code matches and if it hasn't expired
    const currentTimestamp = new Date();
    if (driver.smsCode === code && driver.smsCodeExpiry > currentTimestamp) {
        return true;
    }

    return false;
}

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { User } from '@prisma/client';
import { NextApiHandler } from 'next';
import NextAuth, { NextAuthOptions, Session } from 'next-auth';
import { AdapterUser } from 'next-auth/adapters';
import { JWT } from 'next-auth/jwt';
import AzureADProvider from 'next-auth/providers/azure-ad';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '../../../lib/prisma';
import Twilio from 'twilio';
import { sendVerificationRequest } from './verification-request';

const authHandler: NextApiHandler = (req, res) => {
    try {
        return NextAuth(req, res, authOptions);
    } catch (error) {
        console.error('Error in authHandler:', error);
    }
};

export default authHandler;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = Twilio(accountSid, authToken);

export const authOptions: NextAuthOptions = {
    providers: [
        EmailProvider({
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
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        CredentialsProvider({
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
                const { phoneNumber, carrierCode, code } = credentials;

                // Fetch the driver from your database using the phone number.
                const driver = await getDriverByPhoneNumber(phoneNumber, carrierCode);

                if (!driver) {
                    // If the driver is not found, throw an error.
                    throw new Error('Driver not found');
                }

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
                    }

                    // Notify the frontend that an SMS has been sent.
                    return null; // No session is created yet.
                }

                // If a code is provided, verify it against the stored code in the database.
                const isValidCode = await verifyCodeForDriver(driver.id, code);

                if (!isValidCode) {
                    throw new Error('Invalid code');
                }

                // If the code is valid, return the driver object which will be used to create a session.
                return { id: driver.id, driverId: driver.id, phoneNumber: driver.phone, carrierId: driver.carrierId };
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
                token.driverId = (user as any).driverId; // Store the driver's ID in the JWT
                token.phoneNumber = (user as any).phoneNumber; // Store the driver's phone number in the JWT
                token.carrierId = (user as any).carrierId; // Store the driver's carrier ID in the JWT
            }

            return token;
        },
        async session({ session, user, token }: { session: Session; user: AdapterUser; token: JWT }) {
            // console.log('------------------');
            // console.log('callbacks session:', session);
            // console.log('callbacks session user:', user);
            // console.log('callbacks session token:', token);
            // console.log('------------------');
            if (user && session) {
                session.user = user as User;
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
            return true;
        },
    },
    session: {
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    jwt: {
        secret: process.env.JWT_SECRET,
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
        signOut: async ({ session, token }) => {
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
};

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

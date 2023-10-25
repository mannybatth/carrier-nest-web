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

const authHandler: NextApiHandler = (req, res) => NextAuth(req, res, authOptions);
export default authHandler;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = Twilio(accountSid, authToken);

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
            name: 'driver_login',
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
                    const generatedCode = generateRandomCode();
                    await client.messages.create({
                        body: `Your login code is: ${generatedCode}`,
                        from: '+18883429736',
                        to: phoneNumber,
                    });

                    // Store the generated code in the database linked to the driver's phone number
                    // with a short expiration time.
                    await storeCodeForDriver(driver.id, generatedCode);

                    // Notify the frontend that an SMS has been sent.
                    return null; // No session is created yet.
                }

                // If a code is provided, verify it against the stored code in the database.
                const isValidCode = await verifyCodeForDriver(driver.id, code);

                if (!isValidCode) {
                    throw new Error('Invalid code');
                }

                // If the code is valid, return the driver object which will be used to create a session.
                return { id: driver.id, phoneNumber: driver.phone };
            },
        }),
    ],
    adapter: PrismaAdapter(prisma),
    callbacks: {
        async session({ session, user, token }: { session: Session; user: AdapterUser; token: JWT }) {
            if (user && session) {
                session.user = user as User;
            }
            return session;
        },
    },
    session: {
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    events: {
        signIn: async ({ user, account, profile, isNewUser }) => {
            console.log('signIn user:', user);
            console.log('signIn account:', account);
            console.log('signIn profile:', profile);
            console.log('signIn isNewUser:', isNewUser);
        },
        signOut: async ({ session, token }) => {
            console.log('signOut session:', session);
            console.log('signOut token:', token);
        },
        createUser: async ({ user }) => {
            console.log('createUser user:', user);
        },
        updateUser: async ({ user }) => {
            console.log('updateUser user:', user);
        },
        linkAccount: async ({ user, account }) => {
            console.log('linkAccount user:', user);
            console.log('linkAccount account:', account);
        },
        session: async ({ session, token }) => {
            // console.log('session', session);
            // console.log('session token:', token);
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
    expirationTime.setMonth(expirationTime.getMonth() + 6); // Set to expire in 6 months

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
        },
    });

    if (!driver) {
        throw new Error('Driver not found');
    }

    // Check if the code matches and if it hasn't expired
    const currentTimestamp = new Date();
    if (driver.smsCode === code && driver.smsCodeExpiry > currentTimestamp) {
        return true;
    }

    return false;
}

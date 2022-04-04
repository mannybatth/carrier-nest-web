import { NextApiHandler } from 'next';
import NextAuth, { NextAuthOptions, Session } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '../../../lib/prisma';
import EmailProvider from 'next-auth/providers/email';
import { sendVerificationRequest } from './verification-request';
import { JWT } from 'next-auth/jwt';

const authHandler: NextApiHandler = (req, res) => NextAuth(req, res, options);
export default authHandler;

const options: NextAuthOptions = {
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
    ],
    adapter: PrismaAdapter(prisma),
    secret: process.env.SECRET,
    callbacks: {
        async session({ session, user, token }: { session: Session; user: any; token: JWT }) {
            if (user && session) {
                session.user = user;
            }
            return session;
        },
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
    },
};

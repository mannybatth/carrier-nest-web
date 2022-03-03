import { NextApiHandler } from 'next';
import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '../../../lib/prisma';
import EmailProvider from 'next-auth/providers/email';
import { sendVerificationRequest } from './verification-request';

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
    events: {
        signIn: async ({ req, user, event }) => {
            console.log('signIn', user);
            console.log('signIn', event);
        },
        signOut: async ({ req, user, event }) => {
            console.log('signOut', user);
            console.log('signOut', event);
        },
        createUser: async ({ req, user, event }) => {
            console.log('createUser', user);
            console.log('createUser', event);
        },
        updateUser: async ({ req, user, event }) => {
            console.log('updateUser', user);
            console.log('updateUser', event);
        },
        linkAccount: async ({ req, user, event }) => {
            console.log('linkAccount', user);
            console.log('linkAccount', event);
        },
        session: async ({ req, session, event }) => {
            console.log('session', session);
            console.log('session', event);
        },
    },
    // pages: {
    //     signIn: '/auth/signin',
    //     verifyRequest: '/auth/verify-request',
    // },
};

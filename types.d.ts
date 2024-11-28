import { User } from '@prisma/client';

export interface AuthUser extends User {
    driverId: string;
    phoneNumber: string;
    carrierId: string;
}

declare module 'next-auth' {
    interface Session {
        user?: AuthUser;
    }
}

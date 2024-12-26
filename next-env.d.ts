/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference types="next/navigation-types/compat/navigation" />
import type { User } from '@prisma/client';

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

export interface AuthUser extends User {
    driverId: string;
    phoneNumber: string;
    carrierId: string;
}

declare module 'next-auth/jwt' {
    interface JWT extends DefaultJWT {
        user: AuthUser;
    }
}

declare module 'next-auth' {
    interface Session {
        user?: AuthUser;
    }
}

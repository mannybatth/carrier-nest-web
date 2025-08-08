import type { User } from '@prisma/client';
import type { DefaultJWT } from 'next-auth/jwt';

declare global {
    interface AuthUser extends User {
        driverId: string;
        phoneNumber: string;
        carrierId: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT extends DefaultJWT {
        user: AuthUser;
        isDeactivated?: boolean;
        error?: string;
        driverId?: string;
        phoneNumber?: string;
        carrierId?: string;
    }
}

declare module 'next-auth' {
    interface Session {
        user?: AuthUser;
    }
}

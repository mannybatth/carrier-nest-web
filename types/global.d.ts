import type { User } from '@prisma/client';

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
    }
}

declare module 'next-auth' {
    interface Session {
        user?: AuthUser;
    }
}

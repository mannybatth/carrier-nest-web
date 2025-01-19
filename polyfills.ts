import { Prisma } from '@prisma/client';

// Configure Prisma Decimal serialization
Prisma.Decimal.prototype.toJSON = function () {
    return this.toNumber();
};

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

import { ChargeType, Prisma } from '@prisma/client';

export const calculateDriverPay = ({
    chargeType,
    chargeValue,
    distanceMiles,
    durationHours,
    loadRate,
    billedLoadRate,
}: {
    chargeType: ChargeType;
    chargeValue: Prisma.Decimal | number;
    distanceMiles: Prisma.Decimal | number;
    durationHours: Prisma.Decimal | number;
    loadRate: Prisma.Decimal | number;
    billedLoadRate?: Prisma.Decimal | number;
}) => {
    if (!chargeType || !chargeValue) return new Prisma.Decimal(0);

    const chargeValueDecimal = new Prisma.Decimal(chargeValue);

    if (chargeType === ChargeType.PER_MILE) {
        const distanceInMiles = new Prisma.Decimal(distanceMiles ?? 0);
        return distanceInMiles.mul(chargeValueDecimal).toNearest(0.01);
    } else if (chargeType === ChargeType.PER_HOUR) {
        const durationInHours = new Prisma.Decimal(durationHours ?? 0);
        return durationInHours.mul(chargeValueDecimal).toNearest(0.01);
    } else if (chargeType === ChargeType.FIXED_PAY) {
        return chargeValueDecimal;
    } else if (chargeType === ChargeType.PERCENTAGE_OF_LOAD) {
        // Use billedLoadRate if provided, otherwise use the standard loadRate
        const rate = new Prisma.Decimal(billedLoadRate ?? loadRate ?? 0);
        return rate.mul(chargeValueDecimal).div(100).toNearest(0.01);
    }
    return new Prisma.Decimal(0);
};

export const formatCurrency = (amount: number | Prisma.Decimal) => {
    return new Prisma.Decimal(amount).toNumber().toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

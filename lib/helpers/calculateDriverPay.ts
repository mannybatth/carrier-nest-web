import { ChargeType, Prisma } from '@prisma/client';

export const calculateDriverPay = ({
    chargeType,
    chargeValue,
    routeLegDistance,
    routeLegDuration,
    loadRate,
}: {
    chargeType: ChargeType;
    chargeValue: Prisma.Decimal | number;
    routeLegDistance: Prisma.Decimal | number;
    routeLegDuration: Prisma.Decimal | number;
    loadRate: Prisma.Decimal | number;
}) => {
    if (!chargeType || !chargeValue) return new Prisma.Decimal(0);

    const chargeValueDecimal = new Prisma.Decimal(chargeValue);

    if (chargeType === ChargeType.PER_MILE) {
        const distanceInMiles = new Prisma.Decimal(routeLegDistance ?? 0).div(1609.34);
        return distanceInMiles.mul(chargeValueDecimal).toNearest(0.01);
    } else if (chargeType === ChargeType.PER_HOUR) {
        const durationInHours = new Prisma.Decimal(routeLegDuration ?? 0).div(3600);
        return durationInHours.mul(chargeValueDecimal).toNearest(0.01);
    } else if (chargeType === ChargeType.FIXED_PAY) {
        return chargeValueDecimal;
    } else if (chargeType === ChargeType.PERCENTAGE_OF_LOAD) {
        const rate = new Prisma.Decimal(loadRate ?? 0);
        return rate.mul(chargeValueDecimal).div(100).toNearest(0.01);
    }
    return new Prisma.Decimal(0);
};

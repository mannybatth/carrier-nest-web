import { ChargeType } from '@prisma/client';

export function getChargeTypeLabel(chargeType: ChargeType): string {
    switch (chargeType) {
        case 'PER_MILE':
            return 'Per Mile';
        case 'PER_HOUR':
            return 'Per Hour';
        case 'FIXED_PAY':
            return 'Fixed Pay';
        case 'PERCENTAGE_OF_LOAD':
            return 'Percentage of Load';
        default:
            return 'Unknown';
    }
}

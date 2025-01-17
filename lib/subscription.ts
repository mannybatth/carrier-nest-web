import { Subscription, SubscriptionPlan } from '@prisma/client';

export const isProPlan = (subscription: Subscription | null) => {
    if (!subscription) {
        return false;
    }
    return subscription?.plan === SubscriptionPlan.PRO && subscription?.status === 'active';
};

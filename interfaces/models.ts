import { Prisma } from '@prisma/client';

const simpleLoad = Prisma.validator<Prisma.LoadArgs>()({
    select: { customerId: true, refNum: true, rate: true },
});
export type SimpleLoad = Prisma.LoadGetPayload<typeof simpleLoad>;

const simpleLoadStop = Prisma.validator<Prisma.LoadStopArgs>()({
    select: {
        type: true,
        name: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        date: true,
        time: true,
    },
});
export type SimpleLoadStop = Prisma.LoadStopGetPayload<typeof simpleLoadStop>;

export type LoadWithStops = SimpleLoad & {
    loadStops: SimpleLoadStop[];
};

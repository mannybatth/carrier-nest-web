import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create a basic subscription plan
    const basicPlan = await prisma.subscription.create({
        data: {
            stripeCustomerId: 'cus_basic',
            stripeSubscriptionId: 'sub_basic',
            plan: 'BASIC',
            status: 'active',
            carrier: {
                create: {
                    name: 'Demo Carrier',
                    email: 'demo@carrier.com',
                    street: '123 Demo Street',
                    city: 'Demo City',
                    state: 'DC',
                    zip: '12345',
                    country: 'USA',
                    carrierCode: 'demo',
                },
            },
        },
        include: {
            carrier: true,
        },
    });

    const demoCarrier = basicPlan.carrier;

    console.log(`Created demo carrier: ${demoCarrier.name}`);

    // Create a demo user
    const demoUser = await prisma.user.upsert({
        where: { email: 'demo@user.com' },
        update: {},
        create: {
            name: 'Demo User',
            email: 'demo@user.com',
            isSiteAdmin: false,
            defaultCarrierId: demoCarrier.id,
        },
    });

    console.log(`Created demo user: ${demoUser.name}`);

    // Connect carrier to user
    await prisma.user.update({
        where: {
            id: demoUser.id,
        },
        data: {
            defaultCarrierId: demoCarrier.id,
            carriers: {
                connect: {
                    id: demoCarrier.id,
                },
            },
        },
    });

    // Check if a demo driver with the specified phone and carrier already exists
    let demoDriver = await prisma.driver.findFirst({
        where: {
            phone: '1234567890',
            carrierId: demoCarrier.id,
        },
    });

    // If no driver exists with that phone and carrier, create a new one
    if (!demoDriver) {
        demoDriver = await prisma.driver.create({
            data: {
                name: 'Demo Driver',
                phone: '1234567890',
                email: 'demo@driver.com',
                carrierId: demoCarrier.id,
                smsCode: null, // Bypass OTP
                smsCodeExpiry: null, // Bypass OTP expiry
            },
        });
        console.log(`Created demo driver: ${demoDriver.name}`);
    } else {
        console.log(`Demo driver already exists for this carrier: ${demoDriver.name}`);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });

import { PrismaClient } from '@prisma/client';
import { seedExpenseCategories } from './seed-expense-categories';

const prisma = new PrismaClient();

async function main() {
    await prisma.$transaction(async (prisma) => {
        // Check if a demo carrier already exists
        let demoCarrier = await prisma.carrier.findUnique({
            where: { carrierCode: 'demo' },
        });

        // If no carrier exists with that code, create a new one
        if (!demoCarrier) {
            demoCarrier = await prisma.carrier.create({
                data: {
                    name: 'Demo Carrier',
                    email: 'demo@carrier.com',
                    street: '123 Demo Street',
                    city: 'Demo City',
                    state: 'DC',
                    zip: '12345',
                    country: 'USA',
                    carrierCode: 'demo',
                    subscription: {
                        create: {
                            plan: 'BASIC',
                            status: 'active',
                        },
                    },
                },
            });
            console.log(`Created demo carrier: ${demoCarrier.name}`);
        } else {
            console.log(`Demo carrier already exists: ${demoCarrier.name}`);
        }

        // Check if a demo user already exists
        let demoUser = await prisma.user.findUnique({
            where: { email: 'demo@user.com' },
        });

        // If no user exists with that email, create a new one
        if (!demoUser) {
            demoUser = await prisma.user.create({
                data: {
                    name: 'Demo User',
                    email: 'demo@user.com',
                    isSiteAdmin: false,
                    defaultCarrierId: demoCarrier.id,
                },
            });
            console.log(`Created demo user: ${demoUser.name}`);
        } else {
            console.log(`Demo user already exists: ${demoUser.name}`);
        }

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
    });

    // Seed expense categories
    await seedExpenseCategories();
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

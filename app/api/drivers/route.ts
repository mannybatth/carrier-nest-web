import { Driver } from '@prisma/client';
import { BASIC_PLAN_MAX_DRIVERS } from 'lib/constants';
import { isProPlan } from 'lib/subscription';
import { NextAuthRequest } from 'next-auth/lib';
import { NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { JSONResponse } from 'interfaces/models';
import { PaginationMetadata } from 'interfaces/table';
import { calcPaginationMetadata } from 'lib/pagination';
import Twilio from 'twilio';
import { send } from 'process';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = Twilio(accountSid, authToken);

const buildOrderBy = (sortBy: string, sortDir: string) => {
    if (sortBy && sortDir) {
        if (sortBy.includes('.')) {
            const split = sortBy.split('.');
            return {
                [split[0]]: {
                    [split[1]]: sortDir,
                },
            };
        }
        return { [sortBy]: sortDir };
    }
    return undefined;
};

export const GET = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await getDrivers({ req });
    return NextResponse.json(response, { status: response.code });
});

export const POST = auth(async (req: NextAuthRequest) => {
    if (!req.auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const session = req.auth;
        const carrierId = session.user.defaultCarrierId;

        const carrier = await prisma.carrier.findUnique({
            where: { id: carrierId },
            include: { subscription: true },
        });

        if (!carrier) {
            throw new Error('Carrier not found');
        }

        const driverCount = await prisma.driver.count({
            where: {
                carrierId,
                active: true, // Only count active drivers against subscription limit
            },
        });

        const maxDrivers =
            isProPlan(carrier.subscription) && carrier.subscription?.numberOfDrivers
                ? carrier.subscription.numberOfDrivers
                : BASIC_PLAN_MAX_DRIVERS;

        if (driverCount >= maxDrivers) {
            throw new Error('Max number of drivers limit reached');
        }

        // const driverData = (await req.json()) as Driver;
        const { driver: driverData, sendAppLinkSMS } = (await req.json()) as {
            driver: Driver;
            sendAppLinkSMS: boolean;
        };

        driverData.phone = driverData.phone?.trim();

        // Check if a driver with the same phone and carrierId already exists
        if (driverData.phone) {
            const existingDriver = await prisma.driver.findFirst({
                where: {
                    phone: driverData.phone,
                    carrierId: session.user.defaultCarrierId,
                },
            });

            // If the driver exists, return an error response
            if (existingDriver) {
                return NextResponse.json(
                    {
                        code: 409,
                        errors: [{ message: 'A driver with the given phone number already exists.' }],
                    },
                    { status: 409 },
                );
            }
        }

        const driver = await prisma.driver.create({
            data: {
                name: driverData.name,
                email: driverData.email || '',
                phone: driverData.phone || '',
                active: driverData.active !== undefined ? driverData.active : true,
                type: driverData.type || 'DRIVER',
                defaultChargeType: driverData.defaultChargeType || undefined,
                perMileRate: driverData.perMileRate,
                perHourRate: driverData.perHourRate,
                defaultFixedPay: driverData.defaultFixedPay,
                takeHomePercent: driverData.takeHomePercent,
                carrier: {
                    connect: {
                        id: session.user.defaultCarrierId,
                    },
                },
            },
        });

        sendAppLinkSMS && sendSmsNotifications(driver.name, carrier.name, driverData.phone);

        return NextResponse.json(
            {
                code: 200,
                data: { driver },
            },
            { status: 200 },
        );
    } catch (error) {
        console.log('driver post error', error);
        return NextResponse.json(
            {
                code: 400,
                errors: [{ message: error.message || JSON.stringify(error) }],
            },
            { status: 400 },
        );
    }
});

const getDrivers = async ({
    req,
}: {
    req: NextAuthRequest;
}): Promise<JSONResponse<{ drivers: Driver[]; metadata: PaginationMetadata }>> => {
    const session = req.auth;

    const sortBy = req.nextUrl.searchParams.get('sortBy') as string;
    const sortDir = (req.nextUrl.searchParams.get('sortDir') as string) || 'asc';
    const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';

    const limit =
        req.nextUrl.searchParams.get('limit') !== undefined ? Number(req.nextUrl.searchParams.get('limit')) : undefined;
    const offset =
        req.nextUrl.searchParams.get('offset') !== undefined
            ? Number(req.nextUrl.searchParams.get('offset'))
            : undefined;

    if (limit != null || offset != null) {
        if (limit == null || offset == null) {
            return {
                code: 400,
                errors: [{ message: 'Limit and Offset must be set together' }],
            };
        }

        if (isNaN(limit) || isNaN(offset)) {
            return {
                code: 400,
                errors: [{ message: 'Invalid limit or offset' }],
            };
        }
    }

    const whereClause = {
        carrierId: session.user.defaultCarrierId,
        ...(activeOnly ? { active: true } : {}),
    };

    const total = await prisma.driver.count({
        where: whereClause,
    });

    const metadata = calcPaginationMetadata({ total, limit, offset });

    const drivers = await prisma.driver.findMany({
        where: whereClause,
        ...(limit ? { take: limit } : { take: 10 }),
        ...(offset ? { skip: offset } : { skip: 0 }),
        orderBy: buildOrderBy(sortBy, sortDir) || {
            createdAt: 'desc',
        },
    });
    return {
        code: 200,
        data: { metadata, drivers },
    };
};

async function sendSmsNotifications(driverName: string, companyName: string, driverPhone: string) {
    const driverAppDownloadLink = 'https://apps.apple.com/us/app/carrier-nest/id6471352606';
    const textMessage = `Hi ${driverName},\n\nWelcome to ${companyName}! Download the driver app by clicking the following link ${driverAppDownloadLink}\n\nTo finish app setup, contact company once the app is installed. \n\nThank you! \n\nPlease ignore this message if it does not concern you.`;
    await client.messages.create({
        body: textMessage,
        from: '+18883429736',
        to: driverPhone,
    });
}

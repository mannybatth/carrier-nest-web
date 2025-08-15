import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CARRIER_ID = 'cmdxz2gki000iuluqlmko9m5k';
const TARGET_EXPENSE_COUNT = 250;

// Expense templates with category-specific data
const expenseTemplates = {
    'Diesel Fuel': {
        amounts: [380.5, 425.75, 467.25, 502.9, 435.8, 395.45, 478.3, 521.65],
        descriptions: [
            'Fuel stop at Pilot Travel Center, I-80 Nevada',
            'TA Travel Center fuel purchase - Route 95',
            "Love's truck stop fuel fill-up",
            'Flying J fuel purchase - Interstate route',
            'Shell truck stop diesel fill',
            'Speedway fuel station - highway route',
            "Casey's fuel purchase during delivery",
            'BP truck stop fuel - overnight location',
        ],
        paidBy: ['COMPANY', 'COMPANY', 'COMPANY', 'COMPANY', 'DRIVER'],
    },
    'DEF (Diesel Exhaust Fluid)': {
        amounts: [25.99, 29.5, 32.75, 27.8, 31.25],
        descriptions: [
            'DEF fluid refill at truck stop',
            'AdBlue purchase for emissions system',
            'DEF tank refill during maintenance',
            'Diesel exhaust fluid top-off',
            'DEF purchase at service station',
        ],
        paidBy: ['COMPANY', 'COMPANY', 'COMPANY'],
    },
    'Oil & Lubricants': {
        amounts: [89.99, 125.5, 95.75, 110.25, 78.9],
        descriptions: [
            'Engine oil change and filter replacement',
            'Transmission fluid service',
            'Differential oil change',
            'Hydraulic fluid replacement',
            'Engine oil top-off between services',
        ],
        paidBy: ['COMPANY', 'COMPANY', 'COMPANY'],
    },
    'Toll Fees': {
        amounts: [15.25, 25.8, 35.5, 45.2, 8.75, 12.5, 28.9],
        descriptions: [
            'Illinois Tollway charges for I-294 route',
            'Pennsylvania Turnpike toll fees',
            'New Jersey Turnpike toll charges',
            'Ohio Turnpike toll payment',
            'Indiana Toll Road fees',
            'Florida Turnpike toll charges',
            'New York Thruway toll fees',
        ],
        paidBy: ['DRIVER', 'DRIVER', 'COMPANY', 'DRIVER'],
    },
    'Parking Fees': {
        amounts: [15.0, 25.0, 30.0, 20.0, 12.5],
        descriptions: [
            'Overnight parking at customer facility',
            'Truck stop parking fee',
            'City parking meter charges',
            'Secure lot parking overnight',
            'Rest area parking fee',
        ],
        paidBy: ['COMPANY', 'DRIVER', 'DRIVER', 'COMPANY'],
    },
    'Tires & Tire Repair': {
        amounts: [1250.0, 890.5, 450.75, 125.0, 2100.0],
        descriptions: [
            'Front tire replacement - blowout on I-40',
            'Tire rotation and balancing service',
            'Emergency tire repair on highway',
            'Tire pressure monitoring system repair',
            'Complete tire set replacement',
        ],
        paidBy: ['COMPANY', 'COMPANY', 'COMPANY'],
    },
    'Routine Maintenance': {
        amounts: [350.0, 275.5, 425.75, 180.25, 520.0],
        descriptions: [
            'Scheduled maintenance service at 150K miles',
            'A-service maintenance check',
            'B-service comprehensive maintenance',
            'Pre-trip inspection and minor repairs',
            'Annual DOT inspection and maintenance',
        ],
        paidBy: ['COMPANY', 'COMPANY', 'COMPANY'],
    },
    'Roadside Assistance / Towing': {
        amounts: [275.0, 350.5, 425.75, 180.0, 520.25],
        descriptions: [
            'Emergency towing service - breakdown near Denver',
            'Roadside tire change assistance',
            'Jump start service - dead battery',
            'Emergency fuel delivery',
            'Towing to nearest repair facility',
        ],
        paidBy: ['COMPANY', 'COMPANY', 'COMPANY'],
    },
    'Lodging / Hotel': {
        amounts: [85.99, 95.5, 110.75, 125.0, 78.25],
        descriptions: [
            'Holiday Inn Express - forced rest due to HOS',
            'Motel 6 overnight stay',
            'La Quinta Inn truck parking',
            'Hampton Inn & Suites',
            'Best Western truck-friendly hotel',
        ],
        paidBy: ['DRIVER', 'DRIVER', 'COMPANY', 'DRIVER'],
    },
    Meals: {
        amounts: [25.5, 35.75, 18.25, 42.0, 28.9, 15.75],
        descriptions: [
            'Dinner at truck stop restaurant',
            'Breakfast at Dennys',
            'Lunch at roadside diner',
            'Fast food during delivery',
            'Restaurant meal during break',
            'Coffee and snacks',
        ],
        paidBy: ['DRIVER', 'DRIVER', 'DRIVER', 'DRIVER'],
    },
};

// Status distribution weights
const statusWeights = {
    APPROVED: 0.65, // 65%
    PENDING: 0.25, // 25%
    REJECTED: 0.1, // 10%
};

function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function getWeightedStatus(): 'APPROVED' | 'PENDING' | 'REJECTED' {
    const rand = Math.random();
    if (rand < statusWeights.APPROVED) return 'APPROVED';
    if (rand < statusWeights.APPROVED + statusWeights.PENDING) return 'PENDING';
    return 'REJECTED';
}

function generateExpenseVariation(template: any) {
    const amount = getRandomElement(template.amounts);
    const description = getRandomElement(template.descriptions);
    const paidBy = getRandomElement(template.paidBy);
    const status = getWeightedStatus();

    return {
        amount,
        description,
        paidBy,
        status,
    };
}

// Generate expenses dynamically
function generateExpenseData(): any[] {
    const expenses: any[] = [];
    const categoryNames = Object.keys(expenseTemplates);

    for (let i = 0; i < TARGET_EXPENSE_COUNT; i++) {
        const categoryName = getRandomElement(categoryNames);
        const template = expenseTemplates[categoryName];
        const variation = generateExpenseVariation(template);

        expenses.push({
            categoryName,
            amount: variation.amount,
            description: variation.description,
            status: variation.status,
            paidBy: variation.paidBy,
        });
    }

    return expenses;
}

const expenseData = generateExpenseData();

async function seedExpenseData() {
    console.log(`Starting expense data seeding for carrier: ${CARRIER_ID}`);

    try {
        // Verify the carrier exists
        const carrier = await prisma.carrier.findUnique({
            where: { id: CARRIER_ID },
            include: { users: true, drivers: true },
        });

        if (!carrier) {
            console.error(`Carrier with ID ${CARRIER_ID} not found`);
            return;
        }

        console.log(`Found carrier: ${carrier.name}`);

        // Get all available expense categories
        const categories = await prisma.expenseCategory.findMany({
            where: { isActive: true },
        });

        console.log(`Found ${categories.length} expense categories`);

        // Get users and drivers for this carrier
        const users = carrier.users;
        const drivers = carrier.drivers;

        if (users.length === 0) {
            console.error(` No users found for carrier ${CARRIER_ID}`);
            return;
        }

        console.log(` Found ${users.length} users and ${drivers.length} drivers`);

        // Delete existing expenses for this carrier (optional - for clean seeding)
        const existingExpenseCount = await prisma.expense.count({
            where: { carrierId: CARRIER_ID },
        });

        if (existingExpenseCount > 0) {
            console.log(` Deleting ${existingExpenseCount} existing expenses...`);
            await prisma.expense.deleteMany({
                where: { carrierId: CARRIER_ID },
            });
        }

        // Create expenses
        let createdCount = 0;
        const currentUser = users[0]; // Use first user as creator

        for (const expenseItem of expenseData) {
            // Find the category
            const category = categories.find((cat) => cat.name === expenseItem.categoryName);
            if (!category) {
                console.warn(`Category "${expenseItem.categoryName}" not found, skipping...`);
                continue;
            }

            // Randomly assign to driver or user (80% driver, 20% user)
            const isDriverExpense = Math.random() < 0.8;
            const assignedDriver =
                drivers.length > 0 && isDriverExpense ? drivers[Math.floor(Math.random() * drivers.length)] : null;

            // Create random dates within the last 30 days
            const daysAgo = Math.floor(Math.random() * 30);
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);

            const receiptDate = new Date(createdAt);
            receiptDate.setHours(receiptDate.getHours() - Math.floor(Math.random() * 24));

            const expenseData = {
                carrierId: CARRIER_ID,
                categoryId: category.id,
                amount: expenseItem.amount,
                description: expenseItem.description,
                approvalStatus: expenseItem.status as 'PENDING' | 'APPROVED' | 'REJECTED',
                paidBy: expenseItem.paidBy as 'COMPANY' | 'DRIVER',
                receiptDate: receiptDate,
                createdAt: createdAt,
                updatedAt: createdAt,
                createdById: currentUser.id,
                ...(assignedDriver && { driverId: assignedDriver.id }),
                ...(expenseItem.status === 'APPROVED' && {
                    approvedAt: createdAt,
                    approvedById: currentUser.id,
                }),
                ...(expenseItem.status === 'REJECTED' && {
                    rejectionReason: 'Does not meet company expense policy requirements',
                }),
            };

            await prisma.expense.create({
                data: expenseData,
            });

            createdCount++;
        }

        console.log(`Successfully created ${createdCount} expense records`);

        // Print summary
        const statusSummary = await prisma.expense.groupBy({
            by: ['approvalStatus'],
            where: { carrierId: CARRIER_ID },
            _count: { id: true },
        });

        console.log('Expense Status Summary:');
        statusSummary.forEach((status) => {
            console.log(`   ${status.approvalStatus}: ${status._count.id} expenses`);
        });

        const categorySummary = await prisma.expense.findMany({
            where: { carrierId: CARRIER_ID },
            include: { category: true },
            take: 5,
            orderBy: { amount: 'desc' },
        });

        console.log('Top 5 Expenses by Amount:');
        categorySummary.forEach((expense, index) => {
            console.log(`   ${index + 1}. $${expense.amount} - ${expense.category.name} (${expense.approvalStatus})`);
        });
    } catch (error) {
        console.error('Error seeding expense data:', error);
        throw error;
    }
}

async function main() {
    await seedExpenseData();
}

main()
    .then(async () => {
        console.log('Expense seeding completed successfully!');
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('Seeding failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const expenseCategories = [
    {
        group: 'Fuel & Fluids',
        items: [
            'Diesel Fuel',
            'Gasoline',
            'DEF (Diesel Exhaust Fluid)',
            'Oil & Lubricants',
            'Coolant / Antifreeze',
            'Washer Fluid',
        ],
    },
    {
        group: 'Tolls & Permits',
        items: [
            'Toll Fees',
            'Temporary Permits',
            'Overweight Permits',
            'Oversize Permits',
            'Trip Permits',
            'Parking Fees',
        ],
    },
    {
        group: 'Maintenance & Repairs',
        items: [
            'Routine Maintenance',
            'Tires & Tire Repair',
            'Brakes & Brake Pads',
            'Engine Repairs',
            'Transmission Repairs',
            'Trailer Repairs',
            'Electrical System Repairs',
            'Roadside Assistance / Towing',
        ],
    },
    {
        group: 'Compliance & Licensing',
        items: [
            'CDL License Fees',
            'DOT Physical',
            'Vehicle Registration',
            'Vehicle Inspection Fees',
            'Safety & Compliance Fees',
            'ELD / HOS System Fees',
            'Drug & Alcohol Testing',
        ],
    },
    {
        group: 'Travel & Lodging',
        items: ['Lodging / Hotel', 'Meals', 'Per Diem Allowance', 'Public Transportation / Ride Share'],
    },
    {
        group: 'Insurance',
        items: ['Truck Insurance', 'Trailer Insurance', 'Cargo Insurance', 'Health Insurance', "Workers' Compensation"],
    },
    {
        group: 'Communication & Technology',
        items: ['Cell Phone Bills', 'Internet / Wi-Fi Access', 'GPS Subscription', 'Dispatch Software Subscription'],
    },
    {
        group: 'Office & Administrative',
        items: ['Office Supplies', 'Printing & Copying', 'Postage & Shipping', 'Accounting Fees', 'Legal Fees'],
    },
    {
        group: 'Miscellaneous',
        items: [
            'Personal Advances to Driver',
            'Uniforms / Safety Gear (PPE)',
            'Training / Certification Fees',
            'Fines & Citations',
            'Other',
        ],
    },
];

export async function seedExpenseCategories() {
    try {
        // Clear existing categories
        await prisma.expenseCategory.deleteMany();

        // Create categories with proper display order
        let globalDisplayOrder = 0;

        for (const categoryGroup of expenseCategories) {
            for (let i = 0; i < categoryGroup.items.length; i++) {
                const categoryName = categoryGroup.items[i];

                await prisma.expenseCategory.create({
                    data: {
                        group: categoryGroup.group,
                        name: categoryName,
                        displayOrder: globalDisplayOrder,
                        isActive: true,
                    },
                });

                globalDisplayOrder++;
            }
        }
    } catch (error) {
        console.error('❌ Error seeding expense categories:', error);
        throw error;
    }
}

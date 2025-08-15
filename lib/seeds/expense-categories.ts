import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const expenseCategories = [
    // Fuel & Energy
    { group: 'Fuel & Energy', name: 'Diesel Fuel', displayOrder: 1 },
    { group: 'Fuel & Energy', name: 'Gasoline', displayOrder: 2 },
    { group: 'Fuel & Energy', name: 'DEF (Diesel Exhaust Fluid)', displayOrder: 3 },
    { group: 'Fuel & Energy', name: 'Fuel Cards/Station Fees', displayOrder: 4 },

    // Vehicle Maintenance
    { group: 'Vehicle Maintenance', name: 'Oil Changes', displayOrder: 1 },
    { group: 'Vehicle Maintenance', name: 'Tire Replacement/Repair', displayOrder: 2 },
    { group: 'Vehicle Maintenance', name: 'Brake Service', displayOrder: 3 },
    { group: 'Vehicle Maintenance', name: 'Engine Repair', displayOrder: 4 },
    { group: 'Vehicle Maintenance', name: 'Transmission Service', displayOrder: 5 },
    { group: 'Vehicle Maintenance', name: 'Annual Inspections', displayOrder: 6 },
    { group: 'Vehicle Maintenance', name: 'Wash/Detailing', displayOrder: 7 },
    { group: 'Vehicle Maintenance', name: 'General Repairs', displayOrder: 8 },

    // Travel & Lodging
    { group: 'Travel & Lodging', name: 'Hotel/Motel', displayOrder: 1 },
    { group: 'Travel & Lodging', name: 'Meals', displayOrder: 2 },
    { group: 'Travel & Lodging', name: 'Truck Stop Showers', displayOrder: 3 },
    { group: 'Travel & Lodging', name: 'Parking Fees', displayOrder: 4 },

    // Permits & Fees
    { group: 'Permits & Fees', name: 'Tolls', displayOrder: 1 },
    { group: 'Permits & Fees', name: 'Scale Fees', displayOrder: 2 },
    { group: 'Permits & Fees', name: 'Oversize/Overweight Permits', displayOrder: 3 },
    { group: 'Permits & Fees', name: 'State Permits', displayOrder: 4 },
    { group: 'Permits & Fees', name: 'Registration Fees', displayOrder: 5 },

    // Equipment & Supplies
    { group: 'Equipment & Supplies', name: 'Straps/Chains/Binders', displayOrder: 1 },
    { group: 'Equipment & Supplies', name: 'Tarps', displayOrder: 2 },
    { group: 'Equipment & Supplies', name: 'Tools', displayOrder: 3 },
    { group: 'Equipment & Supplies', name: 'Safety Equipment', displayOrder: 4 },
    { group: 'Equipment & Supplies', name: 'CB Radio/Communications', displayOrder: 5 },

    // Insurance & Legal
    { group: 'Insurance & Legal', name: 'Insurance Premiums', displayOrder: 1 },
    { group: 'Insurance & Legal', name: 'Legal Fees', displayOrder: 2 },
    { group: 'Insurance & Legal', name: 'Fines/Violations', displayOrder: 3 },

    // Office & Administrative
    { group: 'Office & Administrative', name: 'Office Supplies', displayOrder: 1 },
    { group: 'Office & Administrative', name: 'Phone/Internet', displayOrder: 2 },
    { group: 'Office & Administrative', name: 'Software/Apps', displayOrder: 3 },
    { group: 'Office & Administrative', name: 'Bank Fees', displayOrder: 4 },

    // Other
    { group: 'Other', name: 'Miscellaneous', displayOrder: 1 },
    { group: 'Other', name: 'Emergency Repairs', displayOrder: 2 },
    { group: 'Other', name: 'Training/Education', displayOrder: 3 },
];

async function seedExpenseCategories() {
    for (const category of expenseCategories) {
        await prisma.expenseCategory.upsert({
            where: {
                group_name: {
                    group: category.group,
                    name: category.name,
                },
            },
            update: {
                displayOrder: category.displayOrder,
                isActive: true,
            },
            create: category,
        });
    }

    console.log(`✓ Created ${expenseCategories.length} expense categories`);
}

export { seedExpenseCategories };

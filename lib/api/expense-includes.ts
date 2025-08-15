// Optimized include object for complete expense data
export const EXPENSE_INCLUDE = {
    category: {
        select: {
            id: true,
            name: true,
            group: true,
        },
    },
    load: {
        select: {
            id: true,
            refNum: true,
            loadNum: true,
            customer: {
                select: {
                    id: true,
                    name: true,
                },
            },
            shipper: {
                select: {
                    id: true,
                    name: true,
                    city: true,
                    state: true,
                },
            },
            receiver: {
                select: {
                    id: true,
                    name: true,
                    city: true,
                    state: true,
                },
            },
            // Include driver assignments for load context
            driverAssignments: {
                select: {
                    id: true,
                    driver: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    },
    driver: {
        select: {
            id: true,
            name: true,
            active: true,
        },
    },
    equipment: {
        select: {
            id: true,
            equipmentNumber: true,
            make: true,
            model: true,
        },
    },
    createdBy: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    updatedBy: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    approvedBy: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    driverInvoice: {
        select: {
            id: true,
            invoiceNum: true,
            status: true,
            fromDate: true,
            toDate: true,
        },
    },
};

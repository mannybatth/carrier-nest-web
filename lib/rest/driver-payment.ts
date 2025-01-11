import { ExpandedDriverPayment, JSONResponse } from 'interfaces/models';
import { PaginationMetadata } from 'interfaces/table';
import { apiUrl } from '../constants';

export const getDriverPayments = async (
    driverId: string,
    limit = 10,
    offset = 0,
    sortBy = 'createdAt',
    sortDir: 'asc' | 'desc' = 'desc',
): Promise<{ driverPayments: ExpandedDriverPayment[]; metadata: PaginationMetadata }> => {
    try {
        const response = await fetch(
            `${apiUrl}/drivers/${driverId}/payments?limit=${limit}&offset=${offset}&sortBy=${sortBy}&sortDir=${sortDir}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );

        if (!response.ok) {
            throw new Error(`Error fetching assignment payments: ${response.statusText}`);
        }

        const {
            data,
            errors,
        }: JSONResponse<{ driverPayments: ExpandedDriverPayment[]; metadata: PaginationMetadata }> =
            await response.json();

        if (errors) {
            throw new Error(errors.map((e) => e.message).join(', '));
        }

        return data;
    } catch (error) {
        console.error('Error fetching assignment payments:', error);
        throw error;
    }
};

export const createDriverPayments = async (
    driverId: string,
    driverAssignmentIds: string[],
    amount: number,
    paymentDate: string,
    notes: string,
): Promise<ExpandedDriverPayment> => {
    const response = await fetch(`${apiUrl}/drivers/${driverId}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, paymentDate, driverAssignmentIds, notes }),
    });

    const { data, errors }: JSONResponse<{ driverPayment: ExpandedDriverPayment }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }

    return data.driverPayment;
};

export const deleteDriverPayment = async (driverId: string, driverPaymentId: string): Promise<void> => {
    const response = await fetch(`${apiUrl}/drivers/${driverId}/payments/${driverPaymentId}`, {
        method: 'DELETE',
    });

    const { errors }: JSONResponse<void> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
};

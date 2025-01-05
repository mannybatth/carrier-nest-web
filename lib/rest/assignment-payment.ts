import { ExpandedAssignmentPayment } from 'interfaces/models';

export interface AssignmentPaymentResponse {
    code: number;
    data: {
        payments: ExpandedAssignmentPayment[];
        metadata: {
            total: number;
            currentOffset: number;
            currentLimit: number;
        };
    };
    errors?: { message: string }[];
}

export const getAssignmentPayments = async (
    driverId: string,
    limit = 10,
    offset = 0,
    sortBy = 'createdAt',
    sortDir: 'asc' | 'desc' = 'desc',
): Promise<AssignmentPaymentResponse> => {
    try {
        const response = await fetch(
            `/api/drivers/${driverId}/payments?limit=${limit}&offset=${offset}&sortBy=${sortBy}&sortDir=${sortDir}`,
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

        const data: AssignmentPaymentResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching assignment payments:', error);
        throw error;
    }
};

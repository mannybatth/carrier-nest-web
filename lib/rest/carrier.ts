import { Carrier } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse } from '../../interfaces/models';

export const getCarrierById = async (id: string) => {
    const response = await fetch(`${apiUrl}/carriers/${id}`);
    const { data, errors }: JSONResponse<{ carrier: Carrier }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.carrier;
};

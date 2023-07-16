import { Carrier } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse } from '../../interfaces/models';

const state = {
    carriers: [] as Carrier[],
};

export const getCarrierById = async (id: string) => {
    const response = await fetch(`${apiUrl}/carriers/${id}`);
    const { data, errors }: JSONResponse<{ carrier: Carrier }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.carrier;
};

export const getCarriers = async () => {
    if (state.carriers.length) {
        return state.carriers;
    }

    const response = await fetch(`${apiUrl}/carriers`);
    const { data, errors }: JSONResponse<{ carriers: Carrier[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }

    state.carriers = data.carriers;

    return data.carriers;
};

export const createNewCarrier = async (carrier: Carrier) => {
    const response = await fetch(`${apiUrl}/carriers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carrier),
    });
    const { data, errors }: JSONResponse<{ carrier: Carrier }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.carrier;
};

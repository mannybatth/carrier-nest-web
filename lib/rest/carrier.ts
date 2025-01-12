import { Prisma } from '@prisma/client';
import { ExpandedCarrier, JSONResponse } from '../../interfaces/models';
import { apiUrl } from '../constants';

export const getCarrierById = async (id: string) => {
    const response = await fetch(`${apiUrl}/carriers/${id}`);
    const { data, errors }: JSONResponse<{ carrier: ExpandedCarrier }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.carrier;
};

export const getCarriers = async () => {
    const response = await fetch(`${apiUrl}/carriers`);
    const { data, errors }: JSONResponse<{ carriers: ExpandedCarrier[] }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }

    return data.carriers;
};

export const createNewCarrier = async (carrier: Prisma.CarrierCreateInput) => {
    const response = await fetch(`${apiUrl}/carriers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carrier),
    });
    const { data, errors }: JSONResponse<{ carrier: ExpandedCarrier }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.carrier;
};

export const updateCarrier = async (carrierId: string, carrier: Prisma.CarrierUpdateInput) => {
    const response = await fetch(`${apiUrl}/carriers/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carrier),
    });
    const { data, errors }: JSONResponse<{ carrier: ExpandedCarrier }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.carrier;
};

export const isCarrierCodeUnique = async (code: string) => {
    const params = new URLSearchParams({
        carrierCode: code,
    });
    const response = await fetch(`${apiUrl}/carriers/check-code-unique?${params.toString()}`);
    const { data, errors }: JSONResponse<{ isUnique: boolean }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.isUnique;
};

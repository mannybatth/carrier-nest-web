import { Equipment } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse } from '../../interfaces/models';
import { PaginationMetadata, Sort } from '../../interfaces/table';

export const getAllEquipments = async ({
    sort,
    limit,
    offset,
}: {
    sort?: Sort;
    limit?: number;
    offset?: number;
}): Promise<{ equipments: Equipment[]; metadata: PaginationMetadata }> => {
    const params = new URLSearchParams();
    if (sort && sort.key) {
        params.append('sortBy', sort.key);
    }
    if (sort && sort.order) {
        params.append('sortDir', sort.order);
    }
    if (limit !== undefined) {
        params.append('limit', limit.toString());
    }
    if (offset !== undefined) {
        params.append('offset', offset.toString());
    }
    const response = await fetch(apiUrl + '/equipments?' + params.toString());
    const { data, errors }: JSONResponse<{ equipments: Equipment[]; metadata: PaginationMetadata }> =
        await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
};

export const getEquipmentById = async (id: string) => {
    const response = await fetch(apiUrl + '/equipments/' + id);
    const { data, errors }: JSONResponse<{ equipment: Equipment }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.equipment;
};

export const createEquipment = async (equipment: Partial<Equipment>) => {
    const response = await fetch(apiUrl + '/equipments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(equipment),
    });
    const { data, errors }: JSONResponse<{ equipment: Equipment }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.equipment;
};

export const updateEquipment = async (id: string, equipment: Partial<Equipment>) => {
    const response = await fetch(apiUrl + '/equipments/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(equipment),
    });
    const { data, errors }: JSONResponse<{ updatedEquipment: Equipment }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.updatedEquipment;
};

export const deleteEquipmentById = async (id: string) => {
    const response = await fetch(apiUrl + '/equipments/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();

    if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data.result;
};

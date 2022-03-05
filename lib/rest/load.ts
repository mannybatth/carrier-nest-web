import { Load } from '@prisma/client';
import { apiUrl } from '../../constants';
import { JSONResponse, SimpleLoad } from '../../interfaces/models';

export const createLoad = async (load: SimpleLoad) => {
    const response = await fetch(apiUrl + '/loads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(load),
    });
    const { data, errors }: JSONResponse<Load> = await response.json();
    return data;
};

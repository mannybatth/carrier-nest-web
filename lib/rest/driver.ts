import { Driver } from '@prisma/client';
import { apiUrl } from '../../constants';
import { ExpandedDriver, JSONResponse, SimpleDriver, Sort } from '../../interfaces/models';

export const getAllDrivers = async (sort?: Sort) => {
    const params = new URLSearchParams();
    if (sort && sort.key) {
        params.append('sortBy', sort.key);
    }
    if (sort && sort.order) {
        params.append('sortDir', sort.order);
    }
    const response = await fetch(apiUrl + '/drivers?' + params.toString());
    const { data, errors }: JSONResponse<{ drivers: Driver[] }> = await response.json();
    return data.drivers;
};

export const getDriverById = async (id: number) => {
    const response = await fetch(apiUrl + '/drivers/' + id);
    const { data, errors }: JSONResponse<{ driver: Driver }> = await response.json();
    return data.driver;
};

export const getDriverByIdWithLoads = async (id: number) => {
    const response = await fetch(apiUrl + '/drivers/' + id + '?expand=loads');
    const { data, errors }: JSONResponse<{ driver: ExpandedDriver }> = await response.json();
    return data.driver;
};

export const searchDriversByName = async (value: string) => {
    const response = await fetch(apiUrl + '/drivers/search?q=' + value);
    const { data, errors }: JSONResponse<{ drivers: Driver[] }> = await response.json();
    return data.drivers;
};

export const fullTextSearchDriversByName = async (value: string) => {
    const response = await fetch(apiUrl + '/drivers/search/?fullText=true&q=' + value);
    const { data, errors }: JSONResponse<{ drivers: Driver[] }> = await response.json();
    return data.drivers;
};

export const createDriver = async (driver: SimpleDriver) => {
    const response = await fetch(apiUrl + '/drivers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(driver),
    });
    const { data, errors }: JSONResponse<{ driver: Driver }> = await response.json();
    return data.driver;
};

export const updateDriver = async (id: number, driver: SimpleDriver) => {
    const response = await fetch(apiUrl + '/drivers/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(driver),
    });
    const { data, errors }: JSONResponse<{ driver: Driver }> = await response.json();
    return data.driver;
};

export const deleteDriverById = async (id: number) => {
    const response = await fetch(apiUrl + '/drivers/' + id, {
        method: 'DELETE',
    });
    const { data, errors }: JSONResponse<{ result: string }> = await response.json();
    return data.result;
};

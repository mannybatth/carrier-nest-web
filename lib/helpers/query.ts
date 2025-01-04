import { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';
import { Sort } from '../../interfaces/table';

export const sortFromQuery = (query: ParsedUrlQuery): Sort => {
    let sort: Sort = null;
    if (query.sortBy) {
        sort = {
            key: query.sortBy as string,
            order: query.sortOrder as 'asc' | 'desc',
        };
    }
    return sort;
};

export const queryFromSort = (
    sort: Sort,
    routerQuery: ParsedUrlQuery,
    sortByKey = 'sortBy',
    sortOrderKey = 'sortOrder',
): ParsedUrlQueryInput => {
    const query = {
        ...routerQuery,
        ...(sort?.key ? { [sortByKey]: sort.key, [sortOrderKey]: sort.order } : {}),
    };
    if (!sort) {
        delete query[sortByKey];
        delete query[sortOrderKey];
    }
    return query;
};

export const queryFromPagination = (
    pagination: {
        offset: number;
        limit: number;
    },
    routerQuery: ParsedUrlQuery,
): ParsedUrlQueryInput => {
    const query = {
        ...routerQuery,
        ...(pagination.offset > 0 ? { offset: pagination.offset, limit: pagination.limit } : {}),
    };
    if (pagination.offset <= 0) {
        delete query.offset;
        delete query.limit;
    }
    return query;
};

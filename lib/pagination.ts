import { PaginationMetadata } from '../interfaces/models';

export const calcPaginationMetadata = ({ total, limit, offset }: { total: number; limit: number; offset: number }) => {
    const metadata: PaginationMetadata = {
        total,
    };

    const prevOffset = Math.max(0, offset - limit);
    const nextOffset = Math.min(total, offset + limit);

    if (prevOffset > 0) {
        metadata.prev = {
            offset: prevOffset,
            limit,
        };
    }

    if (nextOffset < total) {
        metadata.next = {
            offset: nextOffset,
            limit,
        };
    }
    return metadata;
};

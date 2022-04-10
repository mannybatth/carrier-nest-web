import { PaginationMetadata } from '../interfaces/table';

export const calcPaginationMetadata = ({ total, limit, offset }: { total: number; limit: number; offset: number }) => {
    const metadata: PaginationMetadata = {
        total,
        currentOffset: offset,
        currentLimit: limit,
    };

    const prevOffset = Math.max(0, offset - limit);
    const nextOffset = Math.min(total, offset + limit);

    console.log('prevOffset', prevOffset);
    console.log('nextOffset', nextOffset);

    if (prevOffset >= 0 && offset > 0) {
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

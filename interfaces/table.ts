export type Sort = {
    key: string;
    order: 'asc' | 'desc' | null;
};

export type PaginationMetadata = {
    total: number;
    currentOffset: number;
    currentLimit: number;
    prev?: {
        offset: number;
        limit: number;
    };
    next?: {
        offset: number;
        limit: number;
    };
};

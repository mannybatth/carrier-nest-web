import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { ExpandedEquipment } from 'interfaces/models';
import { getAllEquipments, deleteEquipmentById } from '../../lib/rest/equipment';
import EquipmentsTable from '../../components/equipments/EquipmentsTable';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { useLocalStorage } from '../../lib/useLocalStorage';
import Pagination from '../../components/Pagination';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { CustomersTableSkeleton } from 'components/customers/CustomersTable';

const EquipmentsPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 20;
    const offsetProp = Number(searchParams.get('offset')) || 0;

    const [lastEquipmentsTableLimit, setLastEquipmentsTableLimit] = useLocalStorage(
        'lastEquipmentsTableLimit',
        limitProp,
    );

    const [loadingEquipments, setLoadingEquipments] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);

    const [equipmentsList, setEquipmentsList] = useState<ExpandedEquipment[]>([]);
    const [sort, setSort] = useState<Sort>(sortProps);
    const [limit, setLimit] = useState(limitProp);
    const [offset, setOffset] = useState(offsetProp);
    const [metadata, setMetadata] = useState<PaginationMetadata>({} as PaginationMetadata);

    useEffect(() => {
        reloadEquipments({ sort, limit, offset });
    }, []);

    const reloadEquipments = async ({
        sort,
        limit,
        offset,
        useTableLoading = false,
    }: {
        sort?: Sort;
        limit: number;
        offset: number;
        useTableLoading?: boolean;
    }) => {
        !useTableLoading && setLoadingEquipments(true);
        useTableLoading && setTableLoading(true);
        try {
            const { equipments, metadata: metadataResponse } = await getAllEquipments({
                limit,
                offset,
                sort,
            });
            setLastEquipmentsTableLimit(equipments.length !== 0 ? equipments.length : lastEquipmentsTableLimit);
            setEquipmentsList(equipments);
            setMetadata(metadataResponse);
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        }
        setLoadingEquipments(false);
        setTableLoading(false);
    };

    const changeSort = (sort: Sort) => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromSort(sort, router.query),
            },
            undefined,
            { shallow: true },
        );
        setSort(sort);
        reloadEquipments({ sort, limit, offset });
    };

    const previousPage = async () => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromPagination(metadata.prev, router.query),
            },
            undefined,
            { shallow: true },
        );
        setLimit(metadata.prev.limit);
        setOffset(metadata.prev.offset);
        reloadEquipments({ sort, limit: metadata.prev.limit, offset: metadata.prev.offset });
    };

    const nextPage = async () => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromPagination(metadata.next, router.query),
            },
            undefined,
            { shallow: true },
        );
        setLimit(metadata.next.limit);
        setOffset(metadata.next.offset);
        reloadEquipments({ sort, limit: metadata.next.limit, offset: metadata.next.offset });
    };

    const deleteEquipment = async (id: string) => {
        try {
            await deleteEquipmentById(id);
            notify({ title: 'Equipment deleted', message: 'Equipment deleted successfully' });
            reloadEquipments({ sort, limit, offset, useTableLoading: true });
        } catch (error) {
            notify({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Equipment Management</h1>
                    <button
                        onClick={() => router.push('/equipments/create')}
                        className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        + Create Equipment
                    </button>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Equipment Management</h1>
                        <button
                            onClick={() => router.push('/equipments/create')}
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            + Create Equipment
                        </button>
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    {loadingEquipments ? (
                        <CustomersTableSkeleton limit={lastEquipmentsTableLimit} />
                    ) : (
                        <EquipmentsTable
                            equipments={equipmentsList}
                            sort={sort}
                            changeSort={changeSort}
                            deleteEquipment={deleteEquipment}
                            loading={tableLoading}
                        />
                    )}

                    {equipmentsList.length !== 0 && !loadingEquipments && (
                        <Pagination
                            metadata={metadata}
                            loading={loadingEquipments || tableLoading}
                            onPrevious={() => previousPage()}
                            onNext={() => nextPage()}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
};

EquipmentsPage.authenticationEnabled = true;

export default EquipmentsPage;

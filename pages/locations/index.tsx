import { Location } from '@prisma/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { CustomersTableSkeleton } from '../../components/customers/CustomersTable';
import SimpleDialog from '../../components/dialogs/SimpleDialog';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import Pagination from '../../components/Pagination';
import { PageWithAuth } from '../../interfaces/auth';
import { PaginationMetadata, Sort } from '../../interfaces/table';
import { queryFromPagination, queryFromSort, sortFromQuery } from '../../lib/helpers/query';
import { useLocalStorage } from '../../lib/useLocalStorage';
import LocationsTable from 'components/locations/LocationsTable';
import { deleteLocationById, getAllLocations } from 'lib/rest/locations';

const LocationsPage: PageWithAuth = () => {
    const searchParams = useSearchParams();
    const sortProps = sortFromQuery({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
    });
    const limitProp = Number(searchParams.get('limit')) || 20;
    const offsetProp = Number(searchParams.get('offset')) || 0;

    const [lastLocationsTableLimit, setLastLocationsTableLimit] = useLocalStorage('lastLocationsTableLimit', limitProp);

    const [loadingLocations, setLoadingLocations] = React.useState(true);
    const [tableLoading, setTableLoading] = React.useState(false);

    const [openDeleteLocationConfirmation, setOpenDeleteLocationConfirmation] = React.useState(false);
    const [locationIdToDelete, setLocationIdToDelete] = React.useState<string | null>(null);

    const [locationsList, setLocationsList] = React.useState<Location[]>([]);

    const [sort, setSort] = React.useState<Sort>(sortProps);
    const [limit, setLimit] = React.useState(limitProp);
    const [offset, setOffset] = React.useState(offsetProp);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>({} as PaginationMetadata);

    const router = useRouter();

    useEffect(() => {
        reloadLocations({ sort, limit, offset });
    }, []);

    const reloadLocations = async ({
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
        !useTableLoading && setLoadingLocations(true);
        useTableLoading && setTableLoading(true);
        const { locations, metadata: metadataResponse } = await getAllLocations({
            limit,
            offset,
            sort,
        });
        setLastLocationsTableLimit(locations.length !== 0 ? locations.length : lastLocationsTableLimit);
        setLocationsList(locations);
        setMetadata(metadataResponse);
        setLoadingLocations(false);
        setTableLoading(false);
    };

    const changeSort = (sort) => {
        router.push(
            {
                pathname: router.pathname,
                query: queryFromSort(sort, router.query),
            },
            undefined,
            { shallow: true },
        );
        setSort(sort);
        reloadLocations({ sort, limit, offset });
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
        reloadLocations({ sort, limit: metadata.prev.limit, offset: metadata.prev.offset });
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
        reloadLocations({ sort, limit: metadata.next.limit, offset: metadata.next.offset });
    };

    const deleteLocation = async (id: string) => {
        await deleteLocationById(id);

        notify({ title: 'Driver deleted', message: 'Driver deleted successfully' });
        reloadLocations({ sort, limit, offset, useTableLoading: true });

        setLocationIdToDelete(null);
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Locations</h1>
                    <Link href="/locations/create">
                        <button
                            type="button"
                            className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            + Create Location
                        </button>
                    </Link>
                </div>
            }
        >
            <>
                <SimpleDialog
                    show={openDeleteLocationConfirmation}
                    title="Delete Location"
                    description="Are you sure you want to delete this location?"
                    primaryButtonText="Delete"
                    primaryButtonAction={() => {
                        if (locationIdToDelete) {
                            deleteLocation(locationIdToDelete);
                        }
                    }}
                    secondaryButtonAction={() => {
                        setOpenDeleteLocationConfirmation(false);
                        setLocationIdToDelete(null);
                    }}
                    onClose={() => {
                        setOpenDeleteLocationConfirmation(false);
                        setLocationIdToDelete(null);
                    }}
                ></SimpleDialog>
                <div className="py-2 mx-auto max-w-7xl">
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <div className="flex">
                            <h1 className="flex-1 text-2xl font-semibold text-gray-900">Stop Locations</h1>
                            <Link href="/locations/create">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    + Create Location
                                </button>
                            </Link>
                        </div>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="px-5 sm:px-6 md:px-8">
                        {loadingLocations ? (
                            <CustomersTableSkeleton limit={lastLocationsTableLimit} />
                        ) : (
                            <LocationsTable
                                locations={locationsList}
                                sort={sort}
                                changeSort={changeSort}
                                deleteLocation={(id: string) => {
                                    setOpenDeleteLocationConfirmation(true);
                                    setLocationIdToDelete(id);
                                }}
                                loading={tableLoading}
                            />
                        )}

                        {locationsList.length !== 0 && !loadingLocations && (
                            <Pagination
                                metadata={metadata}
                                loading={loadingLocations || tableLoading}
                                onPrevious={() => previousPage()}
                                onNext={() => nextPage()}
                            ></Pagination>
                        )}
                    </div>
                </div>
            </>
        </Layout>
    );
};

LocationsPage.authenticationEnabled = true;

export default LocationsPage;

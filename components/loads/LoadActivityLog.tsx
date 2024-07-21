import { LoadActivityAction } from '@prisma/client';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { ExpandedLoad, ExpandedLoadActivity } from '../../interfaces/models';
import { PaginationMetadata } from '../../interfaces/table';
import { loadStatusToUIStatus } from '../../lib/load/load-utils';
import { getLoadActivity } from '../../lib/rest/load';
import { useLoadContext } from 'components/context/LoadContext';

const LoadActivityLogSkeleton: React.FC = () => {
    return (
        <div className="space-y-2 animate-pulse">
            <div className="flex justify-between text-sm font-medium ">
                <div className="block w-8/12 h-6 rounded bg-slate-100"></div>
                <div className="block w-3/12 h-6 rounded bg-slate-100"></div>
            </div>
            <div className="flex justify-between text-sm font-medium">
                <div className="block w-8/12 h-6 rounded bg-slate-100"></div>
                <div className="block w-3/12 h-6 rounded bg-slate-100"></div>
            </div>
            <div className="flex justify-between text-sm font-medium">
                <div className="block w-8/12 h-6 rounded bg-slate-100"></div>
                <div className="block w-3/12 h-6 rounded bg-slate-100"></div>
            </div>
        </div>
    );
};

type Props = {
    className?: string;
    loadId: string;
};

const LoadActivityLog: React.FC<Props> = ({ className, loadId }) => {
    const [activity, setActivity] = useState<ExpandedLoadActivity[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [moreLoading, setMoreLoading] = useState(false);
    const [load, setLoad] = useLoadContext();

    const [limit, setLimit] = React.useState(8);
    const [offset, setOffset] = React.useState(0);
    const [metadata, setMetadata] = React.useState<PaginationMetadata>({
        total: 0,
        currentOffset: offset,
        currentLimit: limit,
        next: null,
    });

    useEffect(() => {
        setActivity([]);
        setOffset(0);
        setMetadata({
            total: 0,
            currentOffset: 0,
            currentLimit: limit,
            next: null,
        });
        (async () => {
            setInitialLoading(true);
            await fetchActivity({ limit, offset });
            setInitialLoading(false);
        })();
    }, [loadId]);

    const fetchActivity = async ({ limit, offset }) => {
        try {
            setMoreLoading(true);
            const { activity: newActivity, metadata } = await getLoadActivity(loadId, {
                limit,
                offset,
            });
            setActivity((activity) => [...activity, ...newActivity]);
            setMetadata(metadata);
            setMoreLoading(false);
        } catch (error) {
            console.error('Failed to fetch load activity:', error);
        }
    };

    const openCoordinatesInGoogleMaps = (longitude: number, latitude: number) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
    };

    return (
        <div className={classNames(className, 'flex flex-col')}>
            {initialLoading ? (
                <LoadActivityLogSkeleton></LoadActivityLogSkeleton>
            ) : (
                activity && (
                    <div className="flow-root">
                        {activity.length === 0 && (
                            <div className="flex items-center justify-center h-6 text-sm text-gray-500">
                                No activity yet
                            </div>
                        )}
                        <ul role="list" className="space-y-4">
                            {activity.map((activityItem, activityItemIdx) => (
                                <li key={activityItemIdx} className="relative flex gap-x-2">
                                    <div
                                        className={classNames(
                                            activityItemIdx === activity.length - 1 ? 'h-6' : '-bottom-6',
                                            'absolute left-0 top-0 flex w-6 justify-center',
                                        )}
                                    >
                                        <div className="w-px bg-gray-200" />
                                    </div>
                                    <div className="relative flex items-center justify-center flex-none w-6 h-6 bg-white rounded-full">
                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
                                    </div>
                                    <p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
                                        {activityItem.action === LoadActivityAction.CHANGE_STATUS && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name ||
                                                        activityItem.actorUser?.email ||
                                                        activityItem.actorDriver?.name ||
                                                        activityItem.actorDriverName}
                                                </span>{' '}
                                                changed the load status to{' '}
                                                <span className="font-medium text-gray-900">
                                                    {loadStatusToUIStatus(activityItem.toStatus).toUpperCase()}
                                                </span>
                                                {activityItem.longitude && activityItem.latitude && (
                                                    <span className="block">
                                                        {' '}
                                                        <a
                                                            onClick={() =>
                                                                openCoordinatesInGoogleMaps(
                                                                    activityItem.longitude,
                                                                    activityItem.latitude,
                                                                )
                                                            }
                                                        >
                                                            Open Location
                                                        </a>
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {activityItem.action === LoadActivityAction.UPLOAD_DOCUMENT && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name ||
                                                        activityItem.actorUser?.email ||
                                                        activityItem.actorDriver?.name ||
                                                        activityItem.actorDriverName}
                                                </span>{' '}
                                                uploaded a document{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDocument?.fileName ||
                                                        activityItem.actionDocumentFileName}
                                                </span>
                                                {activityItem.longitude && activityItem.latitude && (
                                                    <span className="block">
                                                        {' '}
                                                        <a
                                                            onClick={() =>
                                                                openCoordinatesInGoogleMaps(
                                                                    activityItem.longitude,
                                                                    activityItem.latitude,
                                                                )
                                                            }
                                                        >
                                                            Open Location
                                                        </a>
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {activityItem.action === LoadActivityAction.UPLOAD_POD && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name ||
                                                        activityItem.actorUser?.email ||
                                                        activityItem.actorDriver?.name ||
                                                        activityItem.actorDriverName}
                                                </span>{' '}
                                                uploaded a POD{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDocument?.fileName ||
                                                        activityItem.actionDocumentFileName}
                                                </span>
                                                {activityItem.longitude && activityItem.latitude && (
                                                    <span className="block">
                                                        {' '}
                                                        <a
                                                            onClick={() =>
                                                                openCoordinatesInGoogleMaps(
                                                                    activityItem.longitude,
                                                                    activityItem.latitude,
                                                                )
                                                            }
                                                        >
                                                            Open Location
                                                        </a>
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {activityItem.action === LoadActivityAction.REMOVE_DOCUMENT && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name ||
                                                        activityItem.actorUser?.email ||
                                                        activityItem.actorDriver?.name ||
                                                        activityItem.actorDriverName}
                                                </span>{' '}
                                                removed a document{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDocument?.fileName ||
                                                        activityItem.actionDocumentFileName}
                                                </span>
                                            </>
                                        )}

                                        {activityItem.action === LoadActivityAction.REMOVE_POD && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name ||
                                                        activityItem.actorUser?.email ||
                                                        activityItem.actorDriver?.name ||
                                                        activityItem.actorDriverName}
                                                </span>{' '}
                                                removed a POD{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDocument?.fileName ||
                                                        activityItem.actionDocumentFileName}
                                                </span>
                                            </>
                                        )}

                                        {/* {activityItem.action === LoadActivityAction.ASSIGN_DRIVER && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                assigned{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDriver?.name || activityItem.actionDriverName}
                                                </span>{' '}
                                                to the load
                                            </>
                                        )}

                                        {activityItem.action === LoadActivityAction.UNASSIGN_DRIVER && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                unassigned{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDriver?.name || activityItem.actionDriverName}
                                                </span>{' '}
                                                from the load
                                            </>
                                        )} */}

                                        {activityItem.action === LoadActivityAction.ADD_DRIVER_TO_ASSIGNMENT && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                added{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDriver?.name || activityItem.actionDriverName}
                                                </span>{' '}
                                                to an assignment
                                            </>
                                        )}
                                        {activityItem.action === LoadActivityAction.REMOVE_DRIVER_FROM_ASSIGNMENT && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                removed{' '}
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actionDriver?.name || activityItem.actionDriverName}
                                                </span>{' '}
                                                from an assignment
                                            </>
                                        )}
                                        {/* {activityItem.action === LoadActivityAction.ADD_ASSIGNMENT && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                added driver assignment to load
                                            </>
                                        )}
                                        {activityItem.action === LoadActivityAction.REMOVE_ASSIGNMENT && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                removed a driver assignment from load
                                            </>
                                        )}
                                        {activityItem.action === LoadActivityAction.UPDATED_ASSIGNMENT && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                updated a driver assignment
                                            </>
                                        )} */}
                                        {activityItem.action === LoadActivityAction.CHANGE_ASSIGNMENT_STATUS && (
                                            <>
                                                <span className="font-medium text-gray-900">
                                                    {activityItem.actorUser?.name || activityItem.actorUser?.email}
                                                </span>{' '}
                                                changed driver assignment status
                                            </>
                                        )}
                                    </p>
                                    <span className="flex-none py-0.5 text-xs leading-5 text-gray-500">
                                        {new Intl.DateTimeFormat('en-US', {
                                            month: 'short',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        }).format(new Date(activityItem.createdAt))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {metadata.next && (
                            <div className="flex justify-center mt-4">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => {
                                        setOffset(metadata.next.offset);
                                        fetchActivity({ limit, offset: metadata.next.offset });
                                    }}
                                    disabled={moreLoading}
                                >
                                    {moreLoading ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    );
};

export default LoadActivityLog;

import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { formatValue } from 'react-currency-input-field';
import { ExpandedDriverAssignment } from '../../interfaces/models';
import { Sort } from '../../interfaces/table';
import Table from '../Table';
import LoadStatusBadge from './LoadStatusBadge';
import { RouteLegStatus } from '@prisma/client';
import AssignmentStatusDropDown from './load-details/AssignmentStatusDropDown';

const statusDotColors = {
    [RouteLegStatus.ASSIGNED]: 'bg-gray-400',
    [RouteLegStatus.IN_PROGRESS]: 'bg-yellow-500',
    [RouteLegStatus.COMPLETED]: 'bg-green-500',
};

const humanReadableStatus = {
    [RouteLegStatus.ASSIGNED]: 'Assigned',
    [RouteLegStatus.IN_PROGRESS]: 'In Progress',
    [RouteLegStatus.COMPLETED]: 'Completed',
};

type Props = {
    assignments: ExpandedDriverAssignment[];
    headers?: string[];
    sort?: Sort;
    loading: boolean;
    changeSort?: (sort: Sort) => void;
    deleteAssignment: (id: string) => void;
    changeLegStatusClicked: (status: string, legId: string) => void;
};

export const DriverAssignmentsTable: React.FC<Props> = ({
    assignments,
    changeSort,
    sort,
    loading,
    headers = [],
    deleteAssignment,
    changeLegStatusClicked,
}) => {
    const router = useRouter();

    return (
        <Table
            loading={loading}
            headers={[
                ...[headers.includes('load.refNum') ? { key: 'refNum', title: 'Order #' } : null],
                ...[headers.includes('routeLeg.scheduledDate') ? { key: 'startTime', title: 'Start Time' } : null],
                ...[headers.includes('routeLeg.locations') ? { key: 'locations', title: 'Stops' } : null],
                ...[
                    headers.includes('routeLeg.driverInstructions')
                        ? { key: 'driverInstructions', title: 'Instructions' }
                        : null,
                ],
                ...[headers.includes('routeLeg.status') ? { key: 'status', title: 'Status' } : null],
            ].filter((x) => x)}
            rows={assignments.map((assignment) => ({
                id: assignment.load.id,
                items: [
                    ...[headers.includes('load.refNum') ? { value: assignment.load.refNum } : null],
                    ...[
                        headers.includes('routeLeg.scheduledDate')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900 flex gap-2">
                                          <p className="text-xs leading-5 text-gray-900 whitespace-nowrap">
                                              {new Intl.DateTimeFormat('en-US', {
                                                  year: '2-digit',
                                                  month: 'short',
                                                  day: '2-digit',
                                              }).format(new Date(assignment.routeLeg.scheduledDate))}
                                          </p>
                                          <div>{`@${assignment.routeLeg.scheduledTime}`}</div>
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('routeLeg.locations')
                            ? {
                                  node: (
                                      <div className="text-xs leading-5 text-gray-900 whitespace-nowrap">
                                          {assignment.routeLeg.locations.map((location, i) => (
                                              <div key={i} className="flex flex-row gap-2   justify-start items-center">
                                                  <p className="w-2 h-2 rounded-full bg-slate-200 text-center text-xs leading-5 border border-gray-400 shadow"></p>
                                                  {location.loadStop && (
                                                      <p className="capitalize font-normal text-xs">
                                                          {location.loadStop?.city.toLocaleLowerCase()},{' '}
                                                          {location.loadStop?.state.toLocaleUpperCase()} - (
                                                          {location.loadStop?.name.toLocaleUpperCase()})
                                                      </p>
                                                  )}
                                                  {location.location && (
                                                      <p className="capitalize font-normal text-xs">
                                                          {location.location?.city.toLocaleLowerCase()},{' '}
                                                          {location.location?.state.toLocaleUpperCase()} - (
                                                          {location.location?.name.toLocaleUpperCase()})
                                                      </p>
                                                  )}
                                                  {i < assignment.routeLeg.locations.length - 1 && (
                                                      <div className="absolute flex -ml-1 opacity-50">
                                                          <p className="w-0.5 h-5 bg-gray-200 mt-4 -ml-2 rounded-md"></p>
                                                          <p className="w-[8px] h-0.5 bg-gray-200 mt-4 -ml-0.5 rounded-md"></p>
                                                          {i == assignment.routeLeg.locations.length - 2 && (
                                                              <p className="absolute bottom-0  w-2 h-0.5 bg-gray-200 -ml-2 rounded-md"></p>
                                                          )}
                                                      </div>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('routeLeg.driverInstructions')
                            ? {
                                  node: (
                                      <p className="text-xs text-wrap  w-fit max-w-[150px] truncate line-clamp-2 px-1 rounded-md text-gray-600 italic">
                                          {assignment.routeLeg.driverInstructions}
                                      </p>
                                  ),
                              }
                            : null,
                    ],
                    ...[
                        headers.includes('routeLeg.status')
                            ? {
                                  node: (
                                      <div className="  min-w-full inline-block">
                                          <AssignmentStatusDropDown
                                              changeStatusClicked={changeLegStatusClicked}
                                              startedAt={assignment.routeLeg.startedAt}
                                              endedAt={assignment.routeLeg.endedAt}
                                              legId={assignment.routeLeg.id}
                                              disabled={false}
                                              status={assignment.routeLeg.status}
                                          />
                                      </div>
                                  ),
                              }
                            : null,
                    ],
                ].filter((x) => x),
                menuItems: [
                    {
                        title: 'View Load',
                        onClick: () => router.push(`/loads/${assignment.load.id}`),
                    },
                ],
            }))}
            sort={sort ? sort : null}
            changeSort={changeSort ? changeSort : null}
            emptyState={
                <div className="my-5 text-center">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-12 h-12 mx-auto text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No loads to show on this page.</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new load.</p>
                    <div className="mt-6">
                        <Link href="/loads/create">
                            <button
                                type="button"
                                className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                + Create Load
                            </button>
                        </Link>
                    </div>
                </div>
            }
        />
    );
};

type AssignmentsTableSkeletonProps = {
    limit: number;
};
export const AssignmentsTableSkeleton: React.FC<AssignmentsTableSkeletonProps> = ({ limit }) => {
    return (
        <div className="w-full">
            <div className="flex space-x-4 animate-pulse">
                <div className="flex-1">
                    <div className="h-10 rounded bg-slate-200"></div>
                    <div className="divide-y divide-gray-200">
                        {[...Array(limit)].map((_, i) => (
                            <div key={i} className="grid items-center grid-cols-12 gap-4 py-3">
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <div className="h-4 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="h-2 rounded bg-slate-200"></div>
                                    <div className="w-1/2 h-2 rounded bg-slate-200"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

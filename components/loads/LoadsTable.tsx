import { Menu, Transition } from '@headlessui/react';
import { ArrowSmUpIcon, ArrowSmDownIcon, DotsVerticalIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import Link from 'next/link';
import React, { Fragment } from 'react';
import { ExpandedLoad, Sort } from '../../interfaces/models';

const MenuLink: React.FC<any> = ({ href, children, ...rest }) => {
    return (
        <Link href={href}>
            <a {...rest}>{children}</a>
        </Link>
    );
};

type Props = {
    loads: ExpandedLoad[];
    onSortChange: (sort: Sort) => void;
};

const LoadsTable: React.FC<Props> = ({ loads, onSortChange }: Props) => {
    const [sort, setSort] = React.useState<Sort>(null);

    const changeSort = (key: string) => {
        if (key === sort?.key && sort?.order === 'desc') {
            setSort(null);
            onSortChange(null);
            return;
        }

        const newSort: Sort = {
            key,
            order: !sort || sort.key !== key ? 'asc' : 'desc',
        };
        setSort(newSort);
        onSortChange(newSort);
    };

    const renderSortIcon = (key: string) => {
        return (
            sort?.key === key && (
                <span className="ml-1">
                    {sort?.order === 'asc' ? (
                        <ArrowSmUpIcon className="w-4 h-4" color="gray-600" />
                    ) : (
                        <ArrowSmDownIcon className="w-4 h-4" color="gray-600" rotate={180} />
                    )}
                </span>
            )
        );
    };

    return (
        <div className="flex flex-col">
            <div className="-my-2 sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="border-b border-gray-200 shadow sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer "
                                        onClick={() => changeSort('refNum')}
                                    >
                                        <div className="inline-flex">
                                            <span className="flex-shrink-0">Reference #</span>
                                            {renderSortIcon('refNum')}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer"
                                        onClick={() => changeSort('customer.name')}
                                    >
                                        <div className="inline-flex">Customer{renderSortIcon('customer.name')}</div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer"
                                        onClick={() => changeSort('status')}
                                    >
                                        <div className="inline-flex">Status{renderSortIcon('status')}</div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer"
                                        onClick={() => changeSort('shipper.date')}
                                    >
                                        <div className="inline-flex">Pickup{renderSortIcon('shipper.date')}</div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer"
                                        onClick={() => changeSort('receiver.date')}
                                    >
                                        <div className="inline-flex">
                                            <div className="inline-flex">
                                                <span className="flex-shrink-0">Drop Off</span>
                                                {renderSortIcon('receiver.date')}
                                            </div>
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer"
                                        onClick={() => changeSort('shipper.city')}
                                    >
                                        <div className="inline-flex">From{renderSortIcon('shipper.city')}</div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer"
                                        onClick={() => changeSort('receiver.city')}
                                    >
                                        <div className="inline-flex">To{renderSortIcon('receiver.city')}</div>
                                    </th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">More</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loads.map((load) => (
                                    <tr key={load.id}>
                                        <td className="px-6 py-4 whitespace-no-wrap">
                                            <div className="text-xs leading-5 text-gray-900">{load.refNum}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-no-wrap">
                                            <div className="text-xs leading-5 text-gray-900">{load.customer.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-no-wrap">
                                            <div className="text-xs leading-5 text-gray-900">
                                                <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 uppercase bg-green-100 rounded-full">
                                                    {load.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-no-wrap">
                                            <div className="text-xs leading-5 text-gray-900">
                                                <div>
                                                    {new Intl.DateTimeFormat('en-US', {
                                                        year: '2-digit',
                                                        month: 'short',
                                                        day: '2-digit',
                                                    }).format(new Date(load.shipper.date))}
                                                </div>
                                                <div>{load.shipper.time}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-no-wrap">
                                            <div className="text-xs leading-5 text-gray-900">
                                                <div>
                                                    {new Intl.DateTimeFormat('en-US', {
                                                        year: '2-digit',
                                                        month: 'short',
                                                        day: '2-digit',
                                                    }).format(new Date(load.receiver.date))}
                                                </div>
                                                <div>{load.receiver.time}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-no-wrap">
                                            <div className="text-xs leading-5 text-gray-900">
                                                {load.shipper.city}, {load.shipper.state}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-no-wrap">
                                            <div className="text-xs leading-5 text-gray-900">
                                                {load.receiver.city}, {load.receiver.state}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-no-wrap">
                                            <Menu as="div" className="relative inline-block text-left">
                                                <div>
                                                    <Menu.Button className="flex items-center text-gray-400 rounded-full hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500">
                                                        <span className="sr-only">Open options</span>
                                                        <DotsVerticalIcon className="w-6 h-6" aria-hidden="true" />
                                                    </Menu.Button>
                                                </div>

                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-100"
                                                    enterFrom="transform opacity-0 scale-95"
                                                    enterTo="transform opacity-100 scale-100"
                                                    leave="transition ease-in duration-75"
                                                    leaveFrom="transform opacity-100 scale-100"
                                                    leaveTo="transform opacity-0 scale-95"
                                                >
                                                    <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                        <div className="py-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <MenuLink
                                                                        href={`/loads/edit/${load.id}`}
                                                                        className={classNames(
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700',
                                                                            'block px-4 py-2 text-sm',
                                                                        )}
                                                                    >
                                                                        Edit
                                                                    </MenuLink>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <a
                                                                        href="#"
                                                                        className={classNames(
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700',
                                                                            'block px-4 py-2 text-sm',
                                                                        )}
                                                                    >
                                                                        Duplicate
                                                                    </a>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                        <div className="py-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <a
                                                                        href="#"
                                                                        className={classNames(
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700',
                                                                            'block px-4 py-2 text-sm',
                                                                        )}
                                                                    >
                                                                        Archive
                                                                    </a>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <a
                                                                        href="#"
                                                                        className={classNames(
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700',
                                                                            'block px-4 py-2 text-sm',
                                                                        )}
                                                                    >
                                                                        Move
                                                                    </a>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                        <div className="py-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <a
                                                                        href="#"
                                                                        className={classNames(
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700',
                                                                            'block px-4 py-2 text-sm',
                                                                        )}
                                                                    >
                                                                        Share
                                                                    </a>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <a
                                                                        href="#"
                                                                        className={classNames(
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700',
                                                                            'block px-4 py-2 text-sm',
                                                                        )}
                                                                    >
                                                                        Add to favorites
                                                                    </a>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                        <div className="py-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <a
                                                                        href="#"
                                                                        className={classNames(
                                                                            active
                                                                                ? 'bg-gray-100 text-gray-900'
                                                                                : 'text-gray-700',
                                                                            'block px-4 py-2 text-sm',
                                                                        )}
                                                                    >
                                                                        Delete
                                                                    </a>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadsTable;

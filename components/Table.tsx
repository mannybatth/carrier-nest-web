import { Menu, Transition } from '@headlessui/react';
import { ArrowSmDownIcon, ArrowSmUpIcon, DotsVerticalIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import React, { Fragment } from 'react';
import { Sort } from '../interfaces/models';

export type TableHeader = {
    key: string;
    title: string;
    disableSort?: boolean;
};

export type TableDataRow = {
    id: number;
    items: {
        value?: string;
        node?: React.ReactNode;
    }[];
    menuItems?: {
        title: string;
        onClick: () => void;
    }[];
};

type Props = {
    headers: TableHeader[];
    rows: TableDataRow[];
    onRowClick: (id: number, index: number) => void;
    changeSort: (sort: Sort) => void;
};

const Table: React.FC<Props> = ({ headers, rows, onRowClick, changeSort }: Props) => {
    const [sort, setSort] = React.useState<Sort>(null);

    const onChangeSort = (key: string) => {
        if (key === sort?.key && sort?.order === 'desc') {
            setSort(null);
            changeSort(null);
            return;
        }

        const newSort: Sort = {
            key,
            order: !sort || sort.key !== key ? 'asc' : 'desc',
        };
        setSort(newSort);
        changeSort(newSort);
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
                                    {headers.map((item) => (
                                        <th
                                            key={item.key}
                                            scope="col"
                                            className={`px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase ${
                                                !item.disableSort && 'cursor-pointer'
                                            }`}
                                            onClick={() => !item.disableSort && onChangeSort(item.key)}
                                        >
                                            <div className="inline-flex">
                                                <span className="flex-shrink-0">{item.title}</span>
                                                {!item.disableSort && renderSortIcon(item.key)}
                                            </div>
                                        </th>
                                    ))}
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">More</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rows.map((row, rowIndex) => (
                                    <tr
                                        className="cursor-pointer hover:bg-gray-50"
                                        key={`row-${rowIndex}`}
                                        onClick={() => {
                                            onRowClick(row.id, rowIndex);
                                        }}
                                    >
                                        {row.items.map((item, index) => (
                                            <td
                                                key={`item-${rowIndex}-${index}`}
                                                className="px-6 py-4 whitespace-no-wrap"
                                            >
                                                {item.value ? (
                                                    <div className="text-sm leading-5 text-gray-900">{item.value}</div>
                                                ) : (
                                                    item.node
                                                )}
                                            </td>
                                        ))}

                                        <td className="px-6 py-4 text-right whitespace-no-wrap">
                                            <Menu as="div" className="relative inline-block text-left">
                                                <div>
                                                    <Menu.Button className="flex items-center justify-center w-8 h-8 text-gray-400 bg-white rounded-full hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
                                                            {row.menuItems?.map((menuItem, index) => (
                                                                <Menu.Item key={`menu-item-${index}`}>
                                                                    {({ active }) => (
                                                                        <a
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                menuItem.onClick();
                                                                            }}
                                                                            className={classNames(
                                                                                active
                                                                                    ? 'bg-gray-100 text-gray-900'
                                                                                    : 'text-gray-700',
                                                                                'block px-4 py-2 text-sm',
                                                                            )}
                                                                        >
                                                                            {menuItem.title}
                                                                        </a>
                                                                    )}
                                                                </Menu.Item>
                                                            ))}
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

export default Table;

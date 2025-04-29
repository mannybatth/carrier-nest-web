/* eslint-disable react/prop-types */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronUpIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import Spinner from './Spinner';

// Simple className utility without tailwind-merge
function cn(...classes: (string | undefined | boolean)[]) {
    return classes.filter(Boolean).join(' ');
}

export type TableHeader = {
    key: string;
    title: string;
    disableSort?: boolean;
    className?: string;
    width?: string;
    priority?: number; // Priority for responsive hiding (lower = more important)
};

export type TableDataRow = {
    id: string;
    items: {
        value?: string;
        node?: React.ReactNode;
        className?: string;
    }[];
    menuItems?: {
        title: string;
        onClick: () => void;
    }[];
};

export type Sort = {
    key: string;
    order: 'asc' | 'desc';
} | null;

type Props = {
    headers: TableHeader[];
    rows: TableDataRow[];
    sort: Sort;
    loading?: boolean;
    emptyState?: React.ReactNode;
    onRowClick?: (id: string, index: number) => void;
    rowLink?: (id: string) => string;
    changeSort?: (sort: Sort) => void;
    caption?: string;
    stickyHeader?: boolean;
};

const Table = ({
    headers,
    rows,
    sort: sortProps,
    loading,
    emptyState,
    onRowClick,
    rowLink,
    changeSort,
    caption,
    stickyHeader = false,
}: Props) => {
    const [sort, setSort] = useState<Sort>(sortProps);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [isScrollable, setIsScrollable] = useState(false);

    // Update sort when props change
    useEffect(() => {
        setSort(sortProps);
    }, [sortProps]);

    // Check if table is scrollable
    const checkTableWidth = useCallback(() => {
        const tableContainer = document.getElementById('table-container');
        const table = document.getElementById('responsive-table');
        if (tableContainer && table) {
            setIsScrollable(table.offsetWidth > tableContainer.offsetWidth);
        }
    }, []);

    useEffect(() => {
        checkTableWidth();
        window.addEventListener('resize', checkTableWidth);
        return () => window.removeEventListener('resize', checkTableWidth);
    }, [rows, checkTableWidth]);

    // Handle sort change
    const onChangeSort = useCallback(
        (key: string) => {
            if (!changeSort) {
                return;
            }

            if (key === sort?.key && sort?.order === 'desc') {
                changeSort(null);
                setSort(null);
                return;
            }

            const newSort: Sort = {
                key,
                order: !sort || sort.key !== key ? 'asc' : 'desc',
            };
            changeSort(newSort);
            setSort(newSort);
        },
        [changeSort, sort],
    );

    // Render sort icon
    const renderSortIcon = useCallback(
        (key: string) => {
            if (sort?.key !== key) return null;

            return sort.order === 'asc' ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-600" />
            ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-600" />
            );
        },
        [sort],
    );

    // Handle menu toggle
    const handleMenuToggle = useCallback((e: React.MouseEvent, rowId: string) => {
        e.stopPropagation();

        setMenuOpen((prevState) => (prevState === rowId ? null : rowId));
        e.preventDefault();
    }, []);

    // Handle menu item click
    const handleMenuItemClick = useCallback((e: React.MouseEvent, onClick: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
        setMenuOpen(null);
    }, []);

    // Handle click outside to close menu
    const handleClickOutside = useCallback(() => {
        if (menuOpen) setMenuOpen(null);
    }, [menuOpen]);

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [handleClickOutside]);

    // Render empty state
    if (!rows || rows.length === 0) {
        return (
            <>
                {emptyState || (
                    <div className="flex items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-lg">
                        <p>No data available</p>
                    </div>
                )}
            </>
        );
    }

    // Row content component
    const RowContent = ({ row, rowIndex }: { row: TableDataRow; rowIndex: number }) => (
        <>
            {row.items.map((item, index) => {
                const header = headers[index];
                return (
                    <td
                        key={`item-${rowIndex}-${index}`}
                        className={cn(
                            'px-4 py-3',
                            item.className,
                            header?.priority && header.priority > 1 && 'hidden md:table-cell',
                        )}
                    >
                        {item.value ? <div className="text-gray-900">{item.value}</div> : item.node}
                    </td>
                );
            })}

            {row.menuItems && row.menuItems.length > 0 && (
                <td className="relative px-2 py-3 text-right  ">
                    <button
                        onClick={(e) => handleMenuToggle(e, row.id)}
                        className="flex items-center justify-center w-8 h-8 text-gray-400 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        aria-label="Row actions"
                    >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>

                    {menuOpen === row.id && (
                        <div className="absolute right-0 z-20 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                {row.menuItems.map((menuItem, index) => (
                                    <button
                                        key={`menu-item-${index}`}
                                        onClick={(e) => handleMenuItemClick(e, menuItem.onClick)}
                                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                        role="menuitem"
                                    >
                                        {menuItem.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </td>
            )}
        </>
    );

    return (
        <div className="relative w-full">
            {loading && (
                <div className="absolute inset-0 z-2 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <Spinner />
                </div>
            )}

            {isScrollable && (
                <div className="text-xs text-gray-300 w-full text-center md:border-x py-1 pb-3 bg-white -mb-2">
                    <span>← Scroll horizontally to view more →</span>
                </div>
            )}

            <div
                id="table-container"
                className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm"
                role="region"
                aria-label="Scrollable table"
            >
                <table id="responsive-table" className="w-full divide-y divide-gray-200 text-sm">
                    {caption && <caption className="sr-only">{caption}</caption>}
                    <thead
                        className={cn(
                            'bg-gray-50 text-xs uppercase text-gray-800',
                            stickyHeader && 'sticky top-0 z-10',
                        )}
                    >
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header.key}
                                    scope="col"
                                    className={cn(
                                        'px-4 py-3 text-left font-medium tracking-wider',
                                        !header.disableSort && 'cursor-pointer select-none',
                                        header.width && header.width,
                                        header.className,
                                        header.priority && header.priority > 1 && 'hidden md:table-cell',
                                    )}
                                    onClick={() => !header.disableSort && onChangeSort(header.key)}
                                    style={header.width ? { width: header.width } : undefined}
                                >
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                        <span>{header.title}</span>
                                        {!header.disableSort && renderSortIcon(header.key)}
                                    </div>
                                </th>
                            ))}
                            {rows.some((row) => row.menuItems && row.menuItems.length > 0) && (
                                <th scope="col" className="relative w-10 px-2">
                                    <span className="sr-only">Actions</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {rows.map((row, rowIndex) => (
                            <tr
                                key={`row-${rowIndex}`}
                                className={cn(
                                    'group transition-colors',
                                    (onRowClick || rowLink) && 'cursor-pointer hover:bg-gray-50',
                                )}
                                onClick={() => onRowClick && onRowClick(row.id, rowIndex)}
                            >
                                {rowLink ? (
                                    <Link
                                        href={rowLink(row.id)}
                                        className="contents"
                                        aria-label={`View details for row ${rowIndex + 1}`}
                                    >
                                        <RowContent row={row} rowIndex={rowIndex} />
                                    </Link>
                                ) : (
                                    <RowContent row={row} rowIndex={rowIndex} />
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;

/* eslint-disable react/prop-types */
'use client';

import React, { useEffect, useState, useCallback, Fragment, useRef } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronUpIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import Spinner from './Spinner';
import { Menu, Transition } from '@headlessui/react';
import { createPortal } from 'react-dom';

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

// Row content component - moved outside main component for better memoization
const RowContent = React.memo(
    ({
        row,
        rowIndex,
        headers,
        handleMenuItemClick,
    }: {
        row: TableDataRow;
        rowIndex: number;
        headers: TableHeader[];
        handleMenuItemClick: (e: React.MouseEvent, onClick: () => void) => void;
    }) => (
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

            {row.menuItems?.length > 0 && (
                <td className="relative px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Menu as="div" className="relative inline-block text-left">
                        {({ open }) => {
                            const buttonRef = useRef<HTMLButtonElement>(null);
                            const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
                            useEffect(() => {
                                if (open && buttonRef.current) {
                                    const updatePosition = () => {
                                        if (!buttonRef.current) return;

                                        const rect = buttonRef.current.getBoundingClientRect();
                                        const viewportHeight = window.innerHeight;
                                        const viewportWidth = window.innerWidth;

                                        // Menu dimensions
                                        const menuHeight = 200;
                                        const menuWidth = 192;

                                        // Calculate vertical position (always below the button)
                                        const top = rect.bottom + 4; // Always position below with 4px gap

                                        // Calculate horizontal position
                                        let left: number;
                                        const idealLeft = rect.right - menuWidth; // Align right edge of menu with right edge of button

                                        if (idealLeft < 10) {
                                            // If no space on left, align left edge of menu with left edge of button
                                            left = rect.left;
                                        } else if (idealLeft + menuWidth > viewportWidth - 10) {
                                            // Adjust if menu would go off-screen
                                            left = viewportWidth - menuWidth - 10;
                                        } else {
                                            left = idealLeft;
                                        }

                                        setMenuPosition({ top, left });
                                    };

                                    // Initial position calculation
                                    updatePosition();

                                    // Update position on scroll or resize
                                    const handleUpdate = () => updatePosition();
                                    window.addEventListener('scroll', handleUpdate, true);
                                    window.addEventListener('resize', handleUpdate);

                                    return () => {
                                        window.removeEventListener('scroll', handleUpdate, true);
                                        window.removeEventListener('resize', handleUpdate);
                                    };
                                }
                            }, [open]);

                            return (
                                <>
                                    <Menu.Button
                                        ref={buttonRef}
                                        className="flex items-center justify-center w-8 h-8 text-gray-400 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200"
                                        aria-label="Row actions"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <EllipsisVerticalIcon className="w-4 h-4" />
                                    </Menu.Button>

                                    {open &&
                                        typeof window !== 'undefined' &&
                                        createPortal(
                                            <div
                                                className="fixed w-48 rounded-lg bg-white border border-gray-200 shadow-lg py-1 z-[50]"
                                                style={{
                                                    top: `${menuPosition.top}px`,
                                                    left: `${menuPosition.left}px`,
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Menu.Items static className="focus:outline-none">
                                                    {row.menuItems.map((menuItem, idx) => {
                                                        if (!menuItem) return null;

                                                        return (
                                                            <Menu.Item key={idx}>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={(e) =>
                                                                            handleMenuItemClick(e, menuItem.onClick)
                                                                        }
                                                                        className={`${
                                                                            active ? 'bg-gray-50' : ''
                                                                        } block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150`}
                                                                        role="menuitem"
                                                                    >
                                                                        {menuItem.title}
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        );
                                                    })}
                                                </Menu.Items>
                                            </div>,
                                            document.body,
                                        )}
                                </>
                            );
                        }}
                    </Menu>
                </td>
            )}
        </>
    ),
    (prevProps, nextProps) => {
        // Custom comparison function for memoization
        return (
            prevProps.row.id === nextProps.row.id &&
            prevProps.rowIndex === nextProps.rowIndex &&
            prevProps.row.items.length === nextProps.row.items.length
        );
    },
);
// Give RowContent a displayName for ESLint
RowContent.displayName = 'RowContent';

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

    // Handle menu item click
    const handleMenuItemClick = useCallback((e: React.MouseEvent, onClick: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    }, []);

    // Handle click outside to close menu
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const handleClickOutside = useCallback(() => {}, []);

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

    return (
        <div className="relative w-full">
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray/80 backdrop-blur-sm">
                    <Spinner />
                </div>
            )}

            {isScrollable && (
                <div className="text-xs text-gray-300 w-full text-center  border-x py-1 pb-3 bg-white -mb-2">
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
                    <tbody className="divide-y divide-gray-200 bg-white transition-none">
                        {rows.map((row, rowIndex) => {
                            return (
                                <tr
                                    key={`row-${row.id}`}
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
                                            <RowContent
                                                row={row}
                                                rowIndex={rowIndex}
                                                headers={headers}
                                                handleMenuItemClick={handleMenuItemClick}
                                            />
                                        </Link>
                                    ) : (
                                        <RowContent
                                            row={row}
                                            rowIndex={rowIndex}
                                            headers={headers}
                                            handleMenuItemClick={handleMenuItemClick}
                                        />
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;

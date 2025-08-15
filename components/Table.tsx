/* eslint-disable react/prop-types */
'use client';

import React, { useEffect, useState, useCallback, Fragment, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronUpIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import Spinner from './Spinner';
import { Menu } from '@headlessui/react';
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
        icon?: React.ReactNode;
        description?: string;
        variant?: 'default' | 'success' | 'warning' | 'danger';
        divider?: boolean; // Add divider after this item
        disabled?: boolean; // Add disabled state for menu items
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
const RowContent = ({
    row,
    rowIndex,
    headers,
    handleMenuItemClick,
}: {
    row: TableDataRow;
    rowIndex: number;
    headers: TableHeader[];
    handleMenuItemClick: (e: React.MouseEvent, onClick: () => void, close?: () => void) => void;
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
            <td className="relative px-2 py-3 text-right" onClick={(e) => e.stopPropagation()} data-menu-item>
                <Menu as="div" className="relative inline-block text-left" data-menu-item>
                    {({ open, close }) => {
                        const buttonRef = useRef<HTMLButtonElement>(null);
                        const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
                        useEffect(() => {
                            if (open && buttonRef.current) {
                                const updatePosition = () => {
                                    if (!buttonRef.current) return;

                                    const rect = buttonRef.current.getBoundingClientRect();
                                    const viewportWidth = window.innerWidth;

                                    // Menu dimensions
                                    const menuWidth = 256; // Updated for w-56 sm:w-64 (14rem/16rem)

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
                                    className="group relative inline-flex items-center px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 rounded-lg border border-gray-200/60 hover:border-gray-300/70 focus:ring-2 focus:ring-gray-300/30 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden"
                                    aria-label="Row actions"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <EllipsisVerticalIcon className="w-4 h-4 relative" />
                                </Menu.Button>

                                {open &&
                                    typeof window !== 'undefined' &&
                                    createPortal(
                                        <div
                                            className="fixed w-56 sm:w-64 rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 shadow-xl ring-1 ring-black/5 z-[50]"
                                            style={{
                                                top: `${menuPosition.top}px`,
                                                left: `${menuPosition.left}px`,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Menu.Items className="focus:outline-none">
                                                {(() => {
                                                    const groups: React.ReactNode[][] = [[]];
                                                    let currentGroupIndex = 0;

                                                    row.menuItems.forEach((menuItem, idx) => {
                                                        if (!menuItem) return;

                                                        const getVariantStyles = (variant: string, active: boolean) => {
                                                            switch (variant) {
                                                                case 'success':
                                                                    return {
                                                                        container: active
                                                                            ? 'bg-green-50/80 text-green-900'
                                                                            : 'text-gray-900',
                                                                        iconBg: active ? 'bg-green-100' : 'bg-gray-100',
                                                                        iconColor: active
                                                                            ? 'text-green-600'
                                                                            : 'text-gray-600',
                                                                    };
                                                                case 'warning':
                                                                    return {
                                                                        container: active
                                                                            ? 'bg-yellow-50/80 text-yellow-900'
                                                                            : 'text-gray-900',
                                                                        iconBg: active
                                                                            ? 'bg-yellow-100'
                                                                            : 'bg-gray-100',
                                                                        iconColor: active
                                                                            ? 'text-yellow-600'
                                                                            : 'text-gray-600',
                                                                    };
                                                                case 'danger':
                                                                    return {
                                                                        container: active
                                                                            ? 'bg-red-50/80 text-red-900'
                                                                            : 'text-gray-900',
                                                                        iconBg: active ? 'bg-red-100' : 'bg-gray-100',
                                                                        iconColor: active
                                                                            ? 'text-red-600'
                                                                            : 'text-gray-600',
                                                                    };
                                                                default:
                                                                    return {
                                                                        container: active
                                                                            ? 'bg-blue-50/80 text-blue-900'
                                                                            : 'text-gray-900',
                                                                        iconBg: active ? 'bg-blue-100' : 'bg-gray-100',
                                                                        iconColor: active
                                                                            ? 'text-blue-600'
                                                                            : 'text-gray-600',
                                                                    };
                                                            }
                                                        };

                                                        groups[currentGroupIndex].push(
                                                            <Menu.Item key={idx}>
                                                                {({ active }) => {
                                                                    const styles = getVariantStyles(
                                                                        menuItem.variant || 'default',
                                                                        active,
                                                                    );
                                                                    return (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                if (!menuItem.disabled) {
                                                                                    handleMenuItemClick(
                                                                                        e,
                                                                                        menuItem.onClick,
                                                                                        close,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            disabled={menuItem.disabled}
                                                                            className={`${
                                                                                styles.container
                                                                            } group flex rounded-lg items-center w-full px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                                                                menuItem.disabled
                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                    : ''
                                                                            }`}
                                                                            role="menuitem"
                                                                        >
                                                                            {menuItem.icon && (
                                                                                <div
                                                                                    className={`${styles.iconBg} w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors flex-shrink-0`}
                                                                                >
                                                                                    <div
                                                                                        className={`${styles.iconColor} w-4 h-4 [&>svg]:w-4 [&>svg]:h-4`}
                                                                                    >
                                                                                        {menuItem.icon}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex-1 text-left min-w-0">
                                                                                <div className="font-medium truncate">
                                                                                    {menuItem.title}
                                                                                </div>
                                                                                {menuItem.description && (
                                                                                    <div className="text-xs text-gray-500 truncate">
                                                                                        {menuItem.description}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                }}
                                                            </Menu.Item>,
                                                        );

                                                        if (menuItem.divider) {
                                                            currentGroupIndex++;
                                                            groups[currentGroupIndex] = [];
                                                        }
                                                    });

                                                    return groups.map((group, groupIdx) => (
                                                        <div key={groupIdx} className="px-1 py-1">
                                                            {group}
                                                        </div>
                                                    ));
                                                })()}
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
);

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
    const router = useRouter();
    const [sort, setSort] = useState<Sort>(sortProps);
    const [isScrollable, setIsScrollable] = useState(false);

    // Update sort when props change
    useEffect(() => {
        setSort(sortProps);
    }, [sortProps]);

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
    const handleMenuItemClick = useCallback((e: React.MouseEvent, onClick: () => void, close?: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
        if (close) {
            close(); // Close the menu after executing the action
        }
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

            <div
                id="table-container"
                className="w-full overflow-x-auto rounded-lg  border border-gray-200 shadow-sm"
                role="region"
                aria-label="Scrollable table"
            >
                <table id="responsive-table" className="w-full divide-y divide-gray-200 text-sm">
                    {caption && <caption className="sr-only">{caption}</caption>}
                    <thead
                        className={cn('bg-gray-50 text-xs uppercase text-gray-800', stickyHeader && 'sticky top-0 ')}
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
                                    onClick={(e) => {
                                        // Prevent navigation if clicking on menu items
                                        if ((e.target as HTMLElement).closest('[data-menu-item]')) {
                                            return;
                                        }

                                        if (onRowClick) {
                                            onRowClick(row.id, rowIndex);
                                        } else if (rowLink) {
                                            // Use Next.js router for programmatic navigation
                                            const href = rowLink(row.id);
                                            router.push(href);
                                        }
                                    }}
                                >
                                    <RowContent
                                        row={row}
                                        rowIndex={rowIndex}
                                        headers={headers}
                                        handleMenuItemClick={handleMenuItemClick}
                                    />
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

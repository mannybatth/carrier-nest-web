import type React from 'react';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadStatus } from '@prisma/client';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, CalendarDaysIcon, TruckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useLoadContext } from 'components/context/LoadContext';
import { isDate24HrInThePast, loadStatus, UILoadStatus } from 'lib/load/load-utils';
import { DownloadInvoicePDFButton } from 'components/invoices/invoicePdf';

type LoadDetailsInfoProps = {
    changeLoadStatus: (newStatus: LoadStatus) => void;
};

const LoadDetailsInfo: React.FC<LoadDetailsInfoProps> = ({ changeLoadStatus }) => {
    const { load } = useLoadContext();
    const [dropOffDatePassed, setDropOffDatePassed] = useState(false);
    const [loadStatusValue, setLoadStatusValue] = useState(null);
    const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });

    useEffect(() => {
        if (load) {
            //setDropOffDatePassed(isDate24HrInThePast(new Date(load.receiver.date)));
            setLoadStatusValue(loadStatus(load));
        }
    }, [load]);

    // Calculate button position for fixed dropdown
    const updateDropdownPosition = () => {
        if (buttonRef) {
            const rect = buttonRef.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 8, // 8px gap below button
                left: rect.left + window.scrollX,
                right: window.innerWidth - rect.right - window.scrollX,
            });
        }
    };

    useEffect(() => {
        updateDropdownPosition();
        const handleResize = () => updateDropdownPosition();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize);
        };
    }, [buttonRef]);

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    // Helper function to get badge styling based on status
    const getStatusBadgeStyle = (status: UILoadStatus) => {
        switch (status) {
            case UILoadStatus.BOOKED:
                return {
                    bg: 'bg-blue-100 hover:bg-blue-200',
                    text: 'text-blue-800',
                    border: 'border-blue-200 hover:border-blue-300',
                    icon: 'text-blue-600',
                };
            case UILoadStatus.IN_PROGRESS:
                return {
                    bg: 'bg-amber-100 hover:bg-amber-200',
                    text: 'text-amber-800',
                    border: 'border-amber-200 hover:border-amber-300',
                    icon: 'text-amber-600',
                };
            case UILoadStatus.DELIVERED:
                return {
                    bg: 'bg-green-100 hover:bg-green-200',
                    text: 'text-green-800',
                    border: 'border-green-200 hover:border-green-300',
                    icon: 'text-green-600',
                };
            default:
                return {
                    bg: 'bg-gray-100 hover:bg-gray-200',
                    text: 'text-gray-800',
                    border: 'border-gray-200 hover:border-gray-300',
                    icon: 'text-gray-600',
                };
        }
    };

    const statusStyle = getStatusBadgeStyle(loadStatusValue);

    return (
        <div className="px-4 sm:px-6 mt-2 bg-gray-50 mb-6 rounded-xl border border-gray-100">
            {/* Header with key information */}
            <div className="p-0 py-4 pb-2 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900">Order# {load.refNum}</h2>
                        <p className="  text-md text-gray-500">Load# {load.loadNum}</p>
                    </div>
                    <div>
                        {load &&
                        !dropOffDatePassed &&
                        (loadStatusValue === UILoadStatus.BOOKED ||
                            loadStatusValue === UILoadStatus.IN_PROGRESS ||
                            loadStatusValue === UILoadStatus.DELIVERED) ? (
                            <Menu as="div" className="text-left z-[1000]">
                                <div>
                                    <Menu.Button
                                        ref={setButtonRef}
                                        onClick={updateDropdownPosition}
                                        className={`inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/20 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                                    >
                                        Status:&nbsp;<span className="font-bold">{loadStatusValue?.toUpperCase()}</span>
                                        <ChevronDownIcon
                                            className={`w-4 h-4 ml-1.5 ${statusStyle.icon}`}
                                            aria-hidden="true"
                                        />
                                    </Menu.Button>
                                </div>
                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-200"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-150"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items
                                        className="fixed w-44 bg-white backdrop-blur-sm rounded-xl border border-gray-200/30 shadow-xl shadow-gray-500/10 focus:outline-none z-[1000]"
                                        style={{
                                            top: `${dropdownPosition.top}px`,
                                            left: `${dropdownPosition.left}px`,
                                        }}
                                    >
                                        <div className="py-1">
                                            {loadStatusValue !== UILoadStatus.BOOKED && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.CREATED)}
                                                            className={classNames(
                                                                active
                                                                    ? 'bg-gray-50/70 text-gray-900'
                                                                    : 'text-gray-700',
                                                                'flex items-center px-3 py-2 text-sm cursor-pointer transition-colors duration-150',
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-center w-5 h-5 mr-2 rounded bg-blue-100">
                                                                <CalendarDaysIcon className="w-3.5 h-3.5 text-blue-600" />
                                                            </div>
                                                            Booked
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {loadStatusValue !== UILoadStatus.IN_PROGRESS && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.IN_PROGRESS)}
                                                            className={classNames(
                                                                active
                                                                    ? 'bg-gray-50/70 text-gray-900'
                                                                    : 'text-gray-700',
                                                                'flex items-center px-3 py-2 text-sm cursor-pointer transition-colors duration-150',
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-center w-5 h-5 mr-2 rounded bg-amber-100">
                                                                <TruckIcon className="w-3.5 h-3.5 text-amber-600" />
                                                            </div>
                                                            In Progress
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {loadStatusValue !== UILoadStatus.DELIVERED && (
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            onClick={() => changeLoadStatus(LoadStatus.DELIVERED)}
                                                            className={classNames(
                                                                active
                                                                    ? 'bg-gray-50/70 text-gray-900'
                                                                    : 'text-gray-700',
                                                                'flex items-center px-3 py-2 text-sm cursor-pointer transition-colors duration-150',
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-center w-5 h-5 mr-2 rounded bg-green-100">
                                                                <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                                                            </div>
                                                            Delivered
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            )}
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        ) : (
                            <div
                                className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border ${getStatusBadgeStyle(
                                    loadStatusValue,
                                ).bg.replace('hover:', '')} ${
                                    getStatusBadgeStyle(loadStatusValue).text
                                } ${getStatusBadgeStyle(loadStatusValue).border.replace('hover:', '')}`}
                            >
                                Status:&nbsp;
                                <span className="font-bold">{loadStatusValue?.toUpperCase() || 'UNKNOWN'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column */}
                    <div className="space-y-4">
                        {/* Customer */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Customer</h3>
                            {load.customer ? (
                                <Link
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                    href={`/customers/${load.customer.id}`}
                                >
                                    {load.customer.name}
                                </Link>
                            ) : (
                                <p className="text-base text-gray-700">No customer assigned</p>
                            )}
                        </div>
                        {/* Drivers */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Drivers</h3>
                            {load.driverAssignments && load.driverAssignments.length > 0 ? (
                                <div className="space-y-2">
                                    {Array.from(
                                        new Map(
                                            load.driverAssignments.map((assignment) => [
                                                assignment.driver.id,
                                                assignment,
                                            ]),
                                        ).values(),
                                    ).map((assignment, index) => (
                                        <div key={`${assignment.driver.id}-${index}`}>
                                            <Link
                                                href={`/drivers/${assignment.driver.id}`}
                                                className="text-base font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                {assignment.driver.name}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-base text-gray-700">No driver assigned</p>
                            )}
                        </div>

                        {/* Created At */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Created</h3>
                            <p className="text-base text-gray-900">
                                {new Date(load.createdAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: true,
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                        {/* Rate */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Rate</h3>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(Number(load.rate))}</p>
                        </div>

                        {/* Invoice */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-0">Invoice</h3>
                            {load.invoice ? (
                                <div className="space-y-3">
                                    <Link
                                        className="text-base font-medium text-blue-600 hover:text-blue-800"
                                        href={`/invoices/${load.invoice.id}`}
                                    >
                                        #{load.invoice.invoiceNum}
                                    </Link>
                                    <div className="mt-2 border bg-gray-100  border-white rounded-md">
                                        <DownloadInvoicePDFButton
                                            invoice={load.invoice}
                                            customer={load.customer}
                                            load={load}
                                            fileName={`invoice-${load.invoice.invoiceNum}.pdf`}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-base text-gray-700">No invoice</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadDetailsInfo;

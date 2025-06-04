'use client';

import {
    CurrencyDollarIcon,
    HomeIcon,
    IdentificationIcon,
    MapPinIcon,
    TruckIcon,
    UserGroupIcon,
    WrenchIcon,
    CreditCardIcon,
    BanknotesIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import {
    CurrencyDollarIcon as CurrencyDollarIconSolid,
    HomeIcon as HomeIconSolid,
    IdentificationIcon as IdentificationIconSolid,
    MapPinIcon as MapPinIconSolid,
    TruckIcon as TruckIconSolid,
    UserGroupIcon as UserGroupIconSolid,
    WrenchIcon as WrenchIconSolid,
    CreditCardIcon as CreditCardIconSolid,
    BanknotesIcon as BanknotesIconSolid,
    FunnelIcon as FunnelIconSolid,
} from '@heroicons/react/24/solid';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type React from 'react';

const navigation = [
    {
        name: 'Operations',
        href: '/',
        icon: HomeIcon,
        iconSolid: HomeIconSolid,
    },
    {
        name: 'Loads',
        href: '/loads',
        icon: TruckIcon,
        iconSolid: TruckIconSolid,
    },
    {
        name: 'Invoices',
        href: '/invoices',
        icon: CurrencyDollarIcon,
        iconSolid: CurrencyDollarIconSolid,
    },
    {
        name: 'Driver Pay',
        href: '/driverinvoices?show=all',
        icon: BanknotesIcon,
        iconSolid: BanknotesIconSolid,
    },
    {
        name: 'Drivers',
        href: '/drivers',
        icon: IdentificationIcon,
        iconSolid: IdentificationIconSolid,
    },
    {
        name: 'IFTA',
        href: '/ifta',
        icon: FunnelIcon,
        iconSolid: FunnelIconSolid,
        comingSoon: true,
    },
    {
        name: 'Customers',
        href: '/customers',
        icon: UserGroupIcon,
        iconSolid: UserGroupIconSolid,
    },
    {
        name: 'Stop Locations',
        href: '/locations',
        icon: MapPinIcon,
        iconSolid: MapPinIconSolid,
    },
    {
        name: 'Equipments',
        href: '/equipments',
        icon: WrenchIcon,
        iconSolid: WrenchIconSolid,
    },
    {
        name: 'Plan & Billing',
        href: '/billing',
        icon: CreditCardIcon,
        iconSolid: CreditCardIconSolid,
    },
];

interface NavigationProps {
    collapsed: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ collapsed }) => {
    const router = useRouter();

    const isActive = (href: string) => {
        const currentPath = router.pathname;
        const targetPath = href.split('?')[0];

        if (targetPath === '/' && currentPath === '/') {
            return true;
        }

        if (targetPath !== '/' && currentPath.startsWith(targetPath)) {
            return true;
        }

        return false;
    };

    return (
        <nav className={`${collapsed ? 'px-2' : 'px-3'} space-y-0.5 my-0`}>
            {navigation.map((item) => {
                const active = isActive(item.href);
                const IconComponent = active ? item.iconSolid : item.icon;

                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={classNames(
                            'group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out',
                            collapsed ? 'p-3 justify-center' : 'px-3 py-2.5',
                            active
                                ? 'bg-blue-100/70 text-blue-700 border-r-2 border-blue-600'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white',
                        )}
                        data-tooltip-id={collapsed ? 'tooltip' : undefined}
                        data-tooltip-content={collapsed ? item.name : undefined}
                        data-tooltip-place="right"
                    >
                        <IconComponent
                            className={classNames(
                                collapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3',
                                active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600',
                                'transition-colors duration-200 flex-shrink-0',
                            )}
                            aria-hidden="true"
                        />

                        {!collapsed && (
                            <span className="flex-1 transition-colors duration-200">
                                {item.name}
                                {item.comingSoon && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        Soon
                                    </span>
                                )}
                            </span>
                        )}

                        {/* Active indicator for collapsed state */}
                        {active && collapsed && (
                            <div className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 bg-blue-600 rounded-full" />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
};

export default Navigation;

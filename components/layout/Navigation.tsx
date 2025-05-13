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
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Loads', href: '/loads', icon: TruckIcon },
    { name: 'Invoices', href: '/invoices', icon: CurrencyDollarIcon },
    { name: 'Driver Pay', href: '/driverinvoices?show=all', icon: BanknotesIcon },
    { name: 'Drivers', href: '/drivers', icon: IdentificationIcon },
    { name: 'IFTA', href: '/ifta', icon: FunnelIcon },
    { name: 'Customers', href: '/customers', icon: UserGroupIcon },
    { name: 'Stop Locations', href: '/locations', icon: MapPinIcon },
    { name: 'Equipments', href: '/equipments', icon: WrenchIcon },
    { name: 'Plan & Billing', href: '/billing', icon: CreditCardIcon },
];

const Navigation: React.FC = () => {
    const router = useRouter();

    const isActive = (href: string) => {
        const currentPath = router.pathname; // e.g., '/loads/123' or '/driverinvoices/create-invoice'
        const targetPath = href.split('?')[0]; // Remove any query parameters from href

        // Special case for the root path '/'
        if (targetPath === '/' && currentPath === '/') {
            return true;
        }

        // If targetPath is not '/', check if currentPath starts with targetPath
        if (targetPath !== '/' && currentPath.startsWith(targetPath)) {
            return true;
        }

        return false;
    };

    return (
        <div>
            <nav className="flex-1 mt-5">
                {navigation.map((item) => (
                    <Link
                        href={item.href}
                        key={item.name}
                        className={classNames(
                            isActive(item.href)
                                ? 'bg-gray-200 text-zinc-700 font-bold'
                                : 'text-zinc-600 hover:bg-gray-200 hover:text-zinc-700',
                            'flex items-center px-4 py-2 text-sm  hover:cursor-pointer  active:bg-gray-300 group',
                        )}
                    >
                        <>
                            <item.icon
                                className={classNames(
                                    isActive(item.href)
                                        ? 'text-slate-600'
                                        : 'text-slate-500 group-hover:text-slate-600',
                                    'mr-3 flex-shrink-0 w-4 h-4',
                                )}
                                aria-hidden="true"
                            />
                            {item.name.includes('IFTA') ? (
                                <>
                                    {item.name}
                                    <span className="text-blue-600"> (coming soon)</span>
                                </>
                            ) : (
                                <span className="text-sm font-medium">{item.name}</span>
                            )}
                        </>
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default Navigation;

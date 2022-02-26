import React from 'react';
import {
    ChartPieIcon,
    CogIcon,
    CurrencyDollarIcon,
    HomeIcon,
    IdentificationIcon,
    TruckIcon,
    UserGroupIcon,
} from '@heroicons/react/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Loads', href: '/loads', icon: TruckIcon },
    { name: 'Customers', href: '/customers', icon: UserGroupIcon },
    { name: 'Drivers', href: '/drivers', icon: IdentificationIcon },
    { name: 'Accounting', href: '/accounting', icon: CurrencyDollarIcon },
    { name: 'Reporting', href: '/reporting', icon: ChartPieIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
];

const Navigation: React.FC = () => {
    const router = useRouter();

    const isActive = (href: string) => {
        return router.pathname === href;
    };

    return (
        <div>
            <nav className="flex-1 mt-5">
                {navigation.map((item) => (
                    <Link href={item.href} key={item.name}>
                        <a
                            className={classNames(
                                isActive(item.href)
                                    ? 'bg-gray-200 text-zinc-700 font-bold'
                                    : 'text-zinc-600 hover:bg-gray-200 hover:text-zinc-700',
                                'flex items-center px-4 py-2 text-sm  hover:cursor-pointer  active:bg-gray-300 group',
                            )}
                        >
                            <item.icon
                                className={classNames(
                                    isActive(item.href)
                                        ? 'text-slate-600'
                                        : 'text-slate-500 group-hover:text-slate-600',
                                    'mr-3 flex-shrink-0 w-4 h-4',
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </a>
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default Navigation;

import {
    CurrencyDollarIcon,
    HomeIcon,
    IdentificationIcon,
    MapPinIcon,
    TruckIcon,
    UserGroupIcon,
    WrenchIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Loads', href: '/loads', icon: TruckIcon },
    { name: 'Customers', href: '/customers', icon: UserGroupIcon },
    { name: 'Drivers', href: '/drivers', icon: IdentificationIcon },
    { name: 'Accounting', href: '/accounting', icon: CurrencyDollarIcon },
    { name: 'Stop Locations', href: '/locations', icon: MapPinIcon },
    { name: 'Equipments', href: '/equipments', icon: WrenchIcon },
];

const Navigation: React.FC = () => {
    const router = useRouter();

    const isActive = (href: string) => {
        const splits = href.split('/');
        const current = router.pathname.split('/');
        if (splits.length > 0 && current.length > 0) {
            return splits[1] === current[1];
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
                            {item.name}
                        </>
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default Navigation;

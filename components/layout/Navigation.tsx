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

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const navigation = [
    { name: 'Dashboard', href: '#', icon: HomeIcon, current: true },
    { name: 'Loads', href: '#', icon: TruckIcon, current: false },
    { name: 'Customers', href: '#', icon: UserGroupIcon, current: false },
    { name: 'Drivers', href: '#', icon: IdentificationIcon, current: false },
    { name: 'Accounting', href: '#', icon: CurrencyDollarIcon, current: false },
    { name: 'Reporting', href: '#', icon: ChartPieIcon, current: false },
    { name: 'Settings', href: '#', icon: CogIcon, current: false },
];

const Navigation: React.FC = () => (
    <div>
        <nav className="flex-1 mt-5 ">
            {navigation.map((item) => (
                <a
                    key={item.name}
                    href={item.href}
                    className={classNames(
                        item.current
                            ? 'bg-gray-200 text-zinc-700 font-bold'
                            : 'text-zinc-600 hover:bg-gray-200 hover:text-zinc-700',
                        'flex items-center px-4 py-2 text-sm  hover:cursor-pointer  active:bg-gray-300 group',
                    )}
                >
                    <item.icon
                        className={classNames(
                            item.current ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-600',
                            'mr-3 flex-shrink-0 w-4 h-4',
                        )}
                        aria-hidden="true"
                    />
                    {item.name}
                </a>
            ))}
        </nav>
    </div>
);

export default Navigation;

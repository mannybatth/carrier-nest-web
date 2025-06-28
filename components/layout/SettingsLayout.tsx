import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    BuildingOfficeIcon,
    CpuChipIcon,
    BellIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    CogIcon,
} from '@heroicons/react/24/outline';
import {
    BuildingOfficeIcon as BuildingOfficeIconSolid,
    CpuChipIcon as CpuChipIconSolid,
    BellIcon as BellIconSolid,
    ShieldCheckIcon as ShieldCheckIconSolid,
    UserGroupIcon as UserGroupIconSolid,
    CogIcon as CogIconSolid,
} from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { useSidebar } from '../../contexts/SidebarContext';
import Layout from './Layout';

interface SettingsLayoutProps {
    children: React.ReactNode;
    title: string;
    maxWidth?: 'full' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const settingsNavItems = [
    {
        name: 'General',
        href: '/settings',
        icon: BuildingOfficeIcon,
        iconSolid: BuildingOfficeIconSolid,
        description: 'Company information and basic settings',
    },
    {
        name: 'ELD Providers',
        href: '/settings/eld-providers',
        icon: CpuChipIcon,
        iconSolid: CpuChipIconSolid,
        description: 'Electronic Logging Device integrations',
    },
    {
        name: 'Notifications',
        href: '/settings/notifications',
        icon: BellIcon,
        iconSolid: BellIconSolid,
        description: 'Email and SMS notification preferences',
        comingSoon: true,
    },
    {
        name: 'Security',
        href: '/settings/security',
        icon: ShieldCheckIcon,
        iconSolid: ShieldCheckIconSolid,
        description: 'Password and security settings',
        comingSoon: true,
    },
    {
        name: 'Team',
        href: '/settings/team',
        icon: UserGroupIcon,
        iconSolid: UserGroupIconSolid,
        description: 'Manage team members and permissions',
    },
    {
        name: 'Advanced',
        href: '/settings/advanced',
        icon: CogIcon,
        iconSolid: CogIconSolid,
        description: 'Advanced configuration options',
        comingSoon: true,
    },
];

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children, title, maxWidth = '3xl' }) => {
    const router = useRouter();
    const { sidebarCollapsed } = useSidebar();

    const isActivePath = (href: string) => {
        if (href === '/settings') {
            return router.pathname === '/settings';
        }
        return router.pathname.startsWith(href);
    }; // Calculate settings sidebar position based on main sidebar state
    const settingsSidebarLeft = sidebarCollapsed ? 'md:left-16' : 'md:left-64';

    // Content should be positioned right after the settings sidebar, not both sidebars
    // Just need to account for the settings sidebar width (256px = 64 in Tailwind)
    const contentMarginLeft = 'md:ml-64'; // Always 256px margin for settings sidebar width

    // Settings sidebar positioning classes with dynamic left positioning and standard styling
    const sidebarClasses = `hidden md:block md:fixed md:inset-y-0 ${settingsSidebarLeft} md:w-64 bg-gradient-to-b from-slate-50 to-gray-100 border-r border-gray-200 shadow-sm z-1 transition-all duration-300 ease-in-out`;

    // Generate max-width class based on prop
    const maxWidthClass = maxWidth === 'full' ? 'max-w-full' : `max-w-${maxWidth}`;

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                </div>
            }
        >
            <div className="min-h-screen bg-gray-50 relative">
                {/* Settings Sidebar - Dynamically positioned based on main sidebar state */}
                <div className={sidebarClasses}>
                    <div className="flex flex-col flex-1 min-h-0 bg-gradient-to-b from-slate-50 to-gray-100">
                        <div className="px-6 py-6 border-b border-slate-200 bg-white/80">
                            <h1 className="text-xl font-bold text-slate-900 mb-1">Settings</h1>
                            <p className="text-sm text-slate-600">Manage your account and application preferences</p>
                        </div>

                        <nav className="px-3 py-4 space-y-0.5 flex-1 overflow-y-auto">
                            {settingsNavItems.map((item) => {
                                const isActive = isActivePath(item.href);
                                const IconComponent = isActive ? item.iconSolid : item.icon;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.comingSoon ? '#' : item.href}
                                        className={classNames(
                                            'group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out px-3 py-2.5',
                                            isActive
                                                ? 'bg-blue-100/70 text-blue-700 border-r-2 border-blue-600'
                                                : item.comingSoon
                                                ? 'text-slate-400 cursor-not-allowed'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                                            !item.comingSoon &&
                                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white',
                                        )}
                                        onClick={(e) => {
                                            if (item.comingSoon) {
                                                e.preventDefault();
                                            }
                                        }}
                                    >
                                        <IconComponent
                                            className={classNames(
                                                'h-5 w-5 mr-3 flex-shrink-0 transition-colors duration-200',
                                                isActive
                                                    ? 'text-blue-600'
                                                    : item.comingSoon
                                                    ? 'text-slate-300'
                                                    : 'text-slate-400 group-hover:text-slate-600',
                                            )}
                                            aria-hidden="true"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <span className="transition-colors duration-200">{item.name}</span>
                                                {item.comingSoon && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                        Soon
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'text-xs mt-0.5 transition-colors duration-200',
                                                    isActive
                                                        ? 'text-blue-600/70'
                                                        : item.comingSoon
                                                        ? 'text-slate-300'
                                                        : 'text-slate-500',
                                                )}
                                            >
                                                {item.description}
                                            </div>
                                        </div>
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 bg-blue-600 rounded-full" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Mobile Settings Navigation */}
                <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
                    <div className="mb-3">
                        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                    </div>
                    <div className="flex overflow-x-auto space-x-1 pb-2">
                        {settingsNavItems.map((item) => {
                            const isActive = isActivePath(item.href);
                            const IconComponent = isActive ? item.iconSolid : item.icon;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.comingSoon ? '#' : item.href}
                                    className={classNames(
                                        'flex items-center px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap text-sm font-medium',
                                        isActive
                                            ? 'bg-blue-100/70 text-blue-700 border border-blue-200'
                                            : item.comingSoon
                                            ? 'text-slate-400 cursor-not-allowed'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                    )}
                                    onClick={(e) => {
                                        if (item.comingSoon) {
                                            e.preventDefault();
                                        }
                                    }}
                                >
                                    <IconComponent
                                        className={classNames(
                                            'h-4 w-4 mr-2 flex-shrink-0 transition-colors duration-200',
                                            isActive
                                                ? 'text-blue-600'
                                                : item.comingSoon
                                                ? 'text-slate-300'
                                                : 'text-slate-400',
                                        )}
                                    />
                                    <span>{item.name}</span>
                                    {item.comingSoon && (
                                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                                            Soon
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Area - Positioned right after settings sidebar with configurable max width */}
                <div className={`${contentMarginLeft} min-h-screen transition-all duration-300 ease-in-out`}>
                    <div className="bg-gray-50 min-h-screen">
                        <div className={`px-4 md:px-8 py-6 md:py-8 ${maxWidthClass}`}>
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-6">{children}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default SettingsLayout;

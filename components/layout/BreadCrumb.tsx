import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import React from 'react';

export type BreadCrumbPath = {
    label: string;
    href?: string;
};

export type Props = {
    className?: string;
    paths: BreadCrumbPath[];
};

const BreadCrumb: React.FC<Props> = ({ paths, ...props }) => {
    return (
        <div {...props}>
            <div className="hidden md:block">
                <nav className="flex items-center space-x-1" aria-label="Breadcrumb">
                    {paths.map((path, index) => (
                        <div key={index} className="flex items-center">
                            {path.href ? (
                                <Link
                                    href={path.href}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline hover:decoration-2 hover:underline-offset-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 rounded-md"
                                >
                                    {path.label}
                                </Link>
                            ) : (
                                <span className="px-3 py-1.5 text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                                    {path.label}
                                </span>
                            )}
                            {index !== paths.length - 1 && <ChevronRightIcon className="w-4 h-4 mx-3 text-gray-400" />}
                        </div>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default BreadCrumb;

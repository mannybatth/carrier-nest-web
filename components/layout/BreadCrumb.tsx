import { ChevronRightIcon } from '@heroicons/react/outline';
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
            <div className="hidden text-sm md:block text-inherit">
                <div className="flex items-center">
                    {paths.map((path, index) => (
                        <span key={index}>
                            {(path.href && (
                                <Link href={path.href} className="text-inherit">
                                    {path.label}
                                </Link>
                            )) || <span className="text-inherit">{path.label}</span>}
                            {index !== paths.length - 1 && (
                                <ChevronRightIcon className="inline-block w-4 h-4 mx-1 text-zinc-500" />
                            )}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BreadCrumb;

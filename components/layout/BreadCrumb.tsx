import { ChevronRightIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import React from 'react';

export type Props = {
    className?: string;
};

const BreadCrumb: React.FC<Props> = ({ ...props }: Props) => {
    return (
        <div {...props}>
            <div className="hidden text-sm md:block text-inherit">
                <div className="flex items-center">
                    <Link href={'/loads'}>
                        <span className="cursor-pointer text-inherit">Loads</span>
                    </Link>
                    <ChevronRightIcon className="inline-block w-4 h-4 mx-1 text-zinc-500"></ChevronRightIcon>
                    <span>Create New Load</span>
                </div>
            </div>
        </div>
    );
};

export default BreadCrumb;

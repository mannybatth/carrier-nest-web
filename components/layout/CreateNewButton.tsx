import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import type React from 'react';

interface CreateNewButtonProps {
    className?: string;
    collapsed: boolean;
}

const CreateNewButton: React.FC<CreateNewButtonProps> = ({ className, collapsed }) => {
    if (collapsed) {
        return (
            <div className={className}>
                <Link
                    href="/loads/create"
                    className="flex items-center mb-3 justify-center w-full p-2.5 text-blue-600 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1 focus:ring-offset-transparent group"
                    data-tooltip-id="tooltip"
                    data-tooltip-content="New Load"
                    data-tooltip-place="right"
                >
                    <PlusIcon className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
                </Link>
            </div>
        );
    }

    return (
        <div className={className}>
            <Link
                href={'/loads/create'}
                className="flex items-center justify-center w-full px-3 py-2 mb-3 text-sm font-display font-medium text-blue-600 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1 focus:ring-offset-transparent group tracking-tight"
            >
                <span className="text-base font-normal mr-1.5 group-hover:scale-105 transition-transform duration-200">
                    +
                </span>
                New Load
            </Link>
        </div>
    );
};

export default CreateNewButton;

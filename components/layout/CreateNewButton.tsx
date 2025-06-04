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
                    className="flex items-center mb-4 justify-center w-full p-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Create New"
                    data-tooltip-place="right"
                >
                    <PlusIcon className="w-5 h-5" />
                </Link>
            </div>
        );
    }

    return (
        <div className={className}>
            <Link
                href={'/loads/create'}
                className="flex items-center justify-center w-full px-3 py-2.5 mb-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
            >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create New
            </Link>
        </div>
    );
};

export default CreateNewButton;

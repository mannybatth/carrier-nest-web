import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import React from 'react';

export type Props = {
    className?: string;
};

const CreateNewButton: React.FC<Props> = ({ className }) => {
    return (
        <div className="flex" {...{ className }}>
            <div className="relative">
                <div className="flex divide-x divide-blue-700 rounded-md shadow-sm">
                    <Link href="/loads/create" className="flex-1">
                        <button
                            type="button"
                            className="flex w-full items-center gap-x-1.5 rounded-md bg-blue-600 px-3 py-2 text-white shadow-sm hover:bg-blue-700"
                        >
                            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                            <p className="w-full text-sm font-semibold text-center">Create New Load</p>
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CreateNewButton;

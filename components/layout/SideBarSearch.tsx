import { SearchIcon } from '@heroicons/react/outline';
import React from 'react';

const SideBarSearch: React.FC = () => (
    <div className="mt-5 space-y-1 ">
        <a className="flex items-center px-4 py-2 text-sm text-zinc-600 hover:bg-gray-200 hover:cursor-pointer hover:text-zinc-700 active:bg-gray-300 group">
            <SearchIcon className="flex-shrink-0 w-4 h-4 mr-3 text-slate-500 group-hover:text-slate-600" />
            Quick Find
        </a>
    </div>
);

export default SideBarSearch;

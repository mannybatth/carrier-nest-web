import { ChevronDownIcon } from '@heroicons/react/outline';
import React from 'react';

const SideBarAccount: React.FC = () => (
    <div className="flex items-center flex-shrink-0 px-4 py-3 space-x-2 hover:bg-gray-200 hover:cursor-pointer active:bg-gray-300">
        <div className="flex items-center justify-center flex-shrink-0 w-4 h-4 text-xs font-medium text-white rounded-sm bg-neutral-400">
            P
        </div>
        <div className="flex-1">
            <div className="text-sm font-medium leading-4 text-zinc-600 line-clamp-1">PSB EXPRESS INC</div>
            <div className="text-xs font-medium leading-4 text-zinc-500 line-clamp-1">psbexpressinc@gmail.com</div>
        </div>
        <div className="flex-shrink-0">
            <ChevronDownIcon className="w-4 h-4 text-zinc-500"></ChevronDownIcon>
        </div>
    </div>
);

export default SideBarAccount;

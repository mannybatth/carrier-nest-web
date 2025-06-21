import type React from 'react';
import CarrierNextImage from '../images/CarrierNextImage';
import LogoSlogan from '../images/LogoSlogan';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface SideBarFooterProps {
    collapsed: boolean;
    onToggle?: () => void;
}

const SideBarFooter: React.FC<SideBarFooterProps> = ({ collapsed, onToggle }) => {
    if (collapsed) {
        return (
            <div className="flex flex-col items-center justify-center flex-shrink-0 mb-0 p-2">
                <button
                    onClick={onToggle}
                    className="relative flex items-center justify-center w-full h-full text-center group transition-all duration-200 hover:bg-slate-100 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    title="Expand sidebar"
                >
                    <div className="relative">
                        <Image
                            src={'/logo_truck_100.png'}
                            height={40}
                            width={40}
                            alt="Carrier Nest Logo"
                            className="rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105"
                        />
                        {/* Small expand indicator */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ChevronRightIcon className="w-3 h-3 text-white" />
                        </div>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center flex-shrink-0 mb-0">
            <button
                onClick={onToggle}
                className="relative flex flex-row gap-2 mt-1 items-end justify-start w-full h-full p-4 text-center rounded-md group transition-all duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Collapse sidebar"
            >
                <div className="flex">
                    <Image
                        src={'/logo_truck_100.png'}
                        height={60}
                        width={60}
                        alt="Carrier Nest Logo"
                        className="transition-transform duration-200 group-hover:scale-105"
                    />
                </div>
                <div className="flex flex-col items-start">
                    <CarrierNextImage className="mb-0" />
                    <LogoSlogan />
                </div>
                {/* Small collapse indicator */}
                <div className="absolute top-2 right-2 w-5 h-5 bg-slate-200/80 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ChevronLeftIcon className="w-3 h-3 text-slate-600" />
                </div>
            </button>
        </div>
    );
};

export default SideBarFooter;

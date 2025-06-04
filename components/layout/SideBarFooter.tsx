import type React from 'react';
import CarrierNextImage from '../images/CarrierNextImage';
import LogoSlogan from '../images/LogoSlogan';
import Image from 'next/image';

interface SideBarFooterProps {
    collapsed: boolean;
}

const SideBarFooter: React.FC<SideBarFooterProps> = ({ collapsed }) => {
    if (collapsed) {
        return (
            <div className="flex flex-col items-center justify-center flex-shrink-0 mb-0 p-2">
                <div className="relative flex items-center justify-center w-full h-full text-center">
                    <Image
                        src={'/logo_truck_100.png'}
                        height={40}
                        width={40}
                        alt="Carrier Nest Logo"
                        className="rounded-lg shadow-sm"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center flex-shrink-0 mb-0">
            <div className="relative flex flex-row gap-2 mt-1 items-end justify-start w-full h-full p-4 text-center rounded-md">
                <div className="flex">
                    <Image src={'/logo_truck_100.png'} height={60} width={60} alt="Carrier Nest Logo" />
                </div>
                <div className="flex flex-col items-start">
                    <CarrierNextImage className="mb-0" />
                    <LogoSlogan />
                </div>
            </div>
        </div>
    );
};

export default SideBarFooter;

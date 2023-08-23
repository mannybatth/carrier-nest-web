import Image from 'next/image';
import React from 'react';
import CarrierNextImage from '../images/CarrierNextImage';
import LogoSlogan from '../images/LogoSlogan';

const SideBarFooter: React.FC = () => (
    <div className="flex flex-col items-center justify-center flex-shrink-0 mb-8">
        <Image src="/logo_truck.svg" alt="Logo" width={100} height={58} className="w-[80px] opacity-30 mb-4"></Image>
        <CarrierNextImage className="mb-2" />
        <LogoSlogan />
    </div>
);

export default SideBarFooter;

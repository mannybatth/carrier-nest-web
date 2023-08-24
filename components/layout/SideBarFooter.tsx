import React from 'react';
import CarrierNextImage from '../images/CarrierNextImage';
import LogoSlogan from '../images/LogoSlogan';

const SideBarFooter: React.FC = () => (
    <div className="flex flex-col items-center justify-center flex-shrink-0 mb-8">
        <CarrierNextImage className="mb-2" />
        <LogoSlogan />
    </div>
);

export default SideBarFooter;

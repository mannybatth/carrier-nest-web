import { Load } from '@prisma/client';
import React from 'react';
import { loadStatus, UILoadStatus } from '../../lib/load/load-utils';

type Props = {
    load: Partial<Load>;
};

const LoadStatusBadge: React.FC<Props> = ({ load }) => {
    const [status, setStatus] = React.useState('');
    const [bgColor, setBgColor] = React.useState('bg-green-100');
    const [textColor, setTextColor] = React.useState('text-green-800');

    React.useEffect(() => {
        const statusText = loadStatus(load);
        setStatus(statusText);
        if (statusText === UILoadStatus.BOOKED) {
            setBgColor('bg-blue-100');
            setTextColor('text-blue-900');
        } else if (statusText === UILoadStatus.IN_PROGRESS) {
            setBgColor('bg-orange-100');
            setTextColor('text-orange-900');
        } else if (statusText === UILoadStatus.DELIVERED) {
            setBgColor('bg-green-100');
            setTextColor('text-green-800');
        } else if (statusText === UILoadStatus.POD_READY) {
            setBgColor('bg-red-100');
            setTextColor('text-red-800');
        } else if (statusText === UILoadStatus.INVOICED) {
            setBgColor('bg-purple-100');
            setTextColor('text-purple-800');
        } else if (statusText === UILoadStatus.PARTIALLY_PAID) {
            setBgColor('bg-green-100');
            setTextColor('text-green-800');
        } else if (statusText === UILoadStatus.PAID) {
            setBgColor('bg-green-100');
            setTextColor('text-green-800');
        } else if (statusText === UILoadStatus.OVERDUE) {
            setBgColor('bg-red-100');
            setTextColor('text-red-800');
        }
    }, [load]);

    return (
        <>
            <span className="hidden text-green-800 bg-green-100"></span>
            <span
                className={`inline-flex px-2 text-xs font-semibold leading-5 ${textColor} uppercase ${bgColor} rounded-full`}
            >
                {status}
            </span>
        </>
    );
};

export default LoadStatusBadge;

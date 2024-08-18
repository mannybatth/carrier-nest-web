import { RouteLeg, RouteLegStatus } from '@prisma/client';
import React from 'react';

type Props = {
    routeLeg: Partial<RouteLeg>;
};

const RouteLegStatusBadge: React.FC<Props> = ({ routeLeg }) => {
    const [status, setStatus] = React.useState('');
    const [bgColor, setBgColor] = React.useState('bg-green-100');
    const [textColor, setTextColor] = React.useState('text-green-800');
    const [tooltipText, setTooltipText] = React.useState('');

    React.useEffect(() => {
        const statusText = routeLeg.status;
        setStatus(statusText);
        if (statusText === RouteLegStatus.ASSIGNED) {
            setBgColor('bg-slate-100');
            setTextColor('text-slate-900');
        } else if (statusText === RouteLegStatus.IN_PROGRESS) {
            setBgColor('bg-orange-100');
            setTextColor('text-orange-900');
        } else if (statusText === RouteLegStatus.COMPLETED) {
            setBgColor('bg-cyan-100');
            setTextColor('text-cyan-800');
        }
    }, [routeLeg]);

    React.useEffect(() => {
        if (status === RouteLegStatus.ASSIGNED) {
            setTooltipText('Load has been assigned to a driver');
        } else if (status === RouteLegStatus.IN_PROGRESS) {
            setTooltipText('Load has been picked up and is in transit');
        } else if (status === RouteLegStatus.COMPLETED) {
            setTooltipText('Load has been delivered');
        }
    }, [status]);

    return (
        <span
            data-tooltip-id="tooltip"
            data-tooltip-content={tooltipText}
            className={`inline-flex px-2 text-xs font-semibold leading-5 ${textColor} uppercase ${bgColor} rounded-full whitespace-nowrap`}
        >
            {status}
        </span>
    );
};

export default RouteLegStatusBadge;

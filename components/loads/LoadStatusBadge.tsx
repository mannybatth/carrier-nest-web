import { Load } from '@prisma/client';
import React from 'react';
import { loadStatus, UILoadStatus } from '../../lib/load/load-utils';
import { Tooltip } from 'react-tooltip';

type Props = {
    load: Partial<Load>;
};

const LoadStatusBadge: React.FC<Props> = ({ load }) => {
    const [status, setStatus] = React.useState('');
    const [bgColor, setBgColor] = React.useState('bg-green-100');
    const [textColor, setTextColor] = React.useState('text-green-800');
    const [tooltipText, setTooltipText] = React.useState('');

    React.useEffect(() => {
        const statusText = loadStatus(load);
        setStatus(statusText);
        if (statusText === UILoadStatus.BOOKED) {
            setBgColor('bg-slate-100');
            setTextColor('text-slate-900');
        } else if (statusText === UILoadStatus.IN_PROGRESS) {
            setBgColor('bg-orange-100');
            setTextColor('text-orange-900');
        } else if (statusText === UILoadStatus.DELIVERED) {
            setBgColor('bg-cyan-100');
            setTextColor('text-cyan-800');
        } else if (statusText === UILoadStatus.POD_READY) {
            setBgColor('bg-purple-100');
            setTextColor('text-purple-800');
        } else if (statusText === UILoadStatus.INVOICED) {
            setBgColor('bg-purple-100');
            setTextColor('text-purple-800');
        } else if (statusText === UILoadStatus.PARTIALLY_PAID) {
            setBgColor('bg-lime-100');
            setTextColor('text-lime-800');
        } else if (statusText === UILoadStatus.PAID) {
            setBgColor('bg-green-200');
            setTextColor('text-green-900');
        } else if (statusText === UILoadStatus.OVERDUE) {
            setBgColor('bg-red-100');
            setTextColor('text-red-800');
        }
    }, [load]);

    React.useEffect(() => {
        if (status === UILoadStatus.BOOKED) {
            setTooltipText('Load is booked and ready to be picked up');
        } else if (status === UILoadStatus.IN_PROGRESS) {
            setTooltipText('Load has been picked up and is in transit');
        } else if (status === UILoadStatus.DELIVERED) {
            setTooltipText('Load has been delivered or is 24 hours after the delivery date');
        } else if (status === UILoadStatus.POD_READY) {
            setTooltipText('Proof of delivery has been uploaded');
        } else if (status === UILoadStatus.INVOICED) {
            setTooltipText('Invoice has been created');
        } else if (status === UILoadStatus.PARTIALLY_PAID) {
            setTooltipText('Partial payment has been made');
        } else if (status === UILoadStatus.PAID) {
            setTooltipText('Load has been paid in full');
        } else if (status === UILoadStatus.OVERDUE) {
            setTooltipText('Payments are overdue');
        }
    }, [status]);

    return (
        <>
            <span
                data-tooltip-id="tooltip"
                data-tooltip-content={tooltipText}
                className={`inline-flex px-2 text-xs font-semibold leading-5 ${textColor} uppercase ${bgColor} rounded-full whitespace-nowrap`}
            >
                {status}
            </span>
        </>
    );
};

export default LoadStatusBadge;

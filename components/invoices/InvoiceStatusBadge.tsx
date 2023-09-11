import React from 'react';
import { ExpandedInvoice, UIInvoiceStatus } from '../../interfaces/models';
import { invoiceStatus } from '../../lib/invoice/invoice-utils';

type Props = {
    invoice: ExpandedInvoice;
};

const InvoiceStatusBadge: React.FC<Props> = ({ invoice }) => {
    const [status, setStatus] = React.useState('');
    const [bgColor, setBgColor] = React.useState('bg-green-100');
    const [textColor, setTextColor] = React.useState('text-green-800');
    const [tooltipText, setTooltipText] = React.useState('');

    React.useEffect(() => {
        const statusText = invoiceStatus(invoice);
        setStatus(statusText);
        if (statusText === UIInvoiceStatus.NOT_PAID) {
            setBgColor('bg-purple-100');
            setTextColor('text-purple-800');
        } else if (statusText === UIInvoiceStatus.PARTIALLY_PAID) {
            setBgColor('bg-lime-100');
            setTextColor('text-lime-800');
        } else if (statusText === UIInvoiceStatus.PAID) {
            setBgColor('bg-green-200');
            setTextColor('text-green-900');
        } else if (statusText === UIInvoiceStatus.OVERDUE) {
            setBgColor('bg-red-100');
            setTextColor('text-red-800');
        }
    }, [invoice]);

    React.useEffect(() => {
        if (status === UIInvoiceStatus.NOT_PAID) {
            setTooltipText('Invoice created but not paid yet');
        } else if (status === UIInvoiceStatus.PARTIALLY_PAID) {
            setTooltipText('Partial payment has been made');
        } else if (status === UIInvoiceStatus.PAID) {
            setTooltipText('Invoice has been paid in full');
        } else if (status === UIInvoiceStatus.OVERDUE) {
            setTooltipText('Invoice is overdue');
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

export default InvoiceStatusBadge;

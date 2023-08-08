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

    React.useEffect(() => {
        const statusText = invoiceStatus(invoice);
        setStatus(statusText);
        if (statusText === UIInvoiceStatus.NOT_PAID) {
            setBgColor('bg-purple-100');
            setTextColor('text-purple-800');
        } else if (statusText === UIInvoiceStatus.PARTIALLY_PAID) {
            setBgColor('bg-green-100');
            setTextColor('text-green-800');
        } else if (statusText === UIInvoiceStatus.PAID) {
            setBgColor('bg-green-100');
            setTextColor('text-green-800');
        } else if (statusText === UIInvoiceStatus.OVERDUE) {
            setBgColor('bg-red-100');
            setTextColor('text-red-800');
        }
    }, [invoice]);

    return (
        <span
            className={`inline-flex px-2 text-xs font-semibold leading-5 ${textColor} uppercase ${bgColor} rounded-full`}
        >
            {status}
        </span>
    );
};

export default InvoiceStatusBadge;

import React from 'react';
import { DriverPayment } from '@prisma/client';
import { TrashIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../../lib/helpers/calculateDriverPay';

interface PaymentDetailsProps {
    payments: { payment: DriverPayment }[];
    setPaymentToDelete: (payment: DriverPayment) => void;
    setConfirmOpen: (open: boolean) => void;
    loading: boolean;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ payments, setPaymentToDelete, setConfirmOpen, loading }) => {
    return (
        <table className="min-w-full mt-4 divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th
                        scope="col"
                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                    >
                        Date
                    </th>
                    <th
                        scope="col"
                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                    >
                        Amount
                    </th>
                    <th
                        scope="col"
                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                    >
                        Batched Payment
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Delete</span>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {payments.length > 0 ? (
                    payments.map(({ payment }) => (
                        <tr key={payment.id}>
                            <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                {new Date(payment.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-6 py-2 text-sm text-gray-500 whitespace-nowrap">
                                {payment.isBatchPayment ? 'Yes' : 'No'}
                            </td>
                            <td className="px-6 py-2 text-sm font-medium text-right whitespace-nowrap">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPaymentToDelete(payment);
                                        setConfirmOpen(true);
                                    }}
                                    disabled={loading}
                                >
                                    <TrashIcon className="flex-shrink-0 w-4 h-4 text-gray-800" />
                                </button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={4} className="px-6 py-4 text-sm text-center text-gray-500">
                            No payments made.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

export default PaymentDetails;

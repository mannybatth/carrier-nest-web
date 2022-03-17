import React from 'react';
import { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { ExpandedInvoice } from '../../../interfaces/models';

type Props = {
    register: UseFormRegister<ExpandedInvoice>;
    errors: FieldErrors<ExpandedInvoice>;
    control: Control<ExpandedInvoice, any>;
};

const InvoiceFormItem: React.FC<Props> = (props: Props) => {
    return <div></div>;
};

export default InvoiceFormItem;

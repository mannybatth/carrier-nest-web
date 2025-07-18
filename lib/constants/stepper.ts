import {
    UserIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { StepperStep } from 'components/InvoiceStepper';

export const createInvoiceSteps: StepperStep[] = [
    {
        id: 1,
        title: 'Select Driver',
        description: 'Choose your driver',
        icon: UserIcon,
    },
    {
        id: 2,
        title: 'Select Assignments',
        description: 'Choose completed jobs',
        icon: ClipboardDocumentListIcon,
    },
    {
        id: 3,
        title: 'Additional Items',
        description: 'Add line items',
        icon: CurrencyDollarIcon,
    },
    {
        id: 4,
        title: 'Review & Create',
        description: 'Final review',
        icon: DocumentCheckIcon,
    },
];

export const editInvoiceSteps: StepperStep[] = [
    {
        id: 1,
        title: 'Edit Assignments',
        description: 'Modify assignments',
        icon: ClipboardDocumentListIcon,
    },
    {
        id: 3,
        title: 'Additional Items',
        description: 'Add line items',
        icon: CurrencyDollarIcon,
    },
    {
        id: 4,
        title: 'Review & Update',
        description: 'Final review',
        icon: DocumentCheckIcon,
    },
];

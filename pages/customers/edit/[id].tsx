import { Customer } from '@prisma/client';
import { CustomerProvider, useCustomerContext } from 'components/context/CustomerContext';
import { LoadingOverlay } from 'components/LoadingOverlay';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import CustomerForm from '../../../components/forms/customer/CustomerForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import { notify } from '../../../components/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import { updateCustomer } from '../../../lib/rest/customer';

const EditCustomer: PageWithAuth = () => {
    const [customer, setCustomer] = useCustomerContext();

    const formHook = useForm<Customer>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    useEffect(() => {
        if (!customer) {
            formHook.reset();
            return;
        }

        formHook.setValue('name', customer.name);
        formHook.setValue('contactEmail', customer.contactEmail);
        formHook.setValue('billingEmail', customer.billingEmail);
        formHook.setValue('paymentStatusEmail', customer.paymentStatusEmail);
        formHook.setValue('street', customer.street);
        formHook.setValue('city', customer.city);
        formHook.setValue('state', customer.state);
        formHook.setValue('zip', customer.zip);

        if (customer.country) {
            formHook.setValue('country', customer.country);
        }
    }, [customer]);

    const submit = async (data: Customer) => {
        console.log('data to save', data);

        setLoading(true);

        const customerData: Partial<Customer> = {
            name: data.name,
            contactEmail: data.contactEmail,
            billingEmail: data.billingEmail,
            paymentStatusEmail: data.paymentStatusEmail,
            street: data.street,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country,
        };

        const newCustomer = await updateCustomer(customer.id, customerData);
        console.log('updated customer', newCustomer);

        notify({ title: 'Customer updated', message: 'Customer updated successfully' });

        // Redirect to customer page
        await router.push(`/customers/${newCustomer.id}`);

        setLoading(false);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Customer</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Customers',
                            href: '/customers',
                        },
                        {
                            label: customer ? `${customer.name}` : '',
                            href: customer ? `/customers/${customer.id}` : '',
                        },
                        {
                            label: 'Edit Customer',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Customer</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 sm:px-6 md:px-8">
                    {(loading || !customer) && <LoadingOverlay />}
                    <form id="customer-form" onSubmit={formHook.handleSubmit(submit)}>
                        <CustomerForm formHook={formHook}></CustomerForm>
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Save Customer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

EditCustomer.authenticationEnabled = true;

const EditCustomerWrapper: PageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const customerId = id as string;

    return (
        <CustomerProvider customerId={customerId}>
            <EditCustomer></EditCustomer>
        </CustomerProvider>
    );
};

EditCustomerWrapper.authenticationEnabled = true;

export default EditCustomerWrapper;

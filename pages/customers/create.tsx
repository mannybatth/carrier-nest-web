import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';
import CustomerForm from '../../components/forms/customer/CustomerForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { SimpleCustomer } from '../../interfaces/models';
import { createCustomer } from '../../lib/rest/customer';

const CreateCustomer: PageWithAuth = () => {
    const formHook = useForm<SimpleCustomer>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    const submit = async (data: SimpleCustomer) => {
        console.log(data);

        setLoading(true);

        const customerData: SimpleCustomer = {
            name: data.name,
            contactEmail: data.contactEmail,
            billingEmail: data.billingEmail,
            paymentStatusEmail: data.paymentStatusEmail,
            street: data.street,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country || 'USA',
        };

        const newCustomer = await createCustomer(customerData);
        console.log('new customer', newCustomer);

        setLoading(false);

        notify({ title: 'New customer created', message: 'New customer created successfully' });

        // Redirect to customer page
        router.push(`/customers/${newCustomer.id}`);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Customer</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Customers',
                            href: '/customers',
                        },
                        {
                            label: 'Create New Customer',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Customer</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <form id="customer-form" onSubmit={formHook.handleSubmit(submit)}>
                        <CustomerForm formHook={formHook}></CustomerForm>
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Create Customer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

CreateCustomer.authenticationEnabled = true;

export default CreateCustomer;

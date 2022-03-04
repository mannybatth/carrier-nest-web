import React from 'react';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { ComponentWithAuth } from '../../interfaces/auth';
import { SimpleLoad } from '../../interfaces/models';

const CreateLoad: ComponentWithAuth = () => {
    const [load, setLoad] = React.useState<SimpleLoad>(null);

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Load</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb className="sm:px-6 md:px-8"></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Load</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <form action="#" method="POST">
                        <LoadForm></LoadForm>
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Create Load
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

CreateLoad.authenticationEnabled = true;

export default CreateLoad;

import { LoadStopType, Prisma } from '@prisma/client';
import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';
import startOfDay from 'date-fns/startOfDay';
import parse from 'date-fns/parse';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { createLoad } from '../../lib/rest/load';
import { parsePdf, AILoad } from '../../lib/rest/ai';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { searchCustomersByName } from '../../lib/rest/customer';
import { FileUploader } from 'react-drag-drop-files';

const CreateLoad: PageWithAuth = () => {
    const formHook = useForm<ExpandedLoad>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    const submit = async (data: ExpandedLoad) => {
        console.log(data);

        data.shipper.type = LoadStopType.SHIPPER;
        data.receiver.type = LoadStopType.RECEIVER;

        const loadData: ExpandedLoad = {
            customerId: data.customer.id,
            refNum: data.refNum,
            rate: new Prisma.Decimal(data.rate),
            distance: 0,
            customer: data.customer,
            shipper: data.shipper,
            receiver: data.receiver,
            stops: data.stops,
        };

        await saveLoadData(loadData);
    };

    const saveLoadData = async (loadData: ExpandedLoad) => {
        setLoading(true);

        const newLoad = await createLoad(loadData);

        setLoading(false);

        notify({ title: 'New load created', message: 'New load created successfully' });

        // Redirect to load page
        router.push(`/loads/${newLoad.id}`);
    };

    const handleFileUpload = async (file: File) => {
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);

            try {
                setLoading(true);
                const load = await parsePdf(byteArray, file);
                await applyAIOutputToForm(load);
                setLoading(false);
            } catch (e) {
                setLoading(false);
                notify({ title: 'Error', message: e?.message || 'Error reading PDF file', type: 'error' });
            }
        };
    };

    const applyAIOutputToForm = async (load: AILoad) => {
        if (!load) {
            return;
        }

        formHook.setValue('refNum', load.load_number);
        formHook.setValue('rate', load.rate ? new Prisma.Decimal(load.rate) : null);
        formHook.setValue('shipper.name', load.shipper);
        formHook.setValue('shipper.street', load.shipper_address?.street);
        formHook.setValue('shipper.city', load.shipper_address?.city);
        formHook.setValue('shipper.state', load.shipper_address?.state);
        formHook.setValue('shipper.zip', load.shipper_address?.zip);
        formHook.setValue(
            'shipper.date',
            load.pickup_date ? startOfDay(parse(load.pickup_date, 'mm/dd/yyyy', new Date())) : null,
        );
        formHook.setValue('shipper.time', load.pickup_time);
        formHook.setValue('receiver.name', load.consignee);
        formHook.setValue('receiver.street', load.consignee_address?.street);
        formHook.setValue('receiver.city', load.consignee_address?.city);
        formHook.setValue('receiver.state', load.consignee_address?.state);
        formHook.setValue('receiver.zip', load.consignee_address?.zip);
        formHook.setValue(
            'receiver.date',
            load.delivery_date ? startOfDay(parse(load.delivery_date, 'mm/dd/yyyy', new Date())) : null,
        );
        formHook.setValue('receiver.time', load.delivery_time);

        setCustomerFromOutput(load);
    };

    const setCustomerFromOutput = async (load: AILoad) => {
        if (!load.logistics_company) {
            return;
        }
        const customers = await searchCustomersByName(load.logistics_company);
        console.log('customers', customers);

        if (!customers || customers.length === 0) {
            return;
        }

        const customer = customers[0];
        if (customer.sim > 0.49) {
            formHook.setValue('customer', customers[0]);
        } else {
            formHook.setValue('customer', null);
        }
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Load</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Loads',
                            href: '/loads',
                        },
                        {
                            label: 'Create New Load',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Load</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="relative px-5 mb-64 sm:px-6 md:px-8">
                    {loading && <LoadingOverlay />}

                    <FileUploader multiple={false} handleChange={handleFileUpload} name="file" types={['PDF']}>
                        <div className="flex mb-4">
                            <label className="flex justify-center w-full px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer h-28 hover:border-gray-400 focus:outline-none">
                                <span className="flex items-center space-x-2">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-6 h-6 text-gray-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                    </svg>
                                    <span className="font-medium text-gray-600">
                                        Drop a rate confirmation file, or{' '}
                                        <span className="text-blue-600 underline">browse</span>
                                    </span>
                                </span>
                            </label>
                        </div>
                    </FileUploader>

                    <form id="load-form" onSubmit={formHook.handleSubmit(submit)}>
                        <LoadForm formHook={formHook}></LoadForm>
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

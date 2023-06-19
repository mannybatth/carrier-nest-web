import { LoadStop, LoadStopType, Prisma } from '@prisma/client';
import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { notify } from '../../components/Notification';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { createLoad } from '../../lib/rest/load';
import SaveLoadConfirmation from '../../components/loads/SaveLoadConfirmation';
import { parsePdf, AILoad } from '../../lib/rest/ai';

const CreateLoad: PageWithAuth = () => {
    const formHook = useForm<ExpandedLoad>();
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);

    const [showConfirmation, setShowConfirmation] = React.useState(false);
    const [dataToSave, setDataToSave] = React.useState<ExpandedLoad>(null);

    const submit = async (data: ExpandedLoad) => {
        console.log(data);

        const needsConfirmation =
            !data.shipper.longitude ||
            !data.shipper.latitude ||
            !data.receiver.longitude ||
            !data.receiver.latitude ||
            !data.stops.every((stop: LoadStop) => stop.longitude && stop.latitude);

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

        if (needsConfirmation) {
            setDataToSave(loadData);
            setShowConfirmation(true);
        } else {
            await saveLoadData(loadData);
        }
    };

    const saveLoadData = async (loadData: ExpandedLoad) => {
        setLoading(true);

        const newLoad = await createLoad(loadData);
        console.log('new load', newLoad);

        setLoading(false);

        notify({ title: 'New load created', message: 'New load created successfully' });

        // Redirect to load page
        router.push(`/loads/${newLoad.id}`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);

            const load = await parsePdf(byteArray, file);
            applyAIOutputToForm(load);
        };
    };

    const applyAIOutputToForm = (load: AILoad) => {
        console.log('response from AI', load);

        formHook.setValue('refNum', load.load_number);
        formHook.setValue('rate', new Prisma.Decimal(load.rate));
        formHook.setValue('shipper.name', load.shipper);
        formHook.setValue('shipper.street', load.shipper_address.street);
        formHook.setValue('shipper.city', load.shipper_address.city);
        formHook.setValue('shipper.state', load.shipper_address.state);
        formHook.setValue('shipper.zip', load.shipper_address.zip);
        formHook.setValue('shipper.date', new Date(load.pickup_date));
        formHook.setValue('shipper.time', load.pickup_time);
        formHook.setValue('receiver.name', load.consignee);
        formHook.setValue('receiver.street', load.consignee_address.street);
        formHook.setValue('receiver.city', load.consignee_address.city);
        formHook.setValue('receiver.state', load.consignee_address.state);
        formHook.setValue('receiver.zip', load.consignee_address.zip);
        formHook.setValue('receiver.date', new Date(load.delivery_date));
        formHook.setValue('receiver.time', load.delivery_time);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Load</h1>}>
            <SaveLoadConfirmation
                show={showConfirmation}
                onSave={() => saveLoadData(dataToSave)}
                onClose={() => setShowConfirmation(false)}
            />
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
                <div className="px-5 mb-64 sm:px-6 md:px-8">
                    <div className="flex items-center justify-between px-4 py-4 bg-white sm:px-6">
                        <div className="flex-1">
                            <label
                                htmlFor="file-upload"
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm cursor-pointer hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Upload File
                            </label>
                            <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>
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

import { Prisma } from '@prisma/client';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import safeJsonStringify from 'safe-json-stringify';
import LoadForm from '../../../components/forms/load/LoadForm';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import Layout from '../../../components/layout/Layout';
import SaveLoadConfirmation from '../../../components/loads/SaveLoadConfirmation';
import { notify } from '../../../components/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import type { ExpandedLoad, SimpleLoadStop } from '../../../interfaces/models';
import { updateLoad } from '../../../lib/rest/load';
import { getLoad } from '../../api/loads/[id]';

type Props = {
    load: ExpandedLoad;
};

export async function getServerSideProps(context: NextPageContext) {
    const { data } = await getLoad({
        req: context.req,
        query: {
            id: context.query.id,
            expand: 'customer,shipper,receiver,stops,invoice,driver,documents',
        },
    });

    if (!data?.load) {
        return {
            redirect: {
                permanent: false,
                destination: '/loads',
            },
        };
    }

    return {
        props: {
            load: JSON.parse(safeJsonStringify(data.load)),
        },
    };
}

const EditLoad: PageWithAuth<Props> = ({ load: loadProp }: Props) => {
    const formHook = useForm<ExpandedLoad>({
        defaultValues: loadProp,
    });
    const router = useRouter();

    const [loading, setLoading] = React.useState(false);
    const [load, setLoad] = React.useState<ExpandedLoad>(loadProp);

    const [showConfirmation, setShowConfirmation] = React.useState(false);
    const [dataToSave, setDataToSave] = React.useState<ExpandedLoad>(null);

    useEffect(() => {
        if (!load) {
            formHook.reset();
            return;
        }

        load.receiver.date = new Date(load.receiver.date);
        load.shipper.date = new Date(load.shipper.date);
        load.stops.forEach((stop: SimpleLoadStop) => {
            stop.date = new Date(stop.date);
        });

        formHook.setValue('customer', load.customer);
        formHook.setValue('refNum', load.refNum);
        formHook.setValue('rate', load.rate);
        formHook.setValue('shipper', load.shipper);
        formHook.setValue('receiver', load.receiver);
        formHook.setValue('stops', load.stops);
    }, [load]);

    const submit = async (data: ExpandedLoad) => {
        console.log('prop load', loadProp);
        console.log('data to save', data);

        const needsConfirmation =
            !data.shipper.longitude ||
            !data.shipper.latitude ||
            !data.receiver.longitude ||
            !data.receiver.latitude ||
            !data.stops.every((stop: SimpleLoadStop) => stop.longitude && stop.latitude);

        console.log('needs confirmation', needsConfirmation);

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

        // Remove ids from loadData
        if ((loadData.shipper as any)?.id) {
            delete (loadData.shipper as any)?.id;
        }
        if ((loadData.receiver as any)?.id) {
            delete (loadData.receiver as any)?.id;
        }
        if (loadData.stops && loadData.stops.length) {
            loadData.stops.forEach((stop: SimpleLoadStop) => {
                if ((stop as any)?.id) {
                    delete (stop as any)?.id;
                }
            });
        }

        if (needsConfirmation) {
            setDataToSave(loadData);
            setShowConfirmation(true);
        } else {
            await saveLoadData(loadData);
        }
    };

    const saveLoadData = async (loadData: ExpandedLoad) => {
        setLoading(true);

        const newLoad = await updateLoad(load.id, loadData);
        console.log('updated load', newLoad);

        setLoading(false);

        notify({ title: 'Load updated', message: 'Load updated successfully' });

        // Redirect to load page
        router.push(`/loads/${newLoad.id}`);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Edit Load</h1>}>
            <>
                <SaveLoadConfirmation show={showConfirmation} onClose={() => setShowConfirmation(false)} />
                <div className="max-w-4xl py-2 mx-auto">
                    <BreadCrumb
                        className="sm:px-6 md:px-8"
                        paths={[
                            {
                                label: 'Loads',
                                href: '/loads',
                            },
                            {
                                label: `# ${load.refNum}`,
                                href: `/loads/${load.id}`,
                            },
                            {
                                label: 'Edit Load',
                            },
                        ]}
                    ></BreadCrumb>
                    <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                        <h1 className="text-2xl font-semibold text-gray-900">Edit Load</h1>
                        <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                    </div>
                    <div className="px-5 mb-64 sm:px-6 md:px-8">
                        <form id="load-form" onSubmit={formHook.handleSubmit(submit)}>
                            <LoadForm formHook={formHook}></LoadForm>
                            <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                                <div className="flex-1"></div>
                                <button
                                    type="submit"
                                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Save Load
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </>
        </Layout>
    );
};

EditLoad.authenticationEnabled = true;

export default EditLoad;

import { Dialog, Transition } from '@headlessui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import LoadFormAdditionalStop from 'components/forms/load/LoadFormAdditionalStop';
import { ExpandedLoad, ExpandedLoadStop } from 'interfaces/models';
import { addAdditionalStopToLoad } from 'lib/rest/load';
import React, { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { useLoadContext } from '../context/LoadContext';
import { LoadingOverlay } from '../LoadingOverlay';
import { notify } from '../Notification';
import Spinner from '../Spinner';

type Props = {
    goBack: () => void;
    title?: string;
    onClose: (value: boolean) => void;
};

const LegStopsAddStopModal: React.FC<Props> = ({ goBack, title, onClose }: Props) => {
    const formHook = useForm<ExpandedLoad>();

    const [load, setLoad] = useLoadContext();

    const [loadingAllStops, setLoadingAllStops] = React.useState<boolean>(false);
    const [saveLoading, setSaveLoading] = React.useState<boolean>(false);

    const submit = async (data: ExpandedLoadStop) => {
        setSaveLoading(true);

        const stop = formHook.getValues().stops['undefined'] as ExpandedLoadStop;

        try {
            notify({ title: 'Load Additional Stops', message: 'Additional stop added to load' });

            close(true);
            setSaveLoading(false);
        } catch (error) {
            setSaveLoading(false);
            notify({ title: 'Error', message: 'Error adding stop to load', type: 'error' });
        }
    };

    const close = (value: boolean) => {
        onClose(value);
    };

    return (
        <Transition.Root as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={(value) => close(value)}>
                <div className="fixed inset-0" />

                <div className="fixed inset-0 overflow-hidden ">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none sm:pl-16">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-500 sm:duration-200"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-500 sm:duration-200"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                                    <div className="relative flex flex-col h-full px-5 py-6 overflow-y-scroll bg-white shadow-xl">
                                        <div className="flex flex-col h-full space-y-4">
                                            <div className="flex items-start flex-none space-x-4">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center flex-none px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        goBack();
                                                    }}
                                                >
                                                    <ArrowLeftIcon className="w-4 h-4"></ArrowLeftIcon>
                                                    <span className="ml-1">Back</span>
                                                </button>
                                                <Dialog.Title className="flex-1 text-lg font-semibold leading-6 text-gray-900">
                                                    {title ? title : 'Add Drivers to Load'}
                                                </Dialog.Title>
                                            </div>
                                            {loadingAllStops ? (
                                                <div className="flex items-start justify-center flex-1 h-32">
                                                    <div className="flex items-center mt-10 space-x-2 text-gray-500">
                                                        <Spinner />
                                                        <span>Loading stops...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {saveLoading && <LoadingOverlay />}

                                                    <div className="flex flex-col flex-1 overflow-auto">
                                                        <form id="load-form" onSubmit={formHook.handleSubmit(submit)}>
                                                            <LoadFormAdditionalStop
                                                                type="LEGSTOP"
                                                                showAdditionalInfoPanel={false}
                                                                register={formHook.register}
                                                                errors={formHook.formState.errors}
                                                                control={formHook.control}
                                                                setValue={formHook.setValue}
                                                                getValues={formHook.getValues}
                                                                watch={formHook.watch}
                                                            ></LoadFormAdditionalStop>
                                                            <div className="flex py-4 mt-4 bg-white border-t-2 border-neutral-200">
                                                                <div className="flex-1"></div>
                                                                <button
                                                                    type="submit"
                                                                    className="inline-flex justify-center w-full py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                >
                                                                    Add Stop
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default LegStopsAddStopModal;

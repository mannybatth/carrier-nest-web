import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, BuildingOffice2Icon, PlusIcon } from '@heroicons/react/24/outline';
import { LoadStop } from '@prisma/client';
import { ExpandedLoad } from 'interfaces/models';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLoadContext } from '../context/LoadContext';
import { LoadingOverlay } from '../LoadingOverlay';
import Spinner from '../Spinner';
import LegStopsAddStopModal from './LegStopsAddStopModal';

type Props = {
    goBack: () => void;
    close: (value: boolean) => void;
    title?: string;
    selectedStops: LoadStop[];
    selectStops: (stops: LoadStop[]) => void;
};

const LegStopsSelectionModalSearch: React.FC<Props> = ({ goBack, close, title, selectStops, selectedStops }: Props) => {
    const formHook = useForm<ExpandedLoad>();

    const [load, setLoad] = useLoadContext();

    const [loadingAllStops, setLoadingAllStops] = React.useState<boolean>(false);
    const [saveLoading, setSaveLoading] = React.useState<boolean>(false);

    const [selectedStopIds, setSelectedStopIds] = React.useState<string[]>([]);
    const [availableStops, setAvailableStops] = React.useState<LoadStop[]>([]);

    const [showAddMoreStops, setShowAddMoreStops] = React.useState<boolean>(false);

    useEffect(() => {
        const allPossibleStops = [load.shipper, ...load.stops, load.receiver] as LoadStop[];

        const filterSelectedStops = allPossibleStops.filter(
            (s) => !selectedStops.find((ss) => ss.id === s.id),
        ) as LoadStop[];

        setAvailableStops(filterSelectedStops);
    }, [load]);

    const handleCheckboxChange = (event) => {
        if (event.target.checked) {
            setSelectedStopIds((prev) => [...prev, event.target.value]);
        } else {
            setSelectedStopIds((prev) => prev.filter((item) => item !== event.target.value));
        }
    };

    const saveSelectedStops = async () => {
        setSaveLoading(true);

        const newStopsAdded = availableStops.filter((s) => selectedStopIds.includes(s.id));
        selectStops(newStopsAdded);

        goBack();
        setSaveLoading(false);
    };

    const _close = (value: boolean) => {
        setShowAddMoreStops(false);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-start flex-none space-x-4 ">
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
                    {showAddMoreStops && (
                        <LegStopsAddStopModal
                            goBack={() => setShowAddMoreStops(false)}
                            title="Add New Stop"
                            key={'addNewStop'}
                            onClose={_close}
                        />
                    )}
                    <div className="fixed bottom-0 right-0 z-50 w-full px-5 pb-5 text-center pr-9">
                        {selectedStopIds.length > 0 && (
                            <div className="sticky py-3 bg-white border-t-[1px] flex  ">
                                <div className="gap-1 space-x-2">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={saveSelectedStops}
                                    >
                                        Select ({selectedStopIds.length} )
                                    </button>
                                    <button
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={() => goBack()}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border-0 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={() => setSelectedStopIds([])}
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex-1" />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <button
                                type="button"
                                className={`inline-flex items-center px-3 py-2  text-sm font-medium leading-4 text-blue-800 bg-blue-200 rounded-md hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600`}
                                onClick={() => setShowAddMoreStops(true)}
                            >
                                <PlusIcon className="-ml-0.5 h-7 w-5" aria-hidden="true" />
                                <p className="w-full text-sm font-semibold text-center">Add New Stop(s)</p>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col flex-1 overflow-auto">
                        <ul role="list" className="overflow-y-auto divide-y divide-gray-200 pb-36">
                            {availableStops?.map((stop, index) => (
                                <li key={index}>
                                    <div
                                        className={`flex items-center space-x-4 ${
                                            selectedStopIds.includes(stop.id) ? 'bg-slate-100' : 'bg-white'
                                        }`}
                                    >
                                        <div className="flex-1">
                                            <label htmlFor={`stop-${index}`}>
                                                <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-pointer">
                                                    <BuildingOffice2Icon
                                                        className="w-6 h-6 text-gray-500"
                                                        aria-hidden="true"
                                                    />
                                                    <div className="flex-1 truncate">
                                                        <p className="flex items-center gap-2 text-base font-semibold text-gray-900 capitalize truncate">
                                                            <span>{stop.name.toLowerCase()}</span>
                                                            {stop.type === 'LEGSTOP' && (
                                                                <span className="text-[8px] text-blue-500 uppercase px-1  font-light h-fit  rounded bg-slate-100 ">{`${
                                                                    stop.type === 'LEGSTOP' ? '  Not a load stop ' : ' '
                                                                }`}</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-800 truncate">
                                                            {new Date(stop.date).toLocaleDateString()} @ {stop.time}
                                                        </p>
                                                        <p className="text-sm text-gray-500 capitalize truncate">
                                                            {stop.street.toLowerCase()}
                                                        </p>
                                                        <p className="text-sm text-gray-500 capitalize truncate">
                                                            {stop.city.toLowerCase()}, {stop.state.toUpperCase()},{' '}
                                                            {stop.zip}
                                                        </p>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                        <div className="flex items-center h-6 pr-4">
                                            <input
                                                id={`stop-${index}`}
                                                name={`stop-${index}`}
                                                type="checkbox"
                                                value={stop.id}
                                                checked={selectedStopIds.includes(stop.id)}
                                                onChange={handleCheckboxChange}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                            />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default LegStopsSelectionModalSearch;

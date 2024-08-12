import { Dialog } from '@headlessui/react';
import {
    ArrowLeftIcon,
    BuildingOffice2Icon,
    StopCircleIcon,
    ChevronUpIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { LoadStop, Location } from '@prisma/client';
import React, { useEffect } from 'react';
import { useLoadContext } from '../context/LoadContext';
import { LoadingOverlay } from '../LoadingOverlay';
import Spinner from '../Spinner';
import { useRouteLegDataContext } from 'components/context/RouteLegDataContext';
import { ExpandedRouteLegLocation } from 'interfaces/models';
import { getAllLocations } from 'lib/rest/locations';

interface ListItem {
    legLocation: ExpandedRouteLegLocation;
    selected: boolean;
}

type Props = {
    title?: string;
    onLegLocationsSelectionSave: (legLocations: ExpandedRouteLegLocation[]) => void;
    onGoBack: () => void;
};

const RouteLegLocationSelection: React.FC<Props> = ({ title, onLegLocationsSelectionSave, onGoBack }: Props) => {
    const [load] = useLoadContext();
    const [routeLegData] = useRouteLegDataContext();
    const [allListItems, setAllListItems] = React.useState<ListItem[]>([]);
    const [locationOptions, setLocationOptions] = React.useState<Location[]>([]);

    const [loadingInit, setLoadingInit] = React.useState<boolean>(true);
    const [saveLoading, setSaveLoading] = React.useState<boolean>(false);

    useEffect(() => {
        if (!load || !routeLegData) return;
        initView();
    }, [load, routeLegData]);

    const initView = async () => {
        const response = await getAllLocations({
            limit: 100,
            offset: 0,
            sort: { key: 'createdAt', order: 'desc' },
        });
        const locations = response.locations;
        setLocationOptions(locations);

        const legLocationsFromLoad = [load.shipper, ...load.stops, load.receiver].map((stop) => ({
            legLocation: { loadStop: stop, location: null },
            selected: false,
        }));

        const existingLegLocations = routeLegData.locations.map((loc) => ({
            legLocation: loc,
            selected: true,
        }));

        const availableFromLoad = legLocationsFromLoad.filter(
            (loc) =>
                !existingLegLocations.some(
                    (existingLoc) => existingLoc.legLocation.loadStop?.id === loc.legLocation.loadStop.id,
                ),
        );

        const allListItems = [...existingLegLocations];
        availableFromLoad.forEach((loc) => {
            const index = legLocationsFromLoad.findIndex(
                (item) => item.legLocation.loadStop.id === loc.legLocation.loadStop.id,
            );
            allListItems.splice(index, 0, loc as ListItem);
        });

        setAllListItems(allListItems);
        setLoadingInit(false);
    };

    const toggleItemSelection = (index: number) => {
        setAllListItems((prevItems) =>
            prevItems.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)),
        );
    };

    const addLocationToSelected = (location: Location) => {
        const item: ListItem = { legLocation: { location }, selected: true };
        setAllListItems([...allListItems, item]);
    };

    const removeIndexFromSelected = (index: number) => {
        setAllListItems(allListItems.filter((_, i) => i !== index));
    };

    const repositionLegLocations = (index: number, direction: 'up' | 'down') => {
        setAllListItems((prevItems) => {
            const newListItems = [...prevItems];

            if (direction === 'up' && index > 0) {
                [newListItems[index - 1], newListItems[index]] = [newListItems[index], newListItems[index - 1]];
            } else if (direction === 'down' && index < newListItems.length - 1) {
                [newListItems[index + 1], newListItems[index]] = [newListItems[index], newListItems[index + 1]];
            }

            return newListItems;
        });
    };

    const saveSelectedItems = async () => {
        setSaveLoading(true);
        const selectedLegLocations = allListItems.filter((item) => item.selected).map((item) => item.legLocation);
        onLegLocationsSelectionSave(selectedLegLocations);
        onGoBack();
        setSaveLoading(false);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-start flex-none space-x-4">
                <button
                    type="button"
                    className="inline-flex items-center flex-none px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={(e) => {
                        e.stopPropagation();
                        onGoBack();
                    }}
                >
                    <ArrowLeftIcon className="w-4 h-4"></ArrowLeftIcon>
                    <span className="ml-1">Back</span>
                </button>
                <Dialog.Title className="flex-1 text-lg font-semibold leading-6 text-gray-900">
                    {title ? title : 'Select Stops or Locations'}
                </Dialog.Title>
            </div>
            {loadingInit ? (
                <div className="flex items-start justify-center flex-1 h-32">
                    <div className="flex items-center mt-10 space-x-2 text-gray-500">
                        <Spinner />
                        <span>Loading...</span>
                    </div>
                </div>
            ) : (
                <>
                    {saveLoading && <LoadingOverlay />}
                    <div className="fixed bottom-0 right-0 z-50 w-full px-5 pb-5 text-center pr-9">
                        {allListItems.some((item) => item.selected) && (
                            <div className="sticky py-3 bg-white border-t-[1px] flex">
                                <div className="gap-1 space-x-2">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={saveSelectedItems}
                                    >
                                        Select ({allListItems.filter((item) => item.selected).length})
                                    </button>
                                    <button
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={onGoBack}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border-0 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={() =>
                                            setAllListItems(allListItems.map((item) => ({ ...item, selected: false })))
                                        }
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex-1" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col flex-1 overflow-auto">
                        <ul role="list" className="overflow-y-auto divide-y divide-gray-200 pb-36">
                            {allListItems.map((locationItem, index) => {
                                const isLoadStop = !!locationItem.legLocation.loadStop;
                                const item = isLoadStop
                                    ? locationItem.legLocation.loadStop
                                    : locationItem.legLocation.location;

                                return (
                                    <li key={`location-${index}`}>
                                        <div
                                            className={`flex items-center space-x-4 ${
                                                locationItem.selected ? 'bg-slate-100' : 'bg-white'
                                            }`}
                                        >
                                            <div className="flex-1">
                                                <label htmlFor={`location-${index}`}>
                                                    <div
                                                        className={`relative flex items-center flex-1 py-4 pl-4 space-x-4 ${
                                                            isLoadStop ? 'cursor-pointer' : 'cursor-pointer'
                                                        }`}
                                                    >
                                                        {isLoadStop ? (
                                                            <BuildingOffice2Icon
                                                                className="w-6 h-6 text-gray-500"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <StopCircleIcon
                                                                className="w-6 h-6 text-gray-500"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        <div className="flex-1 truncate">
                                                            <p className="flex items-center gap-2 text-base font-semibold text-gray-900 capitalize truncate">
                                                                <span>{item.name.toLowerCase()}</span>
                                                            </p>
                                                            {isLoadStop && (
                                                                <p className="text-xs text-gray-800 truncate">
                                                                    {new Date(
                                                                        (item as LoadStop).date,
                                                                    ).toLocaleDateString()}{' '}
                                                                    @ {(item as LoadStop).time}
                                                                </p>
                                                            )}
                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                {item.street.toLowerCase()}
                                                            </p>
                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                {item.city.toLowerCase()}, {item.state.toUpperCase()},{' '}
                                                                {item.zip}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="flex flex-col items-center justify-between min-h-full gap-2 pr-4">
                                                <button
                                                    type="button"
                                                    className={`p-0 text-sm font-medium leading-4 text-white bg-white rounded-full hover:bg-slate-300 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-green-600 ${
                                                        index === 0 && 'invisible'
                                                    }`}
                                                    onClick={() => repositionLegLocations(index, 'up')}
                                                >
                                                    <ChevronUpIcon
                                                        className="w-5 h-5"
                                                        aria-hidden="true"
                                                        color="black"
                                                    />
                                                </button>
                                                {isLoadStop ? (
                                                    <>
                                                        <input
                                                            id={`location-${index}`}
                                                            name={`location-${index}`}
                                                            type="checkbox"
                                                            checked={locationItem.selected}
                                                            onChange={() => toggleItemSelection(index)}
                                                            className="w-4 h-4 mx-2 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                        />
                                                    </>
                                                ) : (
                                                    <input
                                                        id={`location-${index}`}
                                                        name={`location-${index}`}
                                                        type="checkbox"
                                                        checked={true}
                                                        onChange={() => removeIndexFromSelected(index)}
                                                        className="w-4 h-4 mx-2 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                    />
                                                )}

                                                <button
                                                    type="button"
                                                    className={`p-0 text-sm font-medium leading-4 text-white bg-white rounded-full hover:bg-slate-300 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-green-600 ${
                                                        index === allListItems.length - 1 && 'invisible'
                                                    }`}
                                                    onClick={() => repositionLegLocations(index, 'down')}
                                                >
                                                    <ChevronDownIcon
                                                        className="w-5 h-5"
                                                        aria-hidden="true"
                                                        color="black"
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}

                            <div>
                                <h3 className="mt-6 mb-1 text-lg font-medium leading-6 text-gray-900">
                                    Available Locations
                                </h3>
                            </div>
                            {locationOptions.length > 0 ? (
                                locationOptions.map((location, index) => (
                                    <li key={`available-location-${index}`}>
                                        <div className="flex items-center space-x-4 bg-white">
                                            <div className="flex-1">
                                                <label htmlFor={`available-location-${index}`}>
                                                    <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-default">
                                                        <StopCircleIcon
                                                            className="w-6 h-6 text-gray-500"
                                                            aria-hidden="true"
                                                        />
                                                        <div className="flex-1 truncate">
                                                            <p className="flex items-center gap-2 text-base font-semibold text-gray-900 capitalize truncate">
                                                                <span>{location.name.toLowerCase()}</span>
                                                            </p>
                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                {location.street.toLowerCase()}
                                                            </p>
                                                            <p className="text-sm text-gray-500 capitalize truncate">
                                                                {location.city.toLowerCase()},{' '}
                                                                {location.state.toUpperCase()}, {location.zip}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="flex items-center h-6 pr-4">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center px-3 py-1 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addLocationToSelected(location);
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6">
                                    <p className="text-sm text-gray-500">No available locations to select.</p>
                                    <a
                                        href="/locations"
                                        className="mt-2 text-sm text-blue-600 hover:underline"
                                        target="_blank"
                                    >
                                        Go to Locations page to add new locations
                                    </a>
                                </div>
                            )}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default RouteLegLocationSelection;

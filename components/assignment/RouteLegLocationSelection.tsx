import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, BuildingOffice2Icon, MapPinIcon } from '@heroicons/react/24/outline';
import { LoadStop, Location } from '@prisma/client';
import React, { useEffect } from 'react';
import { useLoadContext } from '../context/LoadContext';
import { LoadingOverlay } from '../LoadingOverlay';
import Spinner from '../Spinner';
import { useRouteLegDataContext } from 'components/context/RouteLegDataContext';
import { ExpandedRouteLegLocation } from 'interfaces/models'; // Assuming this is where your ExpandedRouteLegLocation type is defined

type Props = {
    title?: string;
    onLegLocationsSelectionSave: (legLocations: ExpandedRouteLegLocation[]) => void;
    onGoBack: () => void;
};

const RouteLegLocationSelection: React.FC<Props> = ({ title, onLegLocationsSelectionSave, onGoBack }: Props) => {
    const [load] = useLoadContext();
    const [routeLegData] = useRouteLegDataContext();
    const [allLocations, setAllLocations] = React.useState<ExpandedRouteLegLocation[]>([]);
    const [selectedLegLocations, setSelectedLegLocations] = React.useState<ExpandedRouteLegLocation[]>([]);

    const [loadingInit, setLoadingInit] = React.useState<boolean>(true);
    const [saveLoading, setSaveLoading] = React.useState<boolean>(false);

    useEffect(() => {
        const loadStops = [load.shipper, ...load.stops, load.receiver].map((stop) => ({
            loadStop: stop,
            location: null,
        })) as ExpandedRouteLegLocation[];

        const existingLocations = routeLegData.locations;

        // Merge lists and remove duplicates based on id
        const allLocationsSet = new Map<string, ExpandedRouteLegLocation>();
        [...loadStops, ...existingLocations].forEach((item) => {
            const locId = item.loadStop ? item.loadStop.id : item.location?.id;
            allLocationsSet.set(locId, item);
        });
        const mergedLocations = Array.from(allLocationsSet.values());

        setAllLocations(mergedLocations);
        setSelectedLegLocations(existingLocations); // Preselect existing locations
        setLoadingInit(false);
    }, [load, routeLegData]);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, item: ExpandedRouteLegLocation) => {
        const itemId = item.loadStop ? item.loadStop.id : item.location?.id;

        const updatedSelection = event.target.checked
            ? [...selectedLegLocations, item]
            : selectedLegLocations.filter((loc) => {
                  const locId = loc.loadStop ? loc.loadStop.id : loc.location?.id;
                  return locId !== itemId;
              });

        // Filter allLocations to generate the ordered selectedLegLocations
        const orderedSelection = allLocations.filter((loc) =>
            updatedSelection.some((selectedItem) => {
                const selectedId = selectedItem.loadStop ? selectedItem.loadStop.id : selectedItem.location?.id;
                const locId = loc.loadStop ? loc.loadStop.id : loc.location?.id;
                return locId === selectedId;
            }),
        );

        setSelectedLegLocations(orderedSelection);
    };

    const saveSelectedItems = async () => {
        setSaveLoading(true);
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
                        {selectedLegLocations.length > 0 && (
                            <div className="sticky py-3 bg-white border-t-[1px] flex">
                                <div className="gap-1 space-x-2">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={saveSelectedItems}
                                    >
                                        Select ({selectedLegLocations.length})
                                    </button>
                                    <button
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={onGoBack}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border-0 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={() => setSelectedLegLocations([])}
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
                            {allLocations.map((locationItem, index) => {
                                const isLoadStop = !!locationItem.loadStop;
                                const item = isLoadStop ? locationItem.loadStop : locationItem.location;

                                return (
                                    <li key={index}>
                                        <div
                                            className={`flex items-center space-x-4 ${
                                                selectedLegLocations.includes(locationItem)
                                                    ? 'bg-slate-100'
                                                    : 'bg-white'
                                            }`}
                                        >
                                            <div className="flex-1">
                                                <label htmlFor={`location-${index}`}>
                                                    <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-pointer">
                                                        {isLoadStop ? (
                                                            <BuildingOffice2Icon
                                                                className="w-6 h-6 text-gray-500"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <MapPinIcon
                                                                className="w-6 h-6 text-gray-500"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        <div className="flex-1 truncate">
                                                            <p className="flex items-center gap-2 text-base font-semibold text-gray-900 capitalize truncate">
                                                                <span>{item.name.toLowerCase()}</span>
                                                            </p>
                                                            <p className="text-xs text-gray-800 truncate">
                                                                {isLoadStop
                                                                    ? new Date(
                                                                          (item as LoadStop).date,
                                                                      ).toLocaleDateString()
                                                                    : new Date(
                                                                          (item as Location).createdAt,
                                                                      ).toLocaleDateString()}{' '}
                                                                @
                                                                {isLoadStop
                                                                    ? (item as LoadStop).time
                                                                    : new Date(
                                                                          (item as Location).updatedAt,
                                                                      ).toLocaleTimeString()}
                                                            </p>
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
                                            <div className="flex items-center h-6 pr-4">
                                                <input
                                                    id={`location-${index}`}
                                                    name={`location-${index}`}
                                                    type="checkbox"
                                                    checked={selectedLegLocations.includes(locationItem)}
                                                    onChange={(event) => handleCheckboxChange(event, locationItem)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default RouteLegLocationSelection;

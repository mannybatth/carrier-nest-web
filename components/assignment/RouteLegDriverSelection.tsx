import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Driver } from '@prisma/client';
import React, { useEffect } from 'react';
import { getAllDrivers } from '../../lib/rest/driver';
import { useLoadContext } from '../context/LoadContext';
import Spinner from '../Spinner';

type Props = {
    title?: string;
    selectedDrivers: Partial<Driver>[];
    onGoBack: () => void;
    onDriverSelectionSave: (drivers: Partial<Driver>[]) => void;
};

const RouteLegDriverSelection: React.FC<Props> = ({
    title,
    selectedDrivers,
    onGoBack,
    onDriverSelectionSave,
}: Props) => {
    const [load, setLoad] = useLoadContext();

    const [loadingAllDrivers, setLoadingAllDrivers] = React.useState<boolean>(false);

    const [allDrivers, setAllDrivers] = React.useState<Driver[]>([]);
    const [availableDrivers, setAvailableDrivers] = React.useState<Driver[]>([]);
    const [selectedDriverIds, setSelectedDriverIds] = React.useState<string[]>([]);

    useEffect(() => {
        const loadDrivers = async () => {
            setLoadingAllDrivers(true);
            const { drivers } = await getAllDrivers({
                limit: 999,
                offset: 0,
            });
            const filterSelectedDrivers = drivers.filter((d) => !selectedDrivers.find((sd) => sd.id === d.id));
            setAllDrivers(filterSelectedDrivers);

            setAvailableDrivers(filterSelectedDrivers);

            setLoadingAllDrivers(false);
        };

        loadDrivers();
    }, [load]);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedDriverIds((prev) => [...prev, event.target.value]);
        } else {
            setSelectedDriverIds((prev) => prev.filter((item) => item !== event.target.value));
        }
    };

    const saveSelectedDrivers = async () => {
        const newDrivers = selectedDriverIds.map((id) => allDrivers.find((d) => d.id === id));

        onDriverSelectionSave(newDrivers);
        onGoBack();

        setSelectedDriverIds([]);
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
                    {title ? title : 'Add Drivers to Load'}
                </Dialog.Title>
            </div>
            {loadingAllDrivers ? (
                <div className="flex items-start justify-center flex-1 h-32">
                    <div className="flex items-center mt-10 space-x-2 text-gray-500">
                        <Spinner />
                        <span>Loading drivers...</span>
                    </div>
                </div>
            ) : (
                <>
                    {availableDrivers.length > 0 ? (
                        <div className="flex flex-col flex-1 overflow-auto">
                            <ul role="list" className="pb-4 overflow-y-auto divide-y divide-gray-200">
                                {availableDrivers?.map((driver, index) => (
                                    <li key={index}>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-1">
                                                <label htmlFor={`driver-${index}`}>
                                                    <div className="relative flex items-center flex-1 py-4 pl-4 space-x-4 cursor-pointer">
                                                        <UserCircleIcon
                                                            className="w-6 h-6 text-gray-500"
                                                            aria-hidden="true"
                                                        />
                                                        <div className="flex-1 truncate">
                                                            <p className="text-sm font-bold text-gray-900 capitalize truncate">
                                                                {driver.name}
                                                            </p>
                                                            <p className="text-sm text-gray-500 truncate">
                                                                {driver.phone}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="flex items-center h-6 pr-4">
                                                <input
                                                    id={`driver-${index}`}
                                                    name={`driver-${index}`}
                                                    type="checkbox"
                                                    value={driver.id}
                                                    checked={selectedDriverIds.includes(driver.id)}
                                                    onChange={handleCheckboxChange}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                />
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {selectedDriverIds.length > 0 && (
                                <div className="sticky py-2 bg-white border-t-[1px] flex sm:px-2">
                                    <div className="space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={saveSelectedDrivers}
                                        >
                                            Select ({selectedDriverIds.length})
                                        </button>
                                        <button
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={() => onGoBack()}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="flex-1" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start justify-center flex-1 h-32">
                            <div className="flex flex-col items-center gap-1 mt-10 space-x-2 text-center text-gray-500">
                                <span>No drivers available to add.</span>
                                <span>Add more drivers under Drivers page.</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RouteLegDriverSelection;

import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Driver, ChargeType, Prisma } from '@prisma/client';
import React, { useEffect } from 'react';
import { getAllDrivers } from '../../lib/rest/driver';
import { useLoadContext } from '../context/LoadContext';
import Spinner from '../Spinner';
import { DriverWithCharge } from 'interfaces/assignment';

type Props = {
    title?: string;
    selectedDrivers: Partial<DriverWithCharge>[];
    routeLegDistance: number;
    routeLegDuration: number;
    loadRate: Prisma.Decimal;
    onGoBack: () => void;
    onDriverSelectionSave: (drivers: Partial<DriverWithCharge>[]) => void;
};

const RouteLegDriverSelection: React.FC<Props> = ({
    title,
    selectedDrivers,
    routeLegDistance,
    routeLegDuration,
    loadRate,
    onGoBack,
    onDriverSelectionSave,
}: Props) => {
    const [load, setLoad] = useLoadContext();

    const [loadingAllDrivers, setLoadingAllDrivers] = React.useState<boolean>(false);

    const [allDrivers, setAllDrivers] = React.useState<Driver[]>([]);
    const [selectedDriverIds, setSelectedDriverIds] = React.useState<string[]>([]);
    const [driverCharges, setDriverCharges] = React.useState<{
        [key: string]: { chargeType?: ChargeType; chargeValue?: string };
    }>({});

    useEffect(() => {
        const loadDrivers = async () => {
            setLoadingAllDrivers(true);
            const { drivers } = await getAllDrivers({
                limit: 999,
                offset: 0,
            });
            setAllDrivers(drivers);
            setLoadingAllDrivers(false);
        };

        loadDrivers();

        const initialDriverCharges = selectedDrivers.reduce((acc, sd) => {
            if (sd.driver && sd.driver.id) {
                acc[sd.driver.id] = {
                    chargeType: sd.chargeType,
                    chargeValue: sd.chargeValue?.toString(),
                };
            }
            return acc;
        }, {} as { [key: string]: { chargeType?: ChargeType; chargeValue?: string } });
        setDriverCharges(initialDriverCharges);

        setSelectedDriverIds(selectedDrivers.map((sd) => sd.driver.id));
    }, [load, selectedDrivers]);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedDriverIds((prev) => [...prev, event.target.value]);
        } else {
            setSelectedDriverIds((prev) => prev.filter((item) => item !== event.target.value));
        }
    };

    const handleChargeTypeChange = (driverId: string, chargeType: ChargeType) => {
        setDriverCharges((prev) => ({
            ...prev,
            [driverId]: {
                ...prev[driverId],
                chargeType,
            },
        }));
    };

    const handleChargeValueChange = (driverId: string, chargeValue: string) => {
        setDriverCharges((prev) => ({
            ...prev,
            [driverId]: {
                ...prev[driverId],
                chargeValue,
            },
        }));
    };

    const calculateTotalPay = () => {
        let totalPay = 0;

        selectedDriverIds.forEach((id) => {
            const chargeType = driverCharges[id]?.chargeType;
            const chargeValue = driverCharges[id]?.chargeValue ? Number(driverCharges[id].chargeValue) : 0;

            if (chargeType === ChargeType.PER_MILE) {
                totalPay += (routeLegDistance / 1609.34) * chargeValue; // Convert meters to miles
            } else if (chargeType === ChargeType.PER_HOUR) {
                totalPay += (routeLegDuration / 3600) * chargeValue; // Convert seconds to hours
            } else if (chargeType === ChargeType.FIXED_PAY) {
                totalPay += chargeValue;
            } else if (chargeType === ChargeType.PERCENTAGE_OF_LOAD) {
                totalPay += (loadRate.toNumber() * chargeValue) / 100;
            }
        });

        return totalPay.toFixed(2);
    };

    const saveSelectedDrivers = async () => {
        const newDrivers = selectedDriverIds.map((id) => {
            const driver = allDrivers.find((d) => d.id === id);
            return {
                driver,
                chargeType: driverCharges[id]?.chargeType,
                chargeValue: driverCharges[id]?.chargeValue ? Number(driverCharges[id].chargeValue) : undefined,
            };
        });

        onDriverSelectionSave(newDrivers);
        onGoBack();

        setSelectedDriverIds([]);
    };

    const isSelectButtonDisabled = selectedDriverIds.some(
        (id) => !driverCharges[id]?.chargeType || !driverCharges[id]?.chargeValue,
    );

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
                    {allDrivers.length > 0 ? (
                        <div className="flex flex-col flex-1 overflow-auto">
                            <ul role="list" className="pb-4 overflow-y-auto divide-y divide-gray-200">
                                {allDrivers?.map((driver, index) => (
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
                                        {selectedDriverIds.includes(driver.id) && (
                                            <div className="flex flex-row items-end w-full gap-2 px-1 mb-2">
                                                <select
                                                    value={driverCharges[driver.id]?.chargeType || ''}
                                                    onChange={(e) =>
                                                        handleChargeTypeChange(driver.id, e.target.value as ChargeType)
                                                    }
                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                >
                                                    <option value="" disabled>
                                                        Select Charge Type
                                                    </option>
                                                    <option value={ChargeType.PER_MILE}>Per Mile</option>
                                                    <option value={ChargeType.PER_HOUR}>Per Hour</option>
                                                    <option value={ChargeType.FIXED_PAY}>Fixed Pay</option>
                                                    <option value={ChargeType.PERCENTAGE_OF_LOAD}>
                                                        Percentage of Load
                                                    </option>
                                                </select>
                                                <input
                                                    type="number"
                                                    value={driverCharges[driver.id]?.chargeValue || ''}
                                                    onChange={(e) => handleChargeValueChange(driver.id, e.target.value)}
                                                    placeholder="Charge Value"
                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            {selectedDriverIds.length > 0 && (
                                <div className="sticky py-2 bg-white border-t-[1px] flex-col sm:px-2 space-y-2">
                                    <div className="flex items-center text-right">
                                        <p className="text-sm font-medium text-gray-700">
                                            Estimated Total Pay: ${calculateTotalPay()}
                                        </p>
                                    </div>
                                    <div className="space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-600"
                                            onClick={saveSelectedDrivers}
                                            disabled={isSelectButtonDisabled}
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

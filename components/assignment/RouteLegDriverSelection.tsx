import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Driver, ChargeType, Prisma } from '@prisma/client';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

type FormValues = {
    selectedDrivers: { [key: string]: DriverWithCharge };
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
    const {
        register,
        handleSubmit,
        setValue,
        trigger,
        watch,
        formState: { isValid },
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            selectedDrivers: selectedDrivers.reduce((acc, sd) => {
                if (sd.driver && sd.driver.id) {
                    acc[sd.driver.id] = {
                        driver: sd.driver,
                        chargeType: sd.chargeType,
                        chargeValue: sd.chargeValue,
                    };
                }
                return acc;
            }, {} as { [key: string]: DriverWithCharge }),
        },
    });

    const [loadingAllDrivers, setLoadingAllDrivers] = React.useState<boolean>(false);
    const [allDrivers, setAllDrivers] = React.useState<Driver[]>([]);
    const [totalPay, setTotalPay] = React.useState<number>(0);

    const selectedDriversWatch = watch('selectedDrivers');

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
    }, [load]);

    useEffect(() => {
        const newTotalPay = calculateTotalPay(Object.values(selectedDriversWatch) as DriverWithCharge[]);
        setTotalPay(newTotalPay);
    }, [selectedDrivers]);

    useEffect(() => {
        const subscription = watch((value) => {
            const newTotalPay = calculateTotalPay(Object.values(value.selectedDrivers) as DriverWithCharge[]);
            setTotalPay(newTotalPay);
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    const calculateTotalPay = (selectedDrivers: DriverWithCharge[]) => {
        let totalPay = 0;
        selectedDrivers.forEach((driverWithCharge) => {
            const chargeType = driverWithCharge.chargeType;
            const chargeValue = driverWithCharge.chargeValue ? Number(driverWithCharge.chargeValue) : 0;

            if (chargeType === ChargeType.PER_MILE) {
                totalPay += (routeLegDistance / 1609.34) * chargeValue;
            } else if (chargeType === ChargeType.PER_HOUR) {
                totalPay += (routeLegDuration / 3600) * chargeValue;
            } else if (chargeType === ChargeType.FIXED_PAY) {
                totalPay += chargeValue;
            } else if (chargeType === ChargeType.PERCENTAGE_OF_LOAD) {
                totalPay += (loadRate.toNumber() * chargeValue) / 100;
            }
        });
        return totalPay;
    };

    const getDefaultChargeType = (driverId: string) => {
        const driver = allDrivers.find((d) => d.id === driverId);
        return driver?.defaultChargeType || null;
    };

    const getDefaultChargeValue = (driverId: string) => {
        const driver = allDrivers.find((d) => d.id === driverId);
        if (driver?.defaultChargeType === ChargeType.PER_MILE && driver.perMileRate) {
            return new Prisma.Decimal(driver.perMileRate).toNumber() || null;
        } else if (driver?.defaultChargeType === ChargeType.PER_HOUR && driver.perHourRate) {
            return new Prisma.Decimal(driver.perHourRate).toNumber() || null;
        } else if (driver?.defaultChargeType === ChargeType.FIXED_PAY && driver.defaultFixedPay) {
            return new Prisma.Decimal(driver.defaultFixedPay).toNumber() || null;
        } else if (driver?.defaultChargeType === ChargeType.PERCENTAGE_OF_LOAD && driver.takeHomePercent) {
            return new Prisma.Decimal(driver.takeHomePercent).toNumber() || null;
        }
        return null;
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, driver: Driver) => {
        const value = event.target.value;
        const isChecked = event.target.checked;
        const updatedDrivers = { ...selectedDriversWatch };
        if (isChecked) {
            updatedDrivers[value] = {
                driver,
                chargeType: getDefaultChargeType(value) || null,
                chargeValue: getDefaultChargeValue(value),
            };
        } else {
            delete updatedDrivers[value];
        }
        setValue('selectedDrivers', updatedDrivers, { shouldValidate: true });
    };

    const saveSelectedDrivers = async (data: FormValues) => {
        const newDrivers = Object.values(data.selectedDrivers).map((driverWithCharge) => ({
            driver: driverWithCharge.driver,
            chargeType: driverWithCharge.chargeType,
            chargeValue: driverWithCharge.chargeValue ? Number(driverWithCharge.chargeValue) : null,
        }));

        onDriverSelectionSave(newDrivers);
        onGoBack();
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
                    {allDrivers.length > 0 ? (
                        <form
                            onSubmit={handleSubmit(saveSelectedDrivers)}
                            className="flex flex-col flex-1 overflow-auto"
                        >
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
                                                    type="checkbox"
                                                    value={driver.id}
                                                    checked={!!selectedDriversWatch[driver.id]}
                                                    onChange={(e) => handleCheckboxChange(e, driver)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-600"
                                                    // {...register(`selectedDrivers.${driver.id}`)}
                                                />
                                            </div>
                                        </div>
                                        {selectedDriversWatch[driver.id] && (
                                            <div className="flex flex-row items-end w-full gap-2 px-1 mb-2">
                                                <select
                                                    name={`selectedDrivers.${driver.id}.chargeType`}
                                                    {...register(`selectedDrivers.${driver.id}.chargeType`, {
                                                        required: true,
                                                    })}
                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                >
                                                    <option value="" disabled>
                                                        Select Pay Type
                                                    </option>
                                                    <option value={ChargeType.PER_MILE}>Per Mile</option>
                                                    <option value={ChargeType.PER_HOUR}>Per Hour</option>
                                                    <option value={ChargeType.FIXED_PAY}>Fixed Pay</option>
                                                    <option value={ChargeType.PERCENTAGE_OF_LOAD}>
                                                        Percentage of Load
                                                    </option>
                                                </select>
                                                <input
                                                    name={`selectedDrivers.${driver.id}.chargeValue`}
                                                    type="number"
                                                    {...register(`selectedDrivers.${driver.id}.chargeValue`, {
                                                        required: true,
                                                        min: 0,
                                                        valueAsNumber: true,
                                                    })}
                                                    placeholder="Charge Value"
                                                    step="0.01"
                                                    min="0"
                                                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            {Object.keys(selectedDriversWatch).length > 0 && (
                                <div className="sticky py-2 bg-white border-t-[1px] flex-col sm:px-2 space-y-2">
                                    <div className="flex items-center text-right">
                                        <p className="text-sm font-medium text-gray-700">
                                            Estimated Total Pay: ${totalPay.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-x-3">
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-600"
                                            disabled={!isValid}
                                        >
                                            Select ({Object.keys(selectedDriversWatch).length})
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={() => onGoBack()}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
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

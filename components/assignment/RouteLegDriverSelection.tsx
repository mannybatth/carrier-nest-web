'use client';

import { ArrowLeftIcon, UserCircleIcon, LightBulbIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { type Driver, ChargeType, Prisma } from '@prisma/client';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getAllDrivers } from '../../lib/rest/driver';
import { useLoadContext } from '../context/LoadContext';
import Spinner from '../Spinner';
import type { DriverWithCharge } from 'interfaces/assignment';
import { calculateDriverPay, formatCurrency } from 'lib/helpers/calculateDriverPay';
import Link from 'next/link';
import { formatPhoneNumber } from 'lib/helpers/format';

type Props = {
    title?: string;
    selectedDrivers: Partial<DriverWithCharge>[];
    distanceMiles: number;
    durationHours: number;
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
    distanceMiles,
    durationHours,
    loadRate,
    onGoBack,
    onDriverSelectionSave,
}: Props) => {
    const { load, setLoad } = useLoadContext();
    const {
        register,
        handleSubmit,
        setValue,
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
    const [noDefaultDrivers, setNoDefaultDrivers] = React.useState<boolean>(false);

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

    useEffect(() => {
        const checkNoDefaultDrivers = () => {
            const noDefaults = allDrivers.every(
                (driver) =>
                    !driver.perMileRate && !driver.perHourRate && !driver.defaultFixedPay && !driver.takeHomePercent,
            );
            setNoDefaultDrivers(noDefaults);
        };

        checkNoDefaultDrivers();
    }, [allDrivers]);

    const calculateTotalPay = (selectedDrivers: DriverWithCharge[]) => {
        return selectedDrivers
            .reduce((total, driverWithCharge) => {
                const pay = calculateDriverPay({
                    chargeType: driverWithCharge.chargeType,
                    chargeValue: driverWithCharge.chargeValue,
                    distanceMiles: distanceMiles,
                    durationHours: durationHours,
                    loadRate: loadRate,
                });
                return total.add(pay);
            }, new Prisma.Decimal(0))
            .toNumber();
    };

    const calculateIndividualPay = (driverWithCharge: DriverWithCharge) => {
        return calculateDriverPay({
            chargeType: driverWithCharge.chargeType,
            chargeValue: driverWithCharge.chargeValue,
            distanceMiles: distanceMiles,
            durationHours: durationHours,
            loadRate: loadRate,
        }).toNumber();
    };

    const getDefaultChargeType = (driverId: string) => {
        const driver = allDrivers.find((d) => d.id === driverId);
        return driver?.defaultChargeType || null;
    };

    const getDefaultValueForChargeType = (driverId: string, chargeType: ChargeType) => {
        const driver = allDrivers.find((d) => d.id === driverId);
        if (chargeType === ChargeType.PER_MILE && driver.perMileRate) {
            return new Prisma.Decimal(driver.perMileRate).toNumber() || null;
        } else if (chargeType === ChargeType.PER_HOUR && driver.perHourRate) {
            return new Prisma.Decimal(driver.perHourRate).toNumber() || null;
        } else if (chargeType === ChargeType.FIXED_PAY && driver.defaultFixedPay) {
            return new Prisma.Decimal(driver.defaultFixedPay).toNumber() || null;
        } else if (chargeType === ChargeType.PERCENTAGE_OF_LOAD && driver.takeHomePercent) {
            return new Prisma.Decimal(driver.takeHomePercent).toNumber() || null;
        }
        return null;
    };

    const handleChargeTypeChange = (driverId: string, chargeType: ChargeType) => {
        const defaultChargeValue = getDefaultValueForChargeType(driverId, chargeType);
        setValue(`selectedDrivers.${driverId}.chargeValue`, defaultChargeValue, { shouldValidate: true });
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, driver: Driver) => {
        const value = event.target.value;
        const isChecked = event.target.checked;
        const updatedDrivers = { ...selectedDriversWatch };
        if (isChecked) {
            updatedDrivers[value] = {
                driver,
                chargeType: getDefaultChargeType(value) || null,
                chargeValue: getDefaultValueForChargeType(value, getDefaultChargeType(value)),
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

    const getPlaceholder = (chargeType: ChargeType) => {
        switch (chargeType) {
            case ChargeType.PER_MILE:
                return 'Enter per mile rate';
            case ChargeType.PER_HOUR:
                return 'Enter per hour rate';
            case ChargeType.FIXED_PAY:
                return 'Enter fixed pay';
            case ChargeType.PERCENTAGE_OF_LOAD:
                return '% of Load Rate';
            default:
                return 'Enter charge value';
        }
    };

    const getChargeTypeLabel = (chargeType: ChargeType) => {
        switch (chargeType) {
            case ChargeType.PER_MILE:
                return 'Per Mile';
            case ChargeType.PER_HOUR:
                return 'Per Hour';
            case ChargeType.FIXED_PAY:
                return 'Fixed Pay';
            case ChargeType.PERCENTAGE_OF_LOAD:
                return '% of Load';
            default:
                return 'Unknown';
        }
    };

    const selectedCount = Object.keys(selectedDriversWatch).length;
    const profitMargin = new Prisma.Decimal(loadRate).toNumber() - totalPay;
    const profitPercentage = loadRate.toNumber() > 0 ? (profitMargin / loadRate.toNumber()) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                <div className="flex items-center p-6">
                    <button
                        type="button"
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors mr-3"
                        onClick={onGoBack}
                    >
                        <ArrowLeftIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900">{title || 'Select Drivers'}</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Choose drivers and set their pay rates</p>
                    </div>
                </div>
            </div>

            {loadingAllDrivers ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center space-x-3 text-gray-500">
                        <Spinner />
                        <span className="text-base">Loading drivers...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Tip Banner - More subtle design */}
                    {noDefaultDrivers && (
                        <div className="mx-4 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start space-x-2">
                                <LightBulbIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-800">
                                    <p className="font-medium">
                                        Pro Tip: Set default pay rates for drivers to speed up assignments.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {allDrivers.length > 0 ? (
                        <form onSubmit={handleSubmit(saveSelectedDrivers)} className="flex flex-col flex-1">
                            {/* Scrollable Content with proper padding at bottom */}
                            <div className="flex-1 overflow-y-auto pb-safe">
                                <div className="p-6 space-y-3">
                                    {/* Condensed Driver Selection */}
                                    {allDrivers?.map((driver, index) => {
                                        const isSelected = !!selectedDriversWatch[driver.id];
                                        const driverData = selectedDriversWatch[driver.id];
                                        const individualPay =
                                            isSelected && driverData ? calculateIndividualPay(driverData) : 0;

                                        return (
                                            <div
                                                key={index}
                                                className={`
                      bg-white rounded-lg border shadow-sm transition-all duration-200 cursor-pointer
                      ${
                          isSelected
                              ? 'border-blue-200 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }
                    `}
                                                onClick={() => {
                                                    // Create a synthetic event to toggle the driver selection
                                                    const syntheticEvent = {
                                                        target: {
                                                            checked: !isSelected,
                                                            value: driver.id,
                                                        },
                                                    } as React.ChangeEvent<HTMLInputElement>;
                                                    handleCheckboxChange(syntheticEvent, driver);
                                                }}
                                            >
                                                <div className="flex items-center p-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                                        <UserCircleIcon className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                                                            {driver.name}
                                                        </p>
                                                        <p className="text-xs text-gray-600 truncate">
                                                            {formatPhoneNumber(driver.phone)}
                                                        </p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            value={driver.id}
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                e.stopPropagation(); // Prevent double triggering
                                                                handleCheckboxChange(e, driver);
                                                            }}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Condensed Driver Configuration */}
                                                {isSelected && (
                                                    <div
                                                        className="border-t border-blue-100 p-3 bg-blue-50/50"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                    Pay Type
                                                                </label>
                                                                <select
                                                                    {...register(
                                                                        `selectedDrivers.${driver.id}.chargeType`,
                                                                        {
                                                                            required: true,
                                                                            onChange: (e) =>
                                                                                handleChargeTypeChange(
                                                                                    driver.id,
                                                                                    e.target.value as ChargeType,
                                                                                ),
                                                                        },
                                                                    )}
                                                                    className="block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                                >
                                                                    <option value="" disabled>
                                                                        Select Type
                                                                    </option>
                                                                    <option value={ChargeType.PER_MILE}>
                                                                        Per Mile
                                                                    </option>
                                                                    <option value={ChargeType.PER_HOUR}>
                                                                        Per Hour
                                                                    </option>
                                                                    <option value={ChargeType.FIXED_PAY}>
                                                                        Fixed Pay
                                                                    </option>
                                                                    <option value={ChargeType.PERCENTAGE_OF_LOAD}>
                                                                        % of Load
                                                                    </option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                    Pay Amount
                                                                </label>
                                                                <div className="relative">
                                                                    <input
                                                                        {...register(
                                                                            `selectedDrivers.${driver.id}.chargeValue`,
                                                                            {
                                                                                required: true,
                                                                                min: 0,
                                                                                valueAsNumber: true,
                                                                            },
                                                                        )}
                                                                        type="number"
                                                                        placeholder={getPlaceholder(
                                                                            driverData?.chargeType,
                                                                        )}
                                                                        step="any"
                                                                        min="0"
                                                                        max={
                                                                            driverData?.chargeType ===
                                                                            ChargeType.PERCENTAGE_OF_LOAD
                                                                                ? 100
                                                                                : undefined
                                                                        }
                                                                        onWheel={(e) => e.currentTarget.blur()}
                                                                        className="block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                                    />
                                                                    {individualPay > 0 && (
                                                                        <div className="absolute right-0 top-0 h-full flex items-center pr-2">
                                                                            <span className="text-xs font-medium text-green-600">
                                                                                {formatCurrency(individualPay)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Bottom Padding for Fixed Actions */}
                                {selectedCount > 0 && <div className="h-24" />}
                            </div>

                            {/* Bottom Actions - Sticky instead of fixed/absolute */}
                            {selectedCount > 0 && (
                                <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-md">
                                    <div className="p-6">
                                        {/* Subtle Calculations Summary */}
                                        {totalPay > 0 && (
                                            <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500">Total Pay:</span>
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {formatCurrency(totalPay)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500">Profit:</span>
                                                    <span
                                                        className={`text-sm font-bold ${
                                                            profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}
                                                    >
                                                        {formatCurrency(profitMargin)} ({profitPercentage.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center space-x-3">
                                            <button
                                                type="submit"
                                                disabled={!isValid}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-sm"
                                            >
                                                Select {selectedCount} Driver{selectedCount !== 1 ? 's' : ''}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onGoBack}
                                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center text-center text-gray-500 space-y-3 px-4">
                                <UserCircleIcon className="w-12 h-12 text-gray-300" />
                                <div>
                                    <p className="text-base font-medium">No drivers available</p>
                                    <div className="flex items-center justify-center space-x-1 mt-2">
                                        <span className="text-sm">Add drivers on the</span>
                                        <Link
                                            href="/drivers"
                                            target="_blank"
                                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                        >
                                            Drivers Page
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RouteLegDriverSelection;

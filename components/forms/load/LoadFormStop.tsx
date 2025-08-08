'use client';

import { Combobox, Disclosure, Transition, Listbox } from '@headlessui/react';
import { CheckCircleIcon, ChevronUpDownIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { LoadStopType } from '@prisma/client';
import classNames from 'classnames';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import * as iso3166 from 'iso-3166-2';
import React, { useEffect, useState, Fragment, useRef } from 'react';
import {
    type Control,
    Controller,
    type FieldErrors,
    type UseFormGetValues,
    type UseFormRegister,
    type UseFormSetValue,
    type UseFormWatch,
} from 'react-hook-form';
import { countryCodes } from '../../../interfaces/country-codes';
import { type LocationEntry, regionFromLocationEntry } from '../../../interfaces/location';
import type { ExpandedLoad } from '../../../interfaces/models';
import { useDebounce } from '../../../lib/debounce';
import { queryLocations } from '../../../lib/rest/maps';
import Spinner from '../../Spinner';
import TimeRangeSelector from '../../TimeRangeSelector';
import { type TimeRangeValue, stringToTimeRange, timeRangeToString } from '../../../lib/helpers/time-range-utils';

export type LoadFormStopProps = {
    type: LoadStopType;
    totalStops?: number;
    showAdditionalInfoPanel?: boolean;
    index?: number;
    onRemoveStop?: () => void;
    register: UseFormRegister<ExpandedLoad>;
    errors: FieldErrors<ExpandedLoad>;
    control: Control<ExpandedLoad, any>;
    setValue: UseFormSetValue<ExpandedLoad>;
    getValues: UseFormGetValues<ExpandedLoad>;
    watch: UseFormWatch<ExpandedLoad>;
    mouseHoverOverField?: (event: React.MouseEvent<HTMLInputElement>) => void;
    mouseHoverOutField?: (event: React.MouseEvent<HTMLInputElement>) => void;
};

const LoadFormStop: React.FC<LoadFormStopProps> = ({
    register,
    errors,
    control,
    setValue,
    getValues,
    watch,
    index,
    onRemoveStop,
    showAdditionalInfoPanel = true,
    mouseHoverOutField,
    mouseHoverOverField,
    ...props
}) => {
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [locationSearchResults, setLocationSearchResults] = React.useState<LocationEntry[]>(null);
    const debouncedLocationSearchTerm = useDebounce(locationSearchTerm, 500);
    const [selectedLocation, setSelectedLocation] = useState<LocationEntry>(null);

    // Store initial time value for reset functionality in edit mode
    const [initialTimeValue, setInitialTimeValue] = useState<TimeRangeValue | undefined>(undefined);
    const hasSetInitialValue = useRef(false);

    const fieldId = (name: string): any => {
        if (props.type === LoadStopType.SHIPPER) {
            return `shipper.${name}`;
        } else if (props.type === LoadStopType.RECEIVER) {
            return `receiver.${name}`;
        } else {
            return `stops.${index}.${name}`;
        }
    };

    // Watch the time field to capture initial value when it's first populated
    const currentTimeFieldValue = watch(fieldId('time'));

    // Initialize the initial time value when the field gets its first meaningful value
    useEffect(() => {
        if (!hasSetInitialValue.current && currentTimeFieldValue && currentTimeFieldValue !== '') {
            const timeRangeValue =
                typeof currentTimeFieldValue === 'string'
                    ? stringToTimeRange(currentTimeFieldValue)
                    : currentTimeFieldValue;

            if (timeRangeValue && (timeRangeValue.startTime !== '' || timeRangeValue.endTime !== '')) {
                setInitialTimeValue(timeRangeValue);
                hasSetInitialValue.current = true;
            }
        }
    }, [currentTimeFieldValue]); // Watch for changes to the time field value

    const watchCity = watch(fieldId('city'));
    const watchState = watch(fieldId('state'));
    const watchZip = watch(fieldId('zip'));
    const watchCountry = watch(fieldId('country'));
    const watchLongitude = watch(fieldId('longitude'));
    const watchLatitude = watch(fieldId('latitude'));

    useEffect(() => {
        const longitude = getValues(fieldId('longitude'));
        const latitude = getValues(fieldId('latitude'));

        if (longitude && latitude) {
            const location: LocationEntry = {
                longitude,
                latitude,
                street: getValues(fieldId('street')),
                city: getValues(fieldId('city')),
                region: {
                    shortCode: '',
                    text: getValues(fieldId('state')),
                },
                zip: getValues(fieldId('zip')),
                country: {
                    shortCode: getValues(fieldId('country')),
                    text: '',
                },
            };

            setSelectedLocation(location);
        }
    }, [register]);

    useEffect(() => {
        validateLocationCoordinatesWithForm();
    }, [watchCity, watchState, watchZip, watchCountry]);

    useEffect(() => {
        if (!debouncedLocationSearchTerm) {
            setIsSearchingLocation(false);
            setLocationSearchResults(null);
            return;
        }

        async function searchFetch() {
            const locations = await queryLocations(debouncedLocationSearchTerm);
            setIsSearchingLocation(false);

            const noResults = !locations || locations?.length === 0;
            if (noResults) {
                setLocationSearchResults([]);
                return;
            }

            setLocationSearchResults(locations);
        }

        searchFetch();
    }, [debouncedLocationSearchTerm]);

    const getStopTitle = () => {
        switch (props.type) {
            case LoadStopType.SHIPPER:
                return 'Pickup Location';
            case LoadStopType.RECEIVER:
                return 'Delivery Location';
            default:
                return props.totalStops > 1 ? `Stop #${index + 1}` : 'Stop';
        }
    };

    const errorMessage = (errors: FieldErrors<ExpandedLoad>, name: string) => {
        if (props.type === LoadStopType.SHIPPER) {
            return (
                errors.shipper &&
                errors.shipper[name] &&
                errors.shipper[name].message && (
                    <p className="mt-1 text-sm text-red-600">{errors.shipper[name].message}</p>
                )
            );
        } else if (props.type === LoadStopType.RECEIVER) {
            return (
                errors.receiver &&
                errors.receiver[name] &&
                errors.receiver[name].message && (
                    <p className="mt-1 text-sm text-red-600">{errors.receiver[name].message}</p>
                )
            );
        } else {
            return (
                errors?.stops &&
                errors?.stops[index] &&
                errors?.stops[index][name] && (
                    <p className="mt-1 text-sm text-red-600">{errors?.stops[index][name]?.message}</p>
                )
            );
        }
    };

    const validateLocationCoordinatesWithForm = () => {
        if (!selectedLocation) {
            return;
        }

        const currentFormLocation = {
            street: getValues(fieldId('street')),
            city: getValues(fieldId('city')),
            state: getValues(fieldId('state')),
            zip: getValues(fieldId('zip')),
            country: getValues(fieldId('country')),
        };

        const isValid = () => {
            if (currentFormLocation.street.toLowerCase() !== selectedLocation.street?.toLowerCase()) {
                return false;
            }
            if (currentFormLocation.city.toLowerCase() !== selectedLocation.city?.toLowerCase()) {
                return false;
            }

            let iso3166Info = selectedLocation?.region?.iso3166Info;
            if (!iso3166Info) {
                iso3166Info = iso3166.subdivision(selectedLocation.country.shortCode, selectedLocation.region.text);
                selectedLocation.region.iso3166Info = iso3166Info;
            }

            if (iso3166Info) {
                if (
                    currentFormLocation.state.toLowerCase() !== iso3166Info.regionCode?.toLowerCase() &&
                    currentFormLocation.state.toLowerCase() !== iso3166Info.name?.toLowerCase() &&
                    currentFormLocation.state.toLowerCase() !== iso3166Info.code?.toLowerCase()
                ) {
                    return false;
                }
            } else {
                if (
                    currentFormLocation.state.toLowerCase() !== selectedLocation.region?.shortCode?.toLowerCase() &&
                    currentFormLocation.state.toLowerCase() !== selectedLocation.region?.text?.toLowerCase()
                ) {
                    return false;
                }
            }

            if (currentFormLocation.zip.toLowerCase() !== selectedLocation.zip?.toLowerCase()) {
                return false;
            }
            if (currentFormLocation.country !== selectedLocation.country.shortCode) {
                return false;
            }

            return true;
        };

        if (isValid()) {
            setValue(fieldId('longitude'), selectedLocation.longitude);
            setValue(fieldId('latitude'), selectedLocation.latitude);
        } else {
            setValue(fieldId('longitude'), null);
            setValue(fieldId('latitude'), null);
        }
    };

    return (
        <div className="space-y-6">
            {index !== undefined && (
                <input
                    {...register(fieldId('stopIndex'), {
                        valueAsNumber: true,
                    })}
                    type="hidden"
                    value={index}
                    onMouseEnter={mouseHoverOverField}
                    onMouseLeave={mouseHoverOutField}
                />
            )}

            {/* Header for stops only */}
            {props.type === LoadStopType.STOP && (
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">{getStopTitle()}</h3>
                    {onRemoveStop && (
                        <button
                            type="button"
                            onClick={onRemoveStop}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            )}

            {/* Business Name */}
            <div>
                <label htmlFor={fieldId('name')} className="block text-sm text-gray-500 mb-2">
                    Business Name
                </label>
                <input
                    {...register(fieldId('name'), {
                        required: 'Business Name is required',
                    })}
                    type="text"
                    id={fieldId('name')}
                    placeholder="Enter business name"
                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    onMouseEnter={mouseHoverOverField}
                    onMouseLeave={mouseHoverOutField}
                />
                {errorMessage(errors, 'name')}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor={fieldId('date')} className="block text-sm text-gray-500 mb-2">
                        {props.type === LoadStopType.RECEIVER
                            ? 'Delivery Date'
                            : props.type === LoadStopType.SHIPPER
                            ? 'Pick Up Date'
                            : 'Date'}
                    </label>
                    <Controller
                        control={control}
                        rules={{ required: 'Date is required' }}
                        name={fieldId('date')}
                        render={({ field, fieldState: { error } }) => (
                            <div>
                                <input
                                    onMouseEnter={mouseHoverOverField}
                                    onMouseLeave={mouseHoverOutField}
                                    onChange={(e) => {
                                        if (!e.target.validity.badInput) {
                                            field.onChange(parseISO(e.target.value));
                                        }
                                    }}
                                    value={
                                        field.value && !isNaN(new Date(field.value).getTime())
                                            ? format(new Date(field.value), 'yyyy-MM-dd')
                                            : ''
                                    }
                                    type="date"
                                    max="9999-12-31"
                                    id={fieldId('date')}
                                    name={fieldId('date')}
                                    className={`w-full px-4 py-3 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                                        error ? 'bg-red-50' : ''
                                    }`}
                                />
                                {error && <p className="mt-1 text-sm text-red-600">{error?.message}</p>}
                            </div>
                        )}
                    />
                </div>

                <div>
                    <Controller
                        name={fieldId('time')}
                        control={control}
                        rules={{
                            required: 'Time is required',
                            validate: (value) => {
                                if (typeof value === 'string') {
                                    return value.trim() !== '' || 'Time is required';
                                }
                                if (typeof value === 'object') {
                                    return (
                                        (value.startTime && value.startTime.trim() !== '') || 'Start time is required'
                                    );
                                }
                                return 'Time is required';
                            },
                        }}
                        render={({ field, fieldState: { error } }) => (
                            <TimeRangeSelector
                                value={
                                    field.value
                                        ? typeof field.value === 'string'
                                            ? stringToTimeRange(field.value)
                                            : field.value
                                        : undefined
                                }
                                initialValue={initialTimeValue}
                                onChange={(timeRange) => {
                                    // Store as string for backward compatibility
                                    if (timeRange.isRange && timeRange.endTime) {
                                        field.onChange(`${timeRange.startTime}-${timeRange.endTime}`);
                                    } else if (timeRange.startTime) {
                                        field.onChange(timeRange.startTime);
                                    } else {
                                        field.onChange('');
                                    }
                                }}
                                label={
                                    props.type === LoadStopType.RECEIVER
                                        ? 'Drop Off Time (24H)'
                                        : props.type === LoadStopType.SHIPPER
                                        ? 'Pick Up Time (24H)'
                                        : 'Time (24H)'
                                }
                                placeholder="(e.g. 14:00 or 09:00-17:00)"
                                error={error?.message}
                                name={fieldId('time')}
                                onMouseEnter={mouseHoverOverField}
                                onMouseLeave={mouseHoverOutField}
                            />
                        )}
                    />
                </div>
            </div>

            {/* Address Search */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label htmlFor={fieldId('street')} className="block text-sm text-gray-500">
                        Street Address
                    </label>
                    {watchLongitude && watchLatitude && (
                        <div className="flex items-center text-sm font-medium text-green-600">
                            <CheckCircleIcon className="mr-1 h-4 w-4" />
                            Verified
                        </div>
                    )}
                </div>

                <Controller
                    control={control}
                    rules={{ required: 'Street Address is required' }}
                    name={fieldId('street')}
                    render={({ field, fieldState: { error } }) => (
                        <div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <Combobox
                                    as="div"
                                    value={field.value || ''}
                                    onChange={(selectedLocation: LocationEntry) => {
                                        setSelectedLocation(selectedLocation);
                                        setLocationSearchTerm('');

                                        const { regionText, iso3166Info } = regionFromLocationEntry(selectedLocation);
                                        if (iso3166Info) {
                                            selectedLocation.region.iso3166Info = iso3166Info;
                                        }
                                        setValue(fieldId('state'), regionText);

                                        setValue(fieldId('city'), selectedLocation.city);
                                        setValue(fieldId('zip'), selectedLocation.zip);
                                        setValue(fieldId('country'), selectedLocation.country.shortCode);
                                        setValue(fieldId('longitude'), selectedLocation.longitude);
                                        setValue(fieldId('latitude'), selectedLocation.latitude);
                                        field.onChange(selectedLocation.street);
                                    }}
                                >
                                    <Combobox.Input
                                        autoComplete="off"
                                        name={fieldId('street')}
                                        className="w-full pl-10 pr-10 px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        onChange={(e) => {
                                            field.onChange(e.target.value);
                                            if (e.target.value.length > 0) {
                                                setIsSearchingLocation(true);
                                            }
                                            setLocationSearchTerm(e.target.value);
                                            validateLocationCoordinatesWithForm();
                                        }}
                                        onMouseEnter={mouseHoverOverField}
                                        onMouseLeave={mouseHoverOutField}
                                        placeholder="Search for address..."
                                    />
                                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-3">
                                        <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
                                    </Combobox.Button>

                                    {locationSearchTerm.length > 0 && (
                                        <Combobox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto bg-white shadow-lg max-h-60 focus:outline-none">
                                            {isSearchingLocation ? (
                                                <div className="px-4 py-3">
                                                    <Spinner className="text-gray-700" />
                                                </div>
                                            ) : (
                                                <>
                                                    {locationSearchResults?.length > 0 &&
                                                        locationSearchResults.map((location, idx) => (
                                                            <Combobox.Option
                                                                key={idx}
                                                                value={location}
                                                                className={({ active }) =>
                                                                    classNames(
                                                                        'relative select-none py-3 pl-4 pr-9 cursor-pointer',
                                                                        active
                                                                            ? 'bg-blue-50 text-blue-900'
                                                                            : 'text-gray-900',
                                                                    )
                                                                }
                                                            >
                                                                <div>
                                                                    <p className="font-medium text-sm">
                                                                        {location.street}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {location.city}, {location.region.text}{' '}
                                                                        {location.zip}
                                                                    </p>
                                                                </div>
                                                            </Combobox.Option>
                                                        ))}

                                                    {locationSearchResults?.length === 0 && (
                                                        <div className="px-4 py-3 text-gray-500 text-sm">
                                                            Nothing found.
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </Combobox.Options>
                                    )}
                                </Combobox>
                            </div>
                            {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                        </div>
                    )}
                />
            </div>

            {/* City, State, Zip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label htmlFor={fieldId('city')} className="block text-sm text-gray-500 mb-2">
                        City
                    </label>
                    <input
                        {...register(fieldId('city'), { required: 'City is required' })}
                        type="text"
                        id={fieldId('city')}
                        placeholder="Enter city"
                        className="w-full px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        onMouseEnter={mouseHoverOverField}
                        onMouseLeave={mouseHoverOutField}
                    />
                    {errorMessage(errors, 'city')}
                </div>

                <div>
                    <label htmlFor={fieldId('state')} className="block text-sm text-gray-500 mb-2">
                        State / Province
                    </label>
                    <input
                        {...register(fieldId('state'), { required: 'State is required' })}
                        type="text"
                        id={fieldId('state')}
                        placeholder="Enter state"
                        className="w-full px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        onMouseEnter={mouseHoverOverField}
                        onMouseLeave={mouseHoverOutField}
                    />
                    {errorMessage(errors, 'state')}
                </div>

                <div>
                    <label htmlFor={fieldId('zip')} className="block text-sm text-gray-500 mb-2">
                        Zip / Postal Code
                    </label>
                    <input
                        {...register(fieldId('zip'), { required: 'Zipcode is required' })}
                        type="text"
                        id={fieldId('zip')}
                        placeholder="Enter zip code"
                        className="w-full px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        onMouseEnter={mouseHoverOverField}
                        onMouseLeave={mouseHoverOutField}
                    />
                    {errorMessage(errors, 'zip')}
                </div>
            </div>

            {/* Country */}
            <div>
                <label htmlFor={fieldId('country')} className="block text-sm text-gray-500 mb-2">
                    Country
                </label>
                <Controller
                    control={control}
                    rules={{ required: 'Country is required' }}
                    name={fieldId('country')}
                    defaultValue="US"
                    render={({ field, fieldState: { error } }) => (
                        <>
                            <Listbox value={field.value} onChange={field.onChange}>
                                <div className="relative">
                                    <Listbox.Button
                                        id={fieldId('country')}
                                        className="w-full px-4 py-3 bg-gray-50/80 backdrop-blur-xl text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/90 transition-all text-left rounded-md shadow-sm ring-1 ring-gray-200/60"
                                    >
                                        <span className="block truncate">
                                            {field.value
                                                ? countryCodes.find((country) => country.code === field.value)?.name ||
                                                  'Select Country'
                                                : 'Select Country'}
                                        </span>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                            <svg
                                                className="h-5 w-5 text-gray-400"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04L10 14.148l2.7-1.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                    </Listbox.Button>
                                    <Transition
                                        leave="transition ease-in duration-100"
                                        leaveFrom="opacity-100"
                                        leaveTo="opacity-0"
                                    >
                                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white/90 backdrop-blur-xl py-1 text-base shadow-lg ring-1 ring-gray-200/60 focus:outline-none sm:text-sm">
                                            {countryCodes.map((countryCode) => (
                                                <Listbox.Option
                                                    key={countryCode.code}
                                                    value={countryCode.code}
                                                    className={({ active }) =>
                                                        `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                                            active ? 'bg-blue-50/80 text-blue-900' : 'text-gray-900'
                                                        }`
                                                    }
                                                >
                                                    {({ selected }) => (
                                                        <>
                                                            <span
                                                                className={`block truncate font-semibold ${
                                                                    selected ? 'font-bold' : 'font-semibold'
                                                                }`}
                                                            >
                                                                {countryCode.name}
                                                            </span>
                                                            {selected ? (
                                                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                                                                    <svg
                                                                        className="h-5 w-5"
                                                                        viewBox="0 0 20 20"
                                                                        fill="currentColor"
                                                                        aria-hidden="true"
                                                                    >
                                                                        <path
                                                                            fillRule="evenodd"
                                                                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                                                            clipRule="evenodd"
                                                                        />
                                                                    </svg>
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </Listbox.Option>
                                            ))}
                                        </Listbox.Options>
                                    </Transition>
                                </div>
                            </Listbox>
                            {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                        </>
                    )}
                />
            </div>

            {/* Additional Information */}
            {showAdditionalInfoPanel && (
                <div>
                    <Disclosure defaultOpen={true}>
                        {({ open }) => (
                            <>
                                <Disclosure.Button className="flex w-full justify-between items-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                                    <span>Additional Information</span>
                                    <ChevronDownIcon
                                        className={`${
                                            open ? 'transform rotate-180' : ''
                                        } w-5 h-5 text-gray-500 transition-transform`}
                                    />
                                </Disclosure.Button>
                                <Transition
                                    show={open}
                                    as={Fragment}
                                    enter="transition ease-out duration-200"
                                    enterFrom="opacity-0 -translate-y-1"
                                    enterTo="opacity-100 translate-y-0"
                                    leave="transition ease-in duration-150"
                                    leaveFrom="opacity-100 translate-y-0"
                                    leaveTo="opacity-0 -translate-y-1"
                                >
                                    <Disclosure.Panel className="mt-4 space-y-4 p-4 bg-gray-50">
                                        <div>
                                            <label
                                                htmlFor={fieldId('poNumbers')}
                                                className="block text-sm text-gray-500 mb-2"
                                            >
                                                PO Numbers
                                            </label>
                                            <input
                                                {...register(fieldId('poNumbers'))}
                                                id={fieldId('poNumbers')}
                                                placeholder="Enter PO numbers"
                                                className="w-full px-4 py-3 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                onMouseEnter={mouseHoverOverField}
                                                onMouseLeave={mouseHoverOutField}
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor={fieldId('pickUpNumbers')}
                                                className="block text-sm text-gray-500 mb-2"
                                            >
                                                {props.type === LoadStopType.RECEIVER ? 'Delivery' : 'Pickup'} Numbers
                                            </label>
                                            <input
                                                {...register(fieldId('pickUpNumbers'))}
                                                id={fieldId('pickUpNumbers')}
                                                placeholder={`Enter ${
                                                    props.type === LoadStopType.RECEIVER ? 'delivery' : 'pickup'
                                                } numbers`}
                                                className="w-full px-4 py-3 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                onMouseEnter={mouseHoverOverField}
                                                onMouseLeave={mouseHoverOutField}
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor={fieldId('referenceNumbers')}
                                                className="block text-sm text-gray-500 mb-2"
                                            >
                                                Reference Numbers
                                            </label>
                                            <input
                                                {...register(fieldId('referenceNumbers'))}
                                                id={fieldId('referenceNumbers')}
                                                placeholder="Enter reference numbers"
                                                className="w-full px-4 py-3 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                onMouseEnter={mouseHoverOverField}
                                                onMouseLeave={mouseHoverOutField}
                                            />
                                        </div>
                                    </Disclosure.Panel>
                                </Transition>
                            </>
                        )}
                    </Disclosure>
                </div>
            )}
        </div>
    );
};

export default LoadFormStop;

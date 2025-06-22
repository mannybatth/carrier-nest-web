'use client';

import { Combobox, Disclosure, Transition } from '@headlessui/react';
import { CheckCircleIcon, ChevronUpDownIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { LoadStopType } from '@prisma/client';
import classNames from 'classnames';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import * as iso3166 from 'iso-3166-2';
import React, { useEffect, useState, Fragment } from 'react';
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
    const [debouncedLocationSearchTerm, setDebouncedLocationSearchTerm] = useDebounce(locationSearchTerm, 500);
    const [selectedLocation, setSelectedLocation] = useState<LocationEntry>(null);

    const fieldId = (name: string): any => {
        if (props.type === LoadStopType.SHIPPER) {
            return `shipper.${name}`;
        } else if (props.type === LoadStopType.RECEIVER) {
            return `receiver.${name}`;
        } else {
            return `stops.${index}.${name}`;
        }
    };

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
                    <label htmlFor={fieldId('time')} className="block text-sm text-gray-500 mb-2">
                        {props.type === LoadStopType.RECEIVER
                            ? 'Drop Off Time'
                            : props.type === LoadStopType.SHIPPER
                            ? 'Pick Up Time'
                            : 'Time'}
                    </label>
                    <input
                        {...register(fieldId('time'), { required: 'Time is required' })}
                        type="text"
                        id={fieldId('time')}
                        placeholder="e.g. 14:00"
                        className="w-full px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        onMouseEnter={mouseHoverOverField}
                        onMouseLeave={mouseHoverOutField}
                    />
                    {errorMessage(errors, 'time')}
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
                                        setDebouncedLocationSearchTerm('');

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
                            <select
                                {...field}
                                id={fieldId('country')}
                                className="w-full px-4 py-3 bg-gray-50 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            >
                                {countryCodes.map((countryCode) => (
                                    <option key={countryCode.code} value={countryCode.code}>
                                        {countryCode.name}
                                    </option>
                                ))}
                            </select>
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

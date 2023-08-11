import { Combobox } from '@headlessui/react';
import { CheckCircleIcon, ChevronUpDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { LoadStopType } from '@prisma/client';
import classNames from 'classnames';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import * as iso3166 from 'iso-3166-2';
import React, { useEffect, useState } from 'react';
import {
    Control,
    Controller,
    FieldErrors,
    UseFormGetValues,
    UseFormRegister,
    UseFormSetValue,
    UseFormWatch,
} from 'react-hook-form';
import { countryCodes } from '../../../interfaces/country-codes';
import { LocationEntry, regionFromLocationEntry } from '../../../interfaces/location';
import { ExpandedLoad } from '../../../interfaces/models';
import { useDebounce } from '../../../lib/debounce';
import { queryLocations } from '../../../lib/rest/maps';
import Spinner from '../../Spinner';
import TimeField from '../TimeField';

export type LoadFormStopProps = {
    type: LoadStopType;
    totalStops?: number;
    index?: number;
    onRemoveStop?: () => void;
    register: UseFormRegister<ExpandedLoad>;
    errors: FieldErrors<ExpandedLoad>;
    control: Control<ExpandedLoad, any>;
    setValue: UseFormSetValue<ExpandedLoad>;
    getValues: UseFormGetValues<ExpandedLoad>;
    watch: UseFormWatch<ExpandedLoad>;
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
    ...props
}) => {
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [locationSearchResults, setLocationSearchResults] = React.useState<LocationEntry[]>(null);
    const [debouncedLocationSearchTerm, setDebouncedLocationSearchTerm] = useDebounce(locationSearchTerm, 500);

    // Local storage of location to compare changes against
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

    const borderColor = () => {
        switch (props.type) {
            case LoadStopType.SHIPPER:
                return 'border-emerald-500';
            case LoadStopType.RECEIVER:
                return 'border-violet-500';
            default:
                return 'border-gray-500';
        }
    };

    const title = () => {
        switch (props.type) {
            case LoadStopType.SHIPPER:
                return 'Shipper';
            case LoadStopType.RECEIVER:
                return 'Receiver';
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
                    <p className="mt-2 text-sm text-red-600">{errors.shipper[name].message}</p>
                )
            );
        } else if (props.type === LoadStopType.RECEIVER) {
            return (
                errors.receiver &&
                errors.receiver[name] &&
                errors.receiver[name].message && (
                    <p className="mt-2 text-sm text-red-600">{errors.receiver[name].message}</p>
                )
            );
        } else {
            return (
                errors?.stops &&
                errors?.stops[index] &&
                errors?.stops[index][name] && (
                    <p className="mt-2 text-sm text-red-600">{errors?.stops[index][name]?.message}</p>
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
        <div className={`col-span-6 pl-4 border-l-4 ${borderColor()}`}>
            {index !== undefined && (
                <input
                    {...register(fieldId('stopIndex'), {
                        valueAsNumber: true,
                    })}
                    type="hidden"
                    value={index}
                ></input>
            )}
            <div className="flex flex-row">
                <div className="flex-1 mb-3 font-medium leading-6 text-gray-900 uppercase">{title()}</div>
                {props.type === LoadStopType.STOP && (
                    <div>
                        <a
                            className="text-sm"
                            onClick={() => {
                                onRemoveStop();
                            }}
                        >
                            Remove Stop
                        </a>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 sm:col-span-5 lg:col-span-6">
                    <label htmlFor={fieldId('name')} className="block text-sm font-medium text-gray-700">
                        Business Name
                    </label>
                    <input
                        {...register(fieldId('name'), { required: 'Business Name is required' })}
                        type="text"
                        id={fieldId('name')}
                        autoComplete="business-name"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'name')}
                </div>

                <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                    <label htmlFor={fieldId('date')} className="block text-sm font-medium text-gray-700">
                        {props.type === LoadStopType.RECEIVER
                            ? 'Delivery Date'
                            : props.type === LoadStopType.SHIPPER
                            ? 'Pick Up Date'
                            : 'Date'}
                    </label>
                    <Controller
                        control={control}
                        rules={{ required: 'Pick Up Date is required' }}
                        name={fieldId('date')}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                                <div className="relative mt-1">
                                    <input
                                        onChange={(e) => {
                                            if (!e.target.validity.badInput) {
                                                onChange(parseISO(e.target.value));
                                            }
                                        }}
                                        value={
                                            value && !isNaN(new Date(value).getTime())
                                                ? format(new Date(value), 'yyyy-MM-dd')
                                                : ''
                                        }
                                        type="date"
                                        max="9999-12-31"
                                        id={fieldId('date')}
                                        autoComplete="date"
                                        className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                                            error
                                                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                                                : ''
                                        }`}
                                    />
                                </div>
                                {error && <p className="mt-2 text-sm text-red-600">{error?.message}</p>}
                            </>
                        )}
                    />
                </div>

                <div className="col-span-12 sm:col-span-3 lg:col-span-3">
                    <label htmlFor={fieldId('time')} className="block text-sm font-medium text-gray-700">
                        {props.type === LoadStopType.RECEIVER
                            ? 'Drop Off Time'
                            : props.type === LoadStopType.SHIPPER
                            ? 'Pick Up Time'
                            : 'Time'}
                    </label>

                    <Controller
                        control={control}
                        rules={{
                            minLength: { value: 5, message: 'Time is invalid' },
                        }}
                        name={fieldId('time')}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                                <div className="relative mt-1">
                                    <TimeField
                                        value={value || ''}
                                        onChange={onChange}
                                        input={
                                            <input
                                                type="text"
                                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                id={fieldId('time')}
                                            />
                                        }
                                    />
                                    <div className="absolute right-0 flex items-center pr-3 pointer-events-none inset-y-1">
                                        <ClockIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                </div>
                                {error && <p className="mt-2 text-sm text-red-600">{error?.message}</p>}
                            </>
                        )}
                    />
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-12">
                    <Controller
                        control={control}
                        rules={{ required: 'Street Address is required' }}
                        name={fieldId('street')}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <Combobox
                                as="div"
                                value={value || ''}
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
                                    onChange(selectedLocation.street);
                                }}
                            >
                                <div className="flex items-center space-x-3">
                                    <Combobox.Label className="flex-1 block text-sm font-medium text-gray-700 ">
                                        Street Address{' '}
                                        <MagnifyingGlassIcon
                                            className="inline-block w-4 h-4 text-gray-400"
                                            aria-hidden="true"
                                        />
                                    </Combobox.Label>

                                    {watchLongitude && watchLatitude && (
                                        <div className="flex items-center space-x-1 text-xs font-medium text-green-800 flex-0 ">
                                            <CheckCircleIcon className="w-4 h-4 text-green-600" aria-hidden="true" />
                                            <div>Verified</div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative mt-1">
                                    <Combobox.Input
                                        autoComplete="xyz"
                                        className="w-full py-2 pl-3 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                        onChange={(e) => {
                                            onChange(e.target.value);
                                            if (e.target.value.length > 0) {
                                                setIsSearchingLocation(true);
                                            }
                                            setLocationSearchTerm(e.target.value);
                                            validateLocationCoordinatesWithForm();
                                        }}
                                    />
                                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-2 rounded-r-md focus:outline-none">
                                        <ChevronUpDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                                    </Combobox.Button>

                                    {locationSearchTerm.length > 0 && (
                                        <Combobox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            {isSearchingLocation ? (
                                                <div className="relative px-4 py-2">
                                                    <Spinner className="text-gray-700"></Spinner>
                                                </div>
                                            ) : (
                                                <>
                                                    {locationSearchResults?.length > 0 &&
                                                        locationSearchResults.map((location, index) => (
                                                            <Combobox.Option
                                                                key={index}
                                                                value={location}
                                                                className={({ active }) =>
                                                                    classNames(
                                                                        'relative select-none py-2 pl-3 pr-9 cursor-pointer',
                                                                        active
                                                                            ? 'bg-blue-600 text-white'
                                                                            : 'text-gray-900',
                                                                    )
                                                                }
                                                            >
                                                                {({ active, selected }) => (
                                                                    <>
                                                                        <span className="block font-semibold truncate">
                                                                            {location.street}
                                                                        </span>
                                                                        <span className="block truncate">
                                                                            {location.city} {location.region.text}{' '}
                                                                            {location.zip} {location.country.text}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </Combobox.Option>
                                                        ))}

                                                    {locationSearchResults?.length === 0 && (
                                                        <div className="relative px-4 py-2 text-gray-700 cursor-default select-none">
                                                            Nothing found.
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </Combobox.Options>
                                    )}
                                </div>

                                {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
                            </Combobox>
                        )}
                    />
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <label htmlFor={fieldId('city')} className="block text-sm font-medium text-gray-700">
                        City
                    </label>
                    <input
                        {...register(fieldId('city'), { required: 'City is required' })}
                        type="text"
                        id={fieldId('city')}
                        autoComplete="city"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'city')}
                </div>

                <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                    <label htmlFor={fieldId('state')} className="block text-sm font-medium text-gray-700">
                        State / Province
                    </label>
                    <input
                        {...register(fieldId('state'), { required: 'State is required' })}
                        type="text"
                        id={fieldId('state')}
                        autoComplete="state"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'state')}
                </div>

                <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                    <label htmlFor={fieldId('zip')} className="block text-sm font-medium text-gray-700">
                        Zip / Postal Code
                    </label>
                    <input
                        {...register(fieldId('zip'), { required: 'State is required' })}
                        type="text"
                        id={fieldId('zip')}
                        autoComplete="postal-code"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errorMessage(errors, 'zip')}
                </div>

                <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                    <Controller
                        control={control}
                        rules={{ required: 'Country is required' }}
                        name={fieldId('country')}
                        defaultValue="US"
                        render={({ field, fieldState: { error } }) => (
                            <>
                                <label htmlFor={fieldId('country')} className="block text-sm font-medium text-gray-700">
                                    Country
                                </label>
                                <select
                                    {...field}
                                    className="block w-full py-2 pl-3 pr-10 mt-1 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    {countryCodes.map((countryCode) => (
                                        <option key={countryCode.code} value={countryCode.code}>
                                            {countryCode.name}
                                        </option>
                                    ))}
                                </select>
                                {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
                            </>
                        )}
                    />
                </div>
            </div>
        </div>
    );
};

export default LoadFormStop;

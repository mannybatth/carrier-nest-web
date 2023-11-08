import { PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Customer, LoadStopType, Prisma } from '@prisma/client';
import startOfDay from 'date-fns/startOfDay';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { useFieldArray, useForm } from 'react-hook-form';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { notify } from '../../components/Notification';
import { apiUrl, appUrl } from '../../constants';
import { AILoad } from '../../interfaces/ai';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { parseDate } from '../../lib/helpers/date';
import { fuzzySearch } from '../../lib/helpers/levenshtein';
import { calcPdfPageCount } from '../../lib/helpers/pdf';
import { getGeocoding, getRouteForCoords } from '../../lib/mapbox/searchGeo';
import { getAllCustomers } from '../../lib/rest/customer';
import { createLoad, getLoadById } from '../../lib/rest/load';
import AnimatedProgress from 'components/loads/AnimationProgress';
import { addColonToTimeString, convertRateToNumber } from 'lib/helpers/ratecon-vertex-helpers';

const CreateLoad: PageWithAuth = () => {
    const formHook = useForm<ExpandedLoad>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const copyLoadId = searchParams.get('copyLoadId');

    const [loading, setLoading] = React.useState(false);
    const [openAddCustomer, setOpenAddCustomer] = React.useState(false);
    const [showMissingCustomerLabel, setShowMissingCustomerLabel] = React.useState(false);
    const [prefillName, setPrefillName] = React.useState(null);
    const [currentRateconFile, setCurrentRateconFile] = React.useState<File>(null);

    const [aiProgress, setAiProgress] = React.useState(0);
    const [isRetrying, setIsRetrying] = React.useState(false);

    const stopsFieldArray = useFieldArray({ name: 'stops', control: formHook.control });

    useEffect(() => {
        if (!copyLoadId) {
            return;
        }
        const copyLoad = async () => {
            setLoading(true);
            try {
                const load = await getLoadById(copyLoadId);
                if (!load) {
                    setLoading(false);
                    return;
                }

                formHook.setValue('customer', load.customer);
                formHook.setValue('refNum', load.refNum);
                formHook.setValue('rate', load.rate);
                formHook.setValue('shipper', load.shipper);
                formHook.setValue('receiver', load.receiver);
                formHook.setValue('stops', load.stops);
            } catch (error) {
                notify({ title: 'Error', message: 'Error loading load data', type: 'error' });
            }
            setLoading(false);
        };
        copyLoad();
    }, [copyLoadId]);

    const submit = async (data: ExpandedLoad) => {
        setLoading(true);

        data.shipper.type = LoadStopType.SHIPPER;
        data.receiver.type = LoadStopType.RECEIVER;

        const loadData: ExpandedLoad = {
            customerId: data.customer.id,
            refNum: data.refNum,
            rate: new Prisma.Decimal(data.rate),
            customer: data.customer,
            shipper: data.shipper,
            receiver: data.receiver,
            stops: data.stops,
        };

        const shipperAddress =
            loadData.shipper.street +
            ', ' +
            loadData.shipper.city +
            ', ' +
            loadData.shipper.state +
            ' ' +
            loadData.shipper.zip;
        const receiverAddress =
            loadData.receiver.street +
            ', ' +
            loadData.receiver.city +
            ', ' +
            loadData.receiver.state +
            ' ' +
            loadData.receiver.zip;
        const shipperCoordinates = await getGeocoding(shipperAddress);
        const receiverCoordinates = await getGeocoding(receiverAddress);
        const stopsCoordinates = await Promise.all(
            loadData.stops && loadData.stops.length > 0
                ? loadData.stops.map((stop) => {
                      const stopAddress = stop.street + ', ' + stop.city + ', ' + stop.state + ' ' + stop.zip;
                      return getGeocoding(stopAddress);
                  })
                : [],
        );

        const { routeEncoded, distance, duration } = await getRouteForCoords([
            [shipperCoordinates.longitude, shipperCoordinates.latitude],
            ...stopsCoordinates.map((stop) => [stop.longitude, stop.latitude]),
            [receiverCoordinates.longitude, receiverCoordinates.latitude],
        ]);

        loadData.shipper = {
            ...loadData.shipper,
            longitude: shipperCoordinates.longitude,
            latitude: shipperCoordinates.latitude,
        };
        loadData.receiver = {
            ...loadData.receiver,
            longitude: receiverCoordinates.longitude,
            latitude: receiverCoordinates.latitude,
        };
        if (loadData.stops && loadData.stops.length > 0) {
            loadData.stops = loadData.stops.map((stop, index) => {
                return {
                    ...stop,
                    longitude: stopsCoordinates[index].longitude,
                    latitude: stopsCoordinates[index].latitude,
                };
            });
        }
        loadData.routeEncoded = routeEncoded;
        loadData.routeDistance = distance;
        loadData.routeDuration = duration;

        await saveLoadData(loadData);
    };

    const saveLoadData = async (loadData: ExpandedLoad) => {
        const newLoad = await createLoad(loadData, currentRateconFile);

        notify({ title: 'New load created', message: 'New load created successfully' });

        // Redirect to load page
        await router.push(`/loads/${newLoad.id}`);

        setLoading(false);
    };

    const handleFileUpload = async (file: File) => {
        if (!file) {
            return;
        }

        setLoading(true);
        setIsRetrying(false);
        setAiProgress(0);

        let metadata: {
            title?: string;
            author?: string;
            subject?: string;
            creator?: string;
            producer?: string;
            creationDate?: Date;
            modificationDate?: Date;
        } = null;
        let numOfPages = 0;

        try {
            await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onload = async () => {
                    const arrayBuffer = reader.result as ArrayBuffer;
                    const byteArray = new Uint8Array(arrayBuffer);
                    const { totalPages, metadata: pdfMetaData } = await calcPdfPageCount(byteArray);
                    metadata = pdfMetaData;
                    numOfPages = totalPages;

                    if (totalPages < 1) {
                        notify({
                            title: 'Error',
                            message: 'PDF file must contain at least 1 page',
                            type: 'error',
                        });
                        reject();
                        return;
                    } else if (totalPages > 8) {
                        notify({
                            title: 'Error',
                            message: 'PDF file must contain no more than 8 pages',
                            type: 'error',
                        });
                        reject();
                        return;
                    }

                    resolve(null);
                };
            });
        } catch (e) {
            setLoading(false);
            return;
        }

        let logisticsCompany: string = null;
        let customersList: Customer[] = [];
        try {
            const base64File = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    if (reader.result) {
                        const base64String = (reader.result as string).replace(/^data:.+;base64,/, ''); // remove the "data:*/*;base64," part
                        resolve(base64String);
                    }
                };
                reader.onerror = (error) => reject(error);
            });

            setAiProgress(5);
            const [ocrResponse, customersResponse] = await Promise.all([
                fetch(`${apiUrl}/ai/ocr`, {
                    method: 'POST',
                    body: JSON.stringify({
                        file: base64File,
                    }),
                }),
                getAllCustomers({ limit: 999, offset: 0 }),
            ]);
            setAiProgress(10);

            const ocrResult = await ocrResponse.json();
            customersList = customersResponse?.customers;

            const [documentsInBlocks, documentsInLines] = await Promise.all([
                ocrResult.blocks.map((pageText: string, index: number) => {
                    return {
                        pageContent: pageText,
                        metadata: {
                            source: 'blob',
                            blobType: file.type,
                            pdf: {
                                metadata: metadata,
                                totalPages: numOfPages,
                            },
                            loc: {
                                pageNumber: index,
                            },
                        },
                    };
                }),
                ocrResult.lines.map((pageText: string, index: number) => {
                    return {
                        pageContent: pageText,
                        metadata: {
                            source: 'blob',
                            blobType: file.type,
                            pdf: {
                                metadata: metadata,
                                totalPages: numOfPages,
                            },
                            loc: {
                                pageNumber: index,
                            },
                        },
                    };
                }),
            ]);

            const aiLoad = await getAILoad(documentsInBlocks, documentsInLines, false);

            logisticsCompany = aiLoad?.logistics_company;
            applyAIOutputToForm(aiLoad);
        } catch (e) {
            notify({ title: 'Error', message: e?.message || 'Error reading PDF file', type: 'error' });
        }

        setCurrentRateconFile(file);

        formHook.setValue('customer', null);

        try {
            if (logisticsCompany && customersList) {
                const customerNames = customersList.map((customer) => customer.name);

                const matchedIndex = fuzzySearch(logisticsCompany, customerNames);
                if (matchedIndex === -1) {
                    setPrefillName(logisticsCompany);
                    setShowMissingCustomerLabel(true);
                    setOpenAddCustomer(true);
                } else {
                    const matchedCustomer = customersList[matchedIndex];
                    formHook.setValue('customer', matchedCustomer);
                }
            }
        } catch (e) {
            notify({ title: 'Error', message: e?.message || 'Error assigning a customer', type: 'error' });
        }

        setLoading(false);
        setAiProgress(0);
        setIsRetrying(false);
    };

    const getAILoad = async (documentsInBlocks: any[], documentsInLines: any[], isRetry = false): Promise<AILoad> => {
        const response = await fetch(`${appUrl}/ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documents: isRetry ? documentsInLines : documentsInBlocks,
            }),
        });
        const streamReader = response.body.getReader();

        let responseJSON = null;

        const processChunk = (chunk: string): boolean => {
            try {
                console.log('chunk:', chunk);
                const json = JSON.parse(chunk.replace(/^data:/, ''));
                if (json?.data) {
                    setAiProgress(100);
                    responseJSON = json;
                    return true;
                } else {
                    setAiProgress(10 + (json?.progress || 0) * (90 / 100));
                }
            } catch (error) {
                console.error('Error parsing JSON chunk:', error);
                // Handle JSON parsing error, if necessary
            }
            return false;
        };

        const processChunks = (chunks: string) => {
            const messages = chunks.split('\n\ndata:');
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                const done = processChunk(message);
                if (done) {
                    return;
                }
            }
        };

        while (true) {
            const { value, done } = await streamReader.read();
            if (done) {
                break;
            }
            const decoded = new TextDecoder().decode(value);
            processChunks(decoded);
        }

        const aiLoad: AILoad = responseJSON['data'];

        if (isRetry) {
            return aiLoad;
        }

        const stops = aiLoad?.stops || [];
        const needRetryOnStops =
            stops.length === 0 ||
            stops.some(
                (stop) => !stop?.name || !stop?.address?.street || !stop?.address?.city || !stop?.address?.state,
            );

        if (!aiLoad?.logistics_company || !aiLoad?.load_number || needRetryOnStops) {
            setIsRetrying(true);
            setAiProgress(10);

            // Retry with line-by-line data
            return getAILoad(documentsInBlocks, documentsInLines, true);
        }

        return aiLoad;
    };

    const postProcessAILoad = (load: AILoad) => {
        if (load.rate) {
            load.rate = convertRateToNumber(load.rate);
        }

        if (load.stops) {
            load.stops.forEach((stop) => {
                if (stop.time) {
                    stop.time = addColonToTimeString(stop.time);
                }

                // Trim whitespace for every string value
                Object.keys(stop).forEach((key) => {
                    if (typeof stop[key] === 'string') {
                        stop[key] = stop[key].trim();
                    }
                });

                // Trim whitespace from address values
                if (stop.address) {
                    Object.keys(stop.address).forEach((key) => {
                        if (typeof stop.address[key] === 'string') {
                            stop.address[key] = stop.address[key].trim();
                        }
                    });
                }
            });
        }
    };

    const applyAIOutputToForm = (load: AILoad) => {
        if (!load) {
            return;
        }

        postProcessAILoad(load);

        // Reset entire form
        formHook.reset({
            customer: null,
            refNum: null,
            rate: null,
            shipper: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
            },
            receiver: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
            },
            stops: [],
        });

        // Remove all stops
        if (stopsFieldArray.fields.length > 0) {
            stopsFieldArray.fields.forEach((_, index) => {
                stopsFieldArray.remove(index);
            });
        }

        formHook.setValue('refNum', load.load_number);
        formHook.setValue('rate', load.rate ? new Prisma.Decimal(load.rate) : null);

        // Select first PU stop as shipper
        const shipperStop = load.stops.find((stop) => stop.type === 'PU');
        if (shipperStop) {
            formHook.setValue('shipper.name', shipperStop.name);
            formHook.setValue('shipper.street', shipperStop.address?.street || null);
            formHook.setValue('shipper.city', shipperStop.address?.city || null);
            formHook.setValue('shipper.state', shipperStop.address?.state || null);
            formHook.setValue('shipper.zip', shipperStop.address?.zip || null);
            if (shipperStop.address?.country) {
                formHook.setValue('shipper.country', shipperStop.address?.country || null);
            }
            formHook.setValue('shipper.date', startOfDay(parseDate(shipperStop.date)));
            formHook.setValue('shipper.time', shipperStop.time);
            formHook.setValue('shipper.poNumbers', shipperStop.po_numbers?.join(', ') || null);
            formHook.setValue('shipper.pickUpNumbers', shipperStop.pickup_numbers?.join(', ') || null);
            formHook.setValue('shipper.referenceNumbers', shipperStop.reference_numbers?.join(', ') || null);
        }

        // Select last SO stop as receiver
        const receiverStop = load.stops.reverse().find((stop) => stop.type === 'SO');
        if (receiverStop) {
            formHook.setValue('receiver.name', receiverStop.name);
            formHook.setValue('receiver.street', receiverStop.address?.street || null);
            formHook.setValue('receiver.city', receiverStop.address?.city || null);
            formHook.setValue('receiver.state', receiverStop.address?.state || null);
            formHook.setValue('receiver.zip', receiverStop.address?.zip || null);
            if (receiverStop.address?.country) {
                formHook.setValue('receiver.country', receiverStop.address?.country || null);
            }
            formHook.setValue('receiver.date', startOfDay(parseDate(receiverStop.date)));
            formHook.setValue('receiver.time', receiverStop.time);
            formHook.setValue('receiver.poNumbers', receiverStop.po_numbers?.join(', ') || null);
            formHook.setValue('receiver.pickUpNumbers', receiverStop.pickup_numbers?.join(', ') || null);
            formHook.setValue('receiver.referenceNumbers', receiverStop.reference_numbers?.join(', ') || null);
        }

        // Select all stops in between as stops (filter out shipperStop and receiverStop from list by stop.name)
        const stops = load.stops.filter((stop) => stop.name !== shipperStop.name && stop.name !== receiverStop.name);
        stops.forEach((stop, index) => {
            stopsFieldArray.append({
                id: null,
                type: LoadStopType.STOP,
                name: stop.name,
                street: stop.address?.street || null,
                city: stop.address?.city || null,
                state: stop.address?.state || null,
                zip: stop.address?.zip || null,
                ...(stop.address?.country && { country: stop.address?.country || null }),
                date: startOfDay(parseDate(stop.date)),
                time: stop.time,
                stopIndex: index,
                longitude: null,
                latitude: null,
                poNumbers: stop.po_numbers?.join(', ') || null,
                pickUpNumbers: stop.pickup_numbers?.join(', ') || null,
                referenceNumbers: stop.reference_numbers?.join(', ') || null,
            });
        });
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Load</h1>}>
            <div className="max-w-4xl py-2 mx-auto">
                <BreadCrumb
                    className="sm:px-6 md:px-8"
                    paths={[
                        {
                            label: 'Loads',
                            href: '/loads',
                        },
                        {
                            label: 'Create New Load',
                        },
                    ]}
                ></BreadCrumb>
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Load</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                {aiProgress > 0 && (
                    <AnimatedProgress
                        progress={aiProgress}
                        label={isRetrying ? 'Fine tuning results' : 'Reading Document'}
                        labelColor={isRetrying ? 'text-orange-600' : 'text-blue-600'}
                        bgColor={isRetrying ? 'bg-orange-100' : 'bg-blue-100'}
                    />
                )}

                <div className="relative px-5 sm:px-6 md:px-8">
                    {loading && <LoadingOverlay />}

                    {aiProgress == 0 && !currentRateconFile && (
                        <FileUploader multiple={false} handleChange={handleFileUpload} name="file" types={['PDF']}>
                            <div className="flex mb-4">
                                <label className="flex justify-center w-full px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer h-28 hover:border-gray-400 focus:outline-none">
                                    <span className="flex items-center space-x-2">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="w-6 h-6 text-gray-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                            />
                                        </svg>
                                        <span className="font-medium text-gray-600">
                                            Drop a rate confirmation file, or{' '}
                                            <span className="text-blue-600 underline">browse</span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </FileUploader>
                    )}

                    {currentRateconFile && (
                        <div className="flex items-center justify-between py-2 pl-4 pr-2 mb-4 bg-white border border-gray-200 rounded-md">
                            <div className="flex items-center space-x-2">
                                <PaperClipIcon className="flex-shrink-0 w-5 h-5 text-gray-400" aria-hidden="true" />
                                <span className="font-medium text-gray-600">
                                    {currentRateconFile.name} ({currentRateconFile.size} bytes)
                                </span>
                            </div>
                            <button
                                type="button"
                                className="inline-flex items-center px-3 py-1 mr-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                onClick={() => setCurrentRateconFile(null)}
                            >
                                <TrashIcon className="flex-shrink-0 w-4 h-4 mr-2 text-gray-800"></TrashIcon>
                                Remove
                            </button>
                        </div>
                    )}

                    <form id="load-form" onSubmit={formHook.handleSubmit(submit)}>
                        <LoadForm
                            formHook={formHook}
                            openAddCustomerFromProp={openAddCustomer}
                            setOpenAddCustomerFromProp={setOpenAddCustomer}
                            showMissingCustomerLabel={showMissingCustomerLabel}
                            setShowMissingCustomerLabel={setShowMissingCustomerLabel}
                            prefillName={prefillName}
                            setPrefillName={setPrefillName}
                            parentStopsFieldArray={stopsFieldArray}
                        ></LoadForm>
                        <div className="flex px-4 py-4 mt-4 bg-white border-t-2 border-neutral-200">
                            <div className="flex-1"></div>
                            <button
                                type="submit"
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Create Load
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

CreateLoad.authenticationEnabled = true;

export default CreateLoad;

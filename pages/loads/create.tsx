import { PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Customer, LoadStopType, Prisma } from '@prisma/client';
import startOfDay from 'date-fns/startOfDay';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { useFieldArray, useForm } from 'react-hook-form';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { notify } from '../../components/Notification';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import AnimatedProgress from '../../components/loads/AnimationProgress';
import { AILoad } from '../../interfaces/ai';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { parseDate } from '../../lib/helpers/date';
import { fuzzySearch } from '../../lib/helpers/levenshtein';
import { getAllCustomers } from '../../lib/rest/customer';
import { createLoad, getLoadById } from '../../lib/rest/load';
import { calculateGeoForLoad } from '../../lib/mapbox/load-geo';
import { RateconImporter } from '../../lib/load/ratecon-importer';

interface OCRPage {
    dimension: any;
    layout: any;
    tokens: any;
    image: string;
}

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

    const [ocrPages, setOcrPages] = React.useState<OCRPage[]>([]);

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

        await calculateGeoForLoad(loadData);
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

        const resetState = () => {
            setLoading(false);
            setIsRetrying(false);
            setAiProgress(0);
        };
        resetState();

        setLoading(true);

        let metadata = null;
        let numOfPages = 0;
        let pdfImages: string[] = [];
        let aiLoad: AILoad = null;
        let ocrResult: any = null;
        let customersList: Customer[] = [];

        const rateconImporter = new RateconImporter();
        rateconImporter.updateProgressCallback = (progress: number) => {
            setAiProgress(progress);
        };
        rateconImporter.onRetryStart = () => {
            setIsRetrying(true);
        };

        try {
            const pdfResult = await rateconImporter.readPdf(file);
            metadata = pdfResult.metadata;
            numOfPages = pdfResult.totalPages;
            pdfImages = pdfResult.images;

            if (numOfPages < 1) {
                notify({
                    title: 'Error',
                    message: 'PDF file must contain at least 1 page',
                    type: 'error',
                });
                resetState();
                return;
            } else if (numOfPages > 8) {
                notify({
                    title: 'Error',
                    message: 'PDF file must contain no more than 8 pages',
                    type: 'error',
                });
                resetState();
                return;
            }
        } catch (e) {
            resetState();
            notify({ title: 'Error', message: e?.message || 'Failed to open file', type: 'error' });
            return;
        }

        try {
            setAiProgress(5);

            const [_ocrResult, _customersResponse] = await Promise.all([
                rateconImporter.runOCR(file),
                getAllCustomers({ limit: 999, offset: 0 }),
            ]);
            ocrResult = _ocrResult;
            customersList = _customersResponse?.customers;

            setAiProgress(10);
        } catch (e) {
            resetState();
            notify({ title: 'Error', message: e?.message || 'Failed to read file', type: 'error' });
            return;
        }

        const ocrPages = ocrResult.pages.map((page: any, index: number) => {
            return {
                dimension: page.dimension,
                layout: page.layout,
                tokens: page.tokens,
                image: pdfImages[index],
            };
        });
        setOcrPages(ocrPages);

        try {
            aiLoad = await rateconImporter.processRateconFile(file, ocrResult, numOfPages, metadata);
            applyAIOutputToForm(aiLoad);
            setCurrentRateconFile(file);
        } catch (e) {
            resetState();
            notify({ title: 'Error', message: e?.message || 'Error processing file', type: 'error' });
            return;
        }

        applyCustomerToForm(aiLoad, customersList);

        setLoading(false);
        setAiProgress(0);
        setIsRetrying(false);
    };

    const applyAIOutputToForm = (load: AILoad) => {
        if (!load) {
            return;
        }

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

    const applyCustomerToForm = (aiLoad: AILoad, customersList: Customer[]) => {
        formHook.setValue('customer', null);

        const logisticsCompany = aiLoad?.logistics_company;
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
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Load</h1>}>
            <div className="flex">
                <div className="py-2 mx-auto">
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
                <div className="w-1/2">
                    {/* {ocrPages.length > 0 && (
                        <div className="flex justify-center">
                            {ocrPages.map((page, index) => (
                                <Image
                                    key={index}
                                    src={page.image}
                                    alt={`Page ${index + 1}`}
                                    width={500}
                                    height={100}
                                />
                            ))}
                        </div>
                    )} */}
                    {/* <div className="px-5 mt-6">
                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <div className="inline-flex overflow-hidden bg-white rounded-lg shadow">
                                    <Image src="/download.png" alt="" width={750} height={0} />
                                </div>
                            </div>

                            <div className="relative">
                                <div className="inline-flex overflow-hidden bg-white rounded-lg shadow">
                                    <Image src="/download.png" alt="" width={750} height={0} />
                                </div>
                            </div>
                        </div>
                    </div> */}
                </div>
            </div>
        </Layout>
    );
};

CreateLoad.authenticationEnabled = true;

export default CreateLoad;

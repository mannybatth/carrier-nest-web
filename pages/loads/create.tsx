import { PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Customer, LoadStopType, Prisma } from '@prisma/client';
import AnimatedProgress from 'components/loads/AnimationProgress';
import PDFViewer from 'components/PDFViewer';
import startOfDay from 'date-fns/startOfDay';
import { addColonToTimeString, convertRateToNumber } from 'lib/helpers/ratecon-vertex-helpers';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { notify } from '../../components/Notification';
import { AILoad } from '../../interfaces/ai';
import { PageWithAuth } from '../../interfaces/auth';
import { ExpandedLoad } from '../../interfaces/models';
import { apiUrl } from '../../lib/constants';
import { parseDate } from '../../lib/helpers/date';
import { fuzzySearch } from '../../lib/helpers/levenshtein';
import { calcPdfPageCount } from '../../lib/helpers/pdf';
import { getGeocoding, getRouteForCoords } from '../../lib/mapbox/searchGeo';
import { getAllCustomers } from '../../lib/rest/customer';
import { createLoad, getLoadById } from '../../lib/rest/load';
import { useUserContext } from 'components/context/UserContext';
import Link from 'next/link';

interface Line {
    text: string;
    pageNumber: number;
    boundingPoly: {
        vertices: { x: number; y: number }[];
        normalizedVertices: { x: number; y: number }[];
    };
}

interface pageDimensions {
    width: number;
    height: number;
    unit: string;
}

interface OCRLines {
    pageProps: pageDimensions;
    lines: Line[];
    blocks: Line[];
}

const expectedProperties = new Set([
    'logistics_company',
    'load_number',
    'stops',
    'name',
    'street',
    'city',
    'state',
    'zip',
    'date',
    'time',
    'po_numbers',
    'pickup_numbers',
    'reference_numbers',
    'rate',
    'invoice_emails',
]);

function updateProgress(foundProperties: Set<string>) {
    return (foundProperties.size / (expectedProperties.size + 1)) * 100;
}

// This function has been simplified to only check for the presence of a key
function checkForProperties(chunk: string, foundProperties: Set<string>) {
    expectedProperties.forEach((property) => {
        if (chunk.includes(`"${property}"`) && !foundProperties.has(property)) {
            foundProperties.add(property);
        }
    });

    return updateProgress(foundProperties);
}

const CreateLoad: PageWithAuth = () => {
    const formHook = useForm<ExpandedLoad>();
    const router = useRouter();
    const { query } = useRouter();
    const copyLoadId = query.copyLoadId as string;
    const { isProPlan, isLoadingCarrier } = useUserContext();

    const [loading, setLoading] = React.useState(false);
    const [openAddCustomer, setOpenAddCustomer] = React.useState(false);
    const [showMissingCustomerLabel, setShowMissingCustomerLabel] = React.useState(false);
    const [prefillName, setPrefillName] = React.useState(null);
    const [currentRateconFile, setCurrentRateconFile] = React.useState<File>(null);

    const [aiProgress, setAiProgress] = React.useState(0);
    const [isRetrying, setIsRetrying] = React.useState(false);

    const [ocrLines, setOcrLines] = React.useState<OCRLines>(null);
    const [ocrVertices, setOcrVertices] = React.useState<{ x: number; y: number }[][]>(null);
    const [ocrVerticesPage, setOcrVerticesPage] = React.useState<number>(null);

    const stopsFieldArray = useFieldArray({ name: 'stops', control: formHook.control });

    const [dragActive, setDragActive] = React.useState(false);

    const [aiLimitReached, setAiLimitReached] = React.useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragleave') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files?.[0]?.type === 'application/pdf') {
            handleFileUpload(files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files?.[0]?.type === 'application/pdf') {
            handleFileUpload(files[0]);
        }
    };

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
                formHook.setValue('loadNum', load.loadNum);
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
            loadNum: data.loadNum,
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

        const { routeEncoded, distanceMiles, durationHours } = await getRouteForCoords([
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
        loadData.routeDistanceMiles = new Prisma.Decimal(distanceMiles);
        loadData.routeDurationHours = new Prisma.Decimal(durationHours);

        await saveLoadData(loadData);
    };

    const saveLoadData = async (loadData: ExpandedLoad) => {
        try {
            const newLoad = await createLoad(loadData, currentRateconFile);

            notify({ title: 'New load created', message: 'New load created successfully' });

            // Redirect to load page
            await router.push(`/loads/${newLoad.id}`);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            notify({ title: 'Error saving load', message: `${error.message}`, type: 'error' });
        }
    };

    const handleAIError = () => {
        setCurrentRateconFile(null);
        setLoading(false);
        setIsRetrying(false);
        setAiProgress(0);
    };

    const handleFileUpload = async (file: File) => {
        if (!file) {
            return;
        }

        // Reset form and state
        formHook.reset({
            customer: null,
            loadNum: null,
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

        setCurrentRateconFile(file);
        setLoading(true);
        setIsRetrying(false);
        setAiProgress(0);

        // Validate PDF metadata
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
            const result = await validatePDFFile(file);
            metadata = result.metadata;
            numOfPages = result.numOfPages;
        } catch (e) {
            handleAIError();
            return;
        }

        // Get base64 encoded file
        let base64File: string;
        try {
            base64File = await getBase64FromFile(file);
        } catch (error) {
            notify({ title: 'Error', message: 'Error encoding file', type: 'error' });
            handleAIError();
            return;
        }

        // Call OCR API
        let ocrResult;
        try {
            setAiProgress(5);
            const ocrResponse = await fetch(`${apiUrl}/ai/ocr`, {
                method: 'POST',
                body: JSON.stringify({
                    file: base64File,
                }),
            });

            if (!ocrResponse.ok) {
                ocrResult = await ocrResponse.json();
                throw new Error(`${ocrResult?.error || 'Error processing document'}`);
            }

            ocrResult = await ocrResponse.json();
            setAiProgress(10);

            if (ocrResult?.annotations?.lines) {
                setOcrLines({
                    lines: ocrResult.annotations.lines,
                    blocks: ocrResult.annotations.blocks,
                    pageProps: ocrResult.pageProps,
                });
            }
        } catch (e) {
            console.error('Error processing document:', e);
            notify({
                title: 'Error',
                message: e?.message || 'Error processing document',
                type: 'error',
            });
            handleAIError();

            // Handle ratecon limit reached, set the file object to pdfviewer
            // Set aiLimitReached to make the user more aware of the limit reached
            if (e?.message.includes('limit reached')) {
                setCurrentRateconFile(file);
                setAiLimitReached(true);
            }
            return;
        }

        // Get customers list
        let customersList: Customer[] = [];
        try {
            customersList = (await getAllCustomers({ limit: 999, offset: 0 }))?.customers;
        } catch (error) {
            notify({ title: 'Error', message: 'Error loading customers', type: 'error' });
            handleAIError();
            return;
        }

        try {
            const [documentsInBlocks, documentsInLines] = await Promise.all([
                ocrResult.blocks.map((pageText: string, index: number) => ({
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
                })),
                ocrResult.lines.map((pageText: string, index: number) => ({
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
                })),
            ]);

            const aiLoad = await getAILoad(documentsInBlocks, documentsInLines, false);
            const logisticsCompany = aiLoad?.logistics_company;
            applyAIOutputToForm(aiLoad);

            // Handle customer matching
            handleCustomerMatching(logisticsCompany, customersList);
        } catch (e) {
            notify({ title: 'Error', message: e?.message || 'Error processing document', type: 'error' });
            handleAIError();
            return;
        }

        setLoading(false);
        setAiProgress(0);
        setIsRetrying(false);
    };

    const validatePDFFile = async (file: File): Promise<{ metadata: any; numOfPages: number }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = async () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const byteArray = new Uint8Array(arrayBuffer);
                const { totalPages, metadata: pdfMetaData } = await calcPdfPageCount(byteArray);

                if (totalPages < 1) {
                    notify({
                        title: 'Error',
                        message: 'PDF file must contain at least 1 page',
                        type: 'error',
                    });
                    reject(new Error('Invalid page count'));
                    return;
                } else if (totalPages > 8) {
                    notify({
                        title: 'Error',
                        message: 'PDF file must contain no more than 8 pages',
                        type: 'error',
                    });
                    reject(new Error('Too many pages'));
                    return;
                }

                resolve({ metadata: pdfMetaData, numOfPages: totalPages });
            };
        });
    };

    const getBase64FromFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (reader.result) {
                    const base64String = (reader.result as string).replace(/^data:.+;base64,/, '');
                    resolve(base64String);
                }
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleCustomerMatching = (logisticsCompany: string, customersList: Customer[]) => {
        if (!logisticsCompany || !customersList) {
            return;
        }

        formHook.setValue('customer', null);

        const customerNames = customersList.map((customer) => customer.name);
        const matchedIndex = fuzzySearch(logisticsCompany, customerNames);

        if (matchedIndex === -1) {
            setPrefillName(logisticsCompany);
            setShowMissingCustomerLabel(true);
            setOpenAddCustomer(true);
        } else {
            formHook.setValue('customer', customersList[matchedIndex]);
        }
    };

    const getAILoad = async (documentsInBlocks: any[], documentsInLines: any[], isRetry = false): Promise<AILoad> => {
        const response = await fetch(`${apiUrl}/ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documents: isRetry ? documentsInLines : documentsInBlocks,
            }),
        });
        const streamReader = response.body.getReader();

        let aiLoad: AILoad = null;
        const foundProperties = new Set<string>();
        let buffer = '';

        const processChunk = (chunk: string) => {
            const progress = checkForProperties(chunk, foundProperties);
            setAiProgress(10 + (progress || 0) * (90 / 100));
        };

        while (true) {
            const { value, done } = await streamReader.read();
            if (done) {
                setAiProgress(100);
                try {
                    // First try to extract JSON from code fence
                    const jsonMatch = buffer.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        aiLoad = JSON.parse(jsonMatch[1]);
                    } else {
                        // If no code fence found, try parsing the entire buffer as JSON
                        aiLoad = JSON.parse(buffer);
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    throw new Error('Failed read document');
                }
                break;
            }
            const decoded = new TextDecoder().decode(value);
            buffer += decoded;
            processChunk(decoded);
        }

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

        // If po_numbers, pickup_numbers, or reference_numbers are strings, add them to an array
        if (load.stops) {
            load.stops.forEach((stop) => {
                if (typeof stop.po_numbers === 'string') {
                    stop.po_numbers = [stop.po_numbers];
                }
                if (typeof stop.pickup_numbers === 'string') {
                    stop.pickup_numbers = [stop.pickup_numbers];
                }
                if (typeof stop.reference_numbers === 'string') {
                    stop.reference_numbers = [stop.reference_numbers];
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
            loadNum: null,
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

        formHook.setValue('loadNum', load.load_number);
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

    const twoStringWindowSearch = (s1: string, s2: string, windowSize: number) => {
        // Edge case: If window size is greater than either string's length
        if (s1.length < windowSize || s2.length < windowSize) {
            return false;
        }

        // Slide the window over s1
        for (let i = 0; i <= s1.length - windowSize; i++) {
            const s1Window = s1.slice(i, i + windowSize);
            if (s2.includes(s1Window)) {
                return true; // If match found, return true
            }
        }

        return false; // If no match found, return false
    };

    const looselyCompareAddresses = (str1: string, str2: string) => {
        if (!str1 || !str2) {
            return false;
        }

        if (str1 === str2) {
            return true;
        }

        // Normalize strings: remove special characters and convert to lowercase
        const normalize = (str) =>
            str
                .replace(/[^a-zA-Z0-9\s]/g, '') // Remove punctuation
                .toLowerCase()
                .split(/\s+/) // Split into words
                .filter(Boolean); // Remove empty strings

        const tokens1 = normalize(str1);
        const tokens2 = normalize(str2);
        // console.log('Tokens:', tokens1, tokens2);

        // Count matches
        const matches = tokens1.filter((token) => {
            const result = tokens2.find((token2) => {
                return twoStringWindowSearch(token, token2, Math.round(token.length * 0.9));
            });
            // console.log('result:', result);
            return result;
        }).length;

        // Determine similarity based on the proportion of matching tokens
        const threshold = Math.max(tokens1.length, tokens2.length) * 0.5; // Adjust threshold as needed
        // console.log('Matches:', matches, 'Threshold:', threshold);
        return matches >= tokens1.length;
    };

    const findClosestDate = (
        ocrData: Line[],
        targetBoundary: { vertices: { x: number; y: number }[] },
    ): Line | null => {
        const dateRegex = /\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b/g;

        let closestMatch: Line | null = null;
        let minDistance = Infinity;

        const getBoundingBoxCenter = (vertices: { x: number; y: number }[]) => {
            const x = (vertices[0].x + vertices[2].x) / 2;
            const y = (vertices[0].y + vertices[2].y) / 2;

            return { x, y };
        };

        ocrData.forEach((item) => {
            const { text, pageNumber, boundingPoly } = item;

            // Check if the text matches the date format
            const match = text.match(dateRegex);
            if (!match) return;

            // Compute the center of the current bounding box
            const currentCenter = getBoundingBoxCenter(boundingPoly.vertices);

            // Compute the center of the target boundary
            const targetCenter = getBoundingBoxCenter(targetBoundary.vertices);

            // Calculate Euclidean distance
            const distance = Math.sqrt(
                Math.pow(currentCenter.x - targetCenter.x, 2) + Math.pow(currentCenter.y - targetCenter.y, 2),
            );

            // Update the closest match if the distance is smaller
            if (distance < minDistance) {
                minDistance = distance;
                closestMatch = {
                    text: match[0],
                    pageNumber,
                    boundingPoly,
                };
            }
        });

        return closestMatch;
    };

    const mouseHoverOverField = (event: React.MouseEvent<HTMLInputElement>) => {
        // Replace , with space
        let value = (event.target as HTMLInputElement).value.replaceAll(/(?<=\w),(?=\w)/g, ' ');
        // Remove special characters and convert to lowercase
        const replaceExp = /[^a-zA-Z0-9 ]/g;
        value = value.replace(replaceExp, '').toLowerCase();

        // Get the field name
        const fieldName = (event.target as HTMLInputElement).name;

        // console.log('Mouse hover over field: ', value, fieldName);

        if ((fieldName.includes('date') || fieldName.includes('time')) && !value) {
            // Get stop name field to serach against OCR response
            const lastDotIndex = fieldName.lastIndexOf('.');
            const firstPartOfFieldName = fieldName.substring(0, lastDotIndex);

            // Get name or street value to search against OCR response
            value =
                formHook
                    .getValues(`${firstPartOfFieldName}.name` as keyof ExpandedLoad)
                    ?.toString()
                    .replace(replaceExp, '')
                    .toLowerCase() ||
                formHook
                    .getValues(`${firstPartOfFieldName}.street` as keyof ExpandedLoad)
                    ?.toString()
                    .replace(replaceExp, '')
                    .toLowerCase();

            // Find in lines data for value
            const matchingLine = ocrLines?.blocks?.find((line) =>
                looselyCompareAddresses(value, line.text.trim().replace(replaceExp, '').toLocaleLowerCase()),
            );

            // if line is found, find the closest date
            if (matchingLine) {
                const result = findClosestDate(ocrLines?.lines, matchingLine?.boundingPoly);
                if (result) {
                    //console.log('Matching line:', matchingLine.boundingPoly.normalizedVertices, matchingLine);
                    setOcrVertices([result.boundingPoly.normalizedVertices]);
                    setOcrVerticesPage(result.pageNumber);
                    return;
                }
            }
        }

        // If value is empty, return
        if (!value || !ocrLines?.lines) {
            return;
        }

        if (fieldName.includes('date') && Number(value)) {
            // Extract year, month, and day from the input
            const year = value.slice(0, 4);
            const month = value.slice(4, 6);
            const day = value.slice(6, 8);

            // Return in the desired format
            value = `${month}${day}${year}`;
        }

        // Highlight the field border on hover
        event.currentTarget.style.backgroundColor = '#cccccc7d';

        // Check if the field is an address field
        const isAddressField = ['city', 'state', 'zip'].find((name) => fieldName.includes(name));

        // If the field is an address field, build city state zip string to search against OCR response
        if (isAddressField) {
            const lastDotIndex = fieldName.lastIndexOf('.');
            const firstPartOfFieldName = fieldName.substring(0, lastDotIndex);

            const addCity = formHook
                .getValues(`${firstPartOfFieldName}.city` as keyof ExpandedLoad)
                ?.toString()
                .replace(replaceExp, '')
                .toLowerCase();
            const addState = formHook
                .getValues(`${firstPartOfFieldName}.state` as keyof ExpandedLoad)
                ?.toString()
                .replace(replaceExp, '')
                .toLowerCase();
            const addZip = formHook
                .getValues(`${firstPartOfFieldName}.zip` as keyof ExpandedLoad)
                ?.toString()
                .replace(replaceExp, '')
                .toLowerCase();
            value = `${addCity} ${addState} ${addZip}`;
        }

        // Variable to hold the best maching line
        let matchingLine: Line = null;

        // Find the matching line in the OCR response
        matchingLine = ocrLines?.lines?.find((line) =>
            looselyCompareAddresses(value, line.text.trim().replace(replaceExp, '').toLocaleLowerCase()),
        );

        // If no matching line found, search in the blocks
        if (!matchingLine) {
            value = fieldName.includes('state') ? ` ${value} ` : value;
            // Fuzzy search for the value in the OCR response
            matchingLine = ocrLines?.blocks?.find((line) =>
                looselyCompareAddresses(value, line.text.trim().replace(replaceExp, '').toLocaleLowerCase()),
            );
        }

        if (!matchingLine && fieldName.includes('date')) {
            let value = (event.target as HTMLInputElement).value.replace(replaceExp, '').toLowerCase();

            // Extract year, month, and day from the input
            const year = value.slice(2, 4);
            const month = value.slice(4, 6);
            const day = value.slice(6, 8);

            // Return in the desired format
            value = `${month}${day}${year}`;

            // Find in lines data for value
            matchingLine = ocrLines?.lines?.find((line) =>
                looselyCompareAddresses(value, line.text.trim().replace(replaceExp, '').toLocaleLowerCase()),
            );
        }

        // Update matching vertices if matching line is found
        if (matchingLine) {
            //console.log('Matching line:', matchingLine.boundingPoly.normalizedVertices, matchingLine);
            setOcrVertices([matchingLine.boundingPoly.normalizedVertices]);
            setOcrVerticesPage(matchingLine.pageNumber);
        }
    };

    const mouseHoverOverFieldExited = (event: React.MouseEvent<HTMLInputElement>) => {
        // Set the border on hover out back to normal

        event.currentTarget.style.backgroundColor = 'white';

        // Reset the vertices
        setOcrVertices(null);
        // Reset the page number
        setOcrVerticesPage(null);
    };

    return (
        <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create New Load</h1>}>
            <div className={`${currentRateconFile ? 'max-w-full' : 'max-w-4xl'}  py-2 mx-auto`}>
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

                {!isProPlan && !isLoadingCarrier && (
                    <div className="mx-5 mb-6 transition-all md:mx-0 md:px-8">
                        <div
                            className={`p-6 border rounded-lg bg-gradient-to-r ${
                                aiLimitReached
                                    ? 'border-red-300 from-red-100 to-red-200'
                                    : 'border-blue-100 from-blue-50 to-indigo-50'
                            } `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-blue-900">
                                        {aiLimitReached
                                            ? 'AI load import limit reached, unlock the speed + accuracy of AI by upgrading to Pro'
                                            : 'Enhance your load management with AI'}
                                    </h3>
                                    <p className="mt-1 text-sm text-blue-700">
                                        Your plan has limited AI document processing. Upgrade to Pro for unlimited AI
                                        imports, faster processing, and enhanced accuracy in extracting load details.
                                    </p>
                                </div>
                                <div className="ml-6">
                                    <Link href="/billing">
                                        <button
                                            type="button"
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm animate-pulse hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Upgrade Plan
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className="mb-4"
                        >
                            <label
                                className={`flex justify-center w-full px-4 transition bg-white border-2 border-dashed rounded-md appearance-none cursor-pointer h-28
                                    ${
                                        dragActive
                                            ? 'border-blue-400 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                <span className="flex items-center space-x-2">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`w-6 h-6 ${dragActive ? 'text-blue-600' : 'text-gray-600'}`}
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
                                    <span className={`font-medium ${dragActive ? 'text-blue-600' : 'text-gray-600'}`}>
                                        Drop a rate confirmation file, or{' '}
                                        <span className="text-blue-600 underline">browse</span>
                                    </span>
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={handleFileInput}
                                />
                            </label>
                        </div>
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

                    <div className="relative flex flex-row items-start w-full h-full min-h-screen gap-3 mb-4 bg-white rounded-lg">
                        {currentRateconFile ? (
                            <div className="flex-1 overflow-auto ">
                                <PDFViewer
                                    fileBlob={currentRateconFile}
                                    scrollToPage={ocrVerticesPage}
                                    ocrVertices={ocrVertices}
                                />
                            </div>
                        ) : null}
                        <div
                            className={`flex-1 flex ${
                                currentRateconFile ? 'sticky top-2 overflow-y-scroll max-h-screen bg-white p-1' : ''
                            }  rounded-md `}
                        >
                            <form id="load-form" onSubmit={formHook.handleSubmit(submit)} className="h-full">
                                <LoadForm
                                    formHook={formHook}
                                    openAddCustomerFromProp={openAddCustomer}
                                    setOpenAddCustomerFromProp={setOpenAddCustomer}
                                    showMissingCustomerLabel={showMissingCustomerLabel}
                                    setShowMissingCustomerLabel={setShowMissingCustomerLabel}
                                    prefillName={prefillName}
                                    setPrefillName={setPrefillName}
                                    parentStopsFieldArray={stopsFieldArray}
                                    mouseHoverOverField={mouseHoverOverField}
                                    mouseHoverOutField={mouseHoverOverFieldExited}
                                />
                                <div className="flex px-4 py-4 mt-4 border-t-2 border-neutral-200">
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
                </div>
            </div>
        </Layout>
    );
};

CreateLoad.authenticationEnabled = true;

export default CreateLoad;

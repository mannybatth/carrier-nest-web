'use client';

import { PaperClipIcon, TrashIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DocumentMagnifyingGlassIcon, ExclamationCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { type Customer, LoadStopType, Prisma } from '@prisma/client';
import PDFViewer from 'components/PDFViewer';
import startOfDay from 'date-fns/startOfDay';
import { addColonToTimeString, convertRateToNumber } from 'lib/helpers/ratecon-vertex-helpers';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { notify } from '../../components/Notification';
import type { AILoad, AIStop, AICustomerDetails } from '../../interfaces/ai';
import type { PageWithAuth } from '../../interfaces/auth';
import type { ExpandedLoad } from '../../interfaces/models';
import { apiUrl } from '../../lib/constants';
import { parseDate } from '../../lib/helpers/date';
import { fuzzySearch } from '../../lib/helpers/levenshtein';
import { calcPdfPageCount } from '../../lib/helpers/pdf';
import { getGeocoding, getRouteForCoords } from '../../lib/mapbox/searchGeo';
import { getAllCustomers } from '../../lib/rest/customer';
import { createLoad, getLoadById, updateLoad } from '../../lib/rest/load';
import { useUserContext } from 'components/context/UserContext';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

import { useSearchParams } from 'next/navigation';

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
    const searchParams = useSearchParams();
    const loadId = searchParams?.get('id') as string;
    const copyLoadId = searchParams?.get('copyLoadId') as string;
    const { isProPlan, isLoadingCarrier } = useUserContext();

    const [loading, setLoading] = useState(false);
    const [openAddCustomer, setOpenAddCustomer] = useState(false);
    const [showMissingCustomerLabel, setShowMissingCustomerLabel] = useState(false);
    const [prefillName, setPrefillName] = useState(null);
    const [extractedCustomerDetails, setExtractedCustomerDetails] = useState<AICustomerDetails>(null);
    const [currentRateconFile, setCurrentRateconFile] = useState<File>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [aiProgress, setAiProgress] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isProcessingText, setIsProcessingText] = useState(false);
    const [isProcessingImages, setIsProcessingImages] = useState(false);

    const [ocrLines, setOcrLines] = useState<OCRLines>(null);
    const [ocrVertices, setOcrVertices] = useState<{ x: number; y: number }[][]>(null);
    const [ocrVerticesPage, setOcrVerticesPage] = useState<number>(null);

    const stopsFieldArray = useFieldArray({ name: 'stops', control: formHook.control });

    const [dragActive, setDragActive] = useState(false);
    const [aiLimitReached, setAiLimitReached] = useState(false);

    // Upload mode and text paste state
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const [pastedText, setPastedText] = useState('');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [canProcessImages, setCanProcessImages] = useState(false);

    const MAX_IMAGES = 3;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_TEXT_LENGTH = 15000;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Don't allow drag when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            return;
        }

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    // Helper function to validate file types
    const isValidFileType = (file: File) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        return validTypes.includes(file.type);
    };

    // Helper function to check if file is PDF
    const isPDF = (file: File) => {
        return file.type === 'application/pdf';
    };

    // Helper function to check if file is image
    const isImage = (file: File) => {
        return ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
    };

    // Helper function to calculate total size of files
    const calculateTotalSize = (files: File[]) => {
        return files.reduce((total, file) => total + file.size, 0);
    };

    // Helper function to validate multiple file upload
    const validateMultipleFiles = (newFiles: FileList | File[]) => {
        const filesArray = Array.from(newFiles);

        // Check for PDF files
        const pdfFiles = filesArray.filter(isPDF);
        const imageFiles = filesArray.filter(isImage);

        // Validate: only 1 PDF allowed
        if (pdfFiles.length > 1) {
            notify({
                title: 'Too many PDFs',
                message: 'Only one PDF file is allowed.',
                type: 'error',
            });
            return false;
        }

        // Validate: max 3 images
        if (imageFiles.length > MAX_IMAGES) {
            notify({
                title: 'Too many images',
                message: `Maximum ${MAX_IMAGES} images allowed.`,
                type: 'error',
            });
            return false;
        }

        // Check if we already have files and this would exceed limits
        const currentImageCount = selectedImages.length;
        const currentHasPDF = !!currentRateconFile;

        if (currentHasPDF && pdfFiles.length > 0) {
            notify({
                title: 'PDF already uploaded',
                message: 'Only one PDF file is allowed. Remove the current PDF first.',
                type: 'error',
            });
            return false;
        }

        if (currentImageCount + imageFiles.length > MAX_IMAGES) {
            notify({
                title: 'Too many images',
                message: `Maximum ${MAX_IMAGES} images allowed. You currently have ${currentImageCount} image(s).`,
                type: 'error',
            });
            return false;
        }

        // Check total file size
        const allFiles = [...selectedImages, ...filesArray];
        if (currentRateconFile) {
            allFiles.push(currentRateconFile);
        }

        if (calculateTotalSize(allFiles) > MAX_FILE_SIZE) {
            notify({
                title: 'Files too large',
                message: 'Total file size cannot exceed 10MB.',
                type: 'error',
            });
            return false;
        }

        // Check individual file types
        const invalidFiles = filesArray.filter((file) => !isValidFileType(file));
        if (invalidFiles.length > 0) {
            notify({
                title: 'Invalid file type',
                message: 'Please upload only PDF, JPEG, JPG, or PNG files.',
                type: 'error',
            });
            return false;
        }

        return true;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        // Don't allow drop when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            return;
        }

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        if (!validateMultipleFiles(files)) return;

        handleMultipleFiles(files);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Don't allow file input when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            e.target.value = ''; // Reset input
            return;
        }

        if (!validateMultipleFiles(files)) {
            e.target.value = ''; // Reset input
            return;
        }

        handleMultipleFiles(files);
        e.target.value = ''; // Reset input for re-selection
    };

    // Handle multiple files (PDF or images)
    const handleMultipleFiles = (files: FileList | File[]) => {
        const filesArray = Array.from(files);
        const pdfFiles = filesArray.filter(isPDF);
        const imageFiles = filesArray.filter(isImage);

        // Handle PDF files (auto-process)
        if (pdfFiles.length > 0) {
            handleFileUpload(pdfFiles[0]); // Auto-process PDF
        }

        // Handle image files (add to selection, don't auto-process)
        if (imageFiles.length > 0) {
            setSelectedImages((prev) => {
                const newImages = [...prev, ...imageFiles];
                setCanProcessImages(newImages.length > 0);
                return newImages;
            });
        }
    };

    // Remove image from selection
    const removeImage = (index: number) => {
        // Don't allow removing images when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            return;
        }

        setSelectedImages((prev) => {
            const newImages = prev.filter((_, i) => i !== index);
            setCanProcessImages(newImages.length > 0);
            return newImages;
        });
    };

    // Process selected images by stitching them into a PDF
    const processImages = async () => {
        if (selectedImages.length === 0) {
            notify({
                title: 'No images selected',
                message: 'Please select at least one image to process.',
                type: 'error',
            });
            return;
        }

        setIsProcessingImages(true);
        setAiProgress(0);

        try {
            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();

            // Update progress
            setAiProgress(10);

            // Update progress
            setAiProgress(10);

            // Process each image
            for (let i = 0; i < selectedImages.length; i++) {
                const image = selectedImages[i];
                const imageBytes = await image.arrayBuffer();

                let embeddedImage;
                if (image.type === 'image/jpeg' || image.type === 'image/jpg') {
                    embeddedImage = await pdfDoc.embedJpg(imageBytes);
                } else if (image.type === 'image/png') {
                    embeddedImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    throw new Error(`Unsupported image type: ${image.type}`);
                }

                // Calculate dimensions to fit the page while maintaining aspect ratio
                const { width, height } = embeddedImage.scale(1);
                const pageWidth = 612; // Standard letter size width
                const pageHeight = 792; // Standard letter size height
                const margin = 50;

                const maxWidth = pageWidth - margin * 2;
                const maxHeight = pageHeight - margin * 2;

                let scaledWidth = width;
                let scaledHeight = height;

                // Scale down if image is too large
                if (width > maxWidth || height > maxHeight) {
                    const widthRatio = maxWidth / width;
                    const heightRatio = maxHeight / height;
                    const scaleRatio = Math.min(widthRatio, heightRatio);

                    scaledWidth = width * scaleRatio;
                    scaledHeight = height * scaleRatio;
                }

                // Add a new page for each image
                const page = pdfDoc.addPage([pageWidth, pageHeight]);

                // Center the image on the page
                const x = (pageWidth - scaledWidth) / 2;
                const y = (pageHeight - scaledHeight) / 2;

                page.drawImage(embeddedImage, {
                    x,
                    y,
                    width: scaledWidth,
                    height: scaledHeight,
                });

                // Update progress
                setAiProgress(10 + ((i + 1) / selectedImages.length) * 60);
            }

            // Serialize the PDF
            setAiProgress(80);
            const pdfBytes = await pdfDoc.save();

            // Create a File object from the PDF bytes with standardized naming
            const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            const fileName = generateRateconFilename();
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

            setAiProgress(90);

            // Process the stitched PDF
            await handleFileUpload(pdfFile);

            // Clear selected images
            setSelectedImages([]);
            setCanProcessImages(false);

            setAiProgress(100);

            notify({
                title: 'Images processed',
                message: `${selectedImages.length} images have been stitched into a PDF and processed successfully.`,
                type: 'success',
            });
        } catch (error) {
            console.error('Error processing images:', error);
            setIsProcessingImages(false);
            setAiProgress(0);

            notify({
                title: 'Processing failed',
                message: 'Failed to process the selected images. Please try again.',
                type: 'error',
            });
        }
    };

    // Process extracted data from AI (used by both text and document uploads)
    const processExtractedData = async (aiLoad: AILoad) => {
        if (!aiLoad) {
            throw new Error('No data extracted from the input');
        }

        // Get customers list for matching
        let customersList: Customer[] = [];
        try {
            customersList = (await getAllCustomers({ limit: 999, offset: 0 }))?.customers;
        } catch (error) {
            console.error('Error loading customers:', error);
            // Continue without customer matching if this fails
        }

        // Apply AI output to form (reusing existing logic)
        const logisticsCompany = aiLoad?.logistics_company;

        // Only apply AI output if not in edit mode or user confirms
        if (!isEditMode || confirm('Do you want to replace your current data with the extracted information?')) {
            applyAIOutputToForm(aiLoad);
            // Handle customer matching
            if (customersList.length > 0) {
                handleCustomerMatching(logisticsCompany, customersList, aiLoad);
            }
        }
    };

    // Handle text submission for processing
    const handleTextSubmit = async () => {
        if (!pastedText.trim()) {
            notify({
                title: 'No text provided',
                message: 'Please paste some text to process.',
                type: 'error',
            });
            return;
        }

        if (pastedText.length > MAX_TEXT_LENGTH) {
            notify({
                title: 'Text too long',
                message: `Text cannot exceed ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
                type: 'error',
            });
            return;
        }

        // Reset form if not in edit mode
        if (!isEditMode) {
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
        }

        setLoading(true);
        setIsRetrying(false);
        setAiProgress(0);
        setIsProcessing(true);
        setIsProcessingText(true);

        try {
            setAiProgress(10);

            // Call the text processing API endpoint with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

            const response = await fetch(`${apiUrl}/ai/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: pastedText }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = 'Failed to process text';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // If error response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }

                if (response.status === 429) {
                    errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error occurred. Please try again in a few moments.';
                }

                throw new Error(errorMessage);
            }

            setAiProgress(30);

            // Read the streaming response with better error handling
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response stream available from server');
            }

            let aiResponse = '';
            const foundProperties = new Set<string>();
            let chunkCount = 0;
            const maxChunks = 1000; // Prevent infinite loops

            while (true) {
                if (chunkCount++ > maxChunks) {
                    throw new Error('Response stream exceeded maximum length');
                }

                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                aiResponse += chunk;

                // Update progress based on found properties
                const progress = checkForProperties(chunk, foundProperties);
                setAiProgress(Math.max(30, Math.min(90, 30 + progress * 0.6)));
            }

            // Validate we received some response
            if (!aiResponse.trim()) {
                throw new Error('Empty response received from AI service');
            }

            setAiProgress(95);

            // Parse the AI response with improved error handling
            let aiLoad: AILoad;
            try {
                // Handle potential markdown code blocks in response
                let cleanedResponse = aiResponse.trim();

                // Remove markdown code blocks if present
                if (cleanedResponse.startsWith('```json') || cleanedResponse.startsWith('```')) {
                    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (codeBlockMatch) {
                        cleanedResponse = codeBlockMatch[1].trim();
                    }
                }

                // Try to find JSON object if response contains extra text
                const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleanedResponse = jsonMatch[0];
                }

                // Parse the cleaned JSON
                const parsedResponse = JSON.parse(cleanedResponse);
                aiLoad = parsedResponse as AILoad;

                // Validate the parsed response has required structure
                if (!aiLoad || typeof aiLoad !== 'object') {
                    throw new Error('Invalid response structure from AI service');
                }
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.log('Raw AI response:', aiResponse);
                throw new Error(
                    'Failed to parse AI response. The service may be experiencing issues. Please try again.',
                );
            }

            // Process the extracted data (reusing existing logic)
            await processExtractedData(aiLoad);

            setAiProgress(100);
            setIsProcessing(false);
            setIsProcessingText(false);
            setLoading(false);

            notify({
                title: 'Text processing complete',
                message: 'Text has been processed successfully and data extracted.',
                type: 'success',
            });
        } catch (error) {
            console.error('Error processing text:', error);
            setIsProcessing(false);
            setIsProcessingText(false);
            setLoading(false);
            setAiProgress(0);

            let errorMessage = 'Failed to process the pasted text. Please try again.';
            let errorTitle = 'Processing failed';

            if (error.name === 'AbortError') {
                errorTitle = 'Request timeout';
                errorMessage =
                    'The request took too long to complete. Please try with shorter text or try again later.';
            } else if (error.message?.includes('Rate limit')) {
                errorTitle = 'Rate limit exceeded';
                errorMessage = 'Too many requests. Please wait a moment before trying again.';
            } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
                errorTitle = 'Response parsing error';
                errorMessage = 'The AI service returned an invalid response. Please try again.';
            } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
                errorTitle = 'Network error';
                errorMessage = 'Unable to connect to the AI service. Please check your connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            notify({
                title: errorTitle,
                message: errorMessage,
                type: 'error',
            });
        }
    };

    // Load existing load data for editing
    useEffect(() => {
        if (loadId) {
            setIsEditMode(true);
            const fetchLoad = async () => {
                setLoading(true);
                try {
                    const load = await getLoadById(loadId);
                    if (!load) {
                        setLoading(false);
                        return;
                    }

                    formHook.setValue('id', load.id);
                    formHook.setValue('customer', load.customer);
                    formHook.setValue('loadNum', load.loadNum);
                    formHook.setValue('rate', load.rate);
                    formHook.setValue('shipper', load.shipper);
                    formHook.setValue('receiver', load.receiver);
                    stopsFieldArray.replace(load.stops || []);
                    formHook.setValue('routeEncoded', load.routeEncoded);
                    formHook.setValue('routeDistanceMiles', load.routeDistanceMiles);
                    formHook.setValue('routeDurationHours', load.routeDurationHours);
                } catch (error) {
                    notify({ title: 'Error', message: 'Error loading load data', type: 'error' });
                }
                setLoading(false);
            };
            fetchLoad();
        }
    }, [loadId, formHook]);

    // Handle copying a load
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
                stopsFieldArray.replace(load.stops || []);
            } catch (error) {
                notify({ title: 'Error', message: 'Error loading load data', type: 'error' });
            }
            setLoading(false);
        };
        copyLoad();
    }, [copyLoadId, formHook]);

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

        // If editing, include the ID
        if (isEditMode && data.id) {
            loadData.id = data.id;
        }

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
            let newLoad;

            if (isEditMode) {
                newLoad = await updateLoad(loadData.id, loadData);
                notify({ title: 'Load updated', message: 'Load updated successfully' });
            } else {
                newLoad = await createLoad(loadData, currentRateconFile);
                notify({ title: 'New load created', message: 'New load created successfully' });
            }

            // Redirect to load page
            await router.push(`/loads/${newLoad.id}`);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            notify({
                title: `Error ${isEditMode ? 'updating' : 'saving'} load`,
                message: `${error.message}`,
                type: 'error',
            });
        }
    };

    const handleAIError = () => {
        setCurrentRateconFile(null);
        setLoading(false);
        setIsRetrying(false);
        setAiProgress(0);
        setIsProcessing(false);
    };

    // Helper function to generate standardized filename for PDFs
    const generateRateconFilename = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `ratecon-${year}${month}${day}${hours}${minutes}${seconds}.pdf`;
    };

    const handleFileUpload = async (file: File) => {
        if (!file) {
            return;
        }

        // Rename PDF files to standardized format
        let processedFile = file;
        if (isPDF(file)) {
            const newFileName = generateRateconFilename();
            processedFile = new File([file], newFileName, { type: file.type });
        }

        // Reset form and state if not in edit mode
        if (!isEditMode) {
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
        }

        setCurrentRateconFile(processedFile);
        setLoading(true);
        setIsRetrying(false);
        setAiProgress(0);
        setIsProcessing(true);

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

            const aiLoad = await getAILoad(documentsInBlocks, documentsInLines, false, customersList);
            const logisticsCompany = aiLoad?.logistics_company;

            // Only apply AI output if not in edit mode or user confirms
            if (!isEditMode || confirm('Do you want to replace your current data with the extracted information?')) {
                applyAIOutputToForm(aiLoad);
                // Handle customer matching
                handleCustomerMatching(logisticsCompany, customersList, aiLoad);
            }
        } catch (e) {
            notify({ title: 'Error', message: e?.message || 'Error processing document', type: 'error' });
            handleAIError();
            return;
        }

        setLoading(false);
        setAiProgress(0);
        setIsRetrying(false);
        setIsProcessing(false);
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

    const handleCustomerMatching = (logisticsCompany: string, customersList: Customer[], aiLoad?: AILoad) => {
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
            // Store extracted customer details for pre-filling the form
            if (aiLoad?.customer_details) {
                setExtractedCustomerDetails(aiLoad.customer_details);
            }
        } else {
            formHook.setValue('customer', customersList[matchedIndex]);
        }
    };

    const getAILoad = async (
        documentsInBlocks: any[],
        documentsInLines: any[],
        isRetry = false,
        customersList?: Customer[],
    ): Promise<AILoad> => {
        const response = await fetch(`${apiUrl}/ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documents: isRetry ? documentsInLines : documentsInBlocks,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        let aiLoad: AILoad = null;
        try {
            // Try to extract JSON from code fence if present
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                aiLoad = JSON.parse(jsonMatch[1]);
            } else {
                aiLoad = JSON.parse(text);
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
            throw new Error('Failed to parse document response');
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
            return getAILoad(documentsInBlocks, documentsInLines, true, customersList);
        }

        // Update the form all at once
        applyAIOutputToForm(aiLoad);
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
            ...(isEditMode ? { id: formHook.getValues('id') } : {}),
            customer: null,
            loadNum: null,
            rate: null,
            shipper: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
            },
            receiver: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
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
        const receiverStop = [...load.stops].reverse().find((stop) => stop.type === 'SO');
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

    const mouseHoverOverField = (event: React.MouseEvent<HTMLInputElement>) => {
        // Replace comma between word characters with space
        let value = (event.target as HTMLInputElement).value.replace(/(\w),(\w)/g, '$1 $2');
        // Remove special characters and convert to lowercase
        const replaceExp = /[^a-zA-Z0-9 ]/g;
        value = value.replace(replaceExp, '').toLowerCase();

        // Get the field name
        const fieldName = (event.target as HTMLInputElement).name;

        if ((fieldName.includes('date') || fieldName.includes('time')) && !value) {
            // Get stop name field to search against OCR response
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
        event.currentTarget.style.backgroundColor = '#f0f9ff';
        event.currentTarget.style.borderColor = '#3b82f6';

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

        // Variable to hold the best matching line
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
            setOcrVertices([matchingLine.boundingPoly.normalizedVertices]);
            setOcrVerticesPage(matchingLine.pageNumber);
        }
    };

    const mouseHoverOverFieldExited = (event: React.MouseEvent<HTMLInputElement>) => {
        // Reset the field styling
        event.currentTarget.style.backgroundColor = '';
        event.currentTarget.style.borderColor = '';

        // Reset the vertices
        setOcrVertices(null);
        // Reset the page number
        setOcrVerticesPage(null);
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

        // Count matches
        const matches = tokens1.filter((token) => {
            const result = tokens2.find((token2) => {
                return twoStringWindowSearch(token, token2, Math.round(token.length * 0.9));
            });
            return result;
        }).length;

        // Determine similarity based on the proportion of matching tokens
        return matches >= Math.min(tokens1.length, tokens2.length * 0.8);
    };

    const findClosestDate = (
        ocrData: Line[],
        targetBoundary: { vertices: { x: number; y: number }[] },
    ): Line | null => {
        const dateRegex = /\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b/g;

        let closestMatch: Line | null = null;
        let minDistance = Number.POSITIVE_INFINITY;

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

    const resetForm = () => {
        // Reset the form fields
        formHook.reset({
            ...(isEditMode ? { id: formHook.getValues('id') } : {}),
            customer: null,
            loadNum: null,
            rate: null,
            shipper: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
            },
            receiver: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
            },
            stops: [],
        });

        // Remove the rate confirmation file
        setCurrentRateconFile(null);

        // Reset other state
        setOcrVertices(null);
        setOcrVerticesPage(null);
        setAiProgress(0);
        setIsProcessing(false);
        setIsProcessingText(false);
        setIsProcessingImages(false);
        setIsRetrying(false);
        setAiLimitReached(false);
        setExtractedCustomerDetails(null);
        setOpenAddCustomer(false);
        setShowMissingCustomerLabel(false);
        setPrefillName(null);
    };

    return (
        <Layout
            smHeaderComponent={
                <h1 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Edit Load' : 'Create New Load'}</h1>
            }
        >
            {loading && !isProcessingText && !isProcessingImages && (
                <LoadingOverlay message={isEditMode ? 'Updating load...' : 'Creating load...'} />
            )}
            <div className="max-w-[1980px] w-full mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-6">
                <BreadCrumb
                    className="mb-4 md:mb-6"
                    paths={[
                        {
                            label: 'Loads',
                            href: '/loads',
                        },
                        {
                            label: isEditMode ? 'Edit Load' : 'Create New Load',
                        },
                    ]}
                />

                <div className="relative bg-white flex flex-col gap-3 mb-4 md:mb-6 py-2">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Load' : 'Create New Load'}
                    </h1>
                    {/*
                    <div className="flex space-x-3 ">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-2" />
                            Reset Form
                        </button>
                        <button
                            type="submit"
                            form="load-form"
                            className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-lg shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 ${
                                loading ? 'opacity-75 cursor-not-allowed' : ''
                            }`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    {isEditMode ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>{isEditMode ? 'Update Load' : 'Create Load'}</>
                            )}
                        </button>
                    </div> */}
                </div>

                {!isProPlan && !isLoadingCarrier && (
                    <div
                        className={`mb-4 md:mb-6 p-3 md:p-4 border rounded-lg ${
                            aiLimitReached ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                        }`}
                    >
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <ExclamationCircleIcon
                                    className={`h-5 w-5 ${aiLimitReached ? 'text-red-400' : 'text-blue-400'}`}
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="ml-3 flex-1 space-y-2 md:space-y-0 md:flex md:justify-between md:items-center">
                                <p className={`text-sm ${aiLimitReached ? 'text-red-700' : 'text-blue-700'}`}>
                                    {aiLimitReached
                                        ? 'AI load import limit reached. Unlock the speed + accuracy of AI by upgrading to Pro.'
                                        : 'Your plan has limited AI document processing. Upgrade to Pro for unlimited AI imports.'}
                                </p>
                                <div className="md:ml-6">
                                    <Link
                                        href="/billing"
                                        className={`inline-flex items-center whitespace-nowrap font-medium text-sm ${
                                            aiLimitReached
                                                ? 'text-red-700 hover:text-red-600'
                                                : 'text-blue-700 hover:text-blue-600'
                                        }`}
                                    >
                                        Upgrade Plan
                                        <span aria-hidden="true"> &rarr;</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 md:gap-4 lg:gap-6 flex-col xl:flex-row">
                    {/* Left side - PDF upload/viewer */}
                    <div
                        className={`${
                            currentRateconFile ? 'w-full xl:w-[55%] 2xl:w-[60%]' : 'w-full xl:w-1/3 2xl:w-1/4'
                        } transition-all duration-300`}
                    >
                        {aiProgress > 0 && (
                            <div className="bg-white p-3 md:p-4 border border-gray-200 rounded-lg mb-3 md:mb-4">
                                <div className="flex items-center mb-2">
                                    <div className={`mr-2 md:mr-3 ${isRetrying ? 'text-amber-500' : 'text-blue-500'}`}>
                                        <DocumentMagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5 animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className={`font-medium text-xs md:text-sm ${
                                                isRetrying ? 'text-amber-700' : 'text-blue-700'
                                            }`}
                                        >
                                            {isRetrying ? 'Fine tuning results' : 'Reading Document'}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate">
                                            {isRetrying
                                                ? 'Enhancing data extraction accuracy...'
                                                : 'Extracting load information from your document...'}
                                        </p>
                                    </div>
                                    <div className="ml-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                                        {Math.round(aiProgress)}%
                                    </div>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ease-out ${
                                            isRetrying ? 'bg-amber-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${aiProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {!currentRateconFile ? (
                            <div
                                className={`sticky top-4 bg-white border border-gray-200 rounded-lg overflow-hidden ${
                                    isProcessingText || isProcessingImages ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-200">
                                    <h2 className="text-base md:text-lg font-medium text-gray-900">
                                        Rate Confirmation
                                    </h2>
                                    <p className="mt-1 text-xs md:text-sm text-gray-500">
                                        Upload a document or paste text to automatically extract load information
                                    </p>
                                </div>

                                {/* Upload Options Tabs */}
                                <div className="border-b border-gray-200">
                                    <nav className="-mb-px flex w-full">
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('file')}
                                            disabled={isProcessingText || isProcessingImages}
                                            className={`flex-1 py-3 px-2 md:px-4 border-b-2 font-medium text-xs md:text-sm text-center min-h-[44px] flex items-center justify-center transition-colors duration-200 ${
                                                uploadMode === 'file'
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } ${
                                                isProcessingText || isProcessingImages
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : ''
                                            }`}
                                        >
                                            Upload File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('text')}
                                            disabled={isProcessingText || isProcessingImages}
                                            className={`flex-1 py-3 px-2 md:px-4 border-b-2 font-medium text-xs md:text-sm text-center min-h-[44px] flex items-center justify-center transition-colors duration-200 ${
                                                uploadMode === 'text'
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } ${
                                                isProcessingText || isProcessingImages
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : ''
                                            }`}
                                        >
                                            Paste Text
                                        </button>
                                    </nav>
                                </div>

                                {/* Tab Content */}
                                {uploadMode === 'file' ? (
                                    /* File Upload Area */
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        className={`flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 transition-all duration-200 ${
                                            dragActive ? 'bg-blue-50 border-blue-200' : 'bg-white'
                                        }`}
                                    >
                                        <div className="text-center w-full max-w-sm">
                                            <div
                                                className={`mx-auto h-12 w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center mb-3 md:mb-4 transition-colors duration-200 ${
                                                    dragActive ? 'bg-blue-100' : 'bg-gray-100'
                                                }`}
                                            >
                                                <svg
                                                    className={`h-6 w-6 md:h-8 md:w-8 transition-colors duration-200 ${
                                                        dragActive ? 'text-blue-500' : 'text-gray-400'
                                                    }`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                    />
                                                </svg>
                                            </div>
                                            <h3
                                                className={`text-base md:text-lg font-medium mb-2 transition-colors duration-200 ${
                                                    dragActive ? 'text-blue-700' : 'text-gray-900'
                                                }`}
                                            >
                                                {dragActive ? 'Drop your files here' : 'Upload documents'}
                                            </h3>
                                            <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">
                                                Drag and drop files here, or click to browse
                                            </p>

                                            <div className="space-y-3 md:space-y-4">
                                                <button
                                                    type="button"
                                                    disabled={isProcessingText || isProcessingImages}
                                                    className={`w-full sm:w-auto inline-flex items-center justify-center px-4 md:px-6 py-3 md:py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 shadow-sm min-h-[44px] ${
                                                        isProcessingText || isProcessingImages
                                                            ? 'opacity-50 cursor-not-allowed'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        !(isProcessingText || isProcessingImages) &&
                                                        document.getElementById('file-upload').click()
                                                    }
                                                >
                                                    <ArrowUpTrayIcon className="mr-2 h-5 w-5" />
                                                    Choose Files
                                                </button>

                                                <input
                                                    id="file-upload"
                                                    type="file"
                                                    className="hidden"
                                                    accept="application/pdf,image/jpeg,image/jpg,image/png"
                                                    multiple
                                                    disabled={isProcessingText || isProcessingImages}
                                                    onChange={handleFileInput}
                                                />

                                                {/* File limits info */}
                                                <div className="text-center text-xs text-gray-500 space-y-1">
                                                    <p>1 PDF (auto-processes) or up to 3 images</p>
                                                    <p>Total size limit: 10MB</p>
                                                </div>

                                                {/* Supported formats */}
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500 mb-2">Supported formats:</p>
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            PDF
                                                        </span>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            JPEG
                                                        </span>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            PNG
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Selected Images Display */}
                                                {selectedImages.length > 0 && (
                                                    <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                                                            <h4 className="text-sm font-medium text-gray-900">
                                                                Selected Images ({selectedImages.length}/{MAX_IMAGES})
                                                            </h4>
                                                            {canProcessImages &&
                                                                !isProcessingText &&
                                                                !isProcessingImages && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={processImages}
                                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 min-h-[36px]"
                                                                    >
                                                                        Process Images
                                                                    </button>
                                                                )}
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {selectedImages.map((file, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="relative bg-white p-3 rounded border"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1 min-w-0 pr-2">
                                                                            <p className="text-xs font-medium text-gray-900 truncate">
                                                                                {file.name}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">
                                                                                {Math.round(file.size / 1024)} KB
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeImage(index)}
                                                                            disabled={
                                                                                isProcessingText || isProcessingImages
                                                                            }
                                                                            className={`flex-shrink-0 p-2 text-red-400 hover:text-red-600 min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                                                                isProcessingText || isProcessingImages
                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                    : ''
                                                                            }`}
                                                                        >
                                                                            <TrashIcon className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Text Paste Area */
                                    <div className="p-4 md:p-6">
                                        <div className="text-center mb-4 max-w-sm mx-auto">
                                            <div className="mx-auto h-12 w-12 md:h-16 md:w-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                                                <svg
                                                    className="h-6 w-6 md:h-8 md:w-8 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                                                Paste rate confirmation text
                                            </h3>
                                            <p className="text-xs md:text-sm text-gray-500 mb-4">
                                                Copy and paste text from your rate confirmation document
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <textarea
                                                value={pastedText}
                                                onChange={(e) => {
                                                    const newText = e.target.value;
                                                    if (newText.length <= MAX_TEXT_LENGTH) {
                                                        setPastedText(newText);
                                                    }
                                                }}
                                                disabled={isProcessingText}
                                                placeholder="Paste your rate confirmation text here..."
                                                className={`w-full h-40 md:h-48 px-3 md:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm ${
                                                    isProcessingText ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                                maxLength={MAX_TEXT_LENGTH}
                                            />

                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                                <p
                                                    className={`text-xs order-2 sm:order-1 ${
                                                        pastedText.length > MAX_TEXT_LENGTH * 0.9
                                                            ? 'text-orange-500'
                                                            : 'text-gray-500'
                                                    }`}
                                                >
                                                    {pastedText.length.toLocaleString()} /{' '}
                                                    {MAX_TEXT_LENGTH.toLocaleString()} characters
                                                </p>
                                                <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPastedText('')}
                                                        disabled={!pastedText.trim() || isProcessingText}
                                                        className={`w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] ${
                                                            isProcessingText ? 'opacity-50 cursor-not-allowed' : ''
                                                        }`}
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleTextSubmit}
                                                        disabled={
                                                            !pastedText.trim() ||
                                                            pastedText.length > MAX_TEXT_LENGTH ||
                                                            isProcessingText
                                                        }
                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                                                    >
                                                        {isProcessingText ? 'Processing...' : 'Process Text'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="block bg-white border border-gray-200 rounded-lg overflow-hidden overflow-y-visible ">
                                <div className=" relative p-3 md:p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between overflow-hidden">
                                    <div className="flex items-center overflow-hidden flex-1 min-w-0">
                                        <PaperClipIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-400 mr-2 flex-shrink-0" />
                                        <span className="font-medium text-gray-700 text-xs md:text-sm truncate">
                                            {currentRateconFile.name} ({Math.round(currentRateconFile.size / 1024)} KB)
                                        </span>
                                    </div>
                                    <div className="flex gap-1 md:gap-2 bg-gray-50 ml-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center p-1.5 md:p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[36px] min-h-[36px] justify-center"
                                            onClick={() => document.getElementById('file-upload-replace').click()}
                                            title="Replace file"
                                        >
                                            <ArrowPathIcon className="h-4 w-4 text-gray-500" />
                                            <input
                                                id="file-upload-replace"
                                                type="file"
                                                className="hidden"
                                                accept="application/pdf,image/jpeg,image/jpg,image/png"
                                                multiple
                                                onChange={(e) => {
                                                    const files = e.target.files;
                                                    if (files && files.length > 0) {
                                                        // Apply same naming logic for replace files
                                                        const filesArray = Array.from(files);
                                                        const renamedFiles = filesArray.map((file) => {
                                                            if (isPDF(file)) {
                                                                const newFileName = generateRateconFilename();
                                                                return new File([file], newFileName, {
                                                                    type: file.type,
                                                                });
                                                            }
                                                            return file;
                                                        });

                                                        // Create new FileList with renamed files
                                                        const dataTransfer = new DataTransfer();
                                                        renamedFiles.forEach((file) => dataTransfer.items.add(file));

                                                        // Update the input's files
                                                        const input = e.target as HTMLInputElement;
                                                        Object.defineProperty(input, 'files', {
                                                            value: dataTransfer.files,
                                                            writable: false,
                                                        });

                                                        handleFileInput(e);
                                                    }
                                                }}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex items-center p-1.5 md:p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[36px] min-h-[36px] justify-center"
                                            onClick={() => setCurrentRateconFile(null)}
                                            title="Remove file"
                                        >
                                            <TrashIcon className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                                {/* PDF Viewer Component */}
                                <PDFViewer
                                    fileBlob={currentRateconFile}
                                    scrollToPage={ocrVerticesPage}
                                    ocrVertices={ocrVertices}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right side - Form */}
                    <div
                        className={`${
                            currentRateconFile ? 'w-full xl:w-[45%] 2xl:w-[40%]' : 'w-full xl:w-2/3 2xl:w-3/4'
                        } transition-all duration-300 flex-shrink-0`}
                    >
                        {/* This div makes the form panel sticky and defines its adaptive height. */}
                        {/* LoadForm inside will manage its own height based on content. */}
                        <div
                            className={`sticky top-2 md:top-4 bg-white border border-gray-200 overflow-hidden rounded-lg transition-all duration-500 ${
                                currentRateconFile ? 'xl:h-[85vh] h-full' : 'h-auto min-h-[400px] md:min-h-[600px]'
                            }`}
                        >
                            <form
                                id="load-form"
                                onSubmit={formHook.handleSubmit(submit)}
                                className="h-full transition-all duration-500"
                            >
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
                                    loading={loading}
                                    onResetForm={resetForm}
                                    isEditMode={isEditMode}
                                    extractedCustomerDetails={extractedCustomerDetails}
                                />
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

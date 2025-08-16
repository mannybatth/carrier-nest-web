import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    DocumentTextIcon,
    PlusIcon,
    XMarkIcon,
    CloudArrowUpIcon,
    SparklesIcon,
    DocumentMagnifyingGlassIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { PDFDocument } from 'pdf-lib';
import Layout from '../../../components/layout/Layout';
import BreadCrumb from '../../../components/layout/BreadCrumb';
import PDFViewer from '../../../components/PDFViewer';
import { notify } from '../../../components/notifications/Notification';
import { PageWithAuth } from '../../../interfaces/auth';
import { useUserContext } from 'components/context/UserContext';
import ExpenseForm from '../../../components/expenses/ExpenseForm';
import FileUpload from '../../../components/FileUpload';
import { generateExpenseFileName } from '../../../lib/helpers/document-naming';
import { getCachedExpenseCategories } from '../../../lib/cache';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { getDriverById } from '../../../lib/rest/driver';
import { getLoadById } from '../../../lib/rest/load';

const MAX_TEXT_LENGTH = 15000;

const CreateExpensePage: PageWithAuth = () => {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [extracting, setExtracting] = useState(false);

    // State for preselected driver/load from URL params
    const [preselectedDriver, setPreselectedDriver] = useState<any>(null);
    const [preselectedLoad, setPreselectedLoad] = useState<any>(null);
    const [loadingAssociations, setLoadingAssociations] = useState(false);

    // New state for advanced features
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const [pastedText, setPastedText] = useState('');
    const [isProcessingText, setIsProcessingText] = useState(false);
    const [currentExpenseFile, setCurrentExpenseFile] = useState<File>(null);
    const [aiProgress, setAiProgress] = useState({
        stage: '',
        progress: 0,
        isProcessing: false,
    });
    const [isRetrying, setIsRetrying] = useState(false);
    const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

    // Utility function to start artificial progress
    const startArtificialProgress = (startProgress: number, endProgress: number, duration: number) => {
        // Clear any existing interval
        if (progressInterval) {
            clearInterval(progressInterval);
        }

        const increment = (endProgress - startProgress) / (duration / 100); // Update every 100ms
        let currentProgress = startProgress;

        const interval = setInterval(() => {
            currentProgress += increment;
            if (currentProgress >= endProgress) {
                clearInterval(interval);
                currentProgress = endProgress;
            }
            setAiProgress((prev) => ({ ...prev, progress: Math.min(currentProgress, endProgress) }));
        }, 100);

        setProgressInterval(interval);
        return interval;
    };

    // Clean up interval on component unmount
    useEffect(() => {
        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [progressInterval]);

    // Load expense categories
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const categoriesData = await getCachedExpenseCategories();
                setCategories(categoriesData.categories || []);
            } catch (error) {
                console.error('Failed to load categories:', error);
                setCategories([]);
            }
        };
        loadCategories();
    }, []);

    // Check for URL parameters and fetch associated driver/load
    useEffect(() => {
        const fetchAssociations = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const driverId = urlParams.get('driverId');
            const loadId = urlParams.get('loadId');

            if (!driverId && !loadId) {
                return;
            }

            setLoadingAssociations(true);

            try {
                let driver = null;
                let load = null;

                if (driverId) {
                    driver = await getDriverById(driverId);
                    setPreselectedDriver(driver);
                }

                if (loadId) {
                    load = await getLoadById(loadId);
                    setPreselectedLoad(load);
                }

                // Update extracted data to include the preselected associations
                setExtractedData((prevData) => ({
                    ...prevData,
                    ...(driver && {
                        driverId: driver.id,
                        driver: driver,
                    }),
                    ...(load && {
                        loadId: load.id,
                        load: load,
                    }),
                }));

                // Remove the URL parameters after processing (shallow update to avoid reload)
                if (driverId || loadId) {
                    const newQuery = { ...router.query };
                    delete newQuery.driverId;
                    delete newQuery.loadId;

                    router.replace(
                        {
                            pathname: router.pathname,
                            query: newQuery,
                        },
                        undefined,
                        { shallow: true },
                    );
                }
            } catch (error) {
                console.error('Error fetching driver/load associations:', error);
                notify({
                    title: 'Error',
                    message: 'Failed to load driver/load information',
                    type: 'error',
                });
            } finally {
                setLoadingAssociations(false);
            }
        };

        fetchAssociations();
    }, [router.query]);

    const extractDataFromFile = async (file: File) => {
        setExtracting(true);
        setIsRetrying(false);

        // Clear any existing progress interval
        if (progressInterval) {
            clearInterval(progressInterval);
        }

        setAiProgress({
            stage: 'Analyzing document',
            progress: 10,
            isProcessing: true,
        });

        try {
            // Set the current file for viewing if it's a PDF
            if (file.type === 'application/pdf') {
                setCurrentExpenseFile(file);
                // Remove the PDF from uploadedFiles since it's now in currentExpenseFile
                setUploadedFiles((prev) => prev.filter((f) => f !== file));
            }

            setAiProgress({
                stage: 'Preparing document for analysis',
                progress: 20,
                isProcessing: true,
            });

            const formData = new FormData();
            formData.append('file', file);

            setAiProgress({
                stage: 'Running OCR and text extraction',
                progress: 40,
                isProcessing: true,
            });

            // Start artificial progress from 40% to 85% over 3 seconds while API processes
            startArtificialProgress(40, 85, 3000);

            const response = await fetch('/api/ai/expenses/extract', {
                method: 'POST',
                body: formData,
            });

            // Clear artificial progress
            if (progressInterval) {
                clearInterval(progressInterval);
                setProgressInterval(null);
            }

            if (!response.ok) {
                throw new Error('Failed to extract data');
            }

            setAiProgress({
                stage: 'Processing with AI',
                progress: 90,
                isProcessing: true,
            });

            const responseData = await response.json();

            if (!responseData.success) {
                throw new Error(responseData.details || 'Failed to extract data');
            }

            setAiProgress({
                stage: 'Finalizing expense data',
                progress: 95,
                isProcessing: true,
            });

            setExtractedData(responseData.data);

            setAiProgress({
                stage: 'Complete',
                progress: 100,
                isProcessing: false,
            });

            // Auto-hide progress after success
            setTimeout(() => {
                setAiProgress({ stage: '', progress: 0, isProcessing: false });
            }, 2000);
        } catch (error) {
            console.error('Error extracting data:', error);
            notify({ title: 'Failed to extract data from file', type: 'error' });

            // Clear any progress intervals on error
            if (progressInterval) {
                clearInterval(progressInterval);
                setProgressInterval(null);
            }

            setAiProgress({
                stage: '',
                progress: 0,
                isProcessing: false,
            });
        } finally {
            setExtracting(false);
        }
    };

    const handleTextSubmit = async () => {
        if (!pastedText.trim()) {
            notify({ title: 'Please enter some text to process', type: 'error' });
            return;
        }

        if (pastedText.length > MAX_TEXT_LENGTH) {
            notify({
                title: `Text is too long. Maximum ${MAX_TEXT_LENGTH.toLocaleString()} characters allowed.`,
                type: 'error',
            });
            return;
        }

        setIsProcessingText(true);

        // Clear any existing progress interval
        if (progressInterval) {
            clearInterval(progressInterval);
        }

        setAiProgress({
            stage: 'Analyzing pasted text',
            progress: 15,
            isProcessing: true,
        });

        try {
            setAiProgress({
                stage: 'Processing text with AI',
                progress: 30,
                isProcessing: true,
            });

            // Start artificial progress from 30% to 80% over 2.5 seconds while API processes
            startArtificialProgress(30, 80, 2500);

            const response = await fetch('/api/ai/expenses/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: pastedText }),
            });

            // Clear artificial progress
            if (progressInterval) {
                clearInterval(progressInterval);
                setProgressInterval(null);
            }

            if (!response.ok) {
                throw new Error('Failed to process text');
            }

            setAiProgress({
                stage: 'Extracting expense details',
                progress: 90,
                isProcessing: true,
            });

            const responseData = await response.json();

            if (!responseData.success) {
                throw new Error(responseData.details || 'Failed to extract data');
            }

            setAiProgress({
                stage: 'Finalizing data',
                progress: 95,
                isProcessing: true,
            });

            setExtractedData(responseData.data);

            setAiProgress({
                stage: 'Complete',
                progress: 100,
                isProcessing: false,
            });

            // Auto-hide progress after success
            setTimeout(() => {
                setAiProgress({ stage: '', progress: 0, isProcessing: false });
            }, 2000);
        } catch (error) {
            console.error('Error processing text:', error);
            notify({ title: 'Failed to process text', type: 'error' });

            // Clear any progress intervals on error
            if (progressInterval) {
                clearInterval(progressInterval);
                setProgressInterval(null);
            }

            setAiProgress({
                stage: '',
                progress: 0,
                isProcessing: false,
            });
        } finally {
            setIsProcessingText(false);
        }
    };

    const combineImagesToPDF = async (imageFiles: File[]) => {
        if (imageFiles.length === 0 || imageFiles.length > 3) {
            notify({ title: 'Please select 1-3 images to combine into PDF', type: 'error' });
            return;
        }

        setAiProgress({
            stage: 'Initializing PDF creation',
            progress: 5,
            isProcessing: true,
        });

        try {
            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();

            setAiProgress({
                stage: 'Setting up document layout',
                progress: 15,
                isProcessing: true,
            });

            // Process each image
            for (let i = 0; i < imageFiles.length; i++) {
                const image = imageFiles[i];
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

                // Update progress for each image
                const imageProgress = ((i + 1) / imageFiles.length) * 35; // 35% of total for processing
                setAiProgress({
                    stage: `Processing image ${i + 1} of ${imageFiles.length}`,
                    progress: 15 + imageProgress,
                    isProcessing: true,
                });
            }

            setAiProgress({
                stage: 'Generating PDF document',
                progress: 55,
                isProcessing: true,
            });

            // Serialize the PDF
            const pdfBytes = await pdfDoc.save();

            setAiProgress({
                stage: 'Preparing combined document',
                progress: 65,
                isProcessing: true,
            });

            // Create a File object from the PDF bytes
            const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            const fileName = `combined-expense-documents-${Date.now()}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

            // Set the current file for viewing
            setCurrentExpenseFile(pdfFile);

            // Clear the uploaded files since they've been combined into the PDF
            // The combined PDF will be uploaded via currentExpenseFile
            setUploadedFiles([]);

            setAiProgress({
                stage: 'Starting expense data extraction',
                progress: 75,
                isProcessing: true,
            });

            // Process the combined PDF
            await extractDataFromFile(pdfFile);
        } catch (error) {
            console.error('Error combining images:', error);
            notify({ title: 'Failed to combine images to PDF', type: 'error' });
            setAiProgress({
                stage: '',
                progress: 0,
                isProcessing: false,
            });
        }
    };

    const handleSubmit = async (expenseData: any) => {
        setLoading(true);
        try {
            // First upload documents if any
            let documentIds: string[] = [];

            // Collect all files to upload (from uploadedFiles and currentExpenseFile)
            const filesToUpload: File[] = [...uploadedFiles];
            if (currentExpenseFile) {
                filesToUpload.push(currentExpenseFile);
            }

            if (filesToUpload.length > 0) {
                // Find the category name for filename generation
                const selectedCategory = categories.find((cat) => cat.id === expenseData.categoryId);
                const categoryName = selectedCategory?.name || 'unknown';

                // Rename files before uploading
                const renamedFiles = filesToUpload.map((file) => {
                    const newFileName = generateExpenseFileName(file, categoryName);
                    return new File([file], newFileName, {
                        type: file.type,
                        lastModified: file.lastModified,
                    });
                });

                const formData = new FormData();
                renamedFiles.forEach((file) => {
                    formData.append('files', file);
                });

                const uploadResponse = await fetch('/api/documents/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadResponse.ok) throw new Error('Failed to upload documents');

                const uploadData = await uploadResponse.json();
                documentIds = uploadData.documentIds;
            }

            // Validate required fields
            if (!expenseData.categoryId) {
                notify({ title: 'Please select an expense category', type: 'error' });
                return;
            }

            if (!expenseData.amount || parseFloat(expenseData.amount) <= 0) {
                notify({ title: 'Please enter a valid amount', type: 'error' });
                return;
            }

            // Include documentIds in expense data
            const transformedExpenseData = {
                ...expenseData,
                documentIds,
            };

            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transformedExpenseData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error Response:', errorData);
                console.error('Full error details:', JSON.stringify(errorData, null, 2));
                throw new Error(errorData.error || 'Failed to create expense');
            }

            const expense = await response.json();
            notify({ title: 'Expense created successfully!', type: 'success' });
            router.push(`/expenses/${expense.id}`);
        } catch (error) {
            console.error('Error creating expense:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create expense';
            notify({ title: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <LoadingOverlay message="Creating Expense..." />}
            {loadingAssociations && <LoadingOverlay message="Loading driver/load information..." />}
            <Layout smHeaderComponent={<h1 className="text-xl font-semibold text-gray-900">Create Expense</h1>}>
                {/* Main content container */}
                <div className="px-4 py-6 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Breadcrumb */}
                        <div className="mb-6">
                            <BreadCrumb
                                paths={[
                                    {
                                        label: 'Expenses',
                                        href: '/expenses',
                                    },
                                    {
                                        label: 'Create New Expense',
                                    },
                                ]}
                            />
                        </div>

                        {/* Header Section */}
                        <div className="bg-white shadow rounded-lg mb-6">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200/50">
                                            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-2xl font-bold text-gray-900">Create New Expense</h1>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Upload documents for AI-powered extraction or enter details manually
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-[9fr_11fr] gap-6">
                            {/* Left Column - Document Upload & AI Processing - Sticky */}
                            <div className="sticky top-4 self-start">
                                <div className="bg-white shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        {/* AI Progress Card */}
                                        {aiProgress.isProcessing && (
                                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center mb-3">
                                                    <div className="mr-3 p-2 rounded-lg bg-blue-100 flex-shrink-0">
                                                        <DocumentMagnifyingGlassIcon className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-gray-900">
                                                            {aiProgress.stage || 'Processing Document'}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            AI is analyzing your expense document...
                                                        </p>
                                                    </div>
                                                    <div className="ml-2 text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-lg flex-shrink-0">
                                                        {Math.round(aiProgress.progress)}%
                                                    </div>
                                                </div>
                                                <div className="w-full bg-blue-200 rounded-full h-2">
                                                    <div
                                                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                                                        style={{ width: `${aiProgress.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {!currentExpenseFile ? (
                                            <div>
                                                <h2 className="text-lg font-medium text-gray-900 mb-4">
                                                    Document Processing
                                                </h2>
                                                <p className="text-sm text-gray-600 mb-6">
                                                    Upload receipts, invoices, or paste text for data extraction
                                                </p>

                                                {/* Upload Mode Tabs */}
                                                <div className="mb-6">
                                                    <div className="bg-gray-100 rounded-lg p-1">
                                                        <nav className="flex space-x-1">
                                                            <button
                                                                onClick={() => setUploadMode('file')}
                                                                className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                                                                    uploadMode === 'file'
                                                                        ? 'bg-white text-blue-700 shadow-sm'
                                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                                                }`}
                                                            >
                                                                <CloudArrowUpIcon className="w-4 h-4" />
                                                                <span>Upload Files</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setUploadMode('text')}
                                                                className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                                                                    uploadMode === 'text'
                                                                        ? 'bg-white text-blue-700 shadow-sm'
                                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                                                }`}
                                                            >
                                                                <DocumentTextIcon className="w-4 h-4" />
                                                                <span>Paste Text</span>
                                                            </button>
                                                        </nav>
                                                    </div>
                                                </div>

                                                {uploadMode === 'file' ? (
                                                    <div className="space-y-4">
                                                        {/* File Upload Area */}
                                                        <FileUpload
                                                            config={{
                                                                acceptedTypes: [
                                                                    'application/pdf',
                                                                    'image/png',
                                                                    'image/jpg',
                                                                    'image/jpeg',
                                                                ],
                                                                acceptAttribute: '.pdf,.png,.jpg,.jpeg',
                                                                maxFileSize: 10 * 1024 * 1024, // 10MB
                                                                maxFileCount: 3, // For combining images to PDF
                                                                autoProcess: false, // Keep false for manual control
                                                                allowMultiple: true,
                                                                showProcessButton: true,
                                                                title: 'Upload expense documents',
                                                                description:
                                                                    'Drag and drop files here, or click to browse',
                                                                dragDescription: 'Drop your expense documents here',
                                                                fileLimitsText: [
                                                                    'PDF or up to 3 images (PNG, JPG) up to 10MB each',
                                                                ],
                                                                supportedFormatsTitle: 'Supported formats:',
                                                                fileFormats: [
                                                                    { name: 'PDF', color: 'bg-blue-100 text-blue-800' },
                                                                    {
                                                                        name: 'PNG',
                                                                        color: 'bg-green-100 text-green-800',
                                                                    },
                                                                    {
                                                                        name: 'JPG',
                                                                        color: 'bg-green-100 text-green-800',
                                                                    },
                                                                ],
                                                                compact: false,
                                                                showUploadedFiles: true,
                                                                uploadedFilesTitle: 'Uploaded Files',
                                                                processButtonText: 'Process Documents',
                                                            }}
                                                            files={uploadedFiles}
                                                            onFilesChange={(newFiles) => {
                                                                setUploadedFiles(newFiles);

                                                                // Auto-process PDF files immediately when dropped/selected
                                                                if (
                                                                    newFiles.length === 1 &&
                                                                    newFiles[0].type === 'application/pdf'
                                                                ) {
                                                                    // Small delay to ensure UI updates, then process
                                                                    setTimeout(async () => {
                                                                        await extractDataFromFile(newFiles[0]);
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onFileProcess={async (files) => {
                                                                if (files.length === 0) return;

                                                                // Check if all files are images (for combining to PDF)
                                                                const imageFiles = files.filter((file) =>
                                                                    file.type.startsWith('image/'),
                                                                );
                                                                const pdfFiles = files.filter(
                                                                    (file) => file.type === 'application/pdf',
                                                                );

                                                                if (pdfFiles.length > 0) {
                                                                    // Process single PDF
                                                                    await extractDataFromFile(pdfFiles[0]);
                                                                } else if (
                                                                    imageFiles.length > 0 &&
                                                                    imageFiles.length <= 3
                                                                ) {
                                                                    // Combine images to PDF and process
                                                                    await combineImagesToPDF(imageFiles);
                                                                } else if (imageFiles.length > 3) {
                                                                    notify({
                                                                        title: 'Maximum 3 images can be combined into PDF',
                                                                        type: 'error',
                                                                    });
                                                                }
                                                            }}
                                                            disabled={aiProgress.isProcessing}
                                                            processing={aiProgress.isProcessing}
                                                        />

                                                        {/* Help Text */}
                                                        {uploadedFiles.length > 1 &&
                                                            uploadedFiles.every((f) => f.type.startsWith('image/')) && (
                                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                                    <div className="flex items-start space-x-2">
                                                                        <svg
                                                                            className="h-4 w-4 text-amber-600 mt-0.5"
                                                                            fill="currentColor"
                                                                            viewBox="0 0 20 20"
                                                                        >
                                                                            <path
                                                                                fillRule="evenodd"
                                                                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                        <div>
                                                                            <h4 className="text-sm font-medium text-amber-800">
                                                                                Smart Image Processing
                                                                            </h4>
                                                                            <p className="text-sm text-amber-700 mt-1">
                                                                                Multiple images will be combined into a
                                                                                single PDF before processing.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {/* Text Input Area */}
                                                        <div className="text-center py-6">
                                                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-blue-50 mb-4">
                                                                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                                                            </div>
                                                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                                Paste Expense Information
                                                            </h3>
                                                            <p className="text-sm text-gray-600 max-w-md mx-auto">
                                                                Copy and paste text from your receipt or invoice for AI
                                                                analysis
                                                            </p>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="relative">
                                                                <textarea
                                                                    value={pastedText}
                                                                    onChange={(e) => {
                                                                        const newText = e.target.value;
                                                                        if (newText.length <= MAX_TEXT_LENGTH) {
                                                                            setPastedText(newText);
                                                                        }
                                                                    }}
                                                                    disabled={isProcessingText}
                                                                    placeholder="Paste your expense document text here..."
                                                                    className={`w-full h-40 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm ${
                                                                        isProcessingText
                                                                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                                            : 'bg-white'
                                                                    }`}
                                                                    maxLength={MAX_TEXT_LENGTH}
                                                                />
                                                                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                                                    {pastedText.length.toLocaleString()} /{' '}
                                                                    {MAX_TEXT_LENGTH.toLocaleString()}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPastedText('')}
                                                                    disabled={!pastedText.trim() || isProcessingText}
                                                                    className={`px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors ${
                                                                        isProcessingText
                                                                            ? 'opacity-50 cursor-not-allowed'
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    Clear Text
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleTextSubmit}
                                                                    disabled={
                                                                        !pastedText.trim() ||
                                                                        pastedText.length > MAX_TEXT_LENGTH ||
                                                                        isProcessingText
                                                                    }
                                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    {isProcessingText ? (
                                                                        <span className="flex items-center justify-center">
                                                                            <svg
                                                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                                                                            Processing...
                                                                        </span>
                                                                    ) : (
                                                                        'Process Text'
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* AI Extraction Results */}
                                                {extractedData && (
                                                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {extractedData.amount && (
                                                                <div className="bg-white rounded-lg p-3 border border-green-100">
                                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                                        Amount
                                                                    </span>
                                                                    <p className="text-lg font-semibold text-gray-900 mt-1">
                                                                        ${extractedData.amount}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {extractedData.categoryName && (
                                                                <div className="bg-white rounded-lg p-3 border border-green-100">
                                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                                        Category
                                                                    </span>
                                                                    <p className="text-base font-medium text-gray-900 mt-1">
                                                                        {extractedData.categoryName}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {extractedData.receiptDate && (
                                                                <div className="bg-white rounded-lg p-3 border border-green-100">
                                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                                        Date
                                                                    </span>
                                                                    <p className="text-base font-medium text-gray-900 mt-1">
                                                                        {extractedData.receiptDate}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {extractedData.description && (
                                                                <div className="bg-white rounded-lg p-3 border border-green-100 sm:col-span-2">
                                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                                        Description
                                                                    </span>
                                                                    <p className="text-sm text-gray-900 mt-1">
                                                                        {extractedData.description}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-4 text-center">
                                                            <p className="text-sm text-green-700">
                                                                Review and adjust the extracted data in the expense form
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* PDF Viewer */
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center flex-1 min-w-0">
                                                        <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                                            <svg
                                                                className="w-5 h-5 text-blue-600"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h2 className="text-lg font-medium text-gray-900 truncate">
                                                                Expense Document
                                                            </h2>
                                                            <p className="text-sm text-gray-600 truncate">
                                                                {currentExpenseFile.name} (
                                                                {Math.round(currentExpenseFile.size / 1024)} KB)
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="ml-4 p-2 border border-gray-200 rounded-lg text-gray-500 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                                        onClick={() => setCurrentExpenseFile(null)}
                                                        title="Remove file"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <div className="min-h-[400px] max-h-[calc(100vh-200px)] h-auto">
                                                        <PDFViewer fileBlob={currentExpenseFile} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Expense Form */}
                            <div>
                                <div className="bg-white shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-6">Expense Details</h3>
                                        <p className="text-sm text-gray-600 mb-6">
                                            Complete your expense information below
                                        </p>

                                        <ExpenseForm
                                            initialData={extractedData}
                                            onSubmit={handleSubmit}
                                            loading={loading}
                                            submitButtonText="Create Expense"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    );
};

CreateExpensePage.authenticationEnabled = true;

export default CreateExpensePage;

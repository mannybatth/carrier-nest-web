import React, { useState, useRef, useCallback } from 'react';
import { ArrowUpTrayIcon, TrashIcon, CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export interface FileUploadConfig {
    // File type constraints
    acceptedTypes?: string[];
    acceptAttribute?: string;
    maxFileSize?: number; // in bytes
    maxFileCount?: number;

    // Processing options
    autoProcess?: boolean;
    allowMultiple?: boolean;
    showProcessButton?: boolean;
    processButtonText?: string;

    // Visual customization
    title?: string;
    description?: string;
    dragDescription?: string;
    fileLimitsText?: string[];
    supportedFormatsTitle?: string;
    fileFormats?: Array<{ name: string; color: string }>;

    // Layout options
    compact?: boolean;
    showUploadedFiles?: boolean;
    uploadedFilesTitle?: string;
}

export interface FileUploadProps {
    config: FileUploadConfig;
    files: File[];
    onFilesChange: (files: File[]) => void;
    onFileProcess?: (files: File[]) => void;
    disabled?: boolean;
    processing?: boolean;
    dragActive?: boolean;
    onDragStateChange?: (dragActive: boolean) => void;
    className?: string;
}

const DEFAULT_CONFIG: Required<FileUploadConfig> = {
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    acceptAttribute: 'application/pdf,image/jpeg,image/jpg,image/png',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFileCount: 3,
    autoProcess: false,
    allowMultiple: true,
    showProcessButton: true,
    processButtonText: 'Process Files',
    title: 'Upload documents',
    description: 'Drag and drop files here, or click to browse',
    dragDescription: 'Drop your files here',
    fileLimitsText: ['Total size limit: 10MB'],
    supportedFormatsTitle: 'Supported formats:',
    fileFormats: [
        { name: 'PDF', color: 'bg-blue-100 text-blue-800' },
        { name: 'JPEG', color: 'bg-green-100 text-green-800' },
        { name: 'PNG', color: 'bg-green-100 text-green-800' },
    ],
    compact: false,
    showUploadedFiles: true,
    uploadedFilesTitle: 'Selected Files',
};

const FileUpload: React.FC<FileUploadProps> = ({
    config: userConfig,
    files,
    onFilesChange,
    onFileProcess,
    disabled = false,
    processing = false,
    dragActive: externalDragActive,
    onDragStateChange,
    className = '',
}) => {
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    const [internalDragActive, setInternalDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const dragActive = externalDragActive ?? internalDragActive;

    const handleDragStateChange = useCallback(
        (active: boolean) => {
            if (onDragStateChange) {
                onDragStateChange(active);
            } else {
                setInternalDragActive(active);
            }
        },
        [onDragStateChange],
    );

    const handleDrag = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (disabled || processing) return;

            if (e.type === 'dragenter' || e.type === 'dragover') {
                handleDragStateChange(true);
            } else if (e.type === 'dragleave') {
                handleDragStateChange(false);
            }
        },
        [disabled, processing, handleDragStateChange],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleDragStateChange(false);

            if (disabled || processing) return;

            const droppedFiles = Array.from(e.dataTransfer.files);
            handleFiles(droppedFiles);
        },
        [disabled, processing, handleDragStateChange],
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (disabled || processing) return;

            const selectedFiles = e.target.files;
            if (selectedFiles) {
                handleFiles(Array.from(selectedFiles));
            }

            // Reset input value to allow selecting the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        [disabled, processing],
    );

    const handleFiles = useCallback(
        (newFiles: File[]) => {
            const validFiles = newFiles.filter((file) => {
                // Check file type
                if (config.acceptedTypes.length > 0 && !config.acceptedTypes.some((type) => file.type === type)) {
                    console.warn(`File ${file.name} has unsupported type: ${file.type}`);
                    return false;
                }

                // Check file size
                if (file.size > config.maxFileSize) {
                    console.warn(`File ${file.name} exceeds size limit: ${file.size} bytes`);
                    return false;
                }

                return true;
            });

            if (config.allowMultiple) {
                const totalFiles = [...files, ...validFiles];
                const limitedFiles = totalFiles.slice(0, config.maxFileCount);
                onFilesChange(limitedFiles);

                // Auto-process if enabled and files were added
                if (config.autoProcess && validFiles.length > 0 && onFileProcess) {
                    onFileProcess(validFiles);
                }
            } else {
                const singleFile = validFiles.slice(0, 1);
                onFilesChange(singleFile);

                // Auto-process if enabled and file was added
                if (config.autoProcess && singleFile.length > 0 && onFileProcess) {
                    onFileProcess(singleFile);
                }
            }
        },
        [files, config, onFilesChange, onFileProcess],
    );

    const removeFile = useCallback(
        (index: number) => {
            const updatedFiles = files.filter((_, i) => i !== index);
            onFilesChange(updatedFiles);
        },
        [files, onFilesChange],
    );

    const openFileDialog = useCallback(() => {
        if (disabled || processing) return;
        fileInputRef.current?.click();
    }, [disabled, processing]);

    const canProcess = files.length > 0 && !disabled && !processing && onFileProcess && config.showProcessButton;

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={`${className}`}>
            {/* File Upload Area */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                    flex flex-col items-center justify-center transition-all duration-200 cursor-pointer
                    ${config.compact ? 'p-4' : 'p-4 md:p-6 lg:p-8'}
                    ${dragActive ? 'bg-blue-50 border-blue-200' : 'bg-white'}
                    ${disabled || processing ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}
                    ${config.compact ? 'border-2 border-dashed border-gray-300 rounded-lg' : ''}
                `}
                onClick={openFileDialog}
            >
                <div className="text-center w-full max-w-sm">
                    <div
                        className={`
                            mx-auto rounded-full flex items-center justify-center mb-3 md:mb-4 transition-colors duration-200
                            ${config.compact ? 'h-8 w-8' : 'h-12 w-12 md:h-16 md:w-16'}
                            ${dragActive ? 'bg-blue-100' : 'bg-gray-100'}
                        `}
                    >
                        {config.compact ? (
                            <CloudArrowUpIcon
                                className={`
                                    h-5 w-5 transition-colors duration-200
                                    ${dragActive ? 'text-blue-500' : 'text-gray-400'}
                                `}
                            />
                        ) : (
                            <svg
                                className={`
                                    h-6 w-6 md:h-8 md:w-8 transition-colors duration-200
                                    ${dragActive ? 'text-blue-500' : 'text-gray-400'}
                                `}
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
                        )}
                    </div>

                    <h3
                        className={`
                            font-medium mb-2 transition-colors duration-200
                            ${config.compact ? 'text-sm' : 'text-base md:text-lg'}
                            ${dragActive ? 'text-blue-700' : 'text-gray-900'}
                        `}
                    >
                        {dragActive ? config.dragDescription : config.title}
                    </h3>

                    <p className={`text-xs md:text-sm text-gray-500 mb-4 ${config.compact ? 'md:mb-3' : 'md:mb-6'}`}>
                        {config.description}
                    </p>

                    <div className={`space-y-3 ${config.compact ? '' : 'md:space-y-4'}`}>
                        <button
                            type="button"
                            disabled={disabled || processing}
                            className={`
                                w-full sm:w-auto inline-flex items-center justify-center px-4 md:px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 shadow-sm
                                ${config.compact ? 'py-2 px-3 text-xs' : 'min-h-[44px]'}
                                ${disabled || processing ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            onClick={(e) => {
                                e.stopPropagation();
                                openFileDialog();
                            }}
                        >
                            <ArrowUpTrayIcon className={`mr-2 ${config.compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
                            Choose Files
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={config.acceptAttribute}
                            multiple={config.allowMultiple}
                            disabled={disabled || processing}
                            onChange={handleFileInput}
                        />

                        {/* File limits info */}
                        {config.fileLimitsText.length > 0 && !config.compact && (
                            <div className="text-center text-xs text-gray-500 space-y-1">
                                {config.fileLimitsText.map((text, index) => (
                                    <p key={index}>{text}</p>
                                ))}
                            </div>
                        )}

                        {/* Supported formats */}
                        {config.fileFormats.length > 0 && !config.compact && (
                            <div className="text-center">
                                <p className="text-xs text-gray-500 mb-2">{config.supportedFormatsTitle}</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {config.fileFormats.map((format, index) => (
                                        <span
                                            key={index}
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${format.color}`}
                                        >
                                            {format.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Uploaded Files Display */}
            {config.showUploadedFiles && files.length > 0 && (
                <div className={`mt-4 ${config.compact ? 'md:mt-3' : 'md:mt-6'} p-3 md:p-4 bg-gray-50 rounded-lg`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                        <h4 className="text-sm font-medium text-gray-900">
                            {config.uploadedFilesTitle} ({files.length}/{config.maxFileCount})
                        </h4>
                        {canProcess && (
                            <button
                                type="button"
                                onClick={() => onFileProcess!(files)}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 min-h-[36px]"
                            >
                                {config.processButtonText}
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {files.map((file, index) => (
                            <div key={index} className="relative bg-white p-3 rounded border">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center flex-1 min-w-0 pr-2">
                                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        disabled={disabled || processing}
                                        className={`
                                            flex-shrink-0 p-2 text-red-400 hover:text-red-600 min-h-[40px] min-w-[40px] flex items-center justify-center
                                            ${disabled || processing ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
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
    );
};

export default FileUpload;

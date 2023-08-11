import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import React, { ChangeEvent } from 'react';

type UploadDocsAreaProps = {
    handleFileChange: (file: File | undefined, event: ChangeEvent<HTMLInputElement>) => void;
};
export const UploadDocsArea: React.FC<UploadDocsAreaProps> = ({ handleFileChange }) => {
    return (
        <div className="mt-1 sm:mt-0 sm:col-span-2">
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    <DocumentPlusIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <div className="inline text-sm text-gray-600">
                        {/* <FileInput onChange={handleFileChange} />
                        <a
                            onClick={openFileDialog}
                            className="relative font-medium text-indigo-600 bg-white rounded-md cursor-pointer hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                        >
                            <span>Upload a file</span>
                        </a> */}
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDFs only up to 10MB</p>
                </div>
            </div>
        </div>
    );
};

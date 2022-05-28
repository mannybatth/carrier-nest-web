import React from 'react';
import * as zip from '@zip.js/zip.js';
import { useEffect, useState } from 'react';
import Layout from '../../../components/layout/Layout';
import NerAnnotator from '../../../components/ner/NerAnnotator';
import { PageWithAuth } from '../../../interfaces/auth';
import {
    exportToJsonFile,
    readEntryBlob,
    readEntryText,
    readEntryUint8Array,
    unzipAllFiles,
} from '../../../lib/ner/utils';
import { AnnotatedDataItem, OcrDataItem } from '../../../interfaces/ner';

const NERPage: PageWithAuth = () => {
    const [allData, setAllData] = useState<AnnotatedDataItem[]>([]);
    const [filesList, setFilesList] = useState<zip.Entry[]>();
    const [ocrData, setOcrData] = useState<OcrDataItem[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState<number>();

    const [imageContent, setImageContent] = useState<Blob>();
    const [currentDataItem, setCurrentDataItem] = useState<AnnotatedDataItem>();

    // const [selectedEntity, setSelectedEntity] = useState(-1);
    // const [annotations, setAnnotations] = useState<Array<Annotation>>([]);
    // const [textMap, setTextMap] = useState<any>([]);

    useEffect(() => {
        if (filesList && filesList.length > 0) {
            const allData = filesList.map((entry) => {
                const fileName = entry.filename;
                return { words: [], width: 0, height: 0, image: fileName } as AnnotatedDataItem;
            });
            setAllData(allData);

            setCurrentFileIndex(0);
        }
    }, [filesList]);

    useEffect(() => {
        if (currentFileIndex === undefined || currentFileIndex < 0) {
            setImageContent(undefined);
            setCurrentDataItem(undefined);
            return;
        }

        async function readContent(entry: zip.Entry) {
            const content = await readEntryBlob(entry, 'image/jpeg');
            setImageContent(content);
        }

        setCurrentDataItem(allData[currentFileIndex]);

        if (filesList[currentFileIndex]) {
            readContent(filesList[currentFileIndex]);
        } else {
            setImageContent(undefined);
        }
    }, [currentFileIndex, allData]);

    const onPrevious = () => {
        if (!filesList) {
            return;
        }

        if (currentFileIndex > 0) {
            saveCurrentDataItem();
            setCurrentFileIndex(currentFileIndex - 1);
        }
    };

    const onNext = () => {
        if (!filesList) {
            return;
        }

        if (currentFileIndex < filesList.length - 1) {
            saveCurrentDataItem();
            setCurrentFileIndex(currentFileIndex + 1);
        }
    };

    const saveCurrentDataItem = () => {
        if (currentFileIndex && currentFileIndex > 0) {
            return;
        }

        allData[currentFileIndex] = currentDataItem;
        setAllData([...allData]);
    };

    const clearState = () => {
        setAllData([]);
        setFilesList([]);
        setCurrentFileIndex(-1);
        setImageContent(undefined);
        setCurrentDataItem(undefined);
    };

    const exportBtnClicked = () => {
        saveCurrentDataItem();
        exportToJsonFile(allData, 'data.json');
    };

    const processZipEntries = async (entries: zip.Entry[]) => {
        // get all jpegs
        const jpegs = entries.filter((entry) => entry.filename.endsWith('.jpg') || entry.filename.endsWith('.jpeg'));
        setFilesList(jpegs);

        // get data.json file
        const dataJson = entries.find((entry) => entry.filename.includes('data.json'));
        if (dataJson) {
            const data = await readEntryText(dataJson);
            setOcrData(JSON.parse(data));
        }
    };

    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">NER Annotator</h1>
                </div>
            }
        >
            <div className="h-screen max-w-full py-2 mx-auto text-white bg-[#182434]">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold ">NER Annotator</h1>

                        {imageContent && (
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 text-xs font-medium leading-4 text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-600"
                                    onClick={() => onPrevious()}
                                    disabled={currentFileIndex === 0}
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 text-xs font-medium leading-4 text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-600"
                                    onClick={() => onNext()}
                                    disabled={filesList && currentFileIndex === filesList.length - 1}
                                >
                                    Next
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 text-xs font-medium leading-4 text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-600"
                                    onClick={() => exportBtnClicked()}
                                >
                                    Export Data
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    {imageContent && (
                        <div className="flex">
                            <NerAnnotator
                                key={currentFileIndex}
                                data={imageContent}
                                ocrDataItem={ocrData[currentFileIndex]}
                                setCurrentDataItem={setCurrentDataItem}
                            ></NerAnnotator>
                        </div>
                    )}

                    {!imageContent && (
                        <div className="space-y-10">
                            <div>
                                <h3>Upload a zip file with images and ocr data</h3>
                                <input
                                    type="file"
                                    onChange={async (e) => {
                                        if (e.target?.files && e.target?.files.length > 0) {
                                            const file = e.target.files[0];
                                            const entries = await unzipAllFiles(file);
                                            processZipEntries(entries);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

NERPage.authenticationEnabled = true;

export default NERPage;

import React from 'react';
import * as zip from '@zip.js/zip.js';
import { useEffect, useState } from 'react';
import Layout from '../../../components/layout/Layout';
import NerAnnotator from '../../../components/ner/NerAnnotator';
import { PageWithAuth } from '../../../interfaces/auth';
import {
    convertToMLData,
    exportToJsonFile,
    readEntryBlob,
    readEntryText,
    revertBioTagging,
    unzipAllFiles,
} from '../../../lib/ner/utils';
import { entities, PageOcrData } from '../../../interfaces/ner';

const NERPage: PageWithAuth = () => {
    const [filesList, setFilesList] = useState<zip.Entry[]>();
    const [allData, setAllData] = useState<PageOcrData[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState<number>();

    const [imageContent, setImageContent] = useState<Blob>();
    const [currentPageOcrData, setCurrentPageOcrData] = useState<PageOcrData>();

    useEffect(() => {
        if (filesList && filesList.length > 0) {
            const allData = filesList.map((entry) => {
                const fileName = entry.filename;
                return { words: [], width: 0, height: 0, image: fileName } as PageOcrData;
            });
            setAllData(allData);

            setCurrentFileIndex(0);
        }
    }, [filesList]);

    useEffect(() => {
        if (currentFileIndex === undefined || currentFileIndex < 0) {
            setImageContent(undefined);
            setCurrentPageOcrData(undefined);
            return;
        }

        async function readContent(entry: zip.Entry) {
            const content = await readEntryBlob(entry, 'image/jpeg');
            setImageContent(content);
        }

        setCurrentPageOcrData(allData[currentFileIndex]);

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
            setCurrentFileIndex(currentFileIndex - 1);
        }
    };

    const onNext = () => {
        if (!filesList) {
            return;
        }

        if (currentFileIndex < filesList.length - 1) {
            setCurrentFileIndex(currentFileIndex + 1);
        }
    };

    const clearState = () => {
        setAllData([]);
        setFilesList([]);
        setCurrentFileIndex(-1);
        setImageContent(undefined);
        setCurrentPageOcrData(undefined);
    };

    const exportBtnClicked = () => {
        exportToJsonFile(
            convertToMLData({
                data: allData,
                labels: entities,
            }),
            'data.json',
        );
    };

    const processZipEntries = async (entries: zip.Entry[]) => {
        // get all jpegs
        const jpegs = entries.filter((entry) => entry.filename.endsWith('.jpg') || entry.filename.endsWith('.jpeg'));
        setFilesList(jpegs);

        let allPagesData: PageOcrData[] = [];

        // get data.json file
        const dataJson = entries.find((entry) => entry.filename.endsWith('data.json'));
        const ocrJson = entries.find((entry) => entry.filename.endsWith('ocr.json'));

        if (!dataJson && !ocrJson) {
            console.log('No data.json or ocr.json file found');
            return;
        }

        if (dataJson) {
            console.log('Found data.json file');
            const data = await readEntryText(dataJson);
            const raw = JSON.parse(data);
            const { untaggedData } = revertBioTagging(raw, entities);
            console.log('untaggedData', untaggedData);
            allPagesData = untaggedData;
        } else if (ocrJson) {
            console.log('Found ocr.json file');
            const data = await readEntryText(ocrJson);
            allPagesData = JSON.parse(data);
        }

        // Sort jpegs by content in dataJson
        jpegs.sort((a, b) => {
            const aIndex = allPagesData.findIndex((d) => a.filename.endsWith(d.image));
            const bIndex = allPagesData.findIndex((d) => b.filename.endsWith(d.image));
            return aIndex - bIndex;
        });

        setAllData(allPagesData);
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
                                ocrData={currentPageOcrData}
                                setPageOcrData={(data) => (allData[currentFileIndex] = data)}
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

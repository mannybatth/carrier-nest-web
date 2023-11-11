import { AILoad } from '../../interfaces/ai';
import { apiUrl, appUrl } from '../../constants';
import { calcPdfPageCount } from '../helpers/pdf';
import { addColonToTimeString, convertRateToNumber } from '../helpers/ratecon-vertex-helpers';

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

export class RateconImporter {
    public updateProgressCallback: (progress: number) => void;
    public onRetryStart: () => void;

    public readPdf(file: File): Promise<{
        metadata: any;
        totalPages: number;
        images: string[];
    }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = async () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const byteArray = new Uint8Array(arrayBuffer);
                const { totalPages, metadata: pdfMetaData, images } = await calcPdfPageCount(byteArray);
                resolve({
                    metadata: pdfMetaData,
                    totalPages: totalPages,
                    images: images,
                });
            };
        });
    }

    public async runOCR(file: File) {
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

        this.updateProgressCallback(5);
        const ocrResponse = await fetch(`${apiUrl}/ai/ocr`, {
            method: 'POST',
            body: JSON.stringify({
                file: base64File,
            }),
        });
        this.updateProgressCallback(10);

        const ocrResult = await ocrResponse.json();
        return ocrResult;
    }

    public processRateconFile = async (file: File, ocrResult: any, numOfPages: number, metadata: any) => {
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

        const aiLoad = await this._getAILoad(documentsInBlocks, documentsInLines, false);
        this._postProcessAILoad(aiLoad);
        return aiLoad;
    };

    private async _getAILoad(documentsInBlocks: any[], documentsInLines: any[], isRetry = false): Promise<AILoad> {
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

        let aiLoad: AILoad = null;
        const foundProperties = new Set<string>();
        let buffer = '';

        const processChunk = (chunk: string) => {
            // console.log('chunk', chunk);
            const progress = checkForProperties(chunk, foundProperties);
            // console.log('progress', progress);
            this.updateProgressCallback(10 + (progress || 0) * (90 / 100));
        };

        while (true) {
            const { value, done } = await streamReader.read();
            if (done) {
                this.updateProgressCallback(100);
                // console.log('AI response', buffer);
                aiLoad = JSON.parse(buffer);
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
            this.onRetryStart();
            this.updateProgressCallback(10);

            // Retry with line-by-line data
            return this._getAILoad(documentsInBlocks, documentsInLines, true);
        }

        return aiLoad;
    }

    private _postProcessAILoad(load: AILoad) {
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
    }
}

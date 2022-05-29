import * as zip from '@zip.js/zip.js';
import { Entity, PageOcrData, PageOcrDataWord } from '../../interfaces/ner';

export const unzipOnlyPDFs = async (zipFile: File): Promise<zip.Entry[]> => {
    const reader = new zip.ZipReader(new zip.BlobReader(zipFile));
    const entries = await reader.getEntries();
    return entries.filter((entry) => entry.filename.endsWith('.pdf') && !entry.filename.startsWith('__MACOSX'));
};

export const unzipAllFiles = async (zipFile: File): Promise<zip.Entry[]> => {
    const reader = new zip.ZipReader(new zip.BlobReader(zipFile));
    const entries = await reader.getEntries();
    return entries.filter((entry) => !entry.filename.startsWith('__MACOSX'));
};

export const readEntryUint8Array = async (entry: zip.Entry): Promise<Uint8Array> => {
    const array = await entry.getData(new zip.Uint8ArrayWriter());
    return array;
};

export const readEntryBlob = async (entry: zip.Entry, type: string): Promise<Blob> => {
    const blob = await entry.getData(new zip.BlobWriter(type));
    return blob;
};

export const readEntryText = async (entry: zip.Entry): Promise<string> => {
    const text = await entry.getData(new zip.TextWriter());
    return text;
};

export const getFileContentFromFileReader = (file: File): Promise<string | ArrayBuffer | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsText(file);
    });
};

export const exportToJsonFile = (data: any, filename: string): void => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const convertToMLData = (raw: { data: PageOcrData[]; labels: Entity[] }) => {
    const bioLabels: Entity[] = [
        {
            id: 0,
            name: 'O',
            color: 'gray',
        },
    ];

    // Append standard NLP BIO tags to labels
    raw.labels.forEach((label) => {
        // Append B Tag
        bioLabels.push({
            id: bioLabels.length,
            name: `B-${label.name}`,
            color: label.color,
        });

        // Append I Tag
        bioLabels.push({
            id: bioLabels.length,
            name: `I-${label.name}`,
            color: label.color,
        });
    });

    // Iterate over all pages and add BIO tags to each word
    const bioTagData = raw.data.map((page) => {
        let prevTagId = 0;
        const taggedWords = page.words.map((word) => {
            const wordTagId = word.tagId || 0;
            const rawLabel = raw.labels.find((label) => label.id === wordTagId);
            let tag = 'O';

            if (wordTagId !== 0 && prevTagId === 0) {
                tag = 'B';
            } else if (prevTagId !== 0 && prevTagId === wordTagId) {
                tag = 'I';
            } else if (prevTagId !== 0 && prevTagId !== wordTagId) {
                tag = 'B';
            }
            prevTagId = wordTagId;

            if (wordTagId !== 0 && !rawLabel) {
                console.error(`Could not find label with id ${wordTagId}`);
                throw new Error(`Could not find label with id ${wordTagId}`);
            }

            // Find tag id
            const tagId =
                wordTagId !== 0 ? bioLabels.findIndex((label) => label.name === `${tag}-${rawLabel.name}`) : 0;

            return {
                ...word,
                tagId,
            };
        });

        return {
            words: taggedWords,
            image: page.image,
            height: page.height,
            width: page.width,
        };
    });

    return {
        data: bioTagData,
        labels: bioLabels,
    };
};

export const revertBioTagging = (
    {
        data: bioTaggedData,
        labels: bioLabels,
    }: {
        data: PageOcrData[];
        labels: Entity[];
    },
    entities: Entity[],
): { untaggedData: PageOcrData[] } => {
    const untaggedData = bioTaggedData.map((page) => {
        const untaggedWords = page.words.map((word) => {
            if (!word.tagId || word.tagId === 0) {
                return word;
            }

            const rawBioLabel = bioLabels.find((label) => label.id === word.tagId);
            if (!rawBioLabel) {
                console.error(`Could not find label with id ${word.tagId}`);
                throw new Error(`Could not find label with id ${word.tagId}`);
            }

            // Remove tag from bio label name
            const labelName = rawBioLabel.name.replace(/^[BI]\-/, '');
            const label = entities.find((entity) => entity.name === labelName);

            return {
                ...word,
                tagId: label ? label.id : 0,
            };
        });

        return {
            words: untaggedWords,
            image: page.image,
            height: page.height,
            width: page.width,
        };
    });

    return {
        untaggedData,
    };
};

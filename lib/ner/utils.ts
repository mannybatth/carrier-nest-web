import * as zip from '@zip.js/zip.js';

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

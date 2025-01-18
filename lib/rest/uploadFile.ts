import { apiUrl } from '../constants';

export const uploadFileToGCS = async (
    file: File,
): Promise<{ gcsInputUri: string; uniqueFileName: string; originalFileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiUrl}/upload-gcs`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error || 'Failed to upload file');
    }

    const result: { gcsInputUri: string; uniqueFileName: string; originalFileName: string } = await response.json();
    return result;
};

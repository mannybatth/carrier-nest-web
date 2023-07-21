import { apiUrl } from '../../constants';

export const uploadFileToGCS = async (file: File): Promise<{ gcsInputUri: string; uniqueFileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiUrl}/upload-gcs`, {
        method: 'POST',
        body: formData,
    });

    const result: { gcsInputUri: string; uniqueFileName: string } = await response.json();
    return result;
};

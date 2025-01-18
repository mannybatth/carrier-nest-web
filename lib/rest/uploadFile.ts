import { apiUrl } from '../constants';

export const uploadFileToGCS = async (
    file: File,
    driverId?: string,
    assignmentId?: string,
): Promise<{ gcsInputUri: string; uniqueFileName: string; originalFileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const searchParams = new URLSearchParams();
    if (driverId) {
        searchParams.set('did', driverId);
    }
    if (assignmentId) {
        searchParams.set('aid', assignmentId);
    }

    const url = `${apiUrl}/upload-gcs` + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    const response = await fetch(url, {
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

import { LoadDocument } from '@prisma/client';

/**
 * Check if a LoadDocument is a BOL document based on the database relation
 */
export function isBOLDocument(document: LoadDocument): boolean {
    return (document as any).loadIdForBolDoc !== null && (document as any).loadIdForBolDoc !== undefined;
}

/**
 * Check if a LoadDocument is a POD document based on the database relation
 */
export function isPODDocument(document: LoadDocument): boolean {
    return document.loadIdForPodDoc !== null && document.loadIdForPodDoc !== undefined;
}

/**
 * Check if a LoadDocument is a Rate Confirmation document based on the database relation
 */
export function isRateconDocument(document: LoadDocument): boolean {
    return document.loadIdForRatecon !== null && document.loadIdForRatecon !== undefined;
}

/**
 * Get the document type based on its relation in the database
 */
export function getDocumentType(document: LoadDocument): 'BOL' | 'POD' | 'RATECON' | 'GENERAL' {
    if (isBOLDocument(document)) return 'BOL';
    if (isPODDocument(document)) return 'POD';
    if (isRateconDocument(document)) return 'RATECON';
    return 'GENERAL';
}

/**
 * Check if a document is a BOL by filename pattern (for upload validation)
 */
export function isBOLByFilename(fileName: string): boolean {
    if (!fileName) return false;

    const normalizedName = fileName.toLowerCase();
    const bolPatterns = ['bol', 'bill_of_lading', 'bill-of-lading', 'billoflading', 'bill of lading', 'lading'];

    return bolPatterns.some((pattern) => normalizedName.includes(pattern));
}

/**
 * Check if a document is a POD by filename pattern (for upload validation)
 */
export function isPODByFilename(fileName: string): boolean {
    if (!fileName) return false;

    const normalizedName = fileName.toLowerCase();
    const podPatterns = ['pod', 'proof_of_delivery', 'proof-of-delivery', 'proofofdelivery', 'proof of delivery'];

    return podPatterns.some((pattern) => normalizedName.includes(pattern));
}

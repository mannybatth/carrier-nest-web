import { Session } from 'next-auth';

export type DocumentType = 'POD' | 'BOL' | 'RATECON' | 'DOCUMENT';

/**
 * Generates a standardized filename for uploaded documents
 * Format: DocumentType-username-timestamp.extension
 *
 * Examples:
 * - POD-johndoe-20250723-143025.pdf
 * - BOL-janesmith-20250723-143026.jpg
 * - RATECON-unknown-20250723-143027.pdf
 * - DOCUMENT-bobwilson-20250723-143028.docx
 *
 * @param originalFile - The original file being uploaded
 * @param documentType - The type of document (POD, BOL, RATECON, DOCUMENT)
 * @param session - The user session data (optional)
 * @returns Standardized filename string
 */
export const generateStandardizedFileName = (
    originalFile: File,
    documentType: DocumentType = 'DOCUMENT',
    session?: Session | null,
): string => {
    // Get file extension
    const fileExtension = originalFile.name.split('.').pop() || 'pdf';

    // Get username from session and sanitize it
    let username = 'unknown';
    if (session?.user?.name) {
        username = session.user.name.replace(/\s+/g, '').toLowerCase();
    } else if (session?.user?.email) {
        // Fallback to email username if name is not available
        username = session.user.email.split('@')[0].replace(/\s+/g, '').toLowerCase();
    }

    // Generate timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    // Generate standardized filename: DocumentType-username-timestamp.extension
    return `${documentType}-${username}-${timestamp}.${fileExtension}`;
};

/**
 * Generates a standardized filename for expense documents
 * Format: expense-{category}-datewithtimewithsecond.extension
 *
 * Examples:
 * - expense-fuel-20250815-143025.pdf
 * - expense-lodging-20250815-143026.jpg
 * - expense-meals-20250815-143027.pdf
 *
 * @param originalFile - The original file being uploaded
 * @param categoryName - The expense category name
 * @returns Standardized filename string
 */
export const generateExpenseFileName = (originalFile: File, categoryName: string): string => {
    // Get file extension
    const fileExtension = originalFile.name.split('.').pop() || 'pdf';

    // Sanitize category name (lowercase, remove spaces and special characters)
    const sanitizedCategory = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
        .substring(0, 20); // Limit to 20 characters

    // Generate timestamp with seconds
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    // Generate expense filename: expense-{category}-datewithtimewithsecond.extension
    return `expense-${sanitizedCategory}-${timestamp}.${fileExtension}`;
};

/**
 * Sanitizes a username by removing spaces and converting to lowercase
 *
 * @param name - The original name/username
 * @returns Sanitized username
 */
export const sanitizeUsername = (name: string): string => {
    return name.replace(/\s+/g, '').toLowerCase();
};

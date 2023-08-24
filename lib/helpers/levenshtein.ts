// import { Searcher } from 'fast-fuzzy';

function cleanString(str) {
    // Remove non-alphanumeric characters and extra spaces
    return str
        .replace(/[^a-zA-Z0-9\s]+/g, '')
        .trim()
        .toLowerCase();
}

export function fuzzySearch(query, customers) {
    const normalizedQuery = cleanString(query);

    // First, try partial matching
    for (let i = 0; i < customers.length; i++) {
        const normalizedCustomer = cleanString(customers[i]);
        if (normalizedCustomer.includes(normalizedQuery)) {
            return i;
        }
    }

    // Weighted token-based matching
    let bestMatchIndex = -1;
    let minWeightedDistance = Infinity;

    const queryTokens = normalizedQuery.split(' ');

    for (let i = 0; i < customers.length; i++) {
        const normalizedCustomer = cleanString(customers[i]);

        let weightedDistance = 0;
        for (const token of queryTokens) {
            const distance = levenshtein(token, normalizedCustomer);
            weightedDistance += distance / (token.length + 1);
        }

        if (weightedDistance < minWeightedDistance) {
            minWeightedDistance = weightedDistance;
            bestMatchIndex = i;
        }
    }

    // Use a dynamic threshold based on the number of tokens in the query
    const threshold = queryTokens.length * 0.6; // Adjusted threshold
    if (minWeightedDistance > threshold) {
        return -1;
    }

    return bestMatchIndex;
}

function levenshtein(str1, str2) {
    // If either string is empty, return the length of the other string
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Substitution
                    matrix[i][j - 1] + 1, // Insertion
                    matrix[i - 1][j] + 1, // Deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

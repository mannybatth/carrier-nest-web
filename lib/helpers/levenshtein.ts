function cleanString(str: string) {
    // Remove non-alphanumeric characters and extra spaces
    return str
        .replace(/[^a-zA-Z0-9\s]+/g, '')
        .trim()
        .toLowerCase();
}

function calculateThreshold(queryLength: number) {
    const base = 0.6;
    const lengthAdjustment = queryLength < 5 ? -0.2 : -0.01; // Tightening the threshold further
    return base + lengthAdjustment * queryLength;
}

export function fuzzySearch(query: string, searchList: string[]) {
    const normalizedQuery = cleanString(query);

    // Step 1: Check for substring matches
    for (let i = 0; i < searchList.length; i++) {
        const normalizedCustomer = cleanString(searchList[i]);
        if (normalizedCustomer.includes(normalizedQuery) || normalizedQuery.includes(normalizedCustomer)) {
            return i;
        }
    }

    // Step 2: Weighted token-based matching
    let bestMatchIndex = -1;
    let minWeightedDistance = Infinity;

    const queryTokens = normalizedQuery.split(' ');

    for (let i = 0; i < searchList.length; i++) {
        const normalizedCustomer = cleanString(searchList[i]);
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

    const threshold = calculateThreshold(normalizedQuery.length);
    if (minWeightedDistance > threshold) {
        return -1;
    }

    return bestMatchIndex;
}

function levenshtein(str1: string, str2: string) {
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

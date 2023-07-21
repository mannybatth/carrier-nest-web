import { Searcher } from 'fast-fuzzy';

export function fuzzySearch(query: string, list: string[]): number {
    // Clean the query
    const cleanedQuery = cleanQuery(query);

    // Clean the list
    const cleanedList = list.map((item) => cleanQuery(item));

    // Do the search
    const searcher = new Searcher(cleanedList);
    const bestMatch = searcher.search(cleanedQuery)[0];

    // Return the index of the best match in the original list
    return cleanedList.indexOf(bestMatch);
}

function cleanQuery(query: string): string {
    // Define the unwanted words
    const unwantedWords = ['logistics', 'transport', 'llc', ',', '.'];

    // Remove unwanted characters
    query = query.replace(/[,.]/g, '');

    // Split the query into words
    let words = query.split(' ');

    // Remove unwanted words
    words = words.filter((word) => !unwantedWords.includes(word.toLowerCase()));

    // Join the words back together into a string
    return words.join(' ');
}

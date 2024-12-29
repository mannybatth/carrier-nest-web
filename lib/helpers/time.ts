// Convert seconds to readable format length. For example, 60 seconds should be converted to "1 minute", 3600 seconds should be converted to "1 hour". Max length is hrs. Allow for 1 decimal place.
export const secondsToReadable = (seconds: number) => {
    if (seconds < 60) {
        return `${seconds} sec`;
    }

    if (seconds < 60 * 60) {
        return `${(seconds / 60).toFixed(1)} min`;
    }

    return `${(seconds / 60 / 60).toFixed(2)} hrs`;
};

export const sanitize = (str: string) => {
    return str
        .toString() // Convert to string
        .toLowerCase() // Convert to lowercase
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w-]+/g, '') // Remove all non-word characters except for dash
        .replace(/\.+/g, ''); // Remove all dots
};

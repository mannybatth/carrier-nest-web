export const sanitize = (str: string) => {
    return str
        .toString() // Convert to string
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w-\s]+/g, '') // Remove all non-word characters except for dash
        .replace(/\.+/g, ''); // Remove all dots
};

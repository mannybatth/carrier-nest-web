export const sanitize = (str: string) => {
    return str
        .toString() // Convert to string
        .toLowerCase() // Convert to lowercase
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w.-]+/g, '') // Remove all non-word characters except for dot and dash
        .replace(/\.+/g, '.'); // Replace multiple dots with a single dot
};

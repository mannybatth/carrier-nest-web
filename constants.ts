export const appUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000' // development api
        : process.env.NEXT_PUBLIC_VERCEL_URL;
export const apiUrl = `${appUrl}/api`;
export const pythonApiUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001' // development api
        : process.env.PYTHON_API_URL; // production api

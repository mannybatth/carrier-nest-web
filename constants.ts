export const apiUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api' // development api
        : process.env.NEXT_PUBLIC_VERCEL_URL + '/api'; // production api
export const pythonApiUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001' // development api
        : process.env.PYTHON_API_URL; // production api

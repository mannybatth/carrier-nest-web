// Use localhost for development and url from browser for production
export const VERCEL_URL = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;

export const apiUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api' // development api
        : VERCEL_URL + '/api'; // production api

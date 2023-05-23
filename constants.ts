export const apiUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api' // development api
        : 'https://' + process.env.NEXT_PUBLIC_VERCEL_URL + '/api'; // production api

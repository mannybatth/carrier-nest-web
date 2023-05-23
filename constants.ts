// Use localhost for development and url from browser for production
export const apiUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api' // development api
        : window.location.origin + '/api'; // production api

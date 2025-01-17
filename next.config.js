module.exports = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'api.mapbox.com',
                port: '',
                pathname: '/styles/**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/.well-known/apple-app-site-association',
                destination: '/.well-known/apple-app-site-association.json',
            },
        ];
    },
    async redirects() {
        return [
            {
                // /api/assignment/for-driver -> /api/assignments/for-driver
                source: '/api/assignment/for-driver',
                destination: '/api/assignments/for-driver',
                permanent: true,
            },
            {
                // /api/assignment/:id -> /api/assignments/:id
                source: '/api/assignment/:id',
                destination: '/api/assignments/:id',
                permanent: true,
            },
        ];
    },
};

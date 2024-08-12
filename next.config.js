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
                source: '/apple-app-site-association',
                destination: '/apple-app-site-association.json',
            },
        ];
    },
};

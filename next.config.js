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
};

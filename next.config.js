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
};

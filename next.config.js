module.exports = {
    images: {
        unoptimized: true,
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

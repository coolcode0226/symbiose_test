module.exports = {
    async rewrites() {
        return [
            {
                source: '/geoserver/:path*',
                destination: 'http://janazapro.com:8080/geoserver/:path*',
            },
        ]
    },
}
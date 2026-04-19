/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zzqylewczbtqkltvxbut.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@libsql/client', '@libsql/client/web'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
           { key: 'Content-Security-Policy', value: "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src 'self' https://js.stripe.com https://checkout.stripe.com;" },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      if (!Array.isArray(config.externals)) {
        config.externals = config.externals ? [config.externals] : []
      }
      config.externals.unshift(function (ctx, callback) {
        if (ctx.request?.startsWith('@libsql/')) {
          return callback(null, 'commonjs ' + ctx.request)
        }
        callback()
      })
      config.externals.push('sharp')
    }
    return config
  },
}

export default nextConfig

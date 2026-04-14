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
  webpack: (config, { isServer }) => {
    if (isServer) {
      if (!Array.isArray(config.externals)) {
        config.externals = config.externals ? [config.externals] : []
      }
      // Force @libsql packages to CommonJS externals so webpack emits require()
      // instead of import() (which returns a Promise and breaks synchronous code).
      config.externals.unshift(function (ctx, callback) {
        if (ctx.request?.startsWith('@libsql/')) {
          return callback(null, 'commonjs ' + ctx.request)
        }
        callback()
      })
      // sharp uses native C++ bindings — exclude from bundle
      config.externals.push('sharp')
    }
    return config
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
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

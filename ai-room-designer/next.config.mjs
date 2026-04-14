/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@libsql/client', '@libsql/client/web'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // sharp uses native C++ bindings — exclude from webpack bundle
      config.externals = [...(Array.isArray(config.externals) ? config.externals : [config.externals ?? []]), 'sharp']
    }
    return config
  },
}

export default nextConfig

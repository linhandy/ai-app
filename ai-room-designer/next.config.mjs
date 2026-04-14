/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@libsql/client', 'sharp'],
  },
}

export default nextConfig

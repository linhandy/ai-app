import fs from 'fs'
fs.mkdirSync('/tmp/uploads', { recursive: true })

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

export default nextConfig

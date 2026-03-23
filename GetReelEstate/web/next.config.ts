import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/get-reelestate',
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static', 'msedge-tts'],
};

export default nextConfig;

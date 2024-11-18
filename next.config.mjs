/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;

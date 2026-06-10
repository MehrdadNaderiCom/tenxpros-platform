/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Application form accepts a resume PDF up to 5 MB; allow headroom.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;

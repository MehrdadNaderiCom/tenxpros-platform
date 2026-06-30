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
    // MJML compiles newsletter HTML server-side and uses dynamic requires, so keep
    // it external (required at runtime from node_modules) rather than bundled.
    serverComponentsExternalPackages: ["mjml"],
  },
};

export default nextConfig;

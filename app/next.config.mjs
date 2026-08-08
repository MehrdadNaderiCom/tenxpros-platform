/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The container runs `next start` off the full build tree (full node_modules are
  // copied), so the standalone output bundle is not used. Leaving output:standalone
  // set only prints a boot warning, so it is omitted.
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Permissions-Policy",
            value:
              'accelerometer=(), autoplay=(self), camera=(), clipboard-read=(), clipboard-write=(self), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(self), publickey-credentials-get=(self), usb=(), fullscreen=(self "https://www.youtube-nocookie.com" "https://player.vimeo.com" "https://www.loom.com" "https://docs.google.com" "https://drive.google.com"), picture-in-picture=(self "https://www.youtube-nocookie.com" "https://player.vimeo.com" "https://www.loom.com")',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

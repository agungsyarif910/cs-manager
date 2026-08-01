/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Fix pdfjs-dist "canvas" module not found
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;

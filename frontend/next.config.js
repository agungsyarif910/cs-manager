const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Fix pdfjs-dist "canvas" module not found in browser builds
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Completely ignore the canvas module to prevent webpack resolution errors
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^canvas$/,
      })
    );

    return config;
  },
};

module.exports = nextConfig;

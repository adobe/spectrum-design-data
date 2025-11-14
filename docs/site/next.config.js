// next.config.js
const isProd = process.env.NODE_ENV === "production";

module.exports = {
  output: "export",
  assetPrefix: isProd ? "/spectrum-tokens/" : "",
  basePath: isProd ? "/spectrum-tokens" : "",
  images: {
    unoptimized: true,
  },
  distDir: "../../site/",
  transpilePackages: ["@adobe/spectrum-component-api-schemas"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-side packages in client-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        glob: false,
      };
    }
    return config;
  },
};

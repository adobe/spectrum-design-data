// next.config.js
const isProd = process.env.NODE_ENV === "production";

module.exports = {
  assetPrefix: isProd ? "/spectrum-tokens/" : "",
  basePath: isProd ? "/spectrum-tokens" : "",
  images: {
    unoptimized: true,
  },
};

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        (warning) =>
          warning.module &&
          warning.module.resource &&
          warning.module.resource.includes("@zxing/browser"),
      ];

      return webpackConfig;
    },
  },
};

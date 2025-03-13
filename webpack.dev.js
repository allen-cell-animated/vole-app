const { merge } = require("webpack-merge");
const common = require("./webpack.common");

// NOTE: webpack.dev.js is currently used in our deployments across multiple platforms
// (S3, GitHub Pages, etc.). Please be cautious when making changes to this file.

module.exports = (env) => {
  return merge(common(env), {
    mode: env.env === "production" ? "production" : "development",
    devtool: env.env === "production" ? "source-map" : "eval-source-map",
    devServer: {
      // Allows the dev server to handle routes
      historyApiFallback: true,
      open: ["/"],
      port: 9020,
      allowedHosts: "all",
      static: [
        {
          staticOptions: {
            dotfiles: "allow",
          },
        },
      ],
    },
    performance: {
      assetFilter: function (assetFilename) {
        return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
      },
      maxEntrypointSize: 3512000,
      maxAssetSize: 3512000,
    },
    plugins: [],
  });
};

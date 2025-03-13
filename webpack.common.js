const path = require("path");
const webpack = require("webpack");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env) => {
  return {
    entry: { index: "./public/index.tsx", reroute: "./public/gh-reroute/index.tsx" },
    output: {
      path: path.resolve(__dirname, "imageviewer"),
      filename: "[name].bundle.js",
      publicPath: env.basename,
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: "./public/index.html",
        chunks: ["index"],
      }),
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        filename: "404.html",
        template: "./public/gh-reroute/404.html",
        chunks: ["reroute"],
        inject: "head",
        scriptLoading: "blocking",
      }),
      new MiniCssExtractPlugin(),
      new webpack.DefinePlugin({
        VOLEAPP_VERSION: JSON.stringify(require("./package.json").version),
        VOLECORE_VERSION: JSON.stringify(require("./node_modules/@aics/vole-core/package.json").version),
        VOLEAPP_BUILD_ENVIRONMENT: JSON.stringify(env.env),
        VOLEAPP_BASENAME: JSON.stringify(env.basename),
      }),
      new CopyWebpackPlugin({ patterns: ["./.nojekyll"] }),
      new webpack.ProvidePlugin({
        THREE: "three",
        jQuery: "jquery",
        $: "jquery",
      }),
    ],
    module: {
      rules: [
        {
          loader: "babel-loader",
          exclude: /node_modules/,
          test: /\.(js|jsx|ts|tsx|svg)$/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
        },
        {
          test: /\.(woff|woff2|tff|eot|glyph|mp4)$/,
          type: "asset/resource",
        },
      ],
    },
  };
};

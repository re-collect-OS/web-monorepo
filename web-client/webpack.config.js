const webpack = require("webpack");
const path = require("path");
var fs = require("fs");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

const babelConfig = require("./.babelrc.js");

var includePaths = [
  path.join(__dirname, "src"),
  path.join(path.dirname(require.resolve("web-shared-lib/package.json")), "src"),
  path.join(path.dirname(require.resolve("js-shared-lib/package.json")), "src"),
].filter(Boolean);

const config = ({ isEnvProduction, isEnvDevelopment, isDevServer }) => ({
  entry: {
    index: path.join(__dirname, "src/index.js"),
  },
  output: {
    publicPath: "/",
    path: path.join(__dirname, "build"),
    filename: isEnvProduction ? "[name].[chunkhash:8].js" : "[name].js",
    uniqueName: "re-collect",
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        loader: "babel-loader",
        options: babelConfig,
        include: includePaths,
        exclude: /node_modules/,
      },
      {
        test: /\.ts(x)?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          { 
            loader: "style-loader",
            options: {
              attributes: {
                nonce: "5d21df1a5df1636381eef261f49244e9",
              },
            },
          },
          { loader: "css-loader" },
        ],
        exclude: /\.module\.css$/,
      },
      {
        test: /\.css$/,
        use: [
          { 
            loader: "style-loader",
            options: {
              attributes: {
                nonce: "5d21df1a5df1636381eef261f49244e9",
              },
            },
          },
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: "[local]--[hash:base64:5]",
              },
            },
          },
        ],
        include: /\.module\.css$/,
      },
      {
        test: /\.svg$/,
        use: "file-loader",
      },
      {
        test: /\.(woff(2)?|ttf)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/",
            },
          },
        ],
      },
      {
        test: /\.png$/,
        use: [
          {
            loader: "file-loader",
            options: {
              mimetype: "image/png",
            },
          },
        ],
      },
      {
        test: /\.gif$/,
        use: [
          {
            loader: "file-loader",
            options: {
              mimetype: "image/gif",
            },
          },
        ],
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".tsx", ".ts"],
    modules: ["node_modules"],
    alias: {
      // https://penx.medium.com/managing-dependencies-in-a-node-package-so-that-they-are-compatible-with-npm-link-61befa5aaca7
      react: path.resolve("./node_modules/react"),
      "react-dom": isEnvProduction
        ? path.resolve("./node_modules/react-dom")
        : path.resolve("./node_modules/@hot-loader/react-dom"),
    },
  },
  devServer: {
    port: process.env.DEV_SERVER_PORT || 3000,
    historyApiFallback: true,
    hot: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "public",
          to: ".",
          globOptions: {
            ignore: ["**/index.html"],
          },
        },
      ],
    }),
    new webpack.EnvironmentPlugin({
      APP_ANALYTICS_ENABLED: false,
      APP_VERSION: require("./package.json").version,
      APP_ENV_DEVELOPMENT: isEnvDevelopment,
      APP_ENV_PRODUCTION: isEnvProduction,
      APP_STAGE: "dev",
      LOCAL_COGNITO_APP_CLIENT_ID: process.env.LOCAL_COGNITO_APP_CLIENT_ID,
      LOCAL_COGNITO_USERPOOL_ID: process.env.LOCAL_COGNITO_USERPOOL_ID,
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new ESLintPlugin({
      extensions: ["js"],
    }),
    sentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "recollect-j0",
      project: "recollect-web-client",
      telemetry: false,
      disable: isEnvDevelopment,
    }),
  ],
  devtool: isEnvProduction ? "source-map" : "inline-cheap-module-source-map",
  mode: isEnvProduction ? "production" : "development",
});

module.exports = (env, argv) => {
  const isEnvProduction = argv.mode === "production";
  const isEnvDevelopment = argv.mode === "development";
  const isDevServer = isEnvDevelopment && process.argv.includes("serve");

  console.log("Starting webpack build", { isEnvProduction, isEnvDevelopment, isDevServer });

  return config({ isEnvProduction, isEnvDevelopment, isDevServer });
};

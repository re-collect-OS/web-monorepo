const webpack = require("webpack");
const path = require("path");
var fs = require("fs");
const CopyPlugin = require("copy-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const exec = require("child_process").exec;
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

const babelConfig = require("./.babelrc.js");

// Note: We make distinction between dev and non-dev extension builds so they
// may co-exist at the same time
const APP_STYLES_CONTAINER_ID = "_recollect_extension_styles";
const APP_DEV_STYLES_CONTAINER_ID = "_recollect_dev_extension_styles";

var includePaths = [
  path.join(__dirname, "src"),
  path.join(path.dirname(require.resolve("web-shared-lib/package.json")), "src"),
  path.join(path.dirname(require.resolve("js-shared-lib/package.json")), "src"),
].filter(Boolean);

const config = ({ isEnvProduction, isEnvDevelopment, isDevExtension, isDevServer }) => ({
  entry: {
    content: path.join(__dirname, "src/content.js"),
    background: path.join(__dirname, "src/background.js"),
  },
  output: { path: path.join(__dirname, "dist"), filename: "[name].js", publicPath: "" },
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
              injectType: "singletonStyleTag",
              attributes: { id: "id" },
              // Do not forget that this code will be used in the browser and
              // not all browsers support latest ECMA features like `let`, `const`, `arrow function expression` and etc
              // Note: the output of this code gets serialized and injected into the page
              // which is why this code is duplicated and we're not using the global variables
              // as they won't exist at call time!
              insert: isDevExtension
                ? function (element) {
                    var hostId = "_recollect_dev_extension_styles";
                    var hostElement = document.getElementById(hostId);
                    if (!hostElement) {
                      hostElement = document.createElement("div");
                      hostElement.id = hostId;
                      document.body.append(hostElement);
                    }
                    hostElement.appendChild(element);
                  }
                : function (element) {
                    var hostId = "_recollect_extension_styles";
                    var hostElement = document.getElementById(hostId);
                    if (!hostElement) {
                      hostElement = document.createElement("div");
                      hostElement.id = hostId;
                      document.body.append(hostElement);
                    }
                    hostElement.appendChild(element);
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
        test: /\.css$/,
        use: ["to-string-loader", "css-loader"],
        exclude: /\.module\.css$/,
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
            loader: "url-loader",
            options: {
              mimetype: "image/png",
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
      react: path.resolve("./node_modules/react"),
      "react-dom": path.resolve("./node_modules/@hot-loader/react-dom"),
    },
  },
  devServer: {
    contentBase: "./dist",
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public", to: "." }],
    }),
    new webpack.EnvironmentPlugin({
      APP_ANALYTICS_ENABLED: false,
      APP_VERSION: JSON.stringify(require("./package.json").version),
      APP_ENV_DEVELOPMENT: isEnvDevelopment,
      APP_ENV_PRODUCTION: isEnvProduction,
      APP_STAGE: "dev",
      APP_IS_DEV_EXTENSION: isDevExtension,
      APP_STYLES_CONTAINER_ID: isDevExtension ? APP_DEV_STYLES_CONTAINER_ID : APP_STYLES_CONTAINER_ID,
      LOCAL_COGNITO_APP_CLIENT_ID: process.env.LOCAL_COGNITO_APP_CLIENT_ID,
      LOCAL_COGNITO_USERPOOL_ID: process.env.LOCAL_COGNITO_USERPOOL_ID,
    }),
    new ESLintPlugin({
      extensions: ["js"],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("AfterEmitPlugin", (compilation) => {
          exec("./scripts/post_build", (err, stdout, stderr) => {
            if (stdout) process.stdout.write(stdout);
            if (stderr) process.stderr.write(stderr);
          });
        });
      },
    },
    sentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "recollect-j0",
      project: "recollect-chrome-extension",
      telemetry: false,
      disable: isEnvDevelopment,
    }),
  ],
  devtool: isEnvProduction ? "source-map" : "inline-cheap-module-source-map",
});

module.exports = (env, argv) => {
  const isEnvProduction = argv.mode === "production";
  const isEnvDevelopment = argv.mode === "development";
  const isDevServer = isEnvDevelopment && process.argv.includes("--watch");
  const isDevExtension = !!env.isDevExtension;
  const opts = { isEnvProduction, isEnvDevelopment, isDevExtension, isDevServer };

  console.log("Starting webpack build", opts);
  return config(opts);
};

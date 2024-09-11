/* global process */

export const APP_STAGE = process.env.APP_STAGE;
export const APP_VERSION = process.env.APP_VERSION;
export const APP_ENV_DEVELOPMENT = process.env.APP_ENV_DEVELOPMENT;
const urlParams = new URLSearchParams(window.location.search);
export const DEBUG = APP_ENV_DEVELOPMENT || urlParams.has("debug");
export const ANALYTICS_ENABLED = process.env.APP_ANALYTICS_ENABLED;
export const MIN_PASSWORD_LENGTH = 8;
export const CANVAS_GRID_SIZE = 8;
export const HELP_GUIDE_URL =
  "https://re-collect.notion.site/re-collect-help-and-support-guide-acb140d8b0fa42ddbbe21d96fa3bfa75";
export const DEFAULT_EDITOR_LAYOUT = "play";
export const SENTRY_DSN = "https://f91317522c454e6cb418f6e3d28d7f50@o1335587.ingest.sentry.io/4505527017996288";
export const MAC_DOWNLOAD_URL = "https://re-collect.ai/download/mac/re-collect.dmg";

import { baseDevConfig, baseProdConfig, baseDemoConfig, baseWipConfig, baseLocalConfig } from "js-shared-lib";

const dev = {
  ...baseDevConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://dev.app.re-collect.ai",
  TWITTER_CLIENT_ID: "eE5OcTd5d0N6cWlBQkRDc1hPOGY6MTpjaQ",
};
const prod = {
  ...baseProdConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://app.re-collect.ai",
  TWITTER_CLIENT_ID: "TVYwTUZ3cGtSSE5DakRNYkdCT2Q6MTpjaQ",
};
const demo = {
  ...baseDemoConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://demo.app.re-collect.ai",
  TWITTER_CLIENT_ID: "TVYwTUZ3cGtSSE5DakRNYkdCT2Q6MTpjaQ",
};
const wip = {
  ...baseWipConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://wip.app.re-collect.ai",
  TWITTER_CLIENT_ID: "eE5OcTd5d0N6cWlBQkRDc1hPOGY6MTpjaQ",
};
const local = {
  ...baseLocalConfig,
  APP_URL: "http://localhost:3000",
  TWITTER_CLIENT_ID: "eE5OcTd5d0N6cWlBQkRDc1hPOGY6MTpjaQ",
};

const config = (() => {
  switch (APP_STAGE) {
    case "prod":
      return prod;
    case "demo":
      return demo;
    case "wip":
      return wip;
    case "local":
      return local;
    default:
      return dev;
  }
})();

export default config;

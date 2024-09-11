export const APP_STAGE = process.env.APP_STAGE;
export const APP_VERSION = JSON.parse(process.env.APP_VERSION);
export const APP_ENV_DEVELOPMENT = process.env.APP_ENV_DEVELOPMENT;
export const ANALYTICS_ENABLED = process.env.APP_ANALYTICS_ENABLED;
export const DEBUG = APP_ENV_DEVELOPMENT || !ANALYTICS_ENABLED;
export const APP_STYLES_CONTAINER_ID = process.env.APP_STYLES_CONTAINER_ID;
export const APP_IS_DEV_EXTENSION = process.env.APP_IS_DEV_EXTENSION;
export const SENTRY_DSN = "https://b349c2e11dd9471d9206b4bef96e4cba@o1335587.ingest.sentry.io/4505522128289792";

import { baseDevConfig, baseProdConfig, baseDemoConfig, baseWipConfig, baseLocalConfig } from "js-shared-lib";

const dev = {
  ...baseDevConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://dev.app.re-collect.ai",
};
const prod = {
  ...baseProdConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://app.re-collect.ai",
};
const demo = {
  ...baseDemoConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://demo.app.re-collect.ai",
};
const wip = {
  ...baseWipConfig,
  APP_URL: APP_ENV_DEVELOPMENT ? "http://localhost:3000" : "https://wip.app.re-collect.ai",
};
const local = {
  ...baseLocalConfig,
  APP_URL: "http://localhost:3000",
};
const config = (() => {
  // Default to dev if not set
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

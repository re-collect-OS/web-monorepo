import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { Amplify, Auth } from "aws-amplify";

import "./index.css";
import App from "./App";
import { useStore } from "./store";
import config, { SENTRY_DSN, APP_VERSION, APP_STAGE, APP_ENV_DEVELOPMENT } from "./config";
import * as Sentry from "@sentry/react";

const getAuthHeaders = async () => {
  return {
    Authorization: `Bearer ${(await Auth.currentSession()).getAccessToken().getJwtToken()}`,
  };
};


Amplify.configure({
  Auth: {
    mandatorySignIn: true,
    region: config.cognito.REGION,
    userPoolId: config.cognito.USER_POOL_ID,
    identityPoolId: config.cognito.IDENTITY_POOL_ID,
    userPoolWebClientId: config.cognito.APP_CLIENT_ID,
    // Overrides below are only relevant for local development (cognito mock)
    // reference: https://github.com/aws-amplify/amplify-js/blob/7762f1a7076e622ec354c24539a3b57ce3ec4290/packages/auth/src/types/Auth.ts#L30-L45
    ...(APP_STAGE === "local"
      ? {
          endpoint: config.cognito.ENDPOINT,
          authenticationFlowType: config.cognito.AUTH_FLOW_TYPE,
        }
      : {}),
  },
  API: {
    endpoints: config.api.ENDPOINTS.map((endpointConfig) => ({ ...endpointConfig, custom_header: getAuthHeaders })),
  },
});

try {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
    release: APP_VERSION,
    environment: APP_STAGE,
    autoSessionTracking: true,
    enabled: !APP_ENV_DEVELOPMENT,
  });
} catch (error) {
  console.log("Failed to init Sentry with error:", error);
}

// Init
useStore.getState().doAuthInit();

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
  document.getElementById("root")
);

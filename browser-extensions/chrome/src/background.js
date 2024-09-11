/*global URLPattern*/

// Have to shim XMLHttpRequest to use fetch instead to get AWS client code working
// in background script / service worker context
import {
  // chunk,
  debounce,
  errorToString,
  extractCleanUrl,
  getISOTimestamp,
  GlobalNoAutoCollectList,
  GlobalNoGoList,
  isPDFUrl,
  isTweetUrl,
  isYouTubeUrl,
  mapConnectionResultToModel,
  testVisitAgainstNoGoList,
  AppCache,
} from "js-shared-lib";
import * as Sentry from "@sentry/browser";

import { arrayBufferToBinaryString } from "blob-util";

import apiLib from "./libs/apiLib";
import FeedbackEventsManager from "./libs/feedbackEventsLib";

import { XMLHttpRequest } from "./utils/shimXHRToFetch";
import storage from "./utils/storage";
import { authenticateWithSession } from "./utils/auth";
import { getHistory } from "./utils/history";
import { getBookmarks } from "./utils/bookmarks";
import { onError } from "./utils/error";
import { setCheckedExtensionIcon, setErrorExtensionIcon, resetExtensionIcon } from "./utils/badge";

import { events, analyticsService } from "./libs/analyticsLib";

import config, { APP_STAGE, APP_VERSION, DEBUG, APP_ENV_DEVELOPMENT, SENTRY_DSN } from "./config";

import { Amplify, Auth } from "aws-amplify";

if (DEBUG) {
  Amplify.Logger.LOG_LEVEL = "DEBUG";
}

const defaultAccountSettings = { isOptOut: false };

const SKIP_AUTO_COLLECT_ALARM_NAME = "skipAutoCollectAlarm";
const SYNC_VERSION_ALARM_NAME = "skipVersionAlarm";

const SKIP_AUTO_COLLECT_STORAGE_KEY = "skipAutoCollect";
const LAST_REMEMBERED_MAP_STORAGE_KEY = "lastRememberedMap";
const SUBSCRIBED_MAP_STORAGE_KEY = "subscribedMap";
const ACCOUNT_SETTINGS_STORAGE_KEY = "accountSettings";
const IS_DARK_MODE_STORAGE_KEY = "isDarkMode";
const GO_LIST_STORAGE_KEY = "goList";
const NO_GO_LIST_STORAGE_KEY = "noGoList";
const APP_VERSION_STORAGE_KEY = "appVersion";
const LAST_APP_VERSION_STORAGE_KEY = "lastAppVersion";

const AUTO_CAPTURE_DELAY_SECONDS = 3;

const isValidUser = (u) => u && Object.keys(u).length > 0;

let cachedUser = null;
let cachedUserLastSyncTime = 0;

function getCurrentUser() {
  return new Promise((resolve, reject) => {
    if (cachedUser) {
      const timeDelta = new Date().getTime() - cachedUserLastSyncTime;
      // Cache user for 1 minute
      if (timeDelta < 1 * 1000 * 60) {
        return void resolve(cachedUser);
      }
    }

    Auth.currentAuthenticatedUser()
      .then((info) => {
        if (info && isValidUser(info)) {
          cachedUser = info;
          cachedUserLastSyncTime = new Date().getTime();
          resolve(info);
        } else {
          reject(new Error("Could not find user"));
        }
      })
      .catch((error) => {
        const errorMessage = errorToString(error);
        // Clean up if we could not get refreshed access tokens:
        if (errorMessage === "The user is not authenticated") {
          logOut({ source: "[getCurrentUser()]", cleanupOnly: true });
        }
        reject(error);
      });
  });
}

async function tryToSyncUserAndSubscriptionData({ source }) {
  if (!storage.initialized) {
    console.log(`[${source}] Storage not yet initialized. Will not sync go-list...`);
    return;
  }

  try {
    const info = await getCurrentUser();
    console.log(`[${source}] Current user: ${info?.attributes?.email}`);
    syncUserData({ source });
    syncSubscriptionData({ source });
  } catch (error) {
    console.log(`[${source}] Not signed in: ${errorToString(error)}`);
  }
}

console.log("[SERVICE_WORKER_STARTED]", new Date());

// Defaults false, will get set to the persisted value once storage is initialized
let isDarkMode = false;
let needsDarkModeStorageSync = false;
let loggedInUserId;

const getAuthHeaders = async () => {
  return {
    Authorization: `Bearer ${(await Auth.currentSession()).getAccessToken().getJwtToken()}`,
  };
};

storage.init().then((coldStart) => {
  console.log(`[SERVICE_WORKER_STARTED] Storage was initialized (cold: ${coldStart})`);

  if (needsDarkModeStorageSync) {
    storage.setItem(IS_DARK_MODE_STORAGE_KEY, isDarkMode);
    needsDarkModeStorageSync = false;
  } else {
    isDarkMode = storage.getItem(IS_DARK_MODE_STORAGE_KEY, isDarkMode);
  }

  Amplify.configure({
    storage,
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
      autoSessionTracking: false,
      enabled: !APP_ENV_DEVELOPMENT,
    });
  } catch (error) {
    console.log("Failed to init Sentry with error:", error);
  }

  identifyLoggedInUser();
});

global.XMLHttpRequest = XMLHttpRequest; // 1/3: set XMLHttpRequest symbol in global
import axios from "axios"; // 2/3: import axios (which Amplify uses)
axios.defaults.adapter = require("axios/lib/adapters/http"); // 3/3: force axios to use XMLHttpRequest adapter
global.window = {}; // shim window global

// AXIOS is struggling with binary data from the service worker:
// falling back to plain text content type and no blob support available which means a corrupt binary string
// so we recreate the request with fetch directly in order to create a valid binary string that will survive
// the trip to the FE. The caller is expected to turn that to a blob via binaryStringToBlob from blob-utils
// Solution from a human: https://stackoverflow.com/questions/60454048/how-does-axios-handle-blob-vs-arraybuffer-as-responsetype#comment131033221_60461828
// Robots be shamed
function loadThumbnailFromS3Path(s3Path) {
  return new Promise((resolve, reject) => {
    Auth.currentSession().then((session) => {
      const bearerToken = session.getAccessToken().getJwtToken();
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${bearerToken}`);
      const url = `${config.APP_URL}/v2/thumbnail/?s3_path=${encodeURIComponent(s3Path)}`;
      fetch(url, { headers: headers })
        .then((response) => {
          response.arrayBuffer().then((arrayBuffer) => {
            const binaryString = arrayBufferToBinaryString(arrayBuffer);
            resolve({ data: binaryString });
          });
        })
        .catch((error) => reject(error));
    });
  });
}

function recreateContextMenus({ autoCollectDisabled } = {}) {
  chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: "launch",
    title: "Open re:collect",
    contexts: ["action"],
  });

  // chrome.contextMenus.create({
  //   id: "recall",
  //   title: "Recall: %s",
  //   contexts: ["selection"],
  //   documentUrlPatterns: ["http://*/*.pdf", "https://*/*.pdf"],
  // });

  chrome.contextMenus.create({
    id: "annotate",
    title: "Mark up: %s",
    contexts: ["selection"],
    documentUrlPatterns: ["http://*/*", "https://*/*"],
  });

  if (autoCollectDisabled) {
    chrome.contextMenus.create({
      id: "enable_auto_collect",
      title: "Enable auto-collect",
      contexts: ["action"],
    });
  } else {
    chrome.contextMenus.create({
      id: "disable_auto_collect",
      title: "Disable auto-collecting for 1 hr",
      contexts: ["action"],
    });
  }

  chrome.contextMenus.create({
    id: "blank_recall",
    title: "Recall",
    contexts: ["page", "action"],
    documentUrlPatterns: ["http://*/*", "https://*/*"],
  });
}

chrome.action.onClicked.addListener((tab) => {
  const source = "BROWSER_ACTION";
  if (tab.url.includes("app.re-collect.ai") || (APP_ENV_DEVELOPMENT && tab.url.includes("localhost"))) {
    doExternalRecall({ tab: { id: tab.id, title: tab.title, url: tab.url }, source });
  } else {
    chrome.tabs
      .sendMessage(tab.id, { action: "do-toggle-popover", tab: { id: tab.id, title: tab.title, url: tab.url } })
      .then(() => {
        console.log(`[${source}] Toggled Popover`);
      })
      .catch((error) => {
        console.log(`[${source}] Failed to toggle Popover`, { error });
        // If it's not one of our urls, open the app in a new tab:
        for (const cs of chrome.runtime.getManifest().content_scripts) {
          const excludePatterns = cs.exclude_matches.map((rule) => new URLPattern(rule));
          if (!excludePatterns.some((pattern) => pattern.test(tab.url))) {
            chrome.tabs.create({ url: config.APP_URL });
          }
        }
      });
  }
});

// Periodically sync app version
const scheduleNextVersionSyncAlarm = () => chrome.alarms.create(SYNC_VERSION_ALARM_NAME, { delayInMinutes: 360 }); // 6hr
const doAppVersionSync = () => {
  const source = "APP_VERSION_SYNC";
  // Hardcoding deployed functions as they don't run locally
  fetch(
    `https://${
      ["dev", "wip", "demo", "local"].includes(APP_STAGE) ? `${APP_STAGE}.` : ""
    }app.re-collect.ai/.netlify/functions/version`
  )
    .then((response) => {
      response
        .json()
        .then((data) => {
          const lastAppVersion = storage.getItem(APP_VERSION_STORAGE_KEY, "0");
          if (lastAppVersion !== data.appVersion) {
            if (DEBUG) {
              console.log(`[${source}] Setting app version to:`, data.appVersion);
            }
            storage.setItem(APP_VERSION_STORAGE_KEY, data.appVersion);
          }
        })
        .catch((error) => {
          console.log(`[${source}] Failed to decode app version response:`, error);
        });
    })
    .catch((error) => {
      console.log(`[${source}] Failed to sync app version:`, error);
    });

  scheduleNextVersionSyncAlarm();
};

// Iterate though all open tabs and check if we've marked them as "remembered" before
// Note: this data could be stale or gone (logged out)
function syncTabCheckedIconsWithCachedState({ source }) {
  const lastRememberedMap = new Map(storage.getItem(LAST_REMEMBERED_MAP_STORAGE_KEY, []));
  chrome.tabs
    .query({})
    .then((tabs) => {
      tabs.forEach((tab) => {
        if (lastRememberedMap.get(extractCleanUrl(tab.url))) {
          setCheckedExtensionIcon({ tabId: tab.id, isDarkMode });
        }
      });
    })
    .catch((error) => {
      console.log(`${source} Failed to get list of open tabs`, errorToString(error));
    });
}

function syncTabInfoForOpenTabs({ source }) {
  chrome.tabs
    .query({})
    .then((tabs) => {
      tabs.forEach((tab) => {
        // Update page if it's listening
        chrome.tabs
          .sendMessage(tab.id, {
            action: "update-tab-info",
            tab: { id: tab.id, title: tab.title, url: tab.url },
          })
          .catch(() => {
            // noop - this will fail for tabs that don't have the content script injected
          });
      });
    })
    .catch((error) => {
      console.log(`${source} Failed to get list of open tabs`, errorToString(error));
    });
}

async function injectContentScriptForOpenTabs({ source }) {
  console.log(`[${source}] Re-injecting content scripts`);
  // Inject content script for all qualified open tabs:
  for (const cs of chrome.runtime.getManifest().content_scripts) {
    const excludePatterns = cs.exclude_matches.map((rule) => new URLPattern(rule));
    for (const tab of await chrome.tabs.query({ url: cs.matches })) {
      if (!excludePatterns.some((pattern) => pattern.test(tab.url))) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: cs.js,
          });
        } catch (error) {
          console.log("Failed to inject content script into tab", tab.url);
        }
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  const isUpdate = details.reason === "update";
  const source = "ON_INSTALLED";
  console.log(`[${source}] re:collect chrome extension ${isUpdate ? "updated" : "installed"} (stage: ${APP_STAGE})`);

  // Subscribe to alarm callbacks
  chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === SKIP_AUTO_COLLECT_ALARM_NAME) {
      if (DEBUG) {
        console.log(`[${source}] ${alarm.name} alarm fired`);
      }
      storage.removeItem(SKIP_AUTO_COLLECT_STORAGE_KEY);
      recreateContextMenus({ autoCollectDisabled: false });
    } else if (alarm.name === SYNC_VERSION_ALARM_NAME) {
      if (DEBUG) {
        console.log(`[${source}] ${alarm.name} alarm fired`);
      }
      doAppVersionSync();
    }
  });

  // Schedule version sync
  if (loggedInUserId) {
    doAppVersionSync();
  }

  // Reset alarm on install
  storage.removeItem(SKIP_AUTO_COLLECT_STORAGE_KEY);
  recreateContextMenus();

  // Re-inject content scripts
  injectContentScriptForOpenTabs({ source }).then(() => {
    // On update the tab icons get reset
    // If we're logged in, iterate though each open tab and set the correct icon
    if (loggedInUserId) {
      syncTabCheckedIconsWithCachedState({ source });
      syncTabInfoForOpenTabs({ source });
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  const source = "ON_STARTUP";
  console.log(`[${source}] re:collect chrome extension started (stage: ${APP_STAGE})`);

  tryToSyncUserAndSubscriptionData({ source });
});

chrome.runtime.onInstalled.addListener(() => {
  const source = "ON_INSTALLED";
  console.log(`[${source}] re:collect chrome extension installed (stage: ${APP_STAGE})`);

  tryToSyncUserAndSubscriptionData({ source });
});

const sendAlertError = (tabId, message) => {
  chrome.tabs
    .sendMessage(tabId, {
      action: "alert-error",
      message: `re:collect extension failed with code ${message}. Please try again.`,
    })
    .catch(() => {
      // noop
    });
};

chrome.contextMenus.onClicked.addListener((info) => {
  const source = "CONTEXT_MENU";
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0]; // tab is also passed in as 2nd param to addListener callback but PDFs don't report correct ID

    if ("enable_auto_collect" === info.menuItemId) {
      storage.removeItem(SKIP_AUTO_COLLECT_STORAGE_KEY);
      chrome.alarms.clear(SKIP_AUTO_COLLECT_ALARM_NAME);
      recreateContextMenus({ autoCollectDisabled: false });
    } else if ("disable_auto_collect" === info.menuItemId) {
      storage.setItem(SKIP_AUTO_COLLECT_STORAGE_KEY, getISOTimestamp());
      chrome.alarms.create(SKIP_AUTO_COLLECT_ALARM_NAME, { delayInMinutes: 60 }); // 1hr
      recreateContextMenus({ autoCollectDisabled: true });
    } else if ("launch" === info.menuItemId) {
      chrome.tabs.create({ url: "https://app.re-collect.ai" });
    } else if ("annotate" === info.menuItemId) {
      const selectionText = info.selectionText || "";
      const selectionLength = selectionText.length;
      const selectionLengthLimit = 1500;
      if (selectionLength > selectionLengthLimit) {
        console.warn(
          `[${source}] Higlight length ${selectionLength} exceeded ${selectionLengthLimit} characters. Ignoring...`
        );
        return;
      }
      // TODO if pdf, create a highlight with no before and after text and skip trying to inject highlights
      chrome.tabs
        .sendMessage(tab.id, {
          action: "annotate-selection",
          selectionText,
        })
        .catch((error) => {
          const errorContext = `[CONTEXT_MENU] Failed to initiate selection annotation`;
          onError(error, errorContext);
          sendAlertError(tab.id, 4);
        });
    } else if (["blank_recall", "recall"].includes(info.menuItemId)) {
      const query = info.selectionText || "";
      if (tab.url.includes("app.re-collect.ai") || (APP_ENV_DEVELOPMENT && tab.url.includes("localhost"))) {
        doExternalRecall({ tab, query, source });
      } else {
        doRecall({ tab, query, source });
      }
    }
  });
});

function identifyLoggedInUser() {
  getCurrentUser()
    .then((user) => {
      const userId = user.attributes.email;
      console.log("[IDENTIFY_LOGGED_IN_USER] Active session:", userId);
      analyticsService.setUserId(userId);
      analyticsService.setUserProperty({ propertyName: "browserExtensionVersion", value: APP_VERSION });
      Sentry.setUser({ email: userId });
      loggedInUserId = userId;
    })
    .catch((error) => {
      console.log("[IDENTIFY_LOGGED_IN_USER] No active session:", error);
      setErrorExtensionIcon({ isDarkMode });
    });
}

function rememberUrl(url, optionalDate) {
  let lastRememberedMap = storage.getItem(LAST_REMEMBERED_MAP_STORAGE_KEY, []);
  const ts = optionalDate || getISOTimestamp();
  lastRememberedMap.push([extractCleanUrl(url), ts]);
  const limit = 1000;
  if (lastRememberedMap.length > limit) {
    lastRememberedMap = lastRememberedMap.slice(-1 * limit);
  }
  storage.setItem(LAST_REMEMBERED_MAP_STORAGE_KEY, lastRememberedMap);
  return ts;
}

function forgetUrl(url) {
  const lastRememberedMap = new Map(storage.getItem(LAST_REMEMBERED_MAP_STORAGE_KEY, []));
  url = extractCleanUrl(url);
  if (lastRememberedMap.get(url)) {
    lastRememberedMap.delete(url);
    storage.setItem(LAST_REMEMBERED_MAP_STORAGE_KEY, [...lastRememberedMap]);
    return true;
  }
  return false;
}

function forgetUrls(urls) {
  const lastRememberedMap = new Map(storage.getItem(LAST_REMEMBERED_MAP_STORAGE_KEY, []));
  urls.forEach((url) => {
    const cleanUrl = extractCleanUrl(url);
    if (lastRememberedMap.get(cleanUrl)) {
      lastRememberedMap.delete(cleanUrl);
    }
  });
  storage.setItem(LAST_REMEMBERED_MAP_STORAGE_KEY, [...lastRememberedMap]);
}

const needsSource = (url) => !isTweetUrl(url) && !isPDFUrl(url) && !isYouTubeUrl(url);

function submitVisit({ tab, transitionType, source, collectSource }, sendResponse) {
  chrome.tabs
    .sendMessage(tab.id, { action: "get-page-source" })
    .then((response) => {
      if (response.content) {
        let title = response.title;
        // Strip `- YouTube` from title
        if (title && isYouTubeUrl(tab.url)) {
          title = title.split(" - YouTube")[0];
        }
        let doPush;
        doPush = apiLib.pushVisitContent({
          url: tab.url,
          title,
          transitionType,
          visitTime: getISOTimestamp(),
          clipperVersion: "re-collect-chrome-extension:0.1.0",
          source: collectSource,
          // Skip sending source for sources that we know backend doesn't use
          ...(needsSource(tab.url) ? { content: response.content } : {}),
        });

        doPush
          .then(() => {
            console.log(`[${source}] Submitted content.`);
            sendResponse({ success: true });
            setCheckedExtensionIcon({ tabId: tab.id, isDarkMode });
            // Update popover if it's listening
            const ts = rememberUrl(tab.url);
            chrome.tabs
              .sendMessage(tab.id, {
                action: "update-url-state",
                url: tab.url,
                isRemembered: true,
                lastRememberedTs: ts,
              })
              .catch(() => {
                // noop
              });

            // Start attention tracking
            const { wantsAttentionTracking } = storage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY, defaultAccountSettings);
            if (wantsAttentionTracking) {
              startAttentionTracking(tab.id, source);
            }
          })
          .catch((error) => {
            const errorContext = `[${source}] Failed to submit content`;
            const errorMessage = onError(error, errorContext);
            sendResponse({ success: false, message: errorMessage });
          });
      } else {
        const errorContext = `[${source}] Failed to submit content - no content`;
        const errorMessage = onError(response, errorContext);
        sendResponse({ success: false, message: errorMessage });
      }
    })
    .catch((error) => {
      const errorContext = `[${source}] Failed to submit content - no page source`;
      const errorMessage = onError(error, errorContext);
      sendResponse({ success: false, message: errorMessage });
      return;
    });
}

function getVisitsAndSubmit({ tab, sendResponse, source, collectSource = "manual" }) {
  chrome.history.getVisits({ url: tab.url }, (visits) => {
    const transitionType = visits.length ? visits[visits.length - 1].transition : null;
    submitVisit({ tab, transitionType, source, collectSource }, sendResponse);
  });
}

function subscribeToFeedUrl({ feedUrl, sendResponse, source }) {
  apiLib
    .pushRssSubscription({ feedUrl, shouldProcessLinks: false })
    .then(() => {
      // TODO take the opportunity to resync instead?
      let subscribedMap = storage.getItem(SUBSCRIBED_MAP_STORAGE_KEY, []);
      const ts = getISOTimestamp();
      subscribedMap.push([feedUrl, ts]);
      storage.setItem(SUBSCRIBED_MAP_STORAGE_KEY, subscribedMap);

      sendResponse({ success: true, lastSubscribedTs: ts });
      console.log(`[${source}] Subscribed to feed: ${feedUrl}`);
    })
    .catch((error) => {
      sendResponse({ success: false, message: error.message });
    });
}

function syncUserData({ source }) {
  return new Promise((resolve, reject) => {
    apiLib
      .loadUserInfo({ keys: ["go_list", "no_go_list", "settings"] })
      .then((response) => {
        try {
          const flatGoList = response.go_list.entries.map((entry) => entry.rule);
          const flatNoGoList = response.no_go_list.entries.map((entry) => entry.rule);
          const accountSettings = {};

          const stringOrBooleanValue = response.settings?.client_settings?.is_opt_out;
          if (String(stringOrBooleanValue).toLowerCase() === "true") {
            accountSettings.isOptOut = true;
          }

          const defaultEngine = response.settings?.default_engine;
          if (defaultEngine) {
            accountSettings.defaultEngine = defaultEngine;
          }

          const isAccountDeactivated = !!response.settings?.marked_deactivated;
          if (isAccountDeactivated) {
            accountSettings.isAccountDeactivated = isAccountDeactivated;
          }

          const wantsAttentionTracking = !!response.settings?.wants_attention_tracking;
          if (wantsAttentionTracking) {
            accountSettings.wantsAttentionTracking = wantsAttentionTracking;
          }

          storage.setItem(GO_LIST_STORAGE_KEY, flatGoList);
          storage.setItem(NO_GO_LIST_STORAGE_KEY, flatNoGoList);
          storage.setItem(ACCOUNT_SETTINGS_STORAGE_KEY, accountSettings);
          console.log(
            `[${source}] Successful user data sync (go: ${flatGoList.length} rules, noGo: ${flatNoGoList.length} rules, isOptOut: ${accountSettings.isOptOut}, isAccountDeactivated: ${isAccountDeactivated}, wantsAttentionTracking: ${wantsAttentionTracking})`
          );
          resolve({ goList: flatGoList, noGoList: flatNoGoList, accountSettings });
        } catch (error) {
          const errorMsg = `Failed to process user data: ${error.message}`;
          console.log(`[${source}] ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      })
      .catch((error) => {
        const errorContext = `[${source}] Failed to sync user data`;
        onError(error, errorContext);
        reject(error);
      });
  });
}

function syncSubscriptionData({ source }) {
  return new Promise((resolve, reject) => {
    apiLib
      .loadRssSubscriptions()
      .then((results) => {
        try {
          console.log(`[${source}] Successful subscription data sync (count: ${results.length})`);
          const subscribedMap = results.map((r) => [r.feed_url, r.created]);
          storage.setItem(SUBSCRIBED_MAP_STORAGE_KEY, subscribedMap);
          resolve({ subscriptions: results });
        } catch (error) {
          const errorMsg = `Failed to process subscription data: ${error.message}`;
          console.log(`[${source}] ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      })
      .catch((error) => {
        const errorContext = `[${source}] Failed to sync subscription data`;
        onError(error, errorContext);
        reject(error);
      });
  });
}

function isUrlAlreadyCollected({ url }) {
  return new Promise((resolve, reject) => {
    apiLib
      .loadUserCollectedArticleStatus({ url })
      .then((response) => {
        if (response.unknown?.length) {
          resolve(false);
          return;
        }

        const state = response.urlstates[0];
        if (!state) {
          resolve(false);
          return;
        }

        resolve(state.status !== "removing" ? state.initial_timestamp : false);
      })
      .catch((error) => reject(error));
  });
}

function deleteVisits({ urls, normalize }) {
  return new Promise((resolve, reject) => {
    if (!urls.length) {
      return void resolve();
    }

    apiLib
      .deleteVisits({ urls, normalize })
      .then((response) => {
        if (urls.length > 1) {
          forgetUrls(urls);
        } else {
          if (response.unknown?.length) {
            reject(new Error("url not found"));
          } else {
            forgetUrl(urls[0]);
          }
        }
        resolve();
      })
      .catch((error) => reject(error));
  });
}

function loadConnections({ query, source, ...rest }) {
  return new Promise((resolve, reject) => {
    const { defaultEngine } = storage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY, defaultAccountSettings);

    return apiLib
      .loadConnections({
        query,
        source: `re-collect-chrome-extension-v${APP_VERSION}`,
        ...rest,
        ...(defaultEngine ? { engine: defaultEngine } : {}),
      })
      .then((response) => {
        console.log(`[${source}] Successful recall for query: ${query}`);
        resolve(response);
      })
      .catch((error) => {
        const errorContext = `[${source}] Failed to recall`;
        onError(error, errorContext);
        reject(error);
      });
  });
}

function logOut({ source, cleanupOnly }) {
  return new Promise((resolve, reject) => {
    const _handleSuccess = () => {
      // Clear local storage
      storage.clear();
      loggedInUserId = null;
      cachedUser = null;
      // Mark badge as logged out - using error for now
      setErrorExtensionIcon({ isDarkMode });
      if (!cleanupOnly) {
        console.log(`[${source}] logout successful.`);
        analyticsService.logEvent(events.userLogout());
        AppCache.clear();
      }
      analyticsService.setUserId(null);
      Sentry.setUser(null);
      resolve();
    };
    const _handleError = (error) => {
      const message = errorToString(error);
      console.log(`[${source}] logout failed: `, message);
      reject(message);
    };

    // Skip the network call if we know we've just been logged out elsewhere
    if (cleanupOnly) {
      _handleSuccess();
    } else {
      Auth.signOut().then(_handleSuccess).catch(_handleError);
    }
  });
}

function doRecall({ tab, query, sendResponse, source }) {
  chrome.tabs.sendMessage(
    tab.id,
    { action: "do-recall", query, tab: { id: tab.id, title: tab.title, url: tab.url } },
    (response) => {
      if (!response || !response.success) {
        console.log(`[${source}] Failed to recall with query: ${chrome.runtime.lastError?.message} (${query})`);
        if (sendResponse) {
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
        }
        return;
      }

      console.log(`[${source}] Recalled: ${query}`);
      if (sendResponse) {
        sendResponse({ success: true });
      }
    }
  );
}

function doExternalRecall({ tab, query, source }) {
  const port = ports[tab.id];
  if (port) {
    port.postMessage({ action: "recall", query, source });
  }
}

// Storage init happens async - there's a race condition between trying
// to access async storage and init code
function pollForStorageInit(fn, timeoutFn) {
  let iterations = 0;
  const intervalId = setInterval(() => {
    if (storage.initialized) {
      fn();
      clearInterval(intervalId);
    } else {
      iterations += 1;
      // Time out after after a second of waiting
      if (iterations > 10) {
        clearInterval(intervalId);
        timeoutFn();
      }
    }
  }, 100);
}

const startAttentionTracking = (tabId, source) => {
  chrome.tabs
    .sendMessage(tabId, { action: "start-attention-tracking" })
    .then((response) => {
      if (response?.success) {
        console.log(`[${source}] Started attention tracking`);
      } else {
        console.log(`[${source}] Refused to start attention tracking`);
      }
    })
    .catch((error) => {
      const errorContext = `[${source}] Failed to start attention tracking`;
      console.log(errorContext, error);
      onError(error, errorContext);
    });
};

let attentionSessions = [];
function persistAttentionSessions() {
  if (attentionSessions.length) {
    console.log(`[persistAttentionSessions] Logging ${attentionSessions.length} attention sessions`);
    const sessions = [...attentionSessions];
    apiLib.logTrackingSessions({ sessions });
    attentionSessions = [];
  } else {
    console.log("[persistAttentionSessions] no sessions to log");
  }
}
const scheduleAttentionSessionsLogDebounced = debounce(persistAttentionSessions, { delay: 5000, edges: true });
function logAttentionSessions({ sessions }) {
  const mappedSessions = sessions.map((s) => ({
    id: s.id,
    started_at: getISOTimestamp(s.startTime),
    finished_at: getISOTimestamp(s.endTime),
    url: extractCleanUrl(s.url),
    time_in_tab: s.duration,
    max_scroll_depth: s.scrollDepth,
    click_count: s.clickCount,
    highlight_count: s.highlightCount,
  }));
  attentionSessions.push.apply(attentionSessions, mappedSessions);
  scheduleAttentionSessionsLogDebounced();
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Automatic tracking of articles
  if (changeInfo.status !== "complete") return;
  if (!tab.url?.startsWith("http")) return;
  if (tab.incognito) return;

  const { isOptOut, isAccountDeactivated } = storage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY, defaultAccountSettings);
  const source = "ON_UPDATED_SUBMIT_VISIT";

  if (isAccountDeactivated) {
    if (DEBUG) {
      console.log(`[${source}] Ignoring visit to "${tab.url}" because account is deactivated`);
    }
    return;
  }

  // Update page if it's listening
  chrome.tabs
    .sendMessage(tab.id, {
      action: "update-tab-info",
      tab: { id: tab.id, title: tab.title, url: tab.url },
    })
    .catch(() => {
      // noop
    });

  // Bail early if domain on no-go list
  const isOnNoGoList = !testVisitAgainstNoGoList(GlobalNoGoList, {
    url: tab.url,
  });
  if (isOnNoGoList) {
    if (DEBUG) {
      console.log(`[${source}] Ignoring visit to "${tab.url}" because it is on global no-go list`);
    }
    return;
  }

  const skipAutoCollectTs = storage.getItem(SKIP_AUTO_COLLECT_STORAGE_KEY, false);
  if (skipAutoCollectTs) {
    if (DEBUG) {
      console.log(`[${source}] Ignoring visit to "${tab.url}" because auto-collect is disabled`);
    }
    return;
  }

  const lastRememberedMap = new Map(storage.getItem(LAST_REMEMBERED_MAP_STORAGE_KEY, []));
  let lastRememberedTs = lastRememberedMap.get(extractCleanUrl(tab.url));
  const elapsedSeconds = (new Date().getTime() - new Date(lastRememberedTs).getTime()) / 1000;
  let isAlreadyRemembered = !!lastRememberedTs && elapsedSeconds <= 3600; // Cache state for 1 hour
  if (!isAlreadyRemembered) {
    try {
      lastRememberedTs = await isUrlAlreadyCollected({ url: tab.url, source });
      if (lastRememberedTs) {
        isAlreadyRemembered = true;
        rememberUrl(tab.url, lastRememberedTs);
      }
      console.log(`[${source}] Got artifact status`, { isAlreadyRemembered });

      // Update popover if it's listening
      chrome.tabs
        .sendMessage(tab.id, {
          action: "update-url-state",
          url: tab.url,
          isRemembered: isAlreadyRemembered,
          lastRememberedTs,
        })
        .catch(() => {
          // noop
        });
    } catch (error) {
      const errorContext = `[${source}] Failed to get artifact status (${tab.url})`;
      onError(error, errorContext);
    }
  }

  if (isAlreadyRemembered) {
    if (DEBUG) {
      console.log(`[${source}] Ignoring visit because ${tab.url} is already collected`);
    }
    setCheckedExtensionIcon({ tabId, isDarkMode });
    // Have the tab start polling for auto-recall sentences:
    chrome.tabs.sendMessage(tab.id, { action: "do-auto-recall-poll" }).catch(() => {
      // noop
    });

    // Start attention tracking
    const { wantsAttentionTracking } = storage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY, defaultAccountSettings);
    if (wantsAttentionTracking) {
      startAttentionTracking(tabId, source);
    }
    return;
  } else if (loggedInUserId) {
    // Cheap way to check if we're likely logged in - don't want to reset the signed out alert icon
    resetExtensionIcon({ tabId, isDarkMode });
  }

  const hostname = new URL(tab.url)?.hostname;

  const isOnNoAutoCollectList = !testVisitAgainstNoGoList(GlobalNoAutoCollectList, {
    url: tab.url,
  });

  if (isOnNoAutoCollectList) {
    if (DEBUG) {
      console.log(`[${source}] Ignoring visit to "${tab.url}" because it is on global no-auto-collect list`);
    }
    return;
  } else if (isOptOut && storage.getItem(NO_GO_LIST_STORAGE_KEY, []).includes(hostname)) {
    if (DEBUG) {
      console.log(`[${source}] Ignoring visit because ${hostname} is on no-go-list`);
    }
    return;
  } else if (!isOptOut && !storage.getItem(GO_LIST_STORAGE_KEY, []).includes(hostname)) {
    if (DEBUG) {
      console.log(`[${source}] Ignoring visit because ${hostname} is not on go-list`);
    }
    return;
  }

  try {
    // Expect this to throw if cannot get active session:
    await getCurrentUser();

    const doSubmitVisit = () => {
      getVisitsAndSubmit({
        tab,
        source,
        collectSource: isOptOut ? "opt-out" : "opt-in",
        sendResponse: (response) => {
          if (response?.success) {
            // Have the tab start polling for auto-recall sentences:
            chrome.tabs.sendMessage(tab.id, { action: "do-auto-recall-poll" }).catch(() => {
              // noop
            });
          } else {
            const errorContext = `[${source}] Could not submit visit`;
            console.log(`${errorContext} to ${tab.url}: ${response}`);
            setErrorExtensionIcon({ tabId, isDarkMode });
          }
        },
      });
    };

    if (isPDFUrl(tab.url)) {
      doSubmitVisit();
    } else {
      // Delay submitting content to give the page a chance to fully load
      // It also avoids capturing pages that quickly closed
      setTimeout(() => {
        // Check if probably an article:
        chrome.tabs
          .sendMessage(tab.id, { action: "is-probably-article" })
          .then((response) => {
            if (!response.success) {
              console.log(`[${source}] Could not submit visit to ${tab.url}: ${response.message}`);
              return;
            } else if (!response.isProbablyArticle) {
              console.log(`[${source}] Ignoring visit to ${tab.url}: probably not an article`);
              return;
            }
            doSubmitVisit();
          })
          .catch((error) => {
            console.log(`[${source}] Could not submit visit to ${tab.url}:`, errorToString(error));
          });
      }, AUTO_CAPTURE_DELAY_SECONDS * 1000);
    }
  } catch (error) {
    const errorContext = `[${source}] Could not submit visit`;
    console.log(`${errorContext} to ${tab.url}: ${errorToString(error)}`);
    setErrorExtensionIcon({ tabId, isDarkMode });
  }
});

chrome.runtime.onSuspend.addListener(function () {
  console.log("=== Service worker suspended ===");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "get-current-tab": {
      const url = extractCleanUrl(message.url || sender.tab.url);
      chrome.tabs.query({ url }, function (tabs) {
        const tab = tabs[0];
        if (tab) {
          sendResponse({ success: true, tab: { id: tab.id, title: tab.title, url: tab.url } });
        } else {
          sendResponse({ success: false, message: `Could not get current tab for url: ${url}` });
        }
      });
      return true;
    }
    case "get-current-user": {
      pollForStorageInit(
        () => {
          getCurrentUser()
            .then((user) => {
              sendResponse({ success: true, user });
            })
            .catch((error) => {
              const errorMessage = errorToString(error);
              sendResponse({
                success: false,
                message: errorMessage,
              });
            });
        },
        () => {
          sendResponse({ success: false, message: "Timed out waiting for session init" });
        }
      );
      return true;
    }

    case "logout": {
      logOut({ source: "ON_MESSAGE_LOGOUT" })
        .then(() => {
          sendResponse({ success: true });
          setErrorExtensionIcon({ isDarkMode });
        })
        .catch((message) => {
          sendResponse({ success: false, message });
        });
      return true;
    }

    case "submit-visit": {
      const { tab } = message;
      const source = "ON_MESSAGE_SUBMIT_VISIT";

      getCurrentUser()
        .then(() => {
          getVisitsAndSubmit({ tab, sendResponse, source });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            message: onError(error, `[${source}] Failed to get current user`),
          });
        });
      return true;
    }

    case "forget-visit": {
      const { tab } = message;
      const source = "ON_MESSAGE_FORGET_VISIT";

      getCurrentUser()
        .then(() => {
          deleteVisits({ urls: [tab.url], normalize: true })
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({
                success: false,
                message: onError(error, `[${source}] Failed to delete visits`),
              });
            });
          resetExtensionIcon({ tabId: tab.id, isDarkMode });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            message: onError(error, `[${source}] Failed to get current user`),
          });
        });
      return true;
    }

    case "enable-auto-collect-for-hostnames": {
      const source = "ON_MESSAGE_ENABLE_AUTO_COLLECT_FOR_HOSTNAMES";
      const { isOptOut } = storage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY, defaultAccountSettings);
      const { tab, hostnames } = message;

      if (!hostnames.length) {
        sendResponse({ success: false, message: "Missing required hostnames array" });
        return;
      }

      if (isOptOut) {
        // Remove hostname from no-go-list
        apiLib
          .setUserInfoKey({ key: "no_go_list", value: { removals: hostnames.map((rule) => ({ rule })) } })
          .then(() => {
            // manually update our cache
            storage.setItem(
              NO_GO_LIST_STORAGE_KEY,
              storage.getItem(NO_GO_LIST_STORAGE_KEY, []).filter((h) => !hostnames.includes(h))
            );
            // resync user data with the server just in case
            syncUserData({ source });
            console.log(`[${source}] Removed ${hostnames.length} hostnames from no-go-list:`, hostnames);
            // submit visit
            getVisitsAndSubmit({ tab, source, sendResponse });
          })
          .catch((error) => {
            const errorContext = `[${source}] Failed to remove from no-go-list`;
            const errorMessage = onError(error, errorContext);
            sendResponse({ success: false, message: errorMessage });
          });
      } else {
        // Add hostname to go-list
        apiLib
          .setUserInfoKey({
            key: "go_list",
            value: { additions: hostnames.map((rule) => ({ rule, source: "user entered" })) },
          })
          .then(() => {
            // manually update our cache
            storage.setItem(GO_LIST_STORAGE_KEY, [...storage.getItem(GO_LIST_STORAGE_KEY, []), ...hostnames]);
            // resync user data with the server just in case
            syncUserData({ source });
            console.log(`[${source}] Added ${hostnames.length} hostnames to go-list:`, hostnames);
            // submit visit
            getVisitsAndSubmit({ tab, source, sendResponse });
          })
          .catch((error) => {
            const errorContext = `[${source}] Failed to add to go-list`;
            const errorMessage = onError(error, errorContext);
            sendResponse({ success: false, message: errorMessage });
          });
      }

      return true;
    }

    case "disable-auto-collect-for-hostnames": {
      const source = "ON_MESSAGE_DISABLE_AUTO_COLLECT_FOR_HOSTNAMES";
      const { isOptOut } = storage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY, defaultAccountSettings);
      const hostnames = message.hostnames;
      // const tab = message.tab;

      if (!hostnames.length) {
        sendResponse({ success: false, message: "Missing required hostnames array" });
        return;
      }

      if (isOptOut) {
        // Add hostname to no-go-list
        apiLib
          .setUserInfoKey({
            key: "no_go_list",
            value: { additions: hostnames.map((rule) => ({ rule, source: "user entered" })) },
          })
          .then(() => {
            // Manually update our cache
            storage.setItem(NO_GO_LIST_STORAGE_KEY, [...storage.getItem(NO_GO_LIST_STORAGE_KEY, []), ...hostnames]);
            // Resync user data with the server just in case
            syncUserData({ source });
            console.log(`[${source}] Added ${hostnames.length} hostnames to no-go-list:`, hostnames);
            // Delete matching visits
            // mihai: disabled 7/24/23
            // const lastRememberedMap = new Map(storage.getItem(LAST_REMEMBERED_MAP_STORAGE_KEY, []));
            // const tabWasRemembered = !!lastRememberedMap.get(extractCleanUrl(tab.url));
            // runPromisesInSequence(hostnames.map((hostname) => deleteAllVisitsByHostname({ hostname, source }))).then(
            //   () => {
            //     if (tabWasRemembered) {
            //       chrome.tabs
            //         .sendMessage(tab.id, {
            //           action: "update-url-state",
            //           url: tab.url,
            //           isRemembered: false,
            //         })
            //         .catch(() => {
            //           // noop
            //         });
            //       resetExtensionIcon({ tabId: tab.id, isDarkMode });
            //     }
            //   }
            // );
            sendResponse({ success: true });
          })
          .catch((error) => {
            const errorContext = `[${source}] Failed to add to no-go-list`;
            const errorMessage = onError(error, errorContext);
            sendResponse({ success: false, message: errorMessage });
          });
      } else {
        // Remove hostname from go-list
        apiLib
          .setUserInfoKey({ key: "go_list", value: { removals: hostnames.map((rule) => ({ rule })) } })
          .then(() => {
            // Manually update our cache
            storage.setItem(
              GO_LIST_STORAGE_KEY,
              storage.getItem(GO_LIST_STORAGE_KEY, []).filter((h) => !hostnames.includes(h))
            );
            // Resync user data with the server just in case
            syncUserData({ source });
            console.log(`[${source}] Removed ${hostnames.length} hostnames from go-list:`, hostnames);
            sendResponse({ success: true });
          })
          .catch((error) => {
            const errorContext = `[${source}] Failed to remove from go-list`;
            const errorMessage = onError(error, errorContext);
            sendResponse({ success: false, message: errorMessage });
          });
      }

      return true;
    }

    case "get-user-data": {
      pollForStorageInit(
        () => {
          sendResponse({
            success: true,
            goList: storage.getItem(GO_LIST_STORAGE_KEY, []),
            noGoList: storage.getItem(NO_GO_LIST_STORAGE_KEY, []),
            accountSettings: storage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY, defaultAccountSettings),
          });
        },
        () => {
          sendResponse({ success: false, message: "Timed out waiting for storage init" });
        }
      );
      return true;
    }

    case "sync-user-data": {
      pollForStorageInit(
        () => {
          syncUserData({ source: "ON_MESSAGE_SYNC_USER_DATA" })
            .then((response) => {
              sendResponse({
                success: true,
                goList: response.goList,
                noGoList: response.noGoList,
                accountSettings: response.accountSettings,
              });
            })
            .catch((error) => {
              sendResponse({ success: false, message: errorToString(error) });
            });
        },
        () => {
          sendResponse({ success: false, message: "Timed out waiting for storage init" });
        }
      );
      return true;
    }

    case "subscribe-feed-url": {
      const { feedUrl } = message;
      const source = "ON_MESSAGE_SUBSCRIBE_FEED_URL";

      getCurrentUser()
        .then(() => {
          subscribeToFeedUrl({ feedUrl, sendResponse, source });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            message: onError(error, `[${source}] Failed to get current user`),
          });
        });
      return true;
    }

    case "load-annotations-for-url": {
      apiLib
        .loadAnnotationsForUrl({ url: message.url || sender.tab.url })
        .then((annotations) => {
          sendResponse({
            success: true,
            annotations,
          });
        })
        .catch((error) => {
          sendResponse({ success: false, message: errorToString(error) });
        });
      return true;
    }

    case "keep-to-daily-log": {
      const card = message.card;
      if (!card) {
        sendResponse({ success: false, message: "Missing required card object" });
        return;
      }

      apiLib
        .updateAnnotationsForLog({
          cards: [card],
        })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, message: errorToString(error) });
        });

      return true;
    }

    case "update-annotations-for-url": {
      // Update and then delete (separate steps that could fail)
      const needsUpdate = message.updated?.length > 0;
      const needsRemove = message.removed?.length > 0;

      const doUpdate = () => {
        return apiLib.updateAnnotationsForUrl({
          url: message.url || sender.tab.url,
          cards: message.updated,
        });
      };
      const doRemove = () => {
        return apiLib.deleteAnnotations({ ids: message.removed.map((c) => c.id) });
      };
      const respondSuccess = () => {
        sendResponse({ success: true });
      };
      const respondError = ({ error, step }) => {
        sendResponse({ success: false, message: errorToString(error), step });
      };
      if (needsUpdate) {
        doUpdate()
          .then(() => {
            if (needsRemove) {
              doRemove()
                .then(respondSuccess)
                .catch((error) => {
                  respondError({ error, step: "remove" });
                });
            } else {
              respondSuccess();
            }
          })
          .catch((error) => {
            respondError({ error, step: "update" });
          });
      } else if (needsRemove) {
        doRemove()
          .then(respondSuccess)
          .catch((error) => respondError({ error, step: "remove" }));
      } else {
        sendResponse({ success: true });
      }

      // Async
      if (needsUpdate || needsRemove) {
        return true;
      }
      break;
    }

    case "get-last-remembered-ts": {
      pollForStorageInit(
        () => {
          const lastRememberedMap = new Map(storage.getItem(LAST_REMEMBERED_MAP_STORAGE_KEY, []));
          sendResponse({
            success: true,
            lastRememberedTs: lastRememberedMap.get(extractCleanUrl(message.url || sender.tab.url)),
          });
        },
        () => {
          sendResponse({ success: false, message: "Timed out waiting for storage init" });
        }
      );

      return true;
    }

    case "get-last-subscribed-ts": {
      pollForStorageInit(
        () => {
          const subscribedMap = new Map(storage.getItem(SUBSCRIBED_MAP_STORAGE_KEY, []));
          sendResponse({
            success: true,
            lastSubscribedTs: message.feedUrl ? subscribedMap.get(message.feedUrl) : undefined,
          });
        },
        () => {
          sendResponse({ success: false, message: "Timed out waiting for storage init" });
        }
      );

      return true;
    }

    case "send-feedback-email": {
      chrome.tabs.create({ url: "mailto:hello@re-collect.ai?subject=Feedback" }, function (tab) {
        setTimeout(function () {
          chrome.tabs.remove(tab.id);
        }, 500);
      });
      sendResponse({ success: true });
      break;
    }

    case "get-app-version": {
      const appVersion = storage.getItem(APP_VERSION_STORAGE_KEY, "0");
      const lastAppVersion = storage.getItem(LAST_APP_VERSION_STORAGE_KEY, "0");
      sendResponse({ success: true, appVersion, lastAppVersion });
      break;
    }

    case "set-app-version-seen": {
      const appVersion = storage.getItem(APP_VERSION_STORAGE_KEY, "0");
      storage.setItem(LAST_APP_VERSION_STORAGE_KEY, appVersion);
      sendResponse({ success: true });
      break;
    }

    case "recall": {
      if (!message.query) {
        sendResponse({ success: false });
        break;
      }

      const contextUrls = message.contextUrls || undefined;
      const connectionsOptions = apiLib.nobindMapOptionsToConnectionOptions({ options: message.options });

      loadConnections({ query: message.query, contextUrls, ...connectionsOptions, source: "ON_MESSAGE_SYNC_GO_LIST" })
        .then((response) => {
          const stackId = response.stack_id;
          const results = response.results;
          const mappedResults = results.map((r) => mapConnectionResultToModel(r));
          sendResponse({ success: true, query: message.query, results: mappedResults, stackId });
        })
        .catch((error) => {
          // View reports these errors
          sendResponse({ success: false, query: message.query, message: errorToString(error) });
        });
      return true;
    }

    case "proxy-do-recall": {
      const source = "ON_MESSAGE_DO_RECALL";
      doRecall({ tab: sender.tab, query: message.query, sendResponse, source });
      return true;
    }

    case "keep-result": {
      if (!message.result) {
        sendResponse({ success: false });
        break;
      }

      if (!message.id) {
        sendResponse({ success: false });
        break;
      }

      const port = ports[sender.tab.id];
      if (!port) {
        sendResponse({ success: false });
        break;
      }

      port.postMessage({ action: "keep-result", id: message.id, result: message.result });
      sendResponse({ success: true });
      break;
    }

    case "log-attention": {
      logAttentionSessions({ sessions: message.sessions });
      sendResponse({ success: true });
      break;
    }

    case "load-thumbnail-from-s3-path": {
      // Note this is not using the apiLib version! See note above implementation as to why
      loadThumbnailFromS3Path(message.path)
        .then((response) => {
          sendResponse({ success: true, data: response.data }); // data will be a binary string
        })
        .catch((error) => {
          sendResponse({ success: false, error: errorToString(error) });
        });
      return true;
    }

    case "set-dark-mode": {
      isDarkMode = message.isDarkMode;

      if (storage.initialized) {
        if (message.isDarkMode !== isDarkMode) {
          storage.setItem(IS_DARK_MODE_STORAGE_KEY, isDarkMode);

          // Note: this will reset the extension icon not modify the icon for this specific tab
          // If someone switches dark mode after the fact the tabs with custom icon overrides do
          // _not_ get updated. And we can't check since we can't query the active icon...
          resetExtensionIcon({ isDarkMode });
        }
      } else {
        needsDarkModeStorageSync = true;
      }
      sendResponse({ success: true });
      break;
    }

    case "create-new-tab": {
      const url = message.url;
      if (url) {
        // TODO get active tab ID and append it:
        // chrome.tabs.create({ url: `${url}?tid=${id}` });
        chrome.tabs.create({ url });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
      break;
    }

    case "auto-recall": {
      // Fake auto recall
      setTimeout(() => {
        sendResponse({ success: true, sentences: [] });
        // sendResponse({ success: true, sentences: Math.random() < 0.2 ? [] : undefined });
      }, 1000);
      return true;
    }

    case "log-feedback-event": {
      const { event } = message;
      FeedbackEventsManager.logEvent(event);
      sendResponse({ success: true });
      break;
    }

    default: {
      console.log(`[ON_MESSAGE_ERROR] Unexpected message action: ${message.action}`);
      sendResponse({ success: false, message: `Unexpected message action: ${message.action}` });
    }
  }
});

// Keep track of open communication channels from web-client to extension:
let ports = {};
chrome.runtime.onConnectExternal.addListener((p) => {
  const tabId = p.sender.tab.id;
  console.log("[ON_CONNECT_EXTERNAL] Connected", tabId);

  ports[tabId] = p;
  // p.onMessage.addListener((m) => {});
  p.onDisconnect.addListener(() => {
    delete ports[tabId];
    console.log("[ON_CONNECT_EXTERNAL] Disconnected", tabId);
  });
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.stage && message.stage !== APP_STAGE) {
    sendResponse({
      success: false,
      message: `Mismatched deployment stage. Expecting ${APP_STAGE} got ${message.stage}`,
    });
    return;
  }

  switch (message.action) {
    case "login": {
      const source = "ON_MESSAGE_EXTERNAL_LOGIN";
      // Note: every open tab will do this when it loads - on dev builds this happens at the same time (hot reload)
      // This code should handle being run multiple times even if it won't happen in prod
      if (!message.session) {
        sendResponse({ success: false, message: "Missing required message.session" });
        break;
      }
      authenticateWithSession({ session: message.session, config })
        .then((session) => {
          sendResponse({ success: true, session, version: APP_VERSION });
          identifyLoggedInUser();
          syncUserData({ source });
          syncSubscriptionData({ source });
          resetExtensionIcon({ isDarkMode });
          syncTabCheckedIconsWithCachedState({ source });
          syncTabInfoForOpenTabs({ source });
        })
        .catch((error) => {
          sendResponse({ success: false, message: errorToString(error) });
        });
      return true;
    }

    case "activate-tab": {
      if (!message.tabId) {
        sendResponse({ success: false });
        break;
      }

      chrome.tabs
        .update(message.tabId, { active: true })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, message: errorToString(error) });
        });
      return true;
    }

    case "logout": {
      logOut({ source: "ON_MESSAGE_EXTERNAL_LOGOUT" })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, message: errorToString(error) });
        });
      return true;
    }

    case "get-history": {
      if (!message.goList) {
        sendResponse({ success: false, message: "Missing required message.goList" });
        break;
      }

      getHistory({ goList: message.goList })
        .then((history) => {
          sendResponse({ success: true, history });
        })
        .catch((error) => {
          const errorContext = `[ON_MESSAGE_EXTERNAL_GET_HISTORY] Failed to get history`;
          const errorMessage = onError(error, errorContext);
          sendResponse({ success: false, message: errorMessage });
        });
      return true;
    }

    case "get-full-history": {
      if (!message.noGoList) {
        sendResponse({ success: false, message: "Missing required message.noGoList" });
        break;
      }

      getHistory({ noGoList: message.noGoList })
        .then((history) => {
          sendResponse({ success: true, history });
        })
        .catch((error) => {
          const errorContext = `[ON_MESSAGE_EXTERNAL_GET_HISTORY] Failed to get history`;
          const errorMessage = onError(error, errorContext);
          sendResponse({ success: false, message: errorMessage });
        });
      return true;
    }

    case "get-bookmarks": {
      getBookmarks()
        .then((bookmarks) => {
          sendResponse({ success: true, bookmarks });
        })
        .catch((error) => {
          const errorContext = `[ON_MESSAGE_EXTERNAL_GET_BOOKMARKS] Failed to get bookmarks`;
          const errorMessage = onError(error, errorContext);
          sendResponse({ success: false, message: errorMessage });
        });
      return true;
    }

    case "version": {
      sendResponse({ success: true, version: APP_VERSION });
      break;
    }

    case "request-update": {
      chrome.runtime.requestUpdateCheck();
      sendResponse({ success: true });
      break;
    }

    case "sync-go-list": // deprecated
    case "sync-user-data": {
      syncUserData({ source: "ON_MESSAGE_EXTERNAL_SYNC_USER_DATA" })
        .then((response) => {
          sendResponse({
            success: true,
            goList: response.goList,
            noGoList: response.noGoList,
            accountSettings: response.accountSettings,
          });
        })
        .catch((error) => {
          sendResponse({ success: false, message: errorToString(error) });
        });
      return true;
    }

    case "sync-subscription-data": {
      pollForStorageInit(
        () => {
          syncSubscriptionData({ source: "ON_MESSAGE_EXTERNAL_SYNC_SUBSCRIPTION_DATA" })
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({ success: false, message: errorToString(error) });
            });
        },
        () => {
          sendResponse({ success: false, message: "Timed out waiting for storage init" });
        }
      );
      return true;
    }

    case "do-recall": {
      const source = "ON_MESSAGE_EXTERNAL_DO_RECALL";
      doRecall({ tab: sender.tab, query: message.query, sendResponse, source });
      return true;
    }

    case "forget-urls": {
      if (!message.urls?.length) {
        sendResponse({ success: false, message: "Missing expected set of urls" });
      }
      forgetUrls(message.urls);
      sendResponse({ success: true });
      break;
    }

    default: {
      console.log(`[ON_MESSAGE_EXTERNAL] Unexpected message action: ${message.action}`);
      sendResponse({ success: false, message: `Unexpected message action: ${message.action}` });
    }
  }
});

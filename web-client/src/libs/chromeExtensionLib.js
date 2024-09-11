import { DEBUG, APP_STAGE } from "../config";

/* global chrome */
/* global global */

export const prodExtensionId = "ckknoiklamidahaeloleomneofegpjfl";
// To generate (via https://stackoverflow.com/a/46739698):
// openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem
// key
// openssl rsa -in key.pem -pubout -outform DER | openssl base64 -A
// extension ID
// openssl rsa -in key.pem -pubout -outform DER | shasum -a 256 | head -c32 | tr 0-9a-f a-p
export const devExtensionId = "bkejaimdpoaagdbamhbjceifigpgaomj";
export const extensionId = ["dev", "wip", "local"].includes(APP_STAGE) ? devExtensionId : prodExtensionId;

export function pingChromeExtension(extensionId) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "version" }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve({ ...response, extensionId });
      }
    });
  });
}

export function requestExtensionUpdate(extensionId) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "request-update" }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve({ ...response, extensionId });
      }
    });
  });
}

export function getHistory({ extensionId, goList }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "get-history", goList }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
}

export function getFullHistory({ extensionId, noGoList }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "get-full-history", noGoList }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
}

export function getBookmarks({ extensionId }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "get-bookmarks" }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
}

export function transferAuthSession({ extensionId, session, stage }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "login", session, stage }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
}

export function revokeAuthSession({ extensionId, stage }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "logout", stage }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
}

export function syncUserData({ extensionId }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "sync-user-data" }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}

export function syncSubscriptionData({ extensionId }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "sync-subscription-data" }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}

export function forgetUrls({ extensionId, urls = [] }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "forget-urls", urls }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}

export function doRecall({ extensionId, query }) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) reject("Chromium browser required");

    chrome.runtime.sendMessage(extensionId, { action: "do-recall", query }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}

export function canInstallExtension() {
  return global && typeof global.chrome !== "undefined";
}

export function openChromeExtensionInstaller(extensionId) {
  const link = `https://chrome.google.com/webstore/detail/${extensionId}`;
  global.open(link, "_blank", "height=800,width=1100");
}

function _poll({ extensionId, times, maxTimes, delay, resolve, reject }) {
  if (DEBUG) {
    console.log("pollForChromeExtension:", times);
  }
  pingChromeExtension(extensionId)
    .then((response) => {
      resolve(response);
    })
    .catch((error) => {
      if (times < maxTimes) {
        setTimeout(() => _poll({ extensionId, times: times + 1, maxTimes, delay, resolve, reject }), delay);
      } else {
        reject(new Error("Timed out waiting for extension installation", { cause: error }));
      }
    });
}

export function pollForChromeExtension({ extensionId, times = 0, maxTimes = 30, delay = 1000 }) {
  return new Promise((resolve, reject) => {
    _poll({ extensionId, times, maxTimes, delay, resolve, reject });
  });
}

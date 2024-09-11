import { binaryStringToBlob } from "blob-util";

export function doAppVersionSync() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "get-app-version" }, (response) => {
      if (!response) {
        reject({ message: chrome.runtime.lastError?.message, cause: chrome.runtime.lastError });
      } else if (!response.success) {
        reject({ message: response.message });
      } else {
        resolve({ appVersion: response.appVersion, lastAppVersion: response.lastAppVersion });
      }
    });
  });
}

export function doMarkAppVersionSeen() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "set-app-version-seen" }, (response) => {
      if (!response) {
        reject({ message: chrome.runtime.lastError?.message, cause: chrome.runtime.lastError });
      } else if (!response.success) {
        reject({ message: response.message });
      } else {
        resolve();
      }
    });
  });
}

export function doRecall({ query, contextUrls, options }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "recall", query, contextUrls, options }, (response) => {
      if (!response) {
        reject({ message: chrome.runtime.lastError?.message, cause: chrome.runtime.lastError, query });
      } else if (!response.success) {
        reject({ message: response.message, query });
      } else {
        resolve({ results: response.results, query, stackId: response.stackId, options });
      }
    });
  });
}

export function loadCurrentTab() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "get-current-tab" }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      }
      resolve(response.tab);
    });
  });
}

export function submitVisit({ tab }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "submit-visit", tab }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      }
      resolve(response);
    });
  });
}

export function forgetVisit({ tab }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "forget-visit", tab }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      }
      resolve(response);
    });
  });
}

export function optIn({ tab, hostnames }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "enable-auto-collect-for-hostnames", tab, hostnames }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      }
      resolve(response);
    });
  });
}

export function optOut({ tab, hostnames }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "disable-auto-collect-for-hostnames", tab, hostnames }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      }
      resolve(response);
    });
  });
}

export function artifactTypeForTabInfo(tabInfo) {
  // These have to mirror the artifact types in web-client!
  let artifactType = "web-article";
  if (tabInfo.isTweet) {
    artifactType = "tweet-thread";
  } else if (tabInfo.isPDF) {
    artifactType = "pdf";
  } else if (tabInfo.isYouTube) {
    artifactType = "youtube-video-transcript";
  }

  return artifactType;
}

export const logOut = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "logout" }, (response) => {
      if (response.success) {
        window.location.reload(false);
        resolve();
      } else {
        reject(response.message);
      }
    });
  });
};

export function loadUserData() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "get-user-data" }, (response) => {
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

export function loadLastRememberedTs({ url } = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "get-last-remembered-ts", url }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response.lastRememberedTs);
      }
    });
  });
}

export function loadLastSubscribedTs({ feedUrl }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "get-last-subscribed-ts", feedUrl }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response.lastSubscribedTs);
      }
    });
  });
}

export function subscribeFeedUrl({ feedUrl }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "subscribe-feed-url", feedUrl }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      }
      resolve(response);
    });
  });
}

export function loadCurrentUser() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "get-current-user" }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response.user);
      }
    });
  });
}

export function doLaunchApp(appUrl) {
  chrome.runtime.sendMessage({ action: "create-new-tab", url: appUrl });
}

export function loadAnnotationsForUrl({ url } = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "load-annotations-for-url", url }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response.annotations);
      }
    });
  });
}

export function updateAnnotationsForDailyLog({ card }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "keep-to-daily-log", card }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response.annotations);
      }
    });
  });
}

export function updateAnnotationsForUrl({ url, removed, updated }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "update-annotations-for-url", url, removed, updated }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve(response.annotations);
      }
    });
  });
}

export function logFeedbackEvent({ action, query, score, stackId, sentenceNumber, contextUrl }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "log-feedback-event", event: { action, query, score, stackId, sentenceNumber, contextUrl } },
      (response) => {
        if (!response) {
          reject(chrome.runtime.lastError);
        } else if (!response.success) {
          reject(new Error(response.message));
        } else {
          resolve();
        }
      }
    );
  });
}

export function logAttentionSessions({ sessions }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "log-attention", sessions }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        resolve();
      }
    });
  });
}

export function loadThumbnailFromS3Path(path) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "load-thumbnail-from-s3-path", path }, (response) => {
      if (!response) {
        reject(chrome.runtime.lastError);
      } else if (!response.success) {
        reject(new Error(response.message));
      } else {
        // Data expected to be a binary string
        const blob = binaryStringToBlob(response.data.toString("binary"));
        resolve({ data: blob });
      }
    });
  });
}

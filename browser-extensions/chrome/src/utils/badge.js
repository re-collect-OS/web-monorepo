export function resetExtensionIcon({ tabId, isDarkMode } = {}) {
  chrome.action.setIcon({
    ...(tabId ? { tabId } : {}),
    path: {
      48: isDarkMode ? "icon48-dark.png" : "icon48.png",
    },
  });
}

export function setErrorExtensionIcon({ tabId, isDarkMode } = {}) {
  chrome.action.setIcon({
    ...(tabId ? { tabId } : {}),
    path: {
      48: isDarkMode ? "icon48-dark-error.png" : "icon48-error.png",
    },
  });
}

export function setCheckedExtensionIcon({ tabId, isDarkMode }) {
  chrome.action.setIcon({
    tabId,
    path: {
      48: isDarkMode ? "icon48-dark-submitted.png" : "icon48-submitted.png",
    },
  });
}

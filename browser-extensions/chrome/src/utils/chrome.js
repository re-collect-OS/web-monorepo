// Workaround: https://bugs.chromium.org/p/chromium/issues/detail?id=1191971
// https://stackoverflow.com/a/67244340
export function onTabUrlUpdated(tabId) {
  return new Promise((resolve, reject) => {
    const onUpdated = (id, info) => id === tabId && info.url && done(true);
    const onRemoved = (id) => id === tabId && done(false);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    function done(ok) {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      (ok ? resolve : reject)();
    }
  });
}

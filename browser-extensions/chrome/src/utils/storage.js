// Use a cache in front of chrome.storage.local so we can respond to
// auth storage get calls synchronously.

function getAllStorageLocalData() {
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.local.
    chrome.storage.local.get(null, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
}

class CustomStorage {
  constructor() {
    this.cache = {};
    this.initialized = false;
  }

  init() {
    return new Promise((resolve, reject) => {
      if (this.initialized) {
        resolve(false);
      } else {
        getAllStorageLocalData()
          .then((items) => {
            Object.assign(this.cache, items);
            this.initialized = true;
            resolve(true);
          })
          .catch((error) => reject(error));
      }
    });
  }

  clear() {
    this.cache = {};
    chrome.storage.local.clear();
  }

  setItem(key, value) {
    this.cache[key] = value;
    const obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj);
  }

  getItem(key, defaultValue = null) {
    if (key in this.cache) {
      return this.cache[key];
    }
    return defaultValue;
  }

  removeItem(key) {
    delete this.cache[key];
    chrome.storage.local.remove(key);
  }
}

const instance = new CustomStorage();

export default instance;

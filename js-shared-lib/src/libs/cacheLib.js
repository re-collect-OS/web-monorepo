/*global caches*/

const CACHE_NAME = "recollect";

const isBrowser = typeof window !== "undefined";

class CacheUtil {
  constructor() {
    this.didInit = false;
    this._init();
  }

  _init() {
    if (isBrowser && "caches" in window) {
      caches
        .open(CACHE_NAME)
        .then((cache) => {
          this.cache = cache;
        })
        .catch((err) => {
          console.error("cacheLib: failed to load cache with error:", err);
        })
        .finally(() => {
          this.didInit = true;
        });
    }
  }

  put(url, response) {
    return new Promise((resolve, reject) => {
      if (!this.cache) {
        reject("Cache could not be initalized");
      }

      this.cache
        .put(url, response)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }

  match(url) {
    return this.cache?.match(url);
  }

  clear() {
    if (!this.cache) return;

    return this.cache.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          return this.cache.delete(key);
        })
      )
    );
  }
}

export const AppCache = new CacheUtil();

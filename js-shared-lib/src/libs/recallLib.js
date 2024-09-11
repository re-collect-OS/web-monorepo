import debounce from "../utils/debounce";
import { currentTimestamp } from "../utils/date";

function generateCacheKey({ query, options }) {
  return JSON.stringify({ query, ...(options || {}) }).replace(/[\n\r \"\{\}]/g, "");
}

export class RecallManager {
  constructor({ metadata = {}, doRecall, onStart, onSuccess, onError, debug }) {
    this.debug = debug;
    this.metadata = metadata;
    this.doRecall = doRecall;
    this.onStart = onStart;
    this.onSuccess = onSuccess;
    this.onError = onError;
    this.jobs = {};
    this._debouncedDoRecall = debounce(this._doRecall.bind(this), { delay: 1200 });
  }

  update({ query, metadata }) {
    this.metadata = metadata;

    const cleanQuery = query?.trim();
    if (!cleanQuery) {
      // Cancel all active jobs
      this._cancelActiveJobs();
      return;
    }

    this._debouncedDoRecall(cleanQuery);
  }

  clear() {
    this.jobs = {};
  }

  _doRecall(query) {
    const cacheKey = generateCacheKey({ query, options: this.metadata.options });
    const cachedJob = this.jobs[cacheKey];

    if (cachedJob && cachedJob.active) {
      if (this.debug) {
        console.info("[RECALL] Ignoring re-running active job with query", { query });
      }

      return;
    } else if (cachedJob) {
      if (cachedJob.ts - currentTimestamp() < 3600 / 2) {
        // Only reuse results < 30 mins old
        if (this.debug) {
          console.info("[RECALL] Using cached answer for query", { query, cachedJob });
        }

        if (this.onSuccess) {
          this.onSuccess({ ...cachedJob });
        }

        return;
      } else {
        if (this.debug) {
          console.info("[RECALL] Ignoring stale cached answer for query", { query });
        }
      }
    }

    this._cancelActiveJobs();
    this.jobs[cacheKey] = {
      query,
      ts: currentTimestamp(),
      stackId: null,
      matches: null,
      active: true,
      ...this.metadata,
    };

    if (this.debug) {
      console.info("[RECALL] Starting recall for query", { query, metadata: this.metadata });
    }

    if (this.onStart) {
      this.onStart({ query });
    }

    this.doRecall({ query, ...(this.metadata || {}) })
      .then(({ results: matches, query: originalQuery, stackId, options: originalOptions }) => {
        const originalCacheKey = generateCacheKey({ query: originalQuery, options: originalOptions });
        const job = this.jobs[originalCacheKey];
        if (job) {
          job.matches = matches;
          job.stackId = stackId;

          if (job.active) {
            if (this.onSuccess) {
              this.onSuccess({ ...job });
            }
          } else {
            if (this.debug) {
              const activeJob = this.jobs.find((job) => job.active === true);
              console.info("[RECALL] Ignoring results for stale query", {
                query: originalQuery,
                currentQuery: activeJob?.query,
              });
            }
          }

          // Don't cache if we got no results back because we don't expect
          // this to be a valid response with the current design - might change
          // in the future though...
          if (job.matches?.length) {
            job.active = false;
          } else {
            delete this.jobs[originalCacheKey];
          }
        }
      })
      .catch(({ message, query: originalQuery, options: originalOptions }) => {
        const originalCacheKey = generateCacheKey({ query: originalQuery, options: originalOptions });
        if (this.jobs[originalQuery]?.active) {
          if (this.onError) {
            this.onError({ error: new Error(message), query: originalQuery });
          }
        }
        // We only keep track of successful requests
        delete this.jobs[originalQuery];
      });
  }

  _cancelActiveJobs() {
    for (let query in this.jobs) {
      const job = this.jobs[query];
      if (job.active) {
        job.active = false;
        // TODO cancel active request (how?)
        // means keeping track of active requests in background service worker?
      }
    }
  }
}

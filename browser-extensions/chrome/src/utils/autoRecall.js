const AUTO_RECALL_PRIORITY_TIMER_MS = 5 * 1000;
const AUTO_RECALL_TIMER_MS = 30 * 1000;

export class AutoRecallPoller {
  constructor({ doAutoRecall }) {
    this._doAutoRecall = doAutoRecall;
    this.autoRecallTimeoutId = null;
    this.autoRecallTimeoutDate = null;
    this.stopTrackingTabVisibility; // set when visibility tracking starts
  }

  // Track tab visibility and reschedule active scheduled auto-recall polling task
  // only if the remaining time is longer than the priority polling window:
  startTrackingTabVisibility() {
    const onVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        this.autoRecallTimeoutDate &&
        (new Date().getTime() - this.autoRecallTimeoutDate.getTime()) * 1000 > AUTO_RECALL_PRIORITY_TIMER_MS
      ) {
        this.startPolling();
      }
    };
    window.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }

  startPolling({ isLeading } = {}) {
    this.autoRecallTimeoutDate = new Date();

    if (this.autoRecallTimeoutId) {
      clearTimeout(this.autoRecallTimeoutId);
    }

    // If document is visible schedule on priority queue, otherwise go slower
    const delay = document.visibilityState === "visible" ? AUTO_RECALL_PRIORITY_TIMER_MS : AUTO_RECALL_TIMER_MS;
    if (isLeading) {
      this.doAutoRecall();
      this.stopTrackingTabVisibility = this.startTrackingTabVisibility();
    } else {
      this.autoRecallTimeoutId = setTimeout(() => {
        this.doAutoRecall();
        this.autoRecallTimeoutId = null;
        this.autoRecallTimeoutDate = null;
      }, delay);
    }
  }

  doAutoRecall() {
    const doCleanup = () => {
      // If we were tracking tab visibility, stop
      if (this.stopTrackingTabVisibility) {
        this.stopTrackingTabVisibility();
      }
    };

    if (this._doAutoRecall) {
      this._doAutoRecall().finally(() => {
        doCleanup();
      });
    } else {
      doCleanup();
    }
  }
}

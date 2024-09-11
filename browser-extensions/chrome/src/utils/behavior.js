// Behavior tracking
import { debounce } from "js-shared-lib";
import { v4 as uuidv4 } from "uuid";

import { DEBUG } from "../config";

const SOURCE = "ATTENTION TRACKER";
const SESSION_TIMEOUT = 15 * 60 * 1000;

function getScrollDepth() {
  const scrollHeight = document.documentElement.scrollTop + window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  return Math.round((scrollHeight / documentHeight) * 100);
}

export default class BehaviorTracker {
  constructor() {
    this.callback = null;
    this.initialized = false;
    this.timeoutTimer = null;
    this.visibilityState = document.visibilityState;

    this.readySessions = [];

    // Session state
    const now = new Date().getTime();
    this.sessionState = this.initNewSession(now);

    // We track always from the start
    this.initialize();
  }

  initialize() {
    if (DEBUG) {
      console.log(`[${SOURCE}] Initializing`);
    }
    this.sessionState.startTime = new Date().getTime();
    this.initialized = true;
    this._bindDOM();

    if (this.visibilityState === "visible") {
      this.sessionState.startedVisibleTime = this.sessionState.startTime;
    }
  }

  startReporting(callback) {
    if (!this.initialized) {
      return;
    }

    if (DEBUG) {
      console.log(`[${SOURCE}] Starting to report`);
    }

    if (callback) {
      this.callback = callback;
    }
  }

  stopTracking() {
    if (DEBUG) {
      console.log(`[${SOURCE}] Stopping`);
    }

    if (this.initialized) {
      this._teardownDOM();
      this.callback = null;
    }
  }

  reset() {
    if (DEBUG) {
      console.log(`[${SOURCE}] Resetting`);
    }
    this.flush(true);
    this.callback = null;
    const now = new Date().getTime();
    this.sessionState = this.initNewSession(now);
  }

  flush(isFinal) {
    if (this.callback) {
      if (DEBUG) {
        console.log(`[${SOURCE}] Flushing...`);
      }

      // Conclude any final sessions for the final flush
      if (isFinal) {
        // Make sure to update the duration (otherwise it only updates on visibility changes)
        if (this.sessionState.startedVisibleTime) {
          const now = new Date().getTime();
          this.sessionState.duration += Math.round((now - this.sessionState.startedVisibleTime) / 1000);
          this.sessionState.startedVisibleTime = 0;
        }
      }

      this.startNewSession();

      // Flush
      if (this.readySessions.length) {
        this.callback([...this.readySessions]);
        this.readySessions = [];
      } else {
        if (DEBUG) {
          console.log(`[${SOURCE}] No ready sessions to flush...`);
        }
      }
    }
  }

  // Internal

  initNewSession(startTime) {
    return {
      // Session
      url: window.location.href,
      id: uuidv4(),
      startTime: startTime,
      endTime: 0,
      // Timing
      startedVisibleTime: 0, // When tab became visible
      endedVisibleTime: 0, // When tab became hidden
      duration: 0, // Accumulated time in tab
      // Stats
      scrollDepth: 0, // Max scroll depth
      clickCount: 0,
      highlightCount: 0,
    };
  }

  startNewSession() {
    const now = new Date().getTime();
    this.sessionState.endTime = now;

    if (this.sessionState.duration > 0) {
      this.readySessions.push(this.sessionState);
    } else {
      if (DEBUG) {
        console.log(`[${SOURCE}] Dropping no duration session`, { ...this.sessionState });
      }
    }

    this.sessionState = this.initNewSession(now);
  }

  handleEvent(event) {
    switch (event.type) {
      case "click": {
        this._handleClick(event);
        break;
      }
      case "scroll": {
        this._handleScroll(event);
        break;
      }
      case "visibilitychange": {
        this._handleVisibilityChange(event);
        break;
      }
      case "beforeunload": {
        this._handleBeforeUnload(event);
        break;
      }
    }
  }

  _bindDOM() {
    this._handleScrollDebounced = debounce(this._handleScroll, { delay: 50, edges: true });
    window.addEventListener("scroll", this);
    window.addEventListener("click", this);
    window.addEventListener("beforeunload", this);
    document.addEventListener("visibilitychange", this, false);
  }

  _teardownDOM() {
    window.removeEventListener("scroll", this);
    window.removeEventListener("click", this);
    window.removeEventListener("beforeunload", this);
    document.removeEventListener("visibilitychange", this, false);
  }

  _handleScroll() {
    const scrollDepth = getScrollDepth();
    if (scrollDepth > this.sessionState.scrollDepth) {
      this.sessionState.scrollDepth = scrollDepth;
    }
  }

  _handleClick() {
    if (!window.getSelection().isCollapsed) {
      // If we have an active selection at the end of the click it's a text selection
      this.sessionState.highlightCount += 1;
    } else {
      // Otherwise it's a click
      this.sessionState.clickCount += 1;
    }
  }

  _handleBeforeUnload() {
    // Attempt to flush what we have before window closes
    this.flush(true);
  }

  _handleVisibilityChange() {
    const now = new Date().getTime();

    this.visibilityState = document.visibilityState;

    if (this.visibilityState === "visible") {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      } else {
        // We already timed out!
        // Reset session
        this.sessionState = this.initNewSession(now);
      }
      // Reset the started visible time:
      this.sessionState.startedVisibleTime = now;
    } else if (this.visibilityState === "hidden") {
      // Mark when tab visibility changed so we can time out session
      this.sessionState.endedVisibleTime = now;
      // Update total tab duration
      if (this.sessionState.startedVisibleTime) {
        this.sessionState.duration += Math.round((now - this.sessionState.startedVisibleTime) / 1000);
        this.sessionState.startedVisibleTime = 0;
      }

      this.timeoutTimer = setTimeout(() => {
        if (DEBUG) {
          console.log(`[${SOURCE}] Session timed out!`);
        }
        // Flush and start a new session
        this.flush();
        this.timeoutTimer = null;
      }, SESSION_TIMEOUT);
    }

    if (DEBUG) {
      console.log(`[${SOURCE}] Visibility change to ${this.visibilityState}`, this.sessionState);
    }
  }
}

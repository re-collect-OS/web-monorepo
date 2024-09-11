// Track positive and negative customer generated feedback events for pieces of content

import { getISOTimestamp } from "../utils/date";

// TODO persist to storage and on init try to flush

const VALID_ACTIONS = ["keep", "copy", "mark_good", "mark_bad", "expand"];
const AUTO_SAVE_TIMEOUT = 1000;

class FeedbackEventsService {
  constructor({ source, doSubmit }) {
    this.source = source;
    this.doSubmit = doSubmit;

    this.state = "idle";
    this.lastSyncTs = null;
    this.queue = [];
    this.lastSyncTimer = null;
    this.autoSaveTimer = null;
  }

  logEvent({ action, query, score, stackId, sentenceNumber, contextUrl, contextIdeaId }) {
    if (!VALID_ACTIONS.includes(action)) {
      throw new Error(`[FeedbackEventsService] Unexpected action: ${action}`);
    }

    this.queue.push({
      action,
      query,
      score,
      stack_id: stackId,
      sentence_number: sentenceNumber,
      ...(contextUrl ? { context_url: contextUrl } : {}),
      ...(contextIdeaId ? { context_idea_id: contextIdeaId } : {}),
    });

    this._scheduleFlush();
  }

  _flush() {
    return new Promise((resolve) => {
      const queueSnapshot = [...this.queue];
      const events = queueSnapshot.map((e) => ({ ...e, source: this.source }));
      this.queue = [];

      this.status = "loading";
      this.doSubmit(events)
        .then(() => {
          resolve();
          this.lastSyncTs = getISOTimestamp();
          this.status = "success";
        })
        .catch((error) => {
          this.status = "error";
          // Unexpected - re-queue but don't flush
          // Once we persist this will get flushed on next load if no other events trigger this session
          this.queue = [...this.queue, ...queueSnapshot];

          const data = error.response?.data;
          const status = error.response?.status;
          console.warn(`[FeedbackEventsService] flush failed with status error: ${status}`, { data });
        });
    });
  }

  _scheduleFlush() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(
      function () {
        this.lastSyncTimer = this.autoSaveTimer;
        this._flush().finally(() => {
          // If we didn't schedule any future sync, clean up
          if (this.lastSyncTimer === this.autoSaveTimer) {
            this.lastSyncTimer = null;
            this.autoSaveTimer = null;
          }
        });
      }.bind(this),
      AUTO_SAVE_TIMEOUT
    );
  }
}

export default FeedbackEventsService;

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import produce, { enableMapSet } from "immer";
enableMapSet();

import {
  currentTimestamp,
  errorToString,
  extractCleanUrl,
  extractHostname,
  getISOTimestamp,
  GlobalNoAutoCollectList,
  GlobalNoGoList,
  isPDFUrl,
  isTweetUrl,
  isYouTubeUrl,
  makeAppleNotesKeptCard,
  makeGoogleScreenshotKeptCard,
  makeGoogleDocKeptCard,
  makeArticleKeptCard,
  makeHighlightCard,
  makeIdeaNoteKeptCard,
  makeKeptCard,
  makeNoteCard,
  makePDFKeptCard,
  makeTweetKeptCard,
  RecallManager,
  stripWWW,
  testVisitAgainstNoGoList,
} from "js-shared-lib";

import { events, analyticsService, sources } from "./libs/analyticsLib";
import {
  artifactTypeForTabInfo,
  doAppVersionSync,
  doMarkAppVersionSeen,
  doRecall,
  forgetVisit,
  loadAnnotationsForUrl,
  loadCurrentTab,
  loadCurrentUser,
  loadLastRememberedTs,
  loadLastSubscribedTs,
  loadUserData,
  logAttentionSessions,
  logOut,
  optIn,
  optOut,
  submitVisit,
  subscribeFeedUrl,
  updateAnnotationsForDailyLog,
  updateAnnotationsForUrl,
} from "./libs/contentLib";
import { DomAnnotator } from "./utils/annotations";
import { injectDOMHighlight, destroyDOMHighlight } from "./utils/highlight";
import BehaviorTracker from "./utils/behavior";

import { DEBUG } from "./config";

import { PAGE_NAV_TAB, RECALL_NAV_TAB } from "./components/popover";
import { POPOVER_ANIMATION_TIME } from "./components/popover-panel";

const AUTO_SAVE_TIMEOUT = 1000;
let lastSyncTimer = null;
let autoSaveTimer = null;

// Warn if user tries to leave or reload while we have a pending sync
window.addEventListener("beforeunload", (event) => {
  if (autoSaveTimer) {
    event.returnValue = "Changes you made may not be saved.";
  }
});

const onlyUniqueIds = (i, index, self) => self.findIndex((j) => j.id === i.id) === index;

// Given a list of nodes, capture and sort nodes by visual position in the page (top bottom, left right)
function captureVisualyHighlightOrder({ nodes }) {
  // Capture highlight y position
  const list = [];
  nodes.forEach(({ id, spans }) => {
    const top = spans[0].getBoundingClientRect().top;
    const left = spans[0].getBoundingClientRect().left;
    list.push({ id, top, left });
  });
  // Visually sort
  list.sort((a, b) => {
    const diff = a.top - b.top;
    if (diff === 0) {
      return a.left - b.left;
    }
    return diff;
  });
  // Build visual linked list
  const linkedList = [];
  for (let i = 0; i < list.length; i++) {
    linkedList.push({ id: list[i].id, visuallyAfterId: i === 0 ? null : list[i - 1].id });
  }
  return linkedList; // [{id, visuallyAfterId}]
}

// Mutate the visuallyAfterId card state in place
function mutateHighlightsVisualOrder({ state }) {
  const linkedList = captureVisualyHighlightOrder({ nodes: state.annotations.nodes });
  linkedList.forEach(({ id, visuallyAfterId }) => {
    const index = state.annotations.cards.findIndex((c) => c.id === id);
    if (index >= 0) {
      state.annotations.cards[index] = state._doUpdateCardModel({
        card: state.annotations.cards[index],
        visuallyAfterId,
      });
    }
  });
}

function schedule(sync) {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(function () {
    lastSyncTimer = autoSaveTimer;
    sync().finally(() => {
      // If we didn't schedule any future sync, clean up so that navigation doesn't remain blocked
      if (lastSyncTimer === autoSaveTimer) {
        lastSyncTimer = null;
        autoSaveTimer = null;
      }
    });
  }, AUTO_SAVE_TIMEOUT);
}

const onlyUnique = (value, index, self) => self.indexOf(value) === index;
const globalNoGoList = GlobalNoGoList.map((h) => stripWWW(h)).filter(onlyUnique);
const globalNoAutoCollectList = GlobalNoAutoCollectList.map((h) => stripWWW(h)).filter(onlyUnique);
const notOnNoGoList = testVisitAgainstNoGoList.bind(null, globalNoGoList);
const notOnNoAutoCollectList = testVisitAgainstNoGoList.bind(null, globalNoAutoCollectList);

const log = (config) => (set, get, api) =>
  config(
    (args) => {
      set(args);
      if (DEBUG) {
        console.info("%c  @NEW STATE  ", "background: lavender; color: black", get());
      }
    },
    get,
    api
  );

const immer = (config) => (set, get, api) => config((fn) => set(produce(fn)), get, api);

const annotationsMiddleware = (config) => (set, get, api) =>
  config(
    (args, meta) => {
      const prevState = get();
      set(args);
      const state = get();

      if (!prevState.tabState.isRemembered && state.tabState.isRemembered) {
        // Sync annotations if tab remembered state changed
        if (DEBUG) {
          console.info("[ ] Starting annotations sync...");
        }
        state.doAnnotationsSync();
      } else if (prevState.tabState.isRemembered && !state.tabState.isRemembered && state.annotations.cards.length) {
        // If we have cards but the article was forgotten, locally forget cards
        // Expecting server to delete the cards on forget
        state.doAnnotationsClear({ shouldSkipPersist: true });
      }

      // Respond to annotation mutations
      if (prevState.annotations.cards !== state.annotations.cards) {
        if (DEBUG) {
          console.info("%c  @CARDS MUTATED  ", "background: pink; color: black");
        }
        const prevCards = prevState.annotations.cards || [];
        const cards = state.annotations.cards || [];

        // Schedule card sync
        const cardIds = cards.map((c) => c.id);
        const removed = prevCards.filter((c) => !cardIds.includes(c.id));
        const updated = cards.filter((c) => c.updatedAt > state.annotations.lastSyncedAt);
        if (removed.length || updated.length) {
          // Skip persting when we expect the change was mirrored on the server (aka clear)
          if (meta?.shouldSkipPersist) {
            if (DEBUG) {
              console.info("[!] Skipping scheduling annotation persist because article not remembered");
            }
          } else {
            if (DEBUG) {
              console.info("[+] Scheduling annotation sync...", { removed, updated });
            }
            schedule(state.doAnnotationsPersist.bind(null, { removed, updated, ts: currentTimestamp() }));
          }
        }
        // Collapse popover if we removed the last card
        if (
          !cards.length &&
          prevState.popover.isOpen &&
          prevState.popover.isExpanded &&
          prevState.popover.navTab === PAGE_NAV_TAB
        ) {
          state.doPopoverExpand(false);
        }
        // Clean up removed annotations from DOM
        if (prevCards.length !== cards.length) {
          removed.forEach((h) => {
            const spans = prevState.annotations.nodes.find((n) => n.id === h.id)?.spans;
            if (spans) {
              spans.forEach((el) => {
                destroyDOMHighlight(el);
              });
            }
          });
        }
      }
    },
    get,
    api
  );
const isValidUser = (u) => u && Object.keys(u).length > 0;

function isProbablyReaderable() {
  return window.isProbablyReaderable(document);
}

function findFeedUrl() {
  let href = document.head?.querySelector('link[rel="alternate"][type="application/rss+xml"]')?.getAttribute("href");
  if (!href) {
    return undefined;
  }

  if (href.startsWith("//")) {
    // Handle protocol agnostic path
    return `https://${href.substring(2)}`;
  } else if (href.startsWith("/")) {
    // Handle relative path
    return `${window.location.protocol}//${window.location.host}/${href.substring(1)}`;
  }

  return href;
}

const TWITTER_HOSTNAMES = ["twitter.com", "x.com"];
const YOUTUBE_HOSTNAMES = ["youtube.com"];

function loadTabInfo({ id, url, title }) {
  return new Promise((resolve) => {
    const hostname = extractHostname(url);
    const isTwitterDomain = TWITTER_HOSTNAMES.includes(hostname);
    const isPDF = isPDFUrl(url);
    const isTweet = isTweetUrl(url);
    const isYouTubeDomain = YOUTUBE_HOSTNAMES.includes(hostname);
    const isYouTube = isYouTubeUrl(url);

    const baseTabInfo = {
      id,
      title,
      url,
      hostname,
      isPDF,
      isProbablyArticle: false,
      isTwitterDomain,
      isTweet,
      isYouTubeDomain,
      isYouTube,
    };

    if (isPDF || isTweet || isTwitterDomain || isYouTube || isYouTubeDomain) {
      return resolve({
        ...baseTabInfo,
      });
    }

    // If we made it this far we do a content check for probably article
    try {
      return resolve({
        ...baseTabInfo,
        isProbablyArticle: isProbablyReaderable(),
        feedUrl: findFeedUrl(),
      });
    } catch (error) {
      // noop
      console.log("Failed to check if probably an article", error);
      return resolve(baseTabInfo);
    }
  });
}

// Slices

const createVersionSlice = (set) => ({
  version: {
    status: "idle",
    errorMsg: null,
    appVersion: null,
    lastAppVersion: null,
  },

  doVersionSync: () => {
    set((state) => {
      state.version.status = "loading";
      state.version.errorMsg = null;
    });

    doAppVersionSync()
      .then(({ appVersion, lastAppVersion }) => {
        set((state) => {
          state.version.status = "success";
          state.version.errorMsg = null;
          state.version.appVersion = appVersion;
          state.version.lastAppVersion = lastAppVersion;
        });
      })
      .catch((error) => {
        set((state) => {
          state.version.status = "error";
          state.version.errorMsg = error.message;
        });
      });
  },

  doVersionMarkSeen: () => {
    let prevLastVersion;

    set((state) => {
      prevLastVersion = state.version.lastAppVersion;
      state.version.lastAppVersion = state.version.appVersion;
    });

    doMarkAppVersionSeen().catch((error) => {
      console.log("[!] Failed to set last app version. Restoring...", error.message);
      set((state) => {
        state.version.lastAppVersion = prevLastVersion;
      });
    });
  },
});

const createAuthSlice = (set, get) => ({
  user: {
    status: "idle",
    errorMsg: null,
    username: null,
  },

  doAuthLogout: () => {
    logOut()
      .then(() => {
        set((state) => {
          state.user.status = "idle";
          state.user.username = null;
          state.user.errorMsg = null;
        });
      })
      .catch((errorMsg) => {
        set((state) => {
          // state.user.errorMsg = errorMsg;
          // TODO why did I do this? to route the error to the UI?
          state.tabState.error = errorMsg;
        });
      });
  },

  // Called on tab injection and when the popover UI is invoked
  // We can't only do it once because the tab could be very stale
  doAuthAppInit: ({ tab } = {}) => {
    const prevState = get();
    return new Promise((resolve, reject) => {
      prevState
        .doAuthSync()
        // We skip this now because the extension pushes tab info and we
        // can't differentiate between first load and future navigation events
        // .then(() => prevState.doTabInfoSync({ tab }))
        // .then(() => prevState.doTabStateSync())
        .then(() => resolve(tab))
        .catch((error) => reject(error));
    });
  },

  doAuthAppDeInit: () => {
    timeoutTimerCleanup();
  },

  doAuthSync: () => {
    return new Promise((resolve, reject) => {
      set((state) => {
        state.user.status = "loading";
      });

      loadCurrentUser()
        .then((user) => {
          const username = user.attributes.email;
          analyticsService.setUserId(username);
          if (isValidUser(user)) {
            set((state) => {
              state.user.status = "success";
              state.user.username = username;
              state.user.errorMsg = null;
            });
            resolve(true);
          } else {
            // Reset
            set((state) => {
              state.user.status = "idle";
            });
            resolve(false);
          }
        })
        .catch((error) => {
          const errorMsg = errorToString(error);
          console.log("Failed to get current user:", errorMsg);
          set((state) => {
            state.user.status = "idle";
            state.user.errorMsg = errorMsg;
          });
          reject(error);
        });
    });
  },
});

const createAnnotationsSlice = (set, get) => ({
  annotations: {
    syncStatus: "idle", // "idle", "loading",  "error"
    lastSyncedAt: 0,
    cards: [],
    nodes: [],
    openId: null,
  },

  doAnnotationsPersist: async ({ removed, updated, ts }) => {
    // Check we have changes
    if (!removed.length && !updated.length) {
      if (DEBUG) {
        console.warn("[WARN] got a persist call with no dirty cards.");
      }
      return;
    }
    // Check we don't have a sync in progress already
    if (get().annotations.syncStatus === "loading") {
      if (DEBUG) {
        console.warn(`[i] Rescheduled sync...`);
      }
      schedule(get().doAnnotationsPersist.bind(null, { removed, updated, ts }));
      return;
    }
    // Persist changes
    set((state) => {
      state.annotations.syncStatus = "loading";
    });
    try {
      await updateAnnotationsForUrl({ removed, updated });
      set((state) => {
        state.annotations.syncStatus = "idle";
        state.annotations.lastSyncedAt = ts;
      });
    } catch (error) {
      // TODO verify what system does when this happens
      // q1: what if delete fails but update succeeds?
      // q2: should we reschedule sync? depends on why it failed...
      if (DEBUG) {
        console.warn("[WARN] failed to persist card changes.", { error });
      }
      set((state) => {
        state.annotations.syncStatus = "error";
      });
    }
  },

  doAnnotationsClear: ({ shouldSkipPersist } = {}) => {
    // Reset
    set(
      (state) => {
        state.annotations.syncStatus = "idle";
        state.annotations.cards = [];
        state.annotations.nodes = [];
        state.annotations.lastSyncedAt = 0;
        state.annotations.openId = null;
      },
      { shouldSkipPersist }
    );
  },

  doAnnotationsSync: () => {
    loadAnnotationsForUrl()
      .then((annotations) => {
        const prevState = get(); // necessary to keep a reference to the store and not use the proxy in the click handler
        set((state) => {
          state.annotations.syncStatus = "idle";
          state.annotations.lastSyncedAt = currentTimestamp();
          // Merge
          // Don't want to blow away our local state
          // (important since we optimistically create a highlight which might trigger a remember which triggers a sync)
          // The only other way we can make this work is to enforce the order:
          // - 1. optimistically create highlight
          // - 2. trigger remember (doTabSubmitVisitIfNeeded)
          // - 3. persist highlight
          // - 4. sync highlights and replace state (annotationsMiddleware)
          // 3 and 4 happen async currently - to change this doTabSubmitVisitIfNeeded should persist highlights
          // before it marks the tab as "remembered" which kicks off the sync
          state.annotations.cards = [...annotations, ...state.annotations.cards]
            .filter(onlyUniqueIds)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          let nodes = [];
          annotations.forEach((a) => {
            if (a.type !== "highlight") {
              return;
            }

            const range = annotator.findRange({ text: a.text, beforeText: a.before, afterText: a.after });
            if (!range) {
              console.log("Failed to map highlight to document range");
              return;
            }

            const spans = injectDOMHighlight(range, (event) => {
              event.stopPropagation();
              prevState.doAnnotationOpenIdSet((prev) => (prev === a.id ? null : a.id));
            });
            nodes.push({ id: a.id, spans });
          });
          // Merge
          state.annotations.nodes = [...nodes, ...state.annotations.nodes].filter(onlyUniqueIds);
        });
      })
      .catch((error) => {
        if (DEBUG) {
          console.warn("[WARN] failed to load annotations", { error });
        }
        set((state) => {
          // TODO retry
          state.annotations.syncStatus = "error";
        });
      });
  },

  _doUpdateCardModel: ({ card, ...props }) => {
    let factory;
    switch (card.type) {
      case "kept":
        factory = makeKeptCard;
        break;
      case "note":
        factory = makeNoteCard;
        break;
      case "highlight":
        factory = makeHighlightCard;
        break;
      default:
        console.warn(`_doUpdateCardModel: unexpected card type ${card.type}`);
    }
    const updatedCard = { ...card, ...props, updatedAt: currentTimestamp() };

    return factory(updatedCard);
  },

  // Convenience function to update the note card associated with a different card
  doAnnotationsUpdateNoteForCard: ({ id, body }) => {
    const card = get().annotations.cards.find((a) => a.id === id);
    const hasNoteCard = !!card.parentId;

    // Note: expecting body to be null if it's an empty value equivalent
    if (!body) {
      if (hasNoteCard) {
        get().doAnnotationsRemoveCard({ id: card.parentId, shouldSplit: true });
      }
    } else {
      if (hasNoteCard) {
        get().doAnnotationsUpdateNoteCard({ id: card.parentId, body });
      } else {
        get().doAnnotationsAddNoteCard({ body, childId: card.id });
      }
    }
  },

  doAnnotationsAddNoteCard: ({ id, body, childId }) => {
    get().doTabSubmitVisitIfNeeded();

    const newNoteCard = makeNoteCard({ id: id || uuidv4(), body });
    set((state) => {
      state.annotations.cards.push(newNoteCard);
      // Update the child card to point to new note card
      if (childId) {
        const index = state.annotations.cards.findIndex((a) => a.id === childId);
        if (index >= 0) {
          const childCard = state.annotations.cards[index];
          state.annotations.cards[index] = get()._doUpdateCardModel({ card: childCard, parentId: newNoteCard.id });
        }
      }
    });

    return newNoteCard;
  },

  doAnnotationsUpdateNoteCard: ({ id, body }) => {
    const cards = [...get().annotations.cards];
    const index = cards.findIndex((a) => a.id === id);

    if (index >= 0) {
      const noteCard = cards[index];
      if (noteCard.type === "note") {
        set((state) => {
          state.annotations.cards[index] = makeNoteCard({ ...noteCard, body, updatedAt: currentTimestamp() });
        });
      }
    }
  },

  doAnnotationsAddKeptCardToDailyLog: ({ model, query }) => {
    let card;

    // TODO extract
    const baseProps = {
      id: uuidv4(),
      query,
      reason: null,
    };

    if (model.artifactType === "recollect-note") {
      card = makeIdeaNoteKeptCard({
        ...model,
        ...baseProps,
      });
    } else if (model.artifactType === "tweet-thread") {
      card = makeTweetKeptCard({
        ...model,
        ...baseProps,
      });
    } else if (model.artifactType === "pdf") {
      card = makePDFKeptCard({
        ...model,
        ...baseProps,
      });
    } else if (model.artifactType === "apple-note") {
      card = makeAppleNotesKeptCard({
        ...model,
        ...baseProps,
      });
    } else if (model.artifactType === "google-drive-screenshot") {
      card = makeGoogleScreenshotKeptCard({
        ...model,
        ...baseProps,
      });
    } else if (model.artifactType === "google-drive-doc") {
      card = makeGoogleDocKeptCard({
        ...model,
        ...baseProps,
      });
    } else {
      card = makeArticleKeptCard({
        ...model,
        ...baseProps,
      });
    }

    return new Promise((resolve, reject) => {
      updateAnnotationsForDailyLog({ card })
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  doAnnotationsAddKeptCard: ({ model, query }) => {
    get().doTabSubmitVisitIfNeeded();

    // TODO duplicated in web-client, extract into a mapping function they can share...
    // ex: MapConnectionsResultToKeptCard
    let card;

    const baseProps = {
      id: uuidv4(),
      query,
      reason: null,
    };

    if (model.artifactType === "recollect-note") {
      card = makeIdeaNoteKeptCard({
        ...model,
        ...baseProps,
      });
    } else if (model.artifactType === "tweet-thread") {
      card = makeTweetKeptCard({
        ...model,
        ...baseProps,
      });
    } else if (model.artifactType === "pdf") {
      card = makePDFKeptCard({
        ...model,
        ...baseProps,
      });
    } else {
      card = makeArticleKeptCard({
        ...model,
        ...baseProps,
      });
    }

    set((state) => {
      state.annotations.cards.push(card);
      state.popover.navTab = PAGE_NAV_TAB;
    });
  },

  doAnnotationsAddHiglightCard: ({ id, spans, url, text, before = "", after = "", visuallyAfterId = null }) => {
    get().doTabSubmitVisitIfNeeded();

    const card = makeHighlightCard({ id: id || uuidv4(), url, text, before, after, visuallyAfterId });

    set((state) => {
      state.annotations.cards.push(card);
      state.annotations.nodes.push({ id: card.id, spans });
      mutateHighlightsVisualOrder({ state });
    });
    return card;
  },

  doAnnotationsRemoveCard: ({ id, shouldSplit = false }) => {
    set((state) => {
      const cards = state.annotations.cards;
      const nodes = state.annotations.nodes;

      const cardIndex = cards.findIndex((c) => c.id === id);
      if (cardIndex >= 0) {
        const toRemove = [id];
        const card = cards[cardIndex];

        if (shouldSplit) {
          // To split means to disconnect any note child / parent card
          const childCardIndex = cards.findIndex((c) => c.parentId === card.id);
          if (childCardIndex >= 0) {
            cards[childCardIndex] = get()._doUpdateCardModel({ card: cards[childCardIndex], parentId: null });
          }
        } else {
          // To not split means to remove the linked card as well
          if (card.parentId) {
            // Remove parent note card
            toRemove.push(card.parentId);
          } else {
            // Remove card that points to this card
            const childCard = cards.find((c) => c.parentId === card.id);
            if (childCard) {
              toRemove.push(childCard.id);
            }
          }
        }

        // Remove cards backwards
        const toRemoveIndex = toRemove.map((id) => cards.findIndex((c) => c.id === id)).filter((i) => i >= 0);
        toRemoveIndex.sort().reverse();
        toRemoveIndex.forEach((index) => {
          cards.splice(index, 1);
        });
        // Note: important to filter out < 0 indexes as it otherwise removes backwards from the array!
        const nodesToRemoveIndex = toRemove.map((id) => nodes.findIndex((c) => c.id === id)).filter((i) => i >= 0);
        nodesToRemoveIndex.sort().reverse();

        nodesToRemoveIndex.forEach((index) => {
          nodes.splice(index, 1);
        });

        // Update visual order
        mutateHighlightsVisualOrder({ state });
      }
    });
  },

  doAnnotationOpenIdSet: (id) => {
    const _id = typeof id === "function" ? id(get().annotations.openId) : id;

    // Dismiss popover
    if (_id) {
      const prevState = get();
      if (prevState.popover.isOpen && !prevState.popover.isDismissing) {
        prevState.doPopoverOpen(false);
      }
    }

    set((state) => {
      state.annotations.openId = _id || null;
    });
  },
});

const createPopoverSlice = (set, get) => ({
  popover: {
    isOpen: false,
    isDismissing: false,
    isExpanded: false,
    navTab: PAGE_NAV_TAB,
    dismissTimeoutId: null,
    showNotifications: false,
    selectedCardId: null,
  },

  doPopoverOpen: (isOpen) => {
    const prevState = get();

    const isLogicallyOpen = prevState.popover.isDismissing ? false : prevState.popover.isOpen;
    const _isOpen = typeof isOpen === "function" ? isOpen(isLogicallyOpen) : isOpen;

    if (_isOpen === isLogicallyOpen) {
      return;
    }

    if (_isOpen) {
      if (prevState.popover.dismissTimeoutId) {
        clearTimeout(prevState.popover.dismissTimeoutId);
      }
      set((state) => {
        state.popover.dismissTimeoutId = null;
        state.popover.isOpen = true;
        state.popover.isDismissing = false;
      });
      // Dismiss active popover
      if (prevState.annotations.openId) {
        prevState.doAnnotationOpenIdSet(null);
      }
    } else {
      set((state) => {
        state.popover.isOpen = true;
        state.popover.isDismissing = true;
        state.popover.dismissTimeoutId = setTimeout(() => {
          set((state) => {
            state.popover.isOpen = false;
            state.popover.isDismissing = false;
            state.popover.dismissTimeoutId = null;
          });
        }, POPOVER_ANIMATION_TIME);
      });
    }
  },

  doPopoverExpand: (isExpanded) => {
    const _isExpanded = typeof isExpanded === "function" ? isExpanded(get().popover.isExpanded) : isExpanded;
    set((state) => {
      state.popover.isExpanded = _isExpanded || false;
      if (!_isExpanded && state.popover.isShowingAnnotations) {
        state.popover.isShowingAnnotations = false;
      }
    });
  },

  doPopoverShowAnnotations: () => {
    set((state) => {
      state.popover.isShowingAnnotations = true;
      state.popover.isExpanded = true;
    });
  },

  doPopoverNavTabSet: (navTab) => {
    const prevState = get();
    const _navTab = typeof navTab === "function" ? navTab(get().popover.navTab) : navTab;

    // Collapse on double click
    if (prevState.popover.navTab === _navTab && _navTab === PAGE_NAV_TAB && prevState.popover.isExpanded) {
      return void prevState.doPopoverExpand(false);
    }

    set((state) => {
      state.popover.navTab = _navTab || PAGE_NAV_TAB;
    });

    // Sync popover expand state with nav tab
    if (_navTab === RECALL_NAV_TAB && !prevState.popover.isExpanded) {
      prevState.doPopoverExpand(true);
    } else if (_navTab === PAGE_NAV_TAB && prevState.popover.isExpanded && !prevState.popover.isShowingAnnotations) {
      prevState.doPopoverExpand(false);
    }
  },

  doPopoverSelectCardSet: (selectedCardId) => {
    const _selectedCardId =
      typeof selectedCardId === "function" ? selectedCardId(get().popover.selectedCardId) : selectedCardId;
    set((state) => {
      state.popover.selectedCardId = _selectedCardId;
    });
  },

  doPopoverShowNotifications: (showNotifications) => {
    set((state) => {
      state.popover.showNotifications = showNotifications || false;
      if (showNotifications || state.popover.navTab === RECALL_NAV_TAB) {
        state.popover.isExpanded = true;
      } else {
        state.popover.isExpanded = false;
      }
    });
  },
});

let timeoutTimer = null;
const timeoutTimerCleanup = () => {
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
};

const createTabStateSlice = (set, get) => ({
  tabState: {
    status: "loading", //[loading, loaded, submitting_hostname, submitting_visit]
    error: null,
    canCollect: null,
    canAutoCollect: null,
    isAutoCollecting: null,
    isRemembered: null,
    lastRememberedTs: null,
    isSubscribed: null,
    lastSubscribedTs: null,
    canUseRecallFilters: null,
    wantsAttentionTracking: null,
    attentionTracker: new BehaviorTracker(),
  },

  doTabStateRememberedTimeGet: () => {
    const prevState = get();
    if (prevState.tabState.isRemembered && prevState.tabState.lastRememberedTs) {
      return new Date(prevState.tabState.lastRememberedTs);
    }
    return null;
  },

  // Syncs tab state with our cache and expect the extension to call doTabStateRememberedSet
  // if the tab state is updated in the background.
  doTabStateSync: () => {
    return new Promise((resolve, reject) => {
      const tabInfo = get().tabInfo;
      if (!tabInfo.url) {
        reject(new Error("Missing tab info - aborting tab state sync"));
        return;
      }

      timeoutTimer = setTimeout(() => {
        console.log("Loading timed out...", timeoutTimer);
        // Only clear the state if we've never succesfsully syncd before
        if (get().tabState.canCollect === null) {
          set((state) => {
            state.tabState.canCollect = false;
            state.tabState.status = "loaded";
            state.tabState.error = "Could not load tab";
          });
        }
        reject(new Error("Loading tab state timed out..."));
      }, 2000);

      Promise.all([
        loadUserData(),
        loadLastRememberedTs({ url: tabInfo.url }),
        loadLastSubscribedTs({ feedUrl: tabInfo.feedUrl }),
      ])
        .then(([{ goList, noGoList, accountSettings }, lastRememberedTs, lastSubscribedTs]) => {
          if (timeoutTimer !== null) {
            clearTimeout(timeoutTimer);
          }

          const { url, hostname, isTweet, isTwitterDomain, isYouTube, isYouTubeDomain } = tabInfo;
          const { isOptOut, defaultEngine, isAccountDeactivated, wantsAttentionTracking } = accountSettings;
          const canCollect =
            notOnNoGoList({ url }) && !(isTwitterDomain && !isTweet) && !(isYouTubeDomain && !isYouTube); // Don't allow collecting non-tweets from twitter or non-videos from YT
          const canAutoCollect = canCollect && notOnNoAutoCollectList({ url: url });
          const isOnGoList = goList?.includes(hostname);
          const isOnNoGoList = noGoList?.includes(hostname);
          const isAutoCollecting = isOptOut ? canAutoCollect && !isOnNoGoList : canAutoCollect && isOnGoList;
          const isRemembered = !!lastRememberedTs;
          const isSubscribed = !!lastSubscribedTs;

          set((state) => {
            state.tabState.lastRememberedTs = lastRememberedTs;
            state.tabState.lastSubscribedTs = lastSubscribedTs;
            state.tabState.canCollect = canCollect;
            state.tabState.canAutoCollect = canAutoCollect;
            state.tabState.isAutoCollecting = isAutoCollecting;
            state.tabState.isRemembered = isRemembered;
            state.tabState.isSubscribed = isSubscribed;
            state.tabState.canUseRecallFilters = defaultEngine === "paragraph-embedding-v2";
            state.tabState.wantsAttentionTracking = wantsAttentionTracking;
            state.tabState.isAccountDeactivated = isAccountDeactivated;
            state.tabState.status = "loaded";
            state.tabState.error = null;
          });

          resolve({ isRemembered, isSubscribed, canAutoCollect, isAutoCollecting });
        })
        .catch((error) => {
          console.log("Failed to sync tab state", error);
          set((state) => {
            state.tabState.canCollect = false;
            state.tabState.status = "loaded";
            state.tabState.error = null; // TODO hmm?
          });
          reject(new Error("Failed to sync tab state", { cause: error }));
        })
        .finally(timeoutTimerCleanup);
    });
  },

  doTabStateRememberedSet: ({ isRemembered, lastRememberedTs }) => {
    const tabInfo = get().tabInfo;
    if (!tabInfo.url) {
      return;
    }
    set((state) => {
      if (isRemembered) {
        state.tabState.lastRememberedTs = lastRememberedTs;
      } else if (state.tabState.lastRememberedTs) {
        state.tabState.lastRememberedTs = null;
      }
      state.tabState.isRemembered = isRemembered;
    });
  },

  doTabSubmitVisitIfNeeded: () => {
    const prevState = get();
    if (!prevState.tabState.isRemembered && prevState.tabState.status !== "submitting_visit") {
      get().doTabSubmitVisit();
    }
  },

  doTabSubmitVisit: () => {
    const tabInfo = get().tabInfo;
    if (!tabInfo.url) {
      return;
    }

    set((state) => {
      state.tabState.status = "submitting-visit";
      state.tabState.error = null;
    });

    submitVisit({ tab: { id: tabInfo.id, url: tabInfo.url, title: tabInfo.title } })
      .then(() => {
        set((state) => {
          state.tabState.status = "loaded";
          state.tabState.lastRememberedTs = getISOTimestamp();
          state.tabState.isRemembered = true;
          state.tabState.error = null;
        });
      })
      .catch((error) => {
        set((state) => {
          state.tabState.status = "loaded";
          state.tabState.error = errorToString(error);
        });
      });

    analyticsService.logEvent(events.popupArticleRemembered({ artifactType: artifactTypeForTabInfo(tabInfo) }));
  },

  doTabForgetVisit: () => {
    const tabInfo = get().tabInfo;
    if (!tabInfo.url) {
      return;
    }

    set((state) => {
      state.tabState.status = "submitting-visit";
      state.tabState.error = null;
    });

    forgetVisit({ tab: { id: tabInfo.id, url: tabInfo.url } })
      .then(() => {
        set((state) => {
          state.tabState.isRemembered = false;
          state.tabState.status = "loaded";
          state.tabState.error = null;
        });
      })
      .catch((error) => {
        set((state) => {
          state.tabState.error = errorToString(error);
        });
      });

    analyticsService.logEvent(events.popupArticleForgot({ artifactType: artifactTypeForTabInfo(tabInfo) }));
  },

  doTabOptIn: () => {
    const tabInfo = get().tabInfo;
    if (!tabInfo.url) {
      return;
    }

    set((state) => {
      state.tabState.status = "submitting-hostname";
      state.tabState.isAutoCollecting = true;
      state.tabState.error = null;
    });

    optIn({ tab: { id: tabInfo.id, url: tabInfo.url }, hostnames: [tabInfo.hostname] })
      .then(() => {
        set((state) => {
          state.tabState.status = "loaded";
          state.tabState.error = null;
        });
      })
      .catch((error) => {
        // Revert
        set((state) => {
          state.tabState.isAutoCollecting = false;
          state.tabState.error = errorToString(error);
        });
      });

    analyticsService.logEvent(events.popupOptedIn());
  },

  doTabOptOut: () => {
    const tabInfo = get().tabInfo;
    if (!tabInfo.url) {
      return;
    }

    set((state) => {
      state.tabState.status = "submitting-hostname";
      state.tabState.isAutoCollecting = false;
      state.tabState.error = null;
    });

    optOut({ tab: { id: tabInfo.id, url: tabInfo.url }, hostnames: [tabInfo.hostname] })
      .then(() => {
        set((state) => {
          state.tabState.status = "loaded";
          state.tabState.error = null;
        });
      })
      .catch((error) => {
        // Revert
        set((state) => {
          state.isAutoCollecting = true;
          state.tabState.error = errorToString(error);
        });
      });

    analyticsService.logEvent(events.popupOptedOut());
  },

  doTabSubscribe: () => {
    return new Promise((resolve, reject) => {
      const tabInfo = get().tabInfo;
      if (!tabInfo.feedUrl) {
        reject(new Error("Missing required feedUrl"));
        return;
      }

      subscribeFeedUrl({ feedUrl: tabInfo.feedUrl })
        .then(({ lastSubscribedTs }) => {
          set((state) => {
            state.tabState.isSubscribed = true;
            state.tabState.lastSubscribedTs = lastSubscribedTs;
          });
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
});

const createTabInfoSlice = (set, get) => ({
  tabInfo: {
    hostname: null,
    id: null,
    isPDF: null,
    isProbablyArticle: null,
    isTweet: null,
    title: null,
    url: null,
    feedUrl: null,
  },

  doTabInfoSync: ({ tab } = {}) => {
    const prevState = get();

    return new Promise((resolve, reject) => {
      const _doTabInfoLoad = (_tab) => {
        loadTabInfo(_tab).then((tabInfo) => {
          prevState.doTabInfoSet(tabInfo);
          // Reset attention tracker when URL changes:
          if (prevState.tabInfo.url && extractCleanUrl(prevState.tabInfo.url) !== extractCleanUrl(tabInfo.url)) {
            prevState.tabState.attentionTracker.reset();
          }
          resolve(tabInfo);
        });
      };
      if (tab) {
        _doTabInfoLoad(tab);
      } else {
        // Get current tab if we don't have one passed in through the initializing event
        loadCurrentTab()
          .then((tab) => {
            if (tab) {
              _doTabInfoLoad(tab);
            } else {
              reject(new Error("Did not get a valid active tab"));
            }
          })
          .catch((error) => {
            reject(error);
          });
      }
    });
  },

  doTabInfoSet: (tabInfo) => {
    set((state) => {
      state.tabInfo = tabInfo;
    });
  },
});

export const DEFAULT_RECALL_OPTIONS = {
  searchType: "exact",
  timeFilter: "any",
  typeFilter: "any",
  domainFilter: "any",
  source: "auto",
};

const createRecallSlice = (set, get) => ({
  recall: {
    status: "idle",
    query: null,
    options: { ...DEFAULT_RECALL_OPTIONS },
    areFiltersVisible: false,
    results: [],
    markedGoodResultIds: [],
    errorMsg: null,
    stackId: null,
    manager: new RecallManager({
      debug: DEBUG,
      doRecall: (params) => doRecall(params),
      onStart: () => {
        set((state) => {
          state.recall.status = "loading";
          state.recall.errorMsg = null;
        });
      },
      onSuccess: ({ matches, stackId, query: originalQuery }) => {
        set((state) => {
          state.recall.status = "success";
          state.recall.results = matches || [];
          state.recall.markedGoodResultIds = []; // reset
          state.recall.stackId = stackId;
          state.recall.errorMsg = null;
        });
        analyticsService.logEvent(events.recallDidQuery({ stackId, queryLength: originalQuery.length }));
      },
      onError: ({ error, query: originalQuery }) => {
        const errorMsg = errorToString(error);
        set((state) => {
          state.recall.status = "idle";
          state.recall.errorMsg = errorMsg;
        });
        analyticsService.logEvent(events.recallFailed({ error: errorMsg, queryLength: originalQuery.length }));
      },
    }),
  },
  doRecallFiltersOpen: (isOpen) => {
    set((state) => {
      if (typeof isOpen === "function") {
        isOpen = isOpen(state.recall.areFiltersVisible);
      }
      state.recall.areFiltersVisible = isOpen;

      analyticsService.logEvent(events.recallFiltersToggle());
    });
  },
  doRecallRemoveResult: ({ model }) => {
    set((state) => {
      state.recall.results = state.recall.results.filter((r) => r.matchSentence !== model.matchSentence);
    });
    analyticsService.logEvent(events.recallRemovedResult({ stackId: get().recall.stackId, stackIndex: model.index }));
  },
  doRecallMarkGoodResult: ({ model }) => {
    set((state) => {
      state.recall.markedGoodResultIds.push(model.matchSentence);
    });
    analyticsService.logEvent(
      events.recallMarkedGoodResult({ stackId: get().recall.stackId, stackIndex: model.index })
    );
  },
  doRecall: ({ query, url, options }) => {
    const prevQuery = get().recall.query;
    const recallManager = get().recall.manager;
    const prevOptions = get().recall.options;

    // We've changed the options but not the query, carry over:
    if (query === undefined) {
      query = prevQuery;
    }

    options = { ...(options || prevOptions) };

    if (options.source === "auto") {
      if (query?.trim().split(" ").length <= 2) {
        if (options.searchType !== "exact") {
          options.searchType = "exact";
        }
      } else {
        if (options.searchType !== "related") {
          options.searchType = "related";
        }
      }
    }

    if (prevQuery && !query) {
      // Clear stack
      set((state) => {
        state.recall.status = "idle";
        state.recall.results = [];
        state.recall.markedGoodResultIds = [];
        state.recall.query = null;
        state.recall.options = { ...DEFAULT_RECALL_OPTIONS };
        state.recall.stackId = null;
        state.recall.errorMsg = null;
      });
    } else {
      recallManager.update({ query, metadata: { contextUrls: [url], ...(options ? { options } : {}) } });
      set((state) => {
        // Preemtively set loading state before the manager actually starts loading
        // otherwise we have a temporary 'no results' state
        // TODO rethink state machine
        if (query) {
          state.recall.status = "loading";
        }
        state.recall.query = query;
        state.recall.options = options;
      });
    }
  },
});

export const useStore = create(
  log(
    immer(
      annotationsMiddleware((set, get) => ({
        ...createAuthSlice(set, get),
        ...createVersionSlice(set, get),
        ...createRecallSlice(set, get),
        ...createTabInfoSlice(set, get),
        ...createTabStateSlice(set, get),
        ...createPopoverSlice(set, get),
        ...createAnnotationsSlice(set, get),
      }))
    )
  )
);

const annotator = new DomAnnotator();

function resyncTabInfoState(prevState) {
  prevState
    .doTabInfoSync()
    .then(() => {
      prevState.doTabStateSync();
    })
    .catch((error) => {
      console.info("[!] Failed to get active tab:", { error });
    });
}

// Delay title mutation detection a bit to avoid race condition with page rendering
// twitter.com was struggling
let observeTitleAttempts = 0;
const maxObserveTitleAttempts = 3;
function attemptObserveTitle() {
  if (document?.title) {
    try {
      new MutationObserver(function () {
        const prevState = useStore.getState();
        if (DEBUG) {
          console.info("[!] Document title mutated", { title: document.title });
        }
        resyncTabInfoState(prevState);
      }).observe(document.querySelector("title"), { childList: true });
    } catch (error) {
      console.warn("[!] Failed to observe title mutations", error);
    }
  } else {
    if (observeTitleAttempts < maxObserveTitleAttempts) {
      console.warn("[!] Failed to start observing document title. Retrying...");
      setTimeout(attemptObserveTitle, 200);
    } else {
      console.warn("[!] Failed to start observing document title");
    }
  }
}
window.addEventListener("load", attemptObserveTitle);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const prevState = useStore.getState();
  switch (request.action) {
    case "check-script-loaded": {
      sendResponse({ success: true });
      break;
    }
    case "is-probably-article": {
      sendResponse({ success: true, isProbablyArticle: isProbablyReaderable(), feedUrl: findFeedUrl() });
      break;
    }
    case "get-feed-url": {
      sendResponse({ success: true, feedUrl: findFeedUrl() });
      break;
    }
    case "get-page-source": {
      sendResponse({
        success: true,
        content: document.getElementsByTagName("html")[0].outerHTML,
        title: document.title,
      });
      break;
    }
    case "do-recall": {
      prevState
        .doAuthAppInit()
        .then(() => {
          prevState.doRecall({ query: request.query, url: request.tab.url });
          prevState.doPopoverNavTabSet(RECALL_NAV_TAB);
          prevState.doPopoverOpen(true);
        })
        .catch(() => {
          prevState.doPopoverOpen(true);
        });
      sendResponse({ success: true });
      break;
    }
    case "annotate-selection": {
      prevState
        .doAuthSync()
        .then(() => {
          const selection = window.getSelection();
          const selectedText = selection.toString().trim();
          let range = selection.getRangeAt(0);

          const beforeText = annotator._getTextBeforeRange(range, 30);
          const afterText = annotator._getTextAfterRange(range, 30);
          range = annotator.findRange({ text: selectedText, beforeText, afterText });
          if (!range) {
            console.log("Failed to map selection to document range");
            return;
          }

          const id = uuidv4();
          const spans = injectDOMHighlight(range, (event) => {
            event.stopPropagation();
            prevState.doAnnotationOpenIdSet((prev) => (prev === id ? null : id));
          });

          prevState.doAnnotationsAddHiglightCard({
            id,
            spans,
            url: prevState.tabInfo.url,
            text: selectedText,
            before: beforeText,
            after: afterText,
          });
          prevState.doAnnotationOpenIdSet(id);

          window.getSelection().removeAllRanges();
        })
        .catch(() => {
          prevState.doPopoverOpen(true);
        });

      sendResponse({ success: true });
      analyticsService.logEvent(events.annotationCreatedHighlight({ source: sources.CONTEXT_MENU }));

      break;
    }
    case "do-toggle-popover": {
      if (request.tab) {
        if (prevState.popover.isOpen) {
          prevState.doPopoverOpen((prev) => !prev);
        } else {
          prevState
            .doAuthAppInit({ tab: request.tab })
            .then(() => {
              prevState.doPopoverExpand(false);
              prevState.doPopoverShowNotifications(false);
              prevState.doPopoverNavTabSet(PAGE_NAV_TAB);
              prevState.doPopoverOpen((prev) => !prev);
              prevState.doVersionSync();
            })
            .catch(() => {
              prevState.doPopoverOpen(true);
            });
        }

        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
      break;
    }
    case "update-tab-info": {
      // Purposefully not using the request.tab.title because the `complete` event in background fires before
      // render. SPAs will not have had a chance to update the title at this point.

      // We rely on a mutation observer watching the title to re-sync but we must handle the initial sync here:
      if (!prevState.tabInfo?.title) {
        resyncTabInfoState(prevState);
      }

      sendResponse({ success: true });
      break;
    }
    case "update-url-state": {
      if (prevState.tabInfo.url === request.url) {
        prevState.doTabStateRememberedSet({
          isRemembered: request.isRemembered,
          lastRememberedTs: request.lastRememberedTs,
        });
      }
      sendResponse({ success: true });
      break;
    }
    case "alert-error": {
      if (request.message) {
        alert(request.message);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
      break;
    }
    case "do-auto-recall-poll": {
      // const cachedSentences = sessionStorage.getItem(AUTO_RECALL_SESSION_STORAGE_KEY);
      // if (cachedSentences) {
      //   highlightSentencesInDOM(JSON.parse(cachedSentences));
      // } else {
      //   autoRecallPoller.startPolling({ isLeading: true });
      // }
      sendResponse({ success: true });
      break;
    }
    case "start-attention-tracking": {
      prevState.tabState.attentionTracker?.startReporting((sessions) => {
        logAttentionSessions({ sessions });
      });
      sendResponse({ success: true });
      break;
    }
    default: {
      sendResponse({ success: false, message: `[CONTENT_SCRIPT] Unexpected message action: ${request.action}` });
    }
  }
});

// import { AutoRecallPoller } from "./utils/autoRecall";
//
// const AUTO_RECALL_SESSION_STORAGE_KEY = "recollect_auto_recall_sentences";
// const autoRecallPoller = new AutoRecallPoller({ doAutoRecall });
//
// function doAutoRecall() {
//   return new Promise((resolve, reject) => {
//     chrome.runtime
//       .sendMessage({ action: "auto-recall" })
//       .then((response) => {
//         let sentences = response.sentences;
//         if (sentences) {
//           // Example: https://towardsdatascience.com/foundations-of-nlp-explained-visually-beam-search-how-it-works-1586b9849a24
//           sentences = [
//             "Transformers Explained Visually: Overview of functionality (How Transformers are used, and why they are better than RNNs.",
//             "Also, if you are interested in NLP, I have a few more articles that you might find useful.",
//           ];
//           highlightSentencesInDOM(sentences);
//           sessionStorage.setItem(AUTO_RECALL_SESSION_STORAGE_KEY, JSON.stringify(sentences));
//           resolve();
//         } else {
//           autoRecallPoller.startPolling();
//         }
//       })
//       .catch((error) => {
//         console.log("[i] Failed to auto-recall", error);
//         reject(error);
//       });
//   });
// }
//
// function onHighlightClick(query, event) {
//   // Don't mess with interactive elements
//   if (["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
//     return;
//   }
//   event.preventDefault();
//   chrome.runtime.sendMessage({ action: "proxy-do-recall", query });
// }
//
// function highlightSentencesInDOM(sentences) {
//   const annotator = new DomAnnotator();
//   const find = ({ text, ...rest }) => {
//     const range = annotator.findRange({ text, ...rest });
//     if (range) {
//       return { query: text, range };
//     }
//   };
//   const highlights = sentences.map((text) => find({ text })).filter(Boolean);
//   if (highlights.length) {
//     highlights.forEach(({ range, query }) => {
//       injectDOMHighlight(range, onHighlightClick.bind(null, query));
//     });
//   }
// }

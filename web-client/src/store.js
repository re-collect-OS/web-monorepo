import { create } from "zustand";
import { persist } from "zustand/middleware";
import { enableMapSet, enablePatches, produceWithPatches, applyPatches } from "immer";
import { Auth } from "aws-amplify";
import * as Sentry from "@sentry/react";
import {
  currentTimestamp,
  errorToString,
  getCenterAlignedRect,
  getCommonRect,
  getISOTimestamp,
  getMatchSentenceFromModel,
  isoDateStrToLocalDateStr,
  makeAppleNotesKeptCard,
  makeArticleKeptCard,
  makeGoogleScreenshotKeptCard,
  makeGoogleDocKeptCard,
  makeDocument,
  makeHighlightCard,
  makeIdeaNoteKeptCard,
  makeKeptCard,
  makeNoteCard,
  makePDFKeptCard,
  makeQueryStack,
  makeTweetKeptCard,
  makeUserData,
  mapConnectionResultToModel,
  onlyUnique,
  RecallManager,
  ZERO_RECT,
  AppCache,
} from "js-shared-lib";

import apiLib from "./libs/apiLib";
import FeedbackEventsManager from "./libs/feedbackEventsLib";
import { buildExpandedStackUrl } from "./utils/path";

const {
  downloadFile,
  createDocument,
  deleteDocument,
  loadConnections,
  loadDocuments,
  loadDocument,
  checkDocumentNeedsSync,
  loadUserData,
  loadUserInfo,
  saveDocument,
  setUserInfo,
  setUserSetting,
  nobindMapOptionsToConnectionOptions,
  ACCOUNT_STATUS_UNKNOWN,
  USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING,
  USER_SETTING_HAS_DISMISSED_ONBOARDING_PROGRESS,
  USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS,
  USER_SETTING_IS_OPT_OUT,
  USER_SETTING_WANTS_ATTENTION_TRACKING,
} = apiLib;

import {
  canInstallExtension,
  transferAuthSession,
  revokeAuthSession,
  extensionId,
  syncSubscriptionData,
} from "./libs/chromeExtensionLib";
import { onError } from "./libs/errorLib";
import { migrateDocumentContent, makeDocumentContent, SCHEMA } from "./libs/documentLib";
import { v4 as uuidv4 } from "uuid";
import { events, analyticsService, sources } from "./libs/analyticsLib";
import {
  addPatchesToUndoStack,
  hasRedoPatches,
  hasUndoPatches,
  clearUndoStack,
  getRedoPatches,
  getUndoPatches,
  syncPatchesWithState,
  beginUndoCapture,
  endUndoCapture,
} from "./libs/undoLib";
import { DEBUG, APP_VERSION, APP_STAGE, DEFAULT_EDITOR_LAYOUT } from "./config";

// Middleware

// Enable immer change tracking for Map data structures
enableMapSet();
// Our undo system relies on immer patches. See: https://immerjs.github.io/immer/patches/
enablePatches();

const CLIPBOARD_MIMETYPE = "recollect/clipboard";
const CARDS_KEY_PREFIX = "cards_";

let sessionTimeoutTimer = null;
const channel = new BroadcastChannel("app-data");

const immer = (config) => (set, get, api) => {
  return config(
    (fn, meta) => {
      set({
        doDocumentUndo: ({ id, source }) => {
          if (!hasUndoPatches()) return;

          const state = get();
          const inversePatches = getUndoPatches({ state });
          const patches = syncPatchesWithState({ patches: inversePatches, state });
          if (DEBUG) {
            console.info("%c  @APPLYING UNDO  ", "background: lavender; color: black", {
              inversePatches,
              syncedPatches: patches,
            });
          }

          set(applyPatches(get(), patches));
          if (DEBUG) {
            console.info("%c  @NEW STATE  ", "background: lavender; color: black", get());
          }

          schedule(get().doDocumentsSync);

          analyticsService.logEvent(events.documentUndidChange({ documentId: id, source }));
        },
        doDocumentRedo: ({ id, source }) => {
          if (!hasRedoPatches()) return;

          const state = get();
          const forwardPatches = getRedoPatches({ state });
          const patches = syncPatchesWithState({ patches: forwardPatches, state });
          if (DEBUG) {
            console.info("%c  @APPLYING REDO  ", "background: pink; color: black", {
              forwardPatches,
              syncedPatches: patches,
            });
          }
          set(applyPatches(get(), patches));
          if (DEBUG) {
            console.info("%c  @NEW STATE  ", "background: lightgreen; color: black", get());
          }

          schedule(get().doDocumentsSync);

          analyticsService.logEvent(events.documentRedidChange({ documentId: id, source }));
        },
        doDocumentBeginUndoCapture: () => beginUndoCapture(),
        doDocumentEndUndoCapture: () => endUndoCapture(),
        doDocumentUndoClear: () => clearUndoStack(),
      });
      const state = get();
      const [nextState, patches, inversePatches] = produceWithPatches(state, fn);

      if (DEBUG) {
        console.info("%c  @APPLYING  ", "background: lightblue; color: black", patches, fn);
      }
      if (meta?.undoStack) {
        addPatchesToUndoStack({
          patches,
          inversePatches,
          state,
          dirtyKeys: meta?.dirtyKeys || [],
        });
      }
      set(nextState);
      if (DEBUG) {
        console.info("%c  @NEW STATE  ", "background: lightgreen; color: black", get());
      }
    },
    get,
    api
  );
};

const analytics = (config) => (set, get, api) =>
  config(
    (fn, meta) => {
      set(fn, meta);
      if (meta?.analytics) {
        analyticsService.logEvent(meta.analytics);
      }
    },
    get,
    api
  );

// Sync - this is the top level sync state
// Blocks entire app while we get data we need to render app

const createSyncSlice = () => ({
  sync: {
    status: "loading", // start in a loading state
  },
});

// Update
const createUpdateSlice = (set) => ({
  update: {
    version: undefined,
  },

  doUpdateSetVersion: (version) => {
    set((state) => {
      state.update.version = version;
    });
  },
});

// Prefs

const prefs = {
  minConnectionsScore: 0.7,
  engine: "",
  bm25HybridSearchFactor: 0.25,
  graphEnabled: false,
};

const createPrefsSlice = (set, get) => ({
  prefs,

  doSetPref: (key, value) => {
    if (!Object.prototype.hasOwnProperty.call(prefs, key)) {
      if (DEBUG) {
        console.warn("[WARN] Tried to set unexpected pref with key:", key, value);
      }
      return;
    }

    if (get().prefs[key] === value) {
      return;
    }

    set((state) => {
      state.prefs[key] = value;
    });
  },
});

// Auth

// Server backed account settings
const accountSettings = {
  [USER_SETTING_IS_OPT_OUT]: false,
  [USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING]: false,
  [USER_SETTING_HAS_DISMISSED_ONBOARDING_PROGRESS]: false,
  [USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS]: false,
  [USER_SETTING_WANTS_ATTENTION_TRACKING]: false,
};

const sanitizeClientSettings = (settings) => {
  const cleanClientSettings = {};
  if (settings) {
    Object.keys(settings).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(accountSettings, key)) {
        let value = settings[key];
        if (typeof accountSettings[key] === "boolean") {
          value = String(value).toLowerCase() === "true";
        }
        cleanClientSettings[key] = value;
      }
    });
  }
  return cleanClientSettings;
};

// TODO This seems like a bad idea, do I need to check for all public pages?
function redirectToLoginIfNeeded() {
  if (
    !["/login", "/signup", "/recover", "/logout", "/changelog", "/deactivation_notice"].includes(
      window.location.pathname
    )
  ) {
    window.location.href = "/login";
  }
}

const createAuthSlice = (set, get) => ({
  user: {
    status: "idle",
    errorMsg: null,
    email: null,
    name: null,
    accountStatus: ACCOUNT_STATUS_UNKNOWN,
    accountSettings,
    isUserAdmin: false,
    availableEngines: [],
    defaultEngine: null,
    isMarkedDeactivated: false,
  },

  doSetAccountSetting: ({ key, value = true }) => {
    set((state) => {
      state.user.accountSettings[key] = value;
    });

    return new Promise((resolve, reject) => {
      setUserSetting({ key, value })
        .then(() => {
          resolve();
        })
        .catch((error) => {
          onError(error);
          reject(error);
        });
    });
  },

  doSetAccountName: ({ name }) => {
    return new Promise((resolve, reject) => {
      apiLib
        .setUserInfoKey({ key: "name", value: name })
        .then(() => {
          set((state) => {
            state.user.name = name;
          });
          resolve();
        })
        .catch((error) => {
          onError(error);
          reject(error);
        });
    });
  },

  doAuthInit: async () => {
    set((state) => {
      state.user.status = "loading";
      state.sync.status = "loading";
    });

    const isValidUser = (u) => u && Object.keys(u).length > 0;

    let user;
    try {
      user = await Auth.currentUserInfo();
      // Note: can't catch the error but they may change that at some point so keeping it wrapped for now.
      // This throws but apparently doesn't re-sync if the tokens get revoked.
      // const user = await Auth.currentAuthenticatedUser();
      // currentUserInfo returns empty object when it fails for no good reason
      if (isValidUser(user)) {
        analyticsService.setUserId(user.attributes.email);
        Sentry.setUser({ email: user.attributes.email });
        analyticsService.logEvent(events.userVisit());

        set((state) => {
          state.user.status = "success";
          state.user.email = user.attributes.email;
        });
      } else {
        // No current user - reset:
        resetAllStores();
        redirectToLoginIfNeeded();
      }
    } catch (error) {
      onError(error);

      // No current user - reset:
      resetAllStores();
      redirectToLoginIfNeeded();
    }

    if (isValidUser(user)) {
      get()
        .doPostAuthSync()
        .then(() => {
          set((state) => {
            state.sync.status = "success";
          });
        })
        .catch((error) => {
          let errorStatus = "error";

          if (error.response?.status === 503 || (!error.response && error.message === "Network Error")) {
            errorStatus = "error-maintenace";
          }

          set((state) => {
            state.sync.status = errorStatus;
          });
        });
    } else {
      // No current user - reset:
      resetAllStores();
      redirectToLoginIfNeeded();
    }

    // Subscribe to log out messages
    channel.addEventListener("message", (event) => {
      if (DEBUG) {
        console.info("[i] Did receive app broadcast message", event.data);
      }
      if (event.data.doLogoutRedirect) {
        redirectToLoginIfNeeded();
      } else if (event.data.doLoginReload) {
        window.location.reload();
      } else if (event.data.doSync) {
        get().doDocumentLoad({ id: event.data.doSync, checkNeedsSync: false });
      }
    });
  },
  doAuthLogin: ({ email, password }) => {
    // Set this first because future events need this associated for the events to render correctly:
    analyticsService.setUserId(email);
    Sentry.setUser({ email });
    analyticsService.logEvent(events.userVisit());

    return new Promise((resolve, reject) => {
      set((state) => {
        state.user.status = "loading";
        state.sync.status = "loading";
      });

      Auth.signIn(email, password)
        .then((user) => {
          set(
            (state) => {
              state.user.status = "success";
              state.user.email = user?.attributes?.email;
            },
            {
              analytics: events.userLogin(),
            }
          );

          get()
            .doPostAuthSync()
            .then(() => {
              set((state) => {
                state.sync.status = "success";
              });
              // Sync other open tabs
              channel.postMessage({ doLoginReload: true });
            });

          resolve(user);
        })
        .catch((error) => {
          // Handle account was created but email was not confirmed
          if (error.message === "User is not confirmed.") {
            set((state) => {
              state.user.status = "needs-confirmation";
              state.user.email = email;
            });
            return;
          } else {
            set((state) => {
              state.user.status = "error";
              state.sync.status = "idle";
            });
            onError(error);
            reject(error);
          }
        });
    });
  },
  doAuthSyncLoginWithExtension: () => {
    return new Promise((resolve, reject) => {
      if (!canInstallExtension()) {
        resolve();
      }
      // Amplify doesn't seem to be rejecting the promise and throwing instead, guard against it:
      try {
        Auth.currentSession()
          .then((session) => {
            transferAuthSession({ extensionId, session: { ...session }, stage: APP_STAGE })
              .then((response) => {
                if (DEBUG) {
                  console.log("doAuthSyncLoginWithExtension: extension is authenticated", response);
                }
                resolve(response);
              })
              .catch((error) => {
                if (DEBUG) {
                  console.warn("doAuthSyncLoginWithExtension: failed to transfer session to extension", error.message, {
                    ...session,
                  });
                  reject({ cause: error });
                }
              });
          })
          .catch((error) => {
            if (DEBUG) {
              console.warn("doAuthSyncLoginWithExtension: failed to share session with extension", error.message);
            }
            reject({ cause: error, code: "Failed to get current session" });
          });
      } catch (error) {
        reject({ cause: error, code: "Failed to get current session" });
      }
    });
  },
  doAuthSyncLogoutWithExtension: () => {
    return new Promise((resolve, reject) => {
      if (!canInstallExtension()) {
        resolve();
      }
      revokeAuthSession({ extensionId, stage: APP_STAGE })
        .then((response) => {
          if (DEBUG) {
            console.log("doAuthSyncLogoutWithExtension: extension is logged out", response);
          }
          resolve(response);
        })
        .catch((error) => {
          if (DEBUG) {
            console.warn("doAuthSyncLogoutWithExtension: failed to revoke session from extension", error.message);
            reject(error);
          }
        });
    });
  },
  doPostAuthSync: () => {
    if (DEBUG) {
      console.info("[i] Starting to track document visibility");
    }

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (sessionTimeoutTimer !== null) {
          // Cancel timeout, existing session is extended
          clearTimeout(sessionTimeoutTimer);
          sessionTimeoutTimer = null;
          if (DEBUG) {
            console.info("[i] Session extended");
          }
        } else {
          // Log new session start
          analyticsService.logEvent(events.userSessionStart({ url: window.location.href }));
          if (DEBUG) {
            console.info("[i] New session started");
          }
        }
      } else if (document.visibilityState === "hidden") {
        sessionTimeoutTimer = setTimeout(() => {
          if (DEBUG) {
            console.info("[i] Session timed out...");
          }
          sessionTimeoutTimer = null;
        }, 10 * 60 * 1000);
      }
    });

    const p = Promise.all([
      get().doDocumentsLoad(),
      get().doUserDataLoad(),
      get().doArtifacsIndexPreload(),
      get().doSubscriptionsLoad(),
      get().doDailyLogLoad(),
    ]);
    get()
      .doAuthSyncLoginWithExtension()
      .catch(() => {
        // noop
      });
    return p;
  },
  doAuthLogout: () => {
    return new Promise((resolve, reject) => {
      set(
        (state) => {
          state.user.status = "loading";
          state.user.email = null;
        },
        {
          analytics: events.userLogout(),
        }
      );

      Auth.signOut()
        .then(() => {
          analyticsService.setUserId(null);
          Sentry.setUser(null);
          set((state) => {
            state.user.status = "idle";
          });
          get()
            .doAuthSyncLogoutWithExtension()
            .catch(() => {
              // noop
            });
          // Sync other open tabs
          channel.postMessage({ doLogoutRedirect: true });
          resetAllStores();
          AppCache.clear();
          resolve();
        })
        .catch((error) => {
          onError(error);
          reject(error);
        });
    });
  },
  doAuthSignup: async ({ name, email, password, invitation }) => {
    set((state) => {
      state.user.status = "loading";
    });

    try {
      await Auth.signUp({
        username: email,
        password: password,
        attributes: {
          "custom:invitation": invitation,
          "custom:name": name,
          email,
        },
      });
      set((state) => {
        state.user.status = "needs-confirmation";
        state.user.email = email;
      });
    } catch (error) {
      let errorMsg = error.message;

      if (error.code === "InvalidParameterException") {
        // If we fail because leading and trailing white space
        const isWhiteSpaceRegex = error.message.includes(`^[\\S]+.*[\\S]+$`); // eslint-disable-line no-useless-escape
        if (isWhiteSpaceRegex) {
          errorMsg = "Sign up failed: password cannot have leading or trailing white space.";
        }
      } else {
        // If we fail because the new sign-up invitation enforcer the error message will have the form:
        // "PreSignUp failed with error ERRORMESSAGE: <actual message>."
        // Where <actual message> might be: "missing invitation", "invitation already used", "invitation invalid"
        const inviteError = error.message
          ?.replace(/^(PreSignUp failed with error )/, "") // remove error code prefix
          .replace(/\.$/, ""); // remove trailing .

        if (inviteError) {
          // Default to what server responds but make the invitation ones prettier:
          switch (inviteError) {
            case "missing invitation":
              errorMsg = "Sign up failed: no invitation code.";
              break;
            case "invitation already used":
              errorMsg = "Sign up failed: invitation code already used.";
              break;
            case "account already exists":
              errorMsg = "Sign up failed: account already exists.";
              break;
            case "invitation invalid":
              errorMsg = "Sign up failed: could not find invitation.";
              break;
          }
        }
      }
      // Other known failure messages:
      // "Password did not conform with policy: Password not long enough"
      // "User already exists"

      set((state) => {
        state.user.status = "error";
        state.user.errorMsg = errorMsg;
      });
      onError(error);
    }
  },
  doAuthConfirmSignup: async ({ email, code }) => {
    set((state) => {
      state.user.status = "loading";
    });
    try {
      await Auth.confirmSignUp(email, code);
      set((state) => {
        state.user.status = "success";
      });
    } catch (error) {
      set((state) => {
        state.user.status = "error";
      });
      onError(error);
    }
  },
});

// User Data
const createUserDataSlice = (set, get) => ({
  userData: {
    status: "idle",
    goList: [],
    goListRaw: [],
    noGoList: [],
    noGoListRaw: [],
    lastSyncTs: null,
    indexingStats: {},
  },

  doUserIndexingStatsLoad: () => {
    return new Promise((resolve, reject) => {
      loadUserInfo({ keys: ["stats"] })
        .then((response) => {
          const stats = response?.stats?.urlstate_state;
          if (DEBUG) {
            console.log("[ indexing stats ]", stats);
          }
          if (stats) {
            set((state) => {
              state.userData.indexingStats = stats;
            });
            resolve(stats);
          } else {
            reject();
          }
        })
        .catch((error) => {
          onError(error);
          reject(error);
        });
    });
  },

  doUserDataLoad: () => {
    return new Promise((resolve, reject) => {
      set((state) => {
        state.userData.status = "loading";
      });

      loadUserInfo()
        .then((account) => {
          if (DEBUG) {
            console.log("[ account ]", account);
          }
          set((state) => {
            state.userData.status = "success";

            if (account.status) {
              state.user.accountStatus = account.status.value;
              analyticsService.setUserProperty({ propertyName: "accountStatus", value: account.status.value });
            }

            if (account.name) {
              state.user.name = account.name;
              analyticsService.setUserProperty({ propertyName: "preferredName", value: account.name });
            }

            if (account.user_admin) {
              state.user.isUserAdmin = true;
            }

            if (account.settings) {
              state.user.accountSettings = {
                ...accountSettings,
                ...sanitizeClientSettings(account.settings.client_settings),
              };

              if (account.settings.available_engines) {
                state.user.availableEngines = account.settings.available_engines;
              }

              if (account.settings.default_engine) {
                state.user.defaultEngine = account.settings.default_engine;
              }

              if (account.settings.marked_deactivated) {
                state.user.isMarkedDeactivated = true;
              }
            }

            const goList = account.go_list?.entries;
            if (goList) {
              state.userData.goList = goList.map((entry) => entry.rule);
              state.userData.goListRaw = goList.map(({ rule, source }) => ({ rule, source }));
            }

            const noGoList = account.no_go_list?.entries;
            if (noGoList) {
              state.userData.noGoList = noGoList.map((entry) => entry.rule);
              state.userData.noGoListRaw = noGoList.map(({ rule, source }) => ({ rule, source }));
            }

            state.userData.lastSyncTs = getISOTimestamp();
          });

          resolve(account);
        })
        .catch((error) => {
          onError(error);
          set((state) => {
            state.userData.status = "error";
            state.user.accountStatus = ACCOUNT_STATUS_UNKNOWN;
          });
          reject(error);
        });
    });
  },

  doUserDataUpdate: ({ status, goList, noGoList }) => {
    const goListRaw = get().userData.goListRaw;
    const noGoListRaw = get().userData.noGoListRaw;
    const findRaw = (list, hostname) => list.find((entry) => entry.rule === hostname);

    const info = {};

    if (status) {
      info.status = status;
    }

    if (goList) {
      const newRawGoList = goList.map((hostname) => {
        const entry = findRaw(goListRaw, hostname);
        return { rule: hostname, source: entry ? entry.source : "user entered" };
      });
      info.goList = newRawGoList;
    }

    if (noGoList) {
      const newRawNoGoList = noGoList.map((hostname) => {
        const entry = findRaw(noGoListRaw, hostname);
        return { rule: hostname, source: entry ? entry.source : "user entered" };
      });
      info.noGoList = newRawNoGoList;
    }

    return new Promise((resolve, reject) => {
      setUserInfo(info)
        .then(() => {
          set((state) => {
            state.userData.status = "success";
            if (status) {
              state.user.accountStatus = status;
            }
            if (goList) {
              state.userData.goList = goList;
              state.userData.goListRaw = info.goList;
            }
            if (noGoList) {
              state.userData.noGoList = noGoList;
              state.userData.noGoListRaw = info.noGoList;
            }
            resolve();
          });
        })
        .catch((error) => {
          onError(error);
          set((state) => {
            state.userData.status = "error";
          });
          reject(error);
        });
    });
  },
});

// Auto save sync

const AUTO_SAVE_TIMEOUT = 1000;
let lastSyncTimer = null;
let autoSaveTimer = null;

// Warn if user tries to leave or reload while we have a pending sync
window.addEventListener("beforeunload", (event) => {
  if (autoSaveTimer) {
    event.returnValue = "Changes you made may not be saved.";
  }
});

function schedule(sync) {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(function () {
    lastSyncTimer = autoSaveTimer;
    sync().finally(() => {
      // If we didn't schedule any future sync clean up so that navigation doesn't remain blocked
      if (lastSyncTimer === autoSaveTimer) {
        lastSyncTimer = null;
        autoSaveTimer = null;
      }
    });
  }, AUTO_SAVE_TIMEOUT);
}

// Documents

function handleDocumentMigration(model) {
  const content = migrateDocumentContent(model.content);
  const document = makeDocument({
    documentId: model.documentId,
    createdAt: model.createdAt,
    modifiedAt: model.modifiedAt,
    ...content,
  });
  return { document };
}

const createDocumentsSlice = (set, get) => ({
  documents: {
    status: "idle",
    index: [],
  },

  doDocumentLoad: ({ id, checkNeedsSync = true }) => {
    return new Promise((resolve, reject) => {
      const doLoad = () => {
        // Mark document as loading
        set((state) => {
          const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
          if (activeDoc) {
            activeDoc.syncStatus = "loading";
          }
          // Force un-mount the RTEs...
          state.documents.status = "loading";
        });

        loadDocument({ id })
          .then((model) => {
            set((state) => {
              const { document } = handleDocumentMigration(model);
              const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
              // If server has changed and we attempt to sync our dirty changes then it will / has fail(ed) so
              // if we have a dirty document we should take what the server has and merge it..
              const isDirty = activeDoc?.dirtyKeys.size > 0;

              if (activeDoc) {
                // Replace document
                if (isDirty) {
                  console.warn(`Blowing away dirty changes for document ${id}...`, {
                    activeDoc: { ...activeDoc },
                    document,
                  });
                }
                // TODO attempt a merge at the key level
                // - apply our changes on top of latest from the server
                // - for each dirty key replace with our version
                // - for lists, diff added / removed
                // TODO add a "syncing" document state to differentiate from the initial load
                // and avoid showing the loading spinner when document is syncing

                // NOTE We can't safely apply patches if the cards arrays mutate from under us
                // TODO what alternatives are there?
                // - move away from using arrays in favor of a {id: object} map
                // - could I do this w/o involving the server? I think so..
                if (activeDoc.cards.length !== document.cards.length) {
                  clearUndoStack();
                }

                Object.assign(activeDoc, document);

                activeDoc.syncStatus = "idle";
              } else {
                // Append document - not in the list
                state.documents.index = [...state.documents.index, document];
              }

              state.documents.status = "success";
            });

            resolve({ document, updated: true });
          })
          .catch((error) => {
            set((state) => {
              const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
              if (activeDoc) {
                activeDoc.syncStatus = "error";
              }
            });
            onError(error);
            reject(error);
          })
          .finally(() => {
            // Reset the global sync state
            set((state) => {
              state.documents.status = "success";
            });
          });
      };

      if (checkNeedsSync) {
        const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
        const modifiedAt = activeDoc?.modifiedAt;

        if (modifiedAt) {
          if (currentTimestamp() - (activeDoc?.lastSyncedAt || 0) <= 1) {
            // We don't need to check - we just syncd
            if (DEBUG) {
              console.info(
                `[i] Skipping fresh document sync with id ${id} (delta sync ${
                  currentTimestamp() - (activeDoc?.lastSyncedAt || 0)
                }s)`
              );
            }
            resolve({ document: activeDoc, updated: false });
          }

          checkDocumentNeedsSync({ id, modifiedAt })
            .then((needsSync) => {
              if (needsSync) {
                doLoad();
              } else {
                resolve({ document: activeDoc, updated: false });
              }
            })
            .catch((error) => {
              if (DEBUG) {
                console.warn(`Failed to check if document ${id} needs sync`, error);
              }
              // Failed to check state, load
              doLoad();
            });
        } else {
          // Document doesn't exist, load
          doLoad();
        }
      } else {
        doLoad();
      }
    });
  },

  doDocumentsLoad: () => {
    return new Promise((resolve, reject) => {
      // Note: blows away dirty changes
      set((state) => {
        state.documents.status = "loading";
      });

      loadDocuments()
        .then((model) => {
          set((state) => {
            const documents = [];

            model?.forEach((m) => {
              try {
                const { document } = handleDocumentMigration(m);
                documents.push(document);
              } catch (error) {
                console.log("Failed to load document:", m, error);
              }
            });
            state.documents.index = documents;
            state.documents.status = "success";
          });
          analyticsService.setUserProperty({ propertyName: "documentCount", value: model.length });
          resolve();
        })
        .catch((error) => {
          set((state) => {
            state.documents.status = "error";
          });
          onError(error);
          reject(error);
        });
    });
  },
  doDocumentsScheduleSync: () => {
    // Allow scheduling a document sync from outside the store
    schedule(get().doDocumentsSync);
  },
  doDocumentsSync: async () => {
    // Save all dirty documents. Generally would only expect one dirty doc at a time
    // assuming we call this action some time after user stops typing (auto-save)
    const dirtyDocs = get().documents.index.filter((doc) => doc.dirtyKeys.size > 0);
    const dirtyDocsWeCanSync = dirtyDocs.filter((doc) => doc.syncStatus !== "loading");
    const busyArticleCount = dirtyDocs.length - dirtyDocsWeCanSync.length;
    if (!dirtyDocs.length) {
      console.warn("[WARN] got a sync call with no dirty documents.");
    }
    for (const doc of dirtyDocsWeCanSync) {
      // Turn dirtyKeys into a set of mutations
      let changes = [];
      const dirtyKeys = [...doc.dirtyKeys];
      dirtyKeys.forEach((key) => {
        switch (key) {
          case "body":
            changes.push({ key: "body", value: doc.body });
            break;
          case "camera":
            changes.push({ key: "camera", value: doc.camera });
            break;
          case "layout":
            changes.push({ key: "layout", value: doc.layout });
            break;
          case "splitLayoutWidth":
            changes.push({ key: "splitLayoutWidth", value: doc.splitLayoutWidth });
            break;
          case "pinnedAt":
            changes.push({ key: "pinnedAt", value: doc.pinnedAt || null });
            break;
          case "archivedAt":
            changes.push({ key: "archivedAt", value: doc.archivedAt || null });
            break;
          case "trashedAt":
            changes.push({ key: "trashedAt", value: doc.trashedAt || null });
            break;
          default:
            if (key.startsWith(CARDS_KEY_PREFIX)) {
              const cardId = key.slice(CARDS_KEY_PREFIX.length);
              const card = doc.cards.find((c) => c.id === cardId);
              const wasRemoved = !card;
              const wasAdded = card?.createdAt > doc.lastSyncedAt;
              if (wasRemoved) {
                changes.push({ key: "cards", value: cardId, operation: "remove" });
              } else if (wasAdded) {
                changes.push({ key: "cards", value: card, operation: "add" });
              } else {
                changes.push({ key: "cards", value: card, operation: "update" });
              }
            }
        }
      });

      // Set document sync status
      set((state) => {
        const activeDoc = state.documents.index.find((_doc) => _doc.documentId === doc.documentId);
        activeDoc.syncStatus = "loading";
        // Clear the dirty keys so any change that happens while we're in sync can be logged
        // This gets restored on sync fail
        activeDoc.dirtyKeys.clear();
      });

      // Attempt to save
      try {
        const resp = await saveDocument({
          id: doc.documentId,
          changes,
          ifNotModifiedSince: doc.modifiedAt,
        });

        if (resp) {
          // The server will return a set of changes it could not apply. This usually happens
          // because we added and removed a key that never existed on the server before.
          // Server is expected to always return 200 if the call succeeded and we blow away the
          // dirty flags at this point but log this in case:
          if (resp.ignoredChanges.length) {
            console.warn("[WARN] Could not apply a subset of changes", resp.ignoredChanges);
          }
          set((state) => {
            const activeDoc = state.documents.index.find((_doc) => _doc.documentId === doc.documentId);
            activeDoc.modifiedAt = resp.modifiedAt;
            activeDoc.lastSyncedAt = currentTimestamp();
            activeDoc.syncStatus = "idle";
          });
        } else {
          // We could not save the document because of a conflict
          if (DEBUG) {
            console.warn(`[WARN] Could not save document ${doc.documentId} because it's out of date. Reloading...`);
          }

          set((state) => {
            const activeDoc = state.documents.index.find((_doc) => _doc.documentId === doc.documentId);
            activeDoc.syncStatus = "idle";
            // Restore dirty keys
            dirtyKeys.forEach((key) => {
              activeDoc.dirtyKeys.add(key);
            });
          });

          // Reload document
          get().doDocumentLoad({ id: doc.documentId, checkNeedsSync: false });
        }
        if (DEBUG) {
          console.info(`[i] Did save document ${doc.documentId}.`); // Reloading other open tabs...
        }

        // Sync other open tabs
        // TODO doesn't actually work because we need to un-mount the RTEs and moving to a document level sync
        // status doesn't re-mount everything on every load... How to fix?
        // Once we can merge it will be less of an issue as we will apply our changes again on top.
        // But we still need to re-create the RTEs at some point...
        // READ https://docs.slatejs.org/walkthroughs/06-saving-to-a-database#:~:text=resetNodes%20resets%20the%20value%20of%20the%20editor
        // There is also an issue with what looks to be the two tabs broadcasting to each other in response to each other?
        // channel.postMessage({ doSync: doc.documentId });
      } catch (error) {
        onError(error);

        // Reset document sync status
        set((state) => {
          const activeDoc = state.documents.index.find((_doc) => _doc.documentId === doc.documentId);
          activeDoc.syncStatus = "error";
          // Restore dirty keys
          dirtyKeys.forEach((key) => {
            activeDoc.dirtyKeys.add(key);
          });
        });
      }
    }

    if (busyArticleCount > 0) {
      console.warn(`[i] Rescheduled sync due to ${busyArticleCount} busy documents`);
      schedule(get().doDocumentsSync);
    }
  },
  doDocumentCreateWithTitle: ({ title, outline, history, eventSource }) => {
    const body = [
      { type: "title", children: [{ text: title || getISOTimestamp() }] },
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const shouldRename = !title && !get().user.accountSettings[USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS];
    get()
      .doDocumentCreate({ body, history, shouldRename, eventSource })
      .then((id) => {
        if (outline?.length) {
          get().doDocumentAddNoteCard({
            id,
            body: [{ type: "paragraph", children: [{ text: outline }] }],
            source: sources.AUTO,
          });
        }
      });
  },
  doDocumentCreate: async ({ body, history, layout = DEFAULT_EDITOR_LAYOUT, shouldRename = false, eventSource }) => {
    const model = await createDocument(body ? { content: makeDocumentContent({ body }) } : undefined);
    set(
      (state) => {
        const content = migrateDocumentContent(model.content);
        state.documents.index.push(
          makeDocument({
            documentId: model.documentId,
            createdAt: model.createdAt,
            modifiedAt: model.modifiedAt,
            layout,
            ...content,
          })
        );
      },
      {
        analytics: events.documentCreated({ documentId: model.documentId, source: eventSource }),
      }
    );

    if (history) {
      let url = `/${layout}/${model.documentId}`;
      if (shouldRename) {
        url += "#rename";
      }
      history.push(url);
    }

    return model.documentId;
  },
  doDocumentRename: ({ id, topic, source }) => {
    set(
      (state) => {
        const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
        if (!activeDoc) return;

        const oldTitleEl = activeDoc.body[0];
        const newTitleEl = { type: "title", children: [{ text: topic || "Untitled" }] };

        if (oldTitleEl.type !== "title") {
          // Unexpected because RTE should enforce a title existing, but in case it doesn't pre-pend a new title
          activeDoc.body = activeDoc.body.slice().unshift(newTitleEl);
        } else {
          // otherwise, replace the old title:
          activeDoc.body[0] = newTitleEl;
        }

        activeDoc.dirtyKeys.add("body");
        schedule(state.doDocumentsSync);
      },

      {
        analytics: events.documentRenamed({ documentId: id, source }),
      }
    );
  },
  doDocumentUpdate: ({ id, body, cards, removedCardIds, canUndo }) => {
    const _activeDoc = get().documents.index.find((doc) => doc.documentId === id);
    if (!_activeDoc) return;

    let dirtyKeys = [];
    const pathFromCardId = (id) => `${CARDS_KEY_PREFIX}${id}`;

    if (cards != undefined) {
      let _cards;
      if (typeof cards === "function") {
        _cards = [..._activeDoc.cards];
        cards(_cards);
      } else {
        _cards = cards;
      }

      dirtyKeys = _cards
        .filter((c) => c.createdAt >= _activeDoc.lastSyncedAt || c.updatedAt >= _activeDoc.lastSyncedAt)
        .map((c) => pathFromCardId(c.id));
      // We can't infer removed cards as the data is gone so we need this hint from the caller
      if (removedCardIds) {
        dirtyKeys.push(...removedCardIds.map((id) => pathFromCardId(id)));
      }
    }

    if (body !== undefined) {
      dirtyKeys.push("body");
    }

    set(
      (state) => {
        const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
        if (!activeDoc) return;

        if (body !== undefined) {
          activeDoc.body = body;
        }

        if (cards !== undefined) {
          if (typeof cards === "function") {
            cards(activeDoc.cards);
          } else {
            activeDoc.cards = cards;
          }
        }

        dirtyKeys.forEach(activeDoc.dirtyKeys.add, activeDoc.dirtyKeys);

        schedule(state.doDocumentsSync);
      },
      // Only push card changes to the undo stack:
      { ...(canUndo ? { undoStack: id, dirtyKeys } : {}) }
    );
  },
  doDocumentUpdateCamera: ({ id, camera = { x: 0, y: 0, z: 0 } }) => {
    set((state) => {
      const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
      if (!activeDoc) return;

      if (activeDoc.camera.x !== camera.x || activeDoc.camera.y !== camera.y || activeDoc.camera.z !== camera.z) {
        activeDoc.dirtyKeys.add("camera");
        activeDoc.camera = camera;
        schedule(state.doDocumentsSync);
      }
    });
  },
  doDocumentUpdateLayout: ({ id, layout, splitLayoutWidth }) => {
    set((state) => {
      const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
      if (!activeDoc) return;

      let mutated = false;
      if (layout !== undefined) {
        activeDoc.layout = layout;
        activeDoc.dirtyKeys.add("layout");
        mutated = true;
      }

      if (splitLayoutWidth !== undefined) {
        activeDoc.splitLayoutWidth = splitLayoutWidth;
        activeDoc.dirtyKeys.add("splitLayoutWidth");
        mutated = true;
      }

      if (mutated) {
        schedule(state.doDocumentsSync);
      }
    });
  },
  doDocumentArchive: ({ id, archived = true }) => {
    set(
      (state) => {
        const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
        if (!activeDoc) return;

        activeDoc.archivedAt = archived ? currentTimestamp() : undefined;
        // Clear pin state when archiving
        activeDoc.pinnedAt = undefined;
        activeDoc.dirtyKeys.add("pinnedAt");
        activeDoc.dirtyKeys.add("archivedAt");
        schedule(state.doDocumentsSync);
      },
      {
        analytics: events.documentArchived({ documentId: id, source: sources.PLAYGROUNDS, archived }),
      }
    );
  },
  doDocumentPin: ({ id, pinned = true }) => {
    set(
      (state) => {
        const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
        if (!activeDoc) return;

        activeDoc.pinnedAt = pinned ? currentTimestamp() : undefined;
        activeDoc.dirtyKeys.add("pinnedAt");
        schedule(state.doDocumentsSync);
      },
      {
        analytics: events.documentPinned({ documentId: id, source: sources.PLAYGROUNDS, pinned }),
      }
    );
  },
  doDocumentTrash: ({ id, trashed = true }) => {
    set(
      (state) => {
        const activeDoc = state.documents.index.find((doc) => doc.documentId === id);
        if (!activeDoc) return;

        activeDoc.trashedAt = trashed ? currentTimestamp() : undefined;
        // Clear pin and archived state when archiving
        activeDoc.pinnedAt = undefined;
        activeDoc.archivedAt = undefined;
        activeDoc.dirtyKeys.add("pinnedAt");
        activeDoc.dirtyKeys.add("archivedAt");
        activeDoc.dirtyKeys.add("trashedAt");
        schedule(state.doDocumentsSync);
      },
      {
        analytics: events.documentTrashed({ documentId: id, source: sources.PLAYGROUNDS, trashed }),
      }
    );
  },
  doDocumentDelete: async ({ id }) => {
    const docToDelete = get().documents.index.find((doc) => doc.documentId === id);
    if (!docToDelete) return;

    try {
      set(
        (state) => {
          state.documents.index = state.documents.index.filter((doc) => doc.documentId !== docToDelete.documentId);
        },
        {
          analytics: events.documentDeleted({ documentId: id, source: sources.PLAYGROUNDS }),
        }
      );
      await deleteDocument({ id });
    } catch (error) {
      // Restore
      set((state) => {
        state.documents.index.push({ ...docToDelete });
      });
      onError(error);
    }
  },

  _doDocumentMakeKeptCard: ({ model, ...rest }) => {
    const baseProps = {
      createdAt: currentTimestamp(),
      id: uuidv4(),
      reason: null,
      ...rest,
    };

    let card;

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

    return card;
  },

  _doDocumentAddKeptHighlightCard: ({ id, artifact, sentenceIds, position, page }) => {
    const model = {
      ...artifact,
      matchSentences: sentenceIds,
    };

    if (artifact.artifactType === "tweet-thread") {
      // We ignore selections across tweets, just take the first one.
      // Because tweets are short it's ok to keep the full sentence set
      const tweet = artifact.tweets.find(
        (t) =>
          t.sentences.findIndex((s) => sentenceIds.includes(s.sentenceNumber)) >= 0 ||
          t.quotesTweet?.sentences.findIndex((s) => sentenceIds.includes(s.sentenceNumber)) >= 0
      );
      model.tweets = [tweet];
      model.matchTweetIndex = 0;
    } else {
      // Just keep the full paragraphs
      // Results response does something a little smarter like keep the sentence before and after from same paragraph
      const paragraphNumbers = artifact.sentences
        .map((s) => (sentenceIds.includes(s.sentenceNumber) ? s.paragraphNumber : null))
        .filter(Number.isFinite) // was Boolean but we switched to ints
        .filter(onlyUnique);
      model.sentences = artifact.sentences.filter((s) => paragraphNumbers.includes(s.paragraphNumber));

      if (artifact.artifactType === "pdf") {
        if (page === undefined) {
          throw new Error("doDocumentAddKeptHighlightCard: expecting a page ID for artifactType 'pdf'");
        }
        model.page = page;
        model.filename = artifact.filename;
      }
    }

    const card = get()._doDocumentMakeKeptCard({ model, position });

    const mutation = (cards) => cards.push(card);
    get().doDocumentUpdate({ id, cards: mutation, canUndo: true });

    return card;
  },
  doDocumentAddKeptHighlightCard: ({ id, artifactId, sentenceIds, position, page, source }) => {
    const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
    if (!activeDoc) return;

    const artifact = get().artifacts.get(artifactId);
    if (!artifact || artifact.status !== "success") return;

    const card = get()._doDocumentAddKeptHighlightCard({ id, artifact, sentenceIds, position, page });

    analyticsService.logEvent(
      events.documentHighlightCardKept({
        documentId: id,
        artifactId,
        sentenceIds,
        artifactType: card.artifactType,
        source,
      })
    );

    return card;
  },
  doDocumentAddKeptCard: ({ id, stackId, sentenceId, shouldAdvanceStack = true, position, source }) => {
    const { query, index: stackIndex, results } = get().stacks.find((stack) => stack.id === stackId) || {};
    if (!query) return;

    let model;
    if (sentenceId) {
      // If we have a sentenceId use that
      model = results.find((result) => result.matchSentence === sentenceId);
    } else {
      // Otherwise use the current stackIndex
      model = results[stackIndex];
    }
    if (!model) return;

    // TODO do we want to augment connection result to be an array for consistency reasons?
    // or rename matchSentences to highlightedSentences
    model = { ...model };
    if (typeof model.matchSentence !== "undefined") {
      model.matchSentences = [model.matchSentence];
      delete model.matchSentence;
    }

    const card = get()._doDocumentMakeKeptCard({ model, position, query });

    const mutation = (cards) => cards.push(card);
    get().doDocumentUpdate({ id, cards: mutation, canUndo: true });

    // TODO this all feels very inneficient - we should get and update the stack in one go and then update the document?

    // Update stack
    if (shouldAdvanceStack) {
      get().doQueryStackJump({ id: stackId, index: stackIndex + 1 });
    }

    // Mark result as kept
    set((state) => {
      const stack = state.stacks.find((stack) => stack.id === stackId);
      if (!stack) return;

      stack.keptResults.push(model);
    });

    analyticsService.logEvent(
      events.documentCardKept({
        documentId: id,
        stackId,
        stackIndex,
        sentenceIds: card.matchSentences,
        score: card.score,
        artifactType: model.artifactType,
        source,
      })
    );

    FeedbackEventsManager.logEvent({
      action: "keep",
      query,
      score: card.score,
      stackId,
      sentenceNumber: card.matchSentences[0],
      contextIdeaId: id,
    });

    return card;
  },
  _doUpdateCardModel: ({ card, cards, ...props }) => {
    let factory;
    switch (card.type) {
      case "kept":
        factory = makeKeptCard;
        break;
      case "highlight":
        factory = makeHighlightCard;
        break;
      case "note":
        factory = makeNoteCard;
        break;
      default:
        console.warn(`doDocumentUpdateCard: unexpected card type ${card.type}`);
    }
    const updatedCard = { ...card, ...props, updatedAt: currentTimestamp() };

    // Remove needsReposition flag the first time we set the position (set in schema migration)
    if (props.position && card.needsReposition) {
      delete updatedCard.needsReposition;
    }

    // Kind of hacky but we're going to have to rethink this soon anyways:
    // When un-parenting, inherit parent card position + an offset
    if ("parentId" in props && props.parentId === undefined && card.parentId) {
      const parentCard = cards.find((c) => c.id === card.parentId);
      if (parentCard) {
        updatedCard.position = { x: parentCard.position.x + 16, y: parentCard.position.y + 16 };
      }
    }

    return factory(updatedCard);
  },
  doDocumentUpdateCard: ({ id, cardId, canUndo, ...props }) => {
    const mutation = (cards) => {
      const index = cards.findIndex((c) => c.id === cardId);
      if (index >= 0) {
        const card = get()._doUpdateCardModel({ card: cards[index], cards: cards, ...props });
        cards[index] = card;
      }
    };
    get().doDocumentUpdate({ id, cards: mutation, canUndo });
  },
  doDocumentJoinSelectedCards: ({ id, cardId, parentId, source }) => {
    // Parent card:
    get().doDocumentUpdateCard({ id, cardId, parentId, canUndo: true });

    // Re-sort cards:
    const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
    if (!activeDoc) return;

    const mutation = (cards) => {
      const cardIndex = cards.findIndex((c) => c.id === cardId);
      const card = cards[cardIndex];
      // Remove selected card
      cards.splice(cardIndex, 1);

      // Re-insert selected card below note card
      const parentIndex = cards.findIndex((card) => card.id === parentId);
      cards.splice(parentIndex + 1, 0, card);
    };
    get().doDocumentUpdate({ id, cards: mutation, canUndo: true });

    analyticsService.logEvent(events.documentCardsJoined({ documentId: id, source }));
  },
  doDocumentAddNoteCard: ({ id, toCardId, position, body, source, canUndo = true }) => {
    const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
    if (!activeDoc) return;

    const selectedCardIndex = activeDoc.cards.findIndex((card) => card.id === toCardId);
    if (toCardId && selectedCardIndex < 0) return;

    const selectedCard = activeDoc.cards[selectedCardIndex];
    // Take the given start position or try falling back on selected card position (if adding to card):
    const pos = position || selectedCard?.position;
    const noteCard = makeNoteCard({
      id: uuidv4(),
      body: body || [{ type: "paragraph", children: [{ text: "" }] }],
      createdAt: currentTimestamp(),
      ...(pos ? { position: pos } : {}), // inherit default position if we don't have a start point
    });

    const mutation = (cards) => {
      if (toCardId) {
        // Insert note card above selected card
        cards.splice(selectedCardIndex, 0, noteCard);
      } else {
        cards.push(noteCard);
      }
    };
    get().doDocumentUpdate({ id, cards: mutation, canUndo });

    if (!toCardId) {
      analyticsService.logEvent(events.documentNoteAdded({ documentId: id, source }));
    } else {
      // Make selected card as a child of new note card
      if (selectedCard) {
        get().doDocumentUpdateCard({ id, cardId: toCardId, parentId: noteCard.id, canUndo });
      }
      analyticsService.logEvent(events.documentCardNoteAdded({ documentId: id, source }));
    }

    return noteCard;
  },
  doDocumentSeparateCard: ({ id, cardId, source }) => {
    get().doDocumentUpdateCard({ id, cardId, parentId: undefined, canUndo: true });
    analyticsService.logEvent(events.documentCardSeparated({ documentId: id, source }));
  },
  doDocumentRemoveCards: ({ id, selectedCardIds = [], source, didCut = false }) => {
    const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
    if (!activeDoc) return;

    const deletedCardTypes = activeDoc.cards
      .filter((card) => selectedCardIds.includes(card.id))
      .map((card) => card.type);

    // Filter out the selected cards
    const removedCardIds = [];
    activeDoc.cards.forEach((card) => {
      const keep = !selectedCardIds.includes(card.id) && !selectedCardIds.includes(card.parentId);
      if (!keep) {
        removedCardIds.push(card.id);
      }
    });

    const mutation = (cards) => {
      removedCardIds.forEach((cardId) => {
        const index = cards.findIndex((card) => card.id === cardId);
        if (index >= 0) {
          cards.splice(index, 1);
        }
      });
    };
    get().doDocumentUpdate({ id, cards: mutation, removedCardIds, canUndo: true });

    analyticsService.logEvent(events.documentCardsRemoved({ documentId: id, source, types: deletedCardTypes, didCut }));
  },
  doDocumentCardMarkReasonKept: ({ id, cardId, reason, source }) => {
    const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
    if (!activeDoc) return;

    const index = activeDoc.cards.findIndex((card) => card.id === cardId);
    if (index < 0) return;

    const cards = [...activeDoc.cards];
    const card = cards[index];
    const prevReason = card.reason;

    get().doDocumentUpdateCard({ id, cardId, reason, canUndo: true });

    analyticsService.logEvent(events.documentCardMarkedReasonKept({ documentId: id, reason, prevReason, source }));
  },
  doDocumentRepositionCards: ({ id, positionMap, canUndo = true }) => {
    const mutation = (cards) => {
      for (let i = 0; i < cards.length; i++) {
        let card = cards[i];
        if (Object.prototype.hasOwnProperty.call(positionMap, card.id)) {
          cards[i] = get()._doUpdateCardModel({ card, cards, position: positionMap[card.id] });
        }
      }
    };
    get().doDocumentUpdate({ id, cards: mutation, canUndo });
  },
  // cut-copy-paste
  doDocumentCutCards: ({ id, selectedCardIds, rectMap, source }) => {
    // A cut is just a copy followed by a delete. Do we need a unique event?
    get().doDocumentCopyCards({ id, selectedCardIds, rectMap, source, didCut: true });
    get().doDocumentRemoveCards({ id, selectedCardIds, source, didCut: true });
  },
  doDocumentCopyCards: ({ id, selectedCardIds, rectMap, source, didCut = false }) => {
    const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
    if (!activeDoc) return;

    const kept = activeDoc.cards;
    // We want all selected cards and their parents regardless of selection state
    // This makes it simpler since we don't cache the size or know the position of the child cards
    // const parentIds = kept.map((card) => (card.parentId ? card.parentId : null)).filter(Boolean);
    const selectedCardParentIds = kept
      .map((card) => (selectedCardIds.includes(card.id) && card.parentId ? card.parentId : null))
      .filter(Boolean);
    const selectedCards = kept
      .filter(
        (card) =>
          // Was selected by user
          selectedCardIds.includes(card.id) ||
          // Or is a parent of a card selected by user
          selectedCardParentIds.includes(card.id) ||
          // Or has a parent card selected by user
          selectedCardIds.includes(card.parentId)
      )
      .map((card) => {
        // Inject size information into the copied data to avoid having to first render
        // it before figuring out where to place it on screen:
        const rect = rectMap[card.id];
        if (rect) {
          return { ...card, bounds: rect };
        }
        return card;
      });

    const clipboard = {
      schema: SCHEMA,
      cards: selectedCards,
    };

    try {
      const text = JSON.stringify({
        type: CLIPBOARD_MIMETYPE,
        ...clipboard,
      });

      navigator.clipboard.writeText(text);

      analyticsService.logEvent(
        events.documentCardsCopied({ documentId: id, count: selectedCardIds.length, didCut, source })
      );
    } catch (error) {
      console.warn("Failed to copy to clipboard", error);
      analyticsService.logEvent(events.documentCardsCopyFailed({ documentId: id, error: error.message, source }));
    }
  },
  doDocumentPasteCards: ({ id, viewportRect, source }) => {
    return new Promise((resolve, reject) => {
      const activeDoc = get().documents.index.find((doc) => doc.documentId === id);
      if (!activeDoc) {
        reject();
      }

      navigator.clipboard
        .readText()
        .then((result) => {
          const data = JSON.parse(result);
          if (data.type === CLIPBOARD_MIMETYPE) {
            if (!data.cards.length) return;

            const now = currentTimestamp();
            const rectMap = {};
            // Keep track of remapped card IDs
            const idRemap = {};
            data.cards.forEach((card) => {
              idRemap[card.id] = uuidv4();
            });
            const newCards = data.cards.map((card) => {
              card.id = idRemap[card.id];
              card.createdAt = now;
              card.updatedAt = now;

              if (card.parentId) {
                const remappedParentId = idRemap[card.parentId];
                if (remappedParentId) {
                  card.parentId = remappedParentId;
                } else {
                  // We attempt to copy the parent so this should not happen,
                  // but if it does, remove the broken parent reference:
                  delete card.parentId;
                }
              } else {
                rectMap[card.id] = {
                  x: card.position.x,
                  y: card.position.y,
                  width: card.bounds?.width || 0,
                  height: card.bounds?.height || 0,
                };
              }
              // Extract injected size information so we don't persist it with the model
              delete card.bounds;
              return card;
            });

            // Remap card coordinates into centered bounds
            const cardRects = Object.values(rectMap);
            const bounds = cardRects.length ? getCommonRect(cardRects) : ZERO_RECT;
            const centeredBounds = getCenterAlignedRect(viewportRect, bounds);
            const xOffset = bounds.x - centeredBounds.x;
            const yOffset = bounds.y - centeredBounds.y;

            // Reposition cards
            for (let i = 0; i < newCards.length; i++) {
              const card = newCards[i];
              card.position.x = card.position.x - xOffset;
              card.position.y = card.position.y - yOffset;
            }

            const mutation = (cards) => newCards.forEach((card) => cards.push(card));
            get().doDocumentUpdate({ id, cards: mutation, canUndo: true });

            analyticsService.logEvent(events.documentCardsPasted({ documentId: id, count: newCards.length, source }));

            resolve({
              selectedCardIds: newCards.map((card) => !card.parentId && card.id).filter(Boolean),
              bounds: centeredBounds,
            });
          } else {
            // TODO create a note card with the text?
            resolve([]);
          }
        })
        .catch((error) => {
          console.warn("Failed to paste", error);
          reject(error);
          // TODO we could store the clipboard in memory and use that instead but that won't work across tabs
          // localStorage would work across tabs but not across browsers
          analyticsService.logEvent(events.documentCardsPasteFailed({ documentId: id, error: error.message, source }));
        });
    });
  },
});

// Connections

export const DEFAULT_RECALL_OPTIONS = {
  searchType: "exact",
  timeFilter: "any",
  typeFilter: "any",
  domainFilter: "any",
  source: "auto",
};

const createRecallSlice = (set, get) => ({
  stacks: [],
  recall: {
    state: "idle",
    errorMsg: null,
    query: "",
    isOpen: false,
    isMinimized: false,
    areFiltersVisible: false,
    options: { ...DEFAULT_RECALL_OPTIONS },
    manager: new RecallManager({
      debug: DEBUG,
      doRecall: (params) => get()._doRecall(params),
      onStart: () => {
        set((state) => {
          state.recall.status = "loading";
          state.recall.errorMsg = null;
        });
      },
      onSuccess: ({ matches, documentId, stackId, query, source, options }) => {
        set(
          (state) => {
            state.recall.status = "success";
            state.recall.errorMsg = null;

            // Check that we haven't cached this stack before:
            let stack = state.stacks.find((s) => s.id === stackId);
            if (!stack) {
              stack = makeQueryStack({ id: stackId, documentId, query, results: matches || [], options });
            }
            // Move stack to the top regardless of position
            state.stacks = [...state.stacks.filter((s) => s.id === stackId), stack];
            // Truncate to last 10 stacks
            state.stacks.slice(Math.max(state.stacks.length - 10, 0));
          },
          {
            analytics: events.documentQueryStackLoaded({
              documentId,
              source,
              queryLength: query.length,
            }),
          }
        );
      },
      onError: ({ error }) => {
        set((state) => {
          state.recall.status = "error";
          state.recall.errorMsg = errorToString(error);
        });
        onError(error);
      },
    }),
  },
  _doRecall: ({ documentId, query, contextUrls, options }) => {
    return new Promise((resolve, reject) => {
      const prefs = get().prefs;
      let connectionsOptions = { query, source: `web-client-v${APP_VERSION}` };

      const minScore = prefs["minConnectionsScore"];
      if (minScore && typeof minScore === "number") {
        connectionsOptions.minScore = minScore;
      }

      const graphEnabled = prefs["graphEnabled"];
      if (graphEnabled) {
        connectionsOptions.graphEnabled = true;
      }

      if (contextUrls) {
        connectionsOptions.contextUrls = contextUrls;
      }

      const defaultEngine = get().user.defaultEngine;
      const availableEngines = get().user.availableEngines;
      const engine = prefs["engine"];
      // Only use the pref override if it's a valid option:
      if (engine && typeof engine === "string" && availableEngines.includes(engine)) {
        connectionsOptions.engine = engine;
      } else if (defaultEngine) {
        connectionsOptions.engine = defaultEngine;
      } else {
        // Leave out - let server fall back to default
      }
      connectionsOptions.contextUrls = contextUrls;

      // Convert options to the parameters the server expects
      connectionsOptions = {
        ...connectionsOptions,
        ...nobindMapOptionsToConnectionOptions({ options, prefs: get().prefs }),
      };

      // Run
      loadConnections(connectionsOptions)
        .then((response) => {
          // Reshape results and let success handler deal with it
          const results = response.results.map((r) => mapConnectionResultToModel(r));
          const stackId = response.stack_id;
          // This is the shape the manager expects back
          resolve({ results, query, stackId, documentId, options });
        })
        .catch((error) => {
          // Let error handler deal with it
          reject({ message: errorToString(error), query, options });
        });
    });
  },
  doRecallFiltersOpen: (isOpen) => {
    set((state) => {
      if (typeof isOpen === "function") {
        isOpen = isOpen(state.recall.areFiltersVisible);
      }
      state.recall.areFiltersVisible = isOpen;

      analyticsService.logEvent(events.recallFiltersToggle({ source: sources.RECALL }));
    });
  },
  doRecallOpen: ({ isOpen = true, eventSource }) => {
    set((state) => {
      if (typeof isOpen === "function") {
        isOpen = isOpen(state.recall.isOpen);
      }
      const wasOpen = state.recall.isOpen;
      state.recall.isOpen = isOpen;
      // Reset minimized state if re-opening
      if (isOpen && wasOpen && state.recall.isMinimized) {
        state.recall.isMinimized = false;
      }

      analyticsService.logEvent(events.recallToggled({ isOpen, source: eventSource }));
    });
  },
  doRecallMinimize: (isMinimized = true) => {
    set((state) => {
      state.recall.isMinimized = isMinimized;
      // If for some reason we were not open, do so
      if (!state.recall.isOpen) {
        state.recall.isOpen = true;
      }
    });
  },
  doQueryStackLoad: ({ documentId, query, contextUrls, source, options }) => {
    const stacks = get().stacks;
    const activeStack = stacks[stacks.length - 1];
    const prevQuery = get().recall.query || activeStack?.query || "";
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
      // Clear stacks
      set((state) => {
        state.recall.query = "";
        state.recall.options = { ...DEFAULT_RECALL_OPTIONS };
        state.stacks = [];
      });
    } else {
      const recallManager = get().recall.manager;
      recallManager.update({
        query,
        metadata: { documentId, contextUrls, source, ...(options ? { options } : {}) },
      });
      set((state) => {
        state.recall.query = query;
        state.recall.options = options;
        // Reset
        state.recall.isOpen = true;
        state.recall.isMinimized = false;
      });
    }
  },
  // This is still used because the editor will sync viewer to the stack index
  doQueryStackJump: ({ id, index }) => {
    set((state) => {
      const stack = state.stacks.find((stack) => stack.id === id);
      if (!stack) return;

      stack.index = Math.max(0, Math.min(index, stack.results.length - 1));
    });
  },
  doQueryStackMarkGoodResult: ({ documentId, id, source }) => {
    set((state) => {
      const stack = state.stacks.find((stack) => stack.id === id);
      if (!stack) return;

      const stackIndex = stack.index;
      const model = stack.results[stackIndex];
      if (!model) return;

      stack.markedGoodResults.push(model);

      analyticsService.logEvent(
        events.documentQueryStackMarkGood({
          documentId,
          stackId: id,
          stackIndex,
          source,
        })
      );

      FeedbackEventsManager.logEvent({
        action: "mark_good",
        query: stack.query,
        score: model.score,
        stackId: id,
        sentenceNumber: model.matchSentence,
        ...(documentId ? { contextIdeaId: documentId } : { contextUrl: document.location.href }),
      });
    });
  },
  doQueryStackRemoveResult: ({ documentId, id, source }) => {
    set((state) => {
      const stack = state.stacks.find((stack) => stack.id === id);
      if (!stack) return;

      const stackIndex = stack.index;
      const model = stack.results[stackIndex];
      if (!model) return;

      stack.results.splice(stackIndex, 1);
      stack.index = Math.min(Math.max(0, stackIndex - 1), stack.results.length - 1);

      analyticsService.logEvent(
        events.documentQueryStackRemove({
          documentId,
          stackId: id,
          stackIndex,
          source,
        })
      );

      FeedbackEventsManager.logEvent({
        action: "mark_bad",
        query: stack.query,
        score: model.score,
        stackId: id,
        sentenceNumber: model.matchSentence,
        ...(documentId ? { contextIdeaId: documentId } : { contextUrl: document.location.href }),
      });
    });
  },
  doQueryStackCopy: ({ documentId, id, source }) => {
    const stack = get().stacks.find((stack) => stack.id === id);
    if (!stack) return;

    const stackIndex = stack.index;
    const model = stack.results[stackIndex];
    if (!model) return;

    const sentences =
      model.artifactType === "tweet-thread" ? model.tweets[model.matchTweetIndex].sentences : model.sentences;
    const text = `"${sentences.map((s) => s.text).join(" ")}"\n\nSource: ${model.title} (${model.url})`;
    navigator.clipboard.writeText(text).catch((error) => {
      console.error("[!] Could not copy recall result to clipboard:", error);
    });

    analyticsService.logEvent(
      events.documentQueryStackCopy({
        documentId,
        stackId: id,
        stackIndex,
        source,
      })
    );

    FeedbackEventsManager.logEvent({
      action: "copy",
      query: stack.query,
      score: model.score,
      stackId: id,
      sentenceNumber: model.matchSentence,
      ...(documentId ? { contextIdeaId: documentId } : { contextUrl: document.location.href }),
    });
  },
  doQueryStackExpand: ({ documentId, id, source, history }) => {
    const stack = get().stacks.find((stack) => stack.id === id);
    if (!stack) return;

    const stackIndex = stack.index;
    const model = stack.results[stackIndex];
    if (!model) return;

    const sentence = getMatchSentenceFromModel({ model });
    let path = buildExpandedStackUrl({
      basePath: document.location.pathname,
      artifactId: model.artifactId,
      sentence,
      stackId: id,
      page: model.page,
    });
    if (model.page) {
      path = `${path}&page=${model.page}`;
    }
    history.push(path);

    analyticsService.logEvent(
      events.documentQueryStackExpand({
        documentId,
        stackId: id,
        stackIndex,
        source,
      })
    );

    FeedbackEventsManager.logEvent({
      action: "expand",
      query: stack.query,
      score: model.score,
      stackId: id,
      sentenceNumber: model.matchSentence,
      ...(documentId ? { contextIdeaId: documentId } : { contextUrl: document.location.href }),
    });
  },
});

function doExtensionSync() {
  if (!canInstallExtension()) {
    return;
  }

  // TODO better logging
  syncSubscriptionData({ extensionId })
    .then(() => {
      console.log("Sync extension subscriptions");
    })
    .catch((error) => {
      console.log("Failed to sync extension subscriptions", error);
    });
}

const createSubscriptionsSlice = (set) => ({
  subscriptions: {
    status: "loading", // start in a loading state
    records: [],
  },

  doSubscriptionsLoad: () => {
    return apiLib
      .loadRssSubscriptions()
      .then((records) => {
        const subs = records.sort((a, b) => {
          // Sort by sync status first
          if (a.sync_paused && !b.sync_paused) {
            return 1;
          } else if (!a.sync_paused && b.sync_paused) {
            return -1;
          }
          // By creation date second
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        });

        set((state) => {
          state.subscriptions.status = "ready";
          state.subscriptions.records = subs;
        });

        doExtensionSync();
      })
      .catch((error) => {
        set((state) => {
          state.subscriptions.status = "error";
        });
        onError(error);
      });
  },
});

const createArtifactSlice = (set, get) => ({
  artifacts: new Map(),
  artifactsIndex: {
    status: "loading", // start in a loading state
    records: [],
    total: 0,
    lastSyncTs: null,
  },
  doArtifacsIndexPreload: () => {
    set((state) => {
      state.artifactsIndex.status = "preloading";
    });
    return apiLib
      .loadArtifactsPage()
      .then((response) => {
        set((state) => {
          state.artifactsIndex.status = "preloaded";
          state.artifactsIndex.records = response.artifacts;
          state.artifactsIndex.total = response.total;
          state.artifactsIndex.lastSyncTs = getISOTimestamp();
        });
      })
      .catch((error) => {
        set((state) => {
          state.artifactsIndex.status = "error";
        });
        onError(error);
      });
  },

  doArtifactsIndexLoad: () => {
    set((state) => {
      state.artifactsIndex.status = "loading";
    });
    return apiLib
      .loadAllArtifacts()
      .then((response) => {
        set((state) => {
          state.artifactsIndex.status = "ready";
          state.artifactsIndex.records = response.artifacts;
          state.artifactsIndex.total = response.total;
          state.artifactsIndex.lastSyncTs = getISOTimestamp();
        });
      })
      .catch((error) => {
        set((state) => {
          state.artifactsIndex.status = "error";
        });
        onError(error);
      });
  },

  doArtifactLoad: async ({ id, artifactType, title, url, sentences, tweets }) => {
    if (!id) {
      onError("doArtifactLoad: article id is required");
      return;
    }

    // Skip loading if already successfully cached:
    const entry = get().artifacts.get(id);
    if (entry && entry.status === "success") return;

    // We potentially partially have the artifact from the connections response
    // - for now use some heurestics to figure out what we're loading so we can
    // partially hydrate the artifact.
    let type;
    let subType;

    if (artifactType === "recollect-note") {
      type = "recollect";
      subType = "note_card";
    } else if (artifactType === "tweet-thread") {
      type = "twitter";
      subType = "tweet_thread";
    } else if (artifactType === "pdf") {
      type = "pdf";
      subType = undefined;
    } else if (artifactType === "youtube-video-transcript") {
      type = "video_transcription";
      subType = "youtube";
    } else if (artifactType === "google-drive-screenshot") {
      type = "google_drive";
      subType = "screenshot";
    } else if (artifactType === "google-drive-doc") {
      type = "google_drive";
      subType = "google_doc";
    } else {
      type = "web";
      subType = "article";
    }

    let baseData = {};
    if (type) {
      baseData = {
        status: "loading",
        doc_type: type,
        doc_subtype: subType,
        doc_id: id,
        title,
        url,
      };
    }

    const partialData = makeUserData({
      status: "loading",
      ...baseData,
    });
    if (sentences) {
      partialData.sentences = [...sentences];
    } else if (tweets) {
      partialData.tweets = [...tweets];
    }

    set((state) => {
      state.artifacts.set(id, partialData);
    });

    try {
      const results = await loadUserData({ doc_id: id, url });
      const result = results instanceof Array ? results[0] : results;

      set((state) => {
        const article = makeUserData({ status: "success", ...result });
        state.artifacts.set(id, article);
      });
    } catch (error) {
      set((state) => {
        state.artifacts.set(id, makeUserData({ status: "error" }));
      });
      onError(error);
    }
  },
});

function makeDailyLogCardFromResult({ result, contextUrls }) {
  let contextTitle = null;
  if (result.context_url) {
    contextTitle = contextUrls?.find((c) => c.url === result.context_url)?.title || null;
  }

  return {
    id: result.id,
    content: result.content,
    type: result.type,
    created: result.created,
    modified: result.modified,
    // card context
    contextUrl: result.context_url,
    contextTitle,
  };
}

function cardsToDayCardsMap(cards) {
  const dayCardsMap = {};

  // If we add a note to a higlight in the past
  // we want the note card (card highlight parentId points to)
  // to be grouped in with the day of the original highlight
  // otherwise it would move between days.
  const parentIdToChildCardMap = cards.reduce((acc, card) => {
    // Assuming 1:1 relationship is enforced
    if (card.content.parentId) {
      acc[card.content.parentId] = card;
    }
    return acc;
  }, {});

  // Group
  cards.forEach((card) => {
    let day;
    const childCard = parentIdToChildCardMap[card.id];
    if (childCard) {
      day = isoDateStrToLocalDateStr(childCard.created);
    } else {
      day = isoDateStrToLocalDateStr(card.created);
    }

    const existingCards = dayCardsMap[day] || [];
    dayCardsMap[day] = [...existingCards, card];
  });

  // Sort
  Object.keys(dayCardsMap).map((day) => {
    dayCardsMap[day] = dayCardsMap[day].sort((a, b) => new Date(b.created) - new Date(a.created));
  });

  return dayCardsMap;
}

function getLastMonthGMT() {
  let date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function getTodayGMT() {
  let date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

const createDownloadSlice = (set, get) => ({
  doDownloadFile: () => {
    return new Promise((resolve, reject) => {
      downloadFile()
        .then((response) => {
          // Check if response has data and headers
          if (response && response.data) {
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Default filename, adjust based on content type
            let fileName = 'downloaded_file.zip'; // Default to .zip
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
              const match = contentDisposition.match(/filename="(.+)"/);
              if (match && match[1]) {
                fileName = match[1];
              }
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();

            console.log("Download initiated for file:", fileName);
            resolve(response);
          } else {
            console.error("Response data is missing");
            reject(new Error("Response data is missing"));
          }
        })
        .catch((error) => {
          console.error("Failed to download file", error);
          reject(error);
        });
    });
  },
});



const createDailyLogSlice = (set, get) => ({
  dailyLog: {
    status: "loading", // start in a loading state
    startDay: getLastMonthGMT(),
    endDay: getTodayGMT(),
    cards: [],
  },

  // Doesn't cache
  // consider https://github.com/cmlarsen/zustand-middleware-computed-state or alternatives
  doComputeDayCardsMap: (cards) => {
    return cardsToDayCardsMap(cards || []);
  },

  _doDailyLogPersistAnnotations: ({ cards, contextUrl }) => {
    return new Promise((resolve, reject) => {
      apiLib
        .updateAnnotationsForLog({ cards, contextUrl })
        .then(({ results, context_urls: contextUrls }) => {
          set((state) => {
            const resultCards = results?.map((result) => makeDailyLogCardFromResult({ result, contextUrls })) || [];
            const resultCardIds = resultCards.map((card) => card.id);
            state.dailyLog.cards = [
              ...state.dailyLog.cards.filter((card) => !resultCardIds.includes(card.id)),
              ...resultCards,
            ];
            resolve(resultCards);
          });
        })
        .catch((error) => {
          onError(error);
          reject(error);
        });
    });
  },

  doDailyLogAddKeptCard: ({ stackId, source }) => {
    return new Promise((resolve, reject) => {
      const { query, index: stackIndex, results } = get().stacks.find((stack) => stack.id === stackId) || {};
      if (!query) return;

      let model = results[stackIndex];
      if (!model) return;

      const card = get()._doDocumentMakeKeptCard({ model, query });

      get()
        ._doDailyLogPersistAnnotations({ cards: [card] })
        .then(({ resultCards }) => {
          resolve(resultCards);
        })
        .catch((error) => {
          reject(error);
        });

      analyticsService.logEvent(
        events.dailyLogCardKept({
          stackId,
          stackIndex,
          source,
        })
      );

      FeedbackEventsManager.logEvent({
        action: "keep",
        query,
        score: model.score,
        stackId,
        sentenceNumber: model.matchSentence,
      });
    });
  },

  doDailyLogAddNote: ({ id, body }) => {
    return new Promise((resolve, reject) => {
      const newNoteCard = makeNoteCard({ id: uuidv4(), body });
      const updatedCards = [newNoteCard];

      let contextUrl; // extract context from childCard if this is an update

      if (id) {
        // Find child card and point it to the new note card
        const cards = get().dailyLog.cards;
        const childCard = cards.find((card) => card.id === id);
        if (!childCard) {
          reject(new Error(`doDailyLogAddNote: could not find card with id ${id}`));
          return;
        }
        if (childCard.contextUrl) {
          contextUrl = childCard.contextUrl;
        }
        const updatedChildCard = get()._doUpdateCardModel({
          card: childCard.content,
          cards: [], // not needed
          parentId: newNoteCard.id,
        });
        // making sure it gets updated on the server
        updatedCards.push(updatedChildCard);
      }

      get()
        ._doDailyLogPersistAnnotations({ cards: updatedCards, contextUrl })
        .then(({ resultCards }) => {
          resolve(resultCards);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  doDailyLogUpdateNote: ({ id, body }) => {
    return new Promise((resolve, reject) => {
      const cards = get().dailyLog.cards;
      const noteCard = cards.find((c) => c.id === id);
      if (!noteCard) {
        reject(new Error(`doDailyLogUpdateNote: could not find card with id ${id}`));
        return;
      }
      // Note: expecting body to be null if it's an empty value equivalent
      if (!body) {
        get()
          .doDailyLogRemoveCard({ id, shouldSplit: true })
          .then(() => {
            resolve([]);
          })
          .catch((error) => reject(error));
      } else {
        const updatedNoteCard = makeNoteCard({ ...noteCard, body, updatedAt: currentTimestamp() });

        get()
          ._doDailyLogPersistAnnotations({ cards: [updatedNoteCard], contextUrl: noteCard.contextUrl })
          .then(({ resultCards }) => {
            resolve(resultCards);
          })
          .catch((error) => {
            reject(error);
          });
      }
    });
  },

  doDailyLogRemoveCard: ({ id, shouldSplit = false }) => {
    return new Promise((resolve, reject) => {
      const cards = get().dailyLog.cards;
      const cardIndex = cards.findIndex((c) => c.id === id);
      if (cardIndex < 0) {
        reject(new Error(`doDailyLogRemoveCard: could not find card with id ${id}`));
      }

      const toRemove = [id];
      const card = cards[cardIndex];

      if (shouldSplit) {
        // To split means to disconnect any note child / parent card
        const childCardIndex = cards.findIndex((c) => c.parentId === card.id);
        if (childCardIndex >= 0) {
          cards[childCardIndex] = get()._doUpdateCardModel({
            card: cards[childCardIndex],
            cards: [], // not needed
            parentId: null,
          });
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

      get()
        .doDailyLogRemoveCards({ ids: toRemove })
        .then(() => {
          resolve();
        })
        .catch((error) => reject(error));
    });
  },

  doDailyLogRemoveCards: ({ ids }) => {
    return new Promise((resolve, reject) => {
      apiLib
        .deleteAnnotations({ ids })
        .then((response) => {
          if (response.unknown?.length) {
            console.warn("Failed to remove annotation cards:", response);
          }

          set((state) => {
            state.dailyLog.cards = state.dailyLog.cards.filter((card) => !ids.includes(card.id));
          });

          resolve(response);
        })
        .catch((error) => {
          onError(error);
          reject(error);
        });
    });
  },

  doDailyLogLoad: ({ createdAfter, createdBefore } = {}) => {
    return new Promise((resolve) => {
      set((state) => {
        state.dailyLog.status = "loading";
      });

      // Hacky way to avoid having to pass these in for first sync call
      if (!createdAfter) {
        createdAfter = get().dailyLog.startDay;
      }
      if (!createdBefore) {
        createdBefore = get().dailyLog.endDay;
      }

      apiLib
        .loadAnnotationsLog({ createdAfter, createdBefore })
        .then((data) => {
          const { results, context_urls: contextUrls } = data;

          set((state) => {
            state.dailyLog.status = "idle";
            state.dailyLog.cards = results.map((result) => makeDailyLogCardFromResult({ result, contextUrls }));
            resolve();
          });
        })
        .catch((error) => {
          onError(error);
          set((state) => {
            state.dailyLog.status = "error";
            resolve();
          });
        });
    });
  },
});

const resetters = [];
const _create = (f) => {
  const store = create(f);
  const initialState = store.getState();
  resetters.push(() => {
    store.setState(initialState, true);
  });
  return store;
};

export const useStore = _create(
  persist(
    immer(
      analytics((set, get) => ({
        ...createSyncSlice(set, get),
        ...createUpdateSlice(set, get),
        ...createPrefsSlice(set, get),
        ...createAuthSlice(set, get),
        ...createUserDataSlice(set, get),
        ...createDocumentsSlice(set, get),
        ...createRecallSlice(set, get),
        ...createArtifactSlice(set, get),
        ...createDailyLogSlice(set, get),
        ...createSubscriptionsSlice(set, get),
         ...createDownloadSlice(set, get),  // <-- Add this line
      }))
    ),
    {
      name: "recollect_store",
      partialize: (state) => ({
        prefs: state.prefs,
        stacks: state.stacks,
        recall: {
          isOpen: state.recall.isOpen,
          isMinimized: state.recall.isOpen,
          areFiltersVisible: state.recall.areFiltersVisible,
        },
      }),
      merge: (persistedState, currentState) => {
        // Allow overriding prefs from search parameters
        const urlSearchParams = new URLSearchParams(window.location.search);

        const prefKeyToKey = (key, prefix = "pref") => {
          if (key.startsWith(prefix) && key.length > prefix.length) {
            let newKey = key.substring(prefix.length);
            return newKey.charAt(0).toLowerCase() + newKey.slice(1);
          }
        };
        const onOff = (qs) => ({ off: false, on: true, "": true }[qs] || false);
        const float = (qs) => (qs ? parseFloat(qs) : undefined);
        const string = (qs) => (qs ? decodeURIComponent(qs.replace(/[+]/g, " ")) : undefined);

        const overridePrefs = {};
        for (const [key, value] of urlSearchParams.entries()) {
          const _key = prefKeyToKey(key);
          if (_key && Object.prototype.hasOwnProperty.call(prefs, _key)) {
            if (typeof prefs[_key] === "boolean") {
              overridePrefs[_key] = onOff(value);
            } else {
              overridePrefs[_key] = float(value);
              if (isNaN(overridePrefs[_key])) {
                overridePrefs[_key] = string(value);
              }
            }
          }
        }

        // Throw out any persisted prefs that are not in our list of expected prefs:
        const cleanPersistedPrefs = {};
        Object.keys(persistedState.prefs).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(prefs, key)) {
            cleanPersistedPrefs[key] = persistedState.prefs[key];
          }
        });

        persistedState.prefs = { ...prefs, ...cleanPersistedPrefs, ...overridePrefs };

        const numPrefsOverride = Object.keys(overridePrefs).length;
        if (DEBUG && numPrefsOverride > 0) {
          console.info(
            `%c  @PREFS merged ${numPrefsOverride} pref(s) from search params`,
            "background: lightgreen; color: black",
            overridePrefs
          );
        }

        // Make sure we are mapped to latest model to avoid crashing
        persistedState.stacks = persistedState.stacks.map((s) => makeQueryStack(s));

        // Merge persisted Recall state
        // Note that the position is persisted outside of the store by the component itself
        // TODO move that to the store
        persistedState.recall = {
          ...currentState.recall,
          ...persistedState.recall,
        };

        return { ...currentState, ...persistedState };
      },
    }
  )
);





const resetAllStores = () => {
  for (const resetter of resetters) {
    resetter();
  }

  console.log("[!] Clearing persisted state...");
  useStore.persist.clearStorage();
};

// Live store (transient "live" shared state)
// Split up in a different store to avoid the overhead of immer and other wrappers
// for fast changing temporary data used to facilitate drag gestures primarily
export const useLiveStore = create((set) => ({
  liveCamera: null,
  setLiveCamera: (camera) => set(() => ({ liveCamera: camera })),
}));

if (DEBUG) {
  console.info("%c  @DEBUG  ", "background: blue; color: white", DEBUG, `v${APP_VERSION}`);
  window.getState = () => useStore.getState();
  window.resetAllStores = resetAllStores;
  window.getLiveState = () => useLiveStore.getState();
  console.info("%c  @INIT window.getState()  ", "background: lightblue; color: black", window.getState());
  window.clearCache = () => AppCache.clear();
}

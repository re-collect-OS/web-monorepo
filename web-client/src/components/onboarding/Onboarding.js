import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import cn from "classnames";
import { useMachine } from "react-robot";
import { createMachine, state, state as final, transition, action, reduce } from "robot3";
import { shallow } from "zustand/shallow";
import { useParams, useHistory } from "react-router-dom";
import { stripWWW, GlobalNoGoList, onlyUnique, GlobalNoAutoCollectList } from "js-shared-lib";

import { events, analyticsService } from "../../libs/analyticsLib";
import { useStore } from "../../store";
import { DEBUG } from "../../config";
import {
  canInstallExtension,
  getFullHistory,
  getBookmarks,
  openChromeExtensionInstaller,
  pollForChromeExtension,
  syncUserData,
  extensionId,
} from "../../libs/chromeExtensionLib";

import apiLib from "../../libs/apiLib";
const { pushChunkedHistory, ACCOUNT_STATUS_CREATED, ACCOUNT_STATUS_READY, ACCOUNT_STATUS_UNKNOWN } = apiLib;

import { IntroStep, InstallExtensionStep, ImportStep, FinishedStep } from "./Steps";

import styles from "./Onboarding.module.css";

// Allow forcing a fresh account by appending ?debug&fresh&dry to the URL
if (DEBUG) {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());

  const sessionFresh = !!sessionStorage.getItem("fresh");
  const forceFreshAccountStatus = "fresh" in params || sessionFresh;
  if (forceFreshAccountStatus && !sessionFresh) {
    sessionStorage.setItem("fresh", "true");
  }
  window.forceFreshAccountStatus = forceFreshAccountStatus;

  const sessionDry = !!sessionStorage.getItem("dry");
  const dryRun = "dry" in params || sessionDry;
  if (dryRun && !sessionDry) {
    sessionStorage.setItem("dry", "true");
  }
  window.dryRun = dryRun;
}

const globalNoGoList = [...GlobalNoGoList, ...GlobalNoAutoCollectList]
  .map((hostname) => stripWWW(hostname))
  .filter(onlyUnique);

const stripKeyFromContext = (keyToRemove, ctx) =>
  Object.fromEntries(Object.entries(ctx).filter(([key]) => !key.includes(keyToRemove)));

function buildMachine(initialState = "intro") {
  return createMachine(
    initialState,
    {
      intro: state(
        transition("continue", "install"),
        transition(
          "skip",
          "import",
          action((ctx) => ctx.navigate("import"))
        )
      ),
      // Extension
      install: state(
        transition("continue", "installing"),
        transition(
          "skip",
          "import",
          reduce((ctx) => ({ ...ctx, ...{ skippedExtensionInstall: true } })),
          action((ctx) => ctx.navigate("import"))
        )
      ),
      installing: state(
        transition(
          "continue",
          "import",
          action((ctx) => ctx.navigate("import"))
        ),
        transition(
          "back",
          "install",
          reduce((ctx, event) => (event.data?.error ? { ...ctx, installError: event.data.error } : ctx))
        )
      ),
      // Import
      import: state(
        transition(
          "continue",
          "submit",
          reduce((ctx) => stripKeyFromContext("submitSyncError", ctx))
        )
      ),
      submit: state(
        transition(
          "continue",
          "finished",
          reduce((ctx, event) =>
            event.data?.totalImported ? { ...ctx, totalImported: event.data.totalImported } : ctx
          ),
          action((ctx) => ctx.navigate("finished", true))
        ),
        transition(
          "back",
          "import",
          reduce((ctx, event) => (event.data?.error ? { ...ctx, submitSyncError: event.data.error } : ctx)),
          action((ctx) => ctx.navigate("import"))
        )
      ),
      finished: state(
        transition(
          "back",
          "import",
          reduce((ctx) => stripKeyFromContext("totalImported", ctx)),
          action((ctx) => ctx.navigate("import"))
        )
      ),
      onboarded: final(),
    },
    (initialContext) => initialContext
  );
}

const selector = (state) => ({
  name: state.user.name,
  accountStatus: state.user.accountStatus,
  doAuthSyncLoginWithExtension: state.doAuthSyncLoginWithExtension,
  doUserDataUpdate: state.doUserDataUpdate,
  userDataGoList: state.userData.goList,
});

function useDynamicMachine(step, ctx) {
  const [machine, setMachine] = useState(buildMachine(step));
  const _ctx = useRef(ctx);

  useEffect(() => setMachine(buildMachine(step)), [step]);

  const instance = useMachine(machine, _ctx.current);
  const [{ context }] = instance;

  useEffect(() => (_ctx.current = context), [context]);

  return instance;
}

const dashToCamel = (s) => s.replace(/(-\w)/g, (k) => k[1].toUpperCase());
const camelToDash = (str) => str.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);

export default function Onboarding() {
  const { accountStatus, userDataGoList, doUserDataUpdate, doAuthSyncLoginWithExtension, name } = useStore(
    selector,
    shallow
  );

  const { step: navState } = useParams();
  const history = useHistory();

  const firstRender = useRef(true);
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;

      const remappedNavState = "intro";
      if (remappedNavState !== navState) {
        history.replace(`/welcome/${camelToDash(remappedNavState)}`);
      }
    }
  }, [navState, accountStatus, history]);

  const [
    {
      name: state,
      context,
      service: { send },
    },
  ] = useDynamicMachine(navState ? dashToCamel(navState) : undefined, {
    goList: userDataGoList,
    navigate: (to, replace = false, block = false) => {
      setTimeout(() => {
        const url = `/welcome/${camelToDash(to)}`;
        if (replace) {
          history.replace(url);
        } else {
          history.push(url);
        }

        if (block) {
          const unblock = history.block((tx) => {
            if (tx.pathname.startsWith("/welcome")) {
              if (window.confirm(`Do you want to go back and add more data?`)) {
                unblock();
                return true;
              }
            } else {
              unblock();
              return true;
            }
            return false;
          });
        }
      }, 0);
    },
  });

  window.context = context;

  let step = null;
  switch (state) {
    case "intro":
      step = (
        <IntroStep
          name={name}
          onContinue={() => {
            send("continue");
            analyticsService.logEvent(events.onboardingChromeExtensionStarted());
          }}
          onSkip={() => {
            send("skip");
            analyticsService.logEvent(events.onboardingDataFlowStarted());
          }}
          onOpenProduct={() => history.push("/")}
          canInstallExtension={canInstallExtension()}
        />
      );
      break;
    case "install":
    case "installing":
      step = (
        <InstallExtensionStep
          error={context.installError}
          isInstalling={state === "installing"}
          onContinue={(launchInstaller = true) => {
            send("continue");

            if (launchInstaller) {
              openChromeExtensionInstaller(extensionId);
              analyticsService.logEvent(events.onboardingChromeExtensionPopupOpened());
            }

            if (DEBUG) {
              console.log("Onboarding: polling for extension...");
            }
            pollForChromeExtension({ extensionId })
              .then((_pingResponse) => {
                if (DEBUG) {
                  console.log("Onboarding: found extension!", _pingResponse);
                }
                doAuthSyncLoginWithExtension()
                  .then(() => {
                    send("continue");
                    analyticsService.logEvent(events.onboardingChromeExtensionInstalled());
                  })
                  .catch(({ cause, code }) => {
                    const errorMsg =
                      code === "Could not find extension"
                        ? "Failed to get current session. Please try again."
                        : "Failed to communicate with extension. Please try again.";
                    send({
                      type: "back",
                      data: {
                        error: new Error(errorMsg, { cause }),
                      },
                    });
                    analyticsService.logEvent(
                      events.onboardingChromeExtensionFailed({ error: errorMsg, debugError: cause.message })
                    );
                  });
              })
              .catch((error) => {
                console.warn("Onboarding: could not find extension:", error.message);
                send("back");
                analyticsService.logEvent(
                  events.onboardingChromeExtensionFailed({ error: "Could not find extension" })
                );
              });
          }}
          onSkip={() => send("skip")}
        />
      );
      break;
    case "import":
    case "submit":
      step = (
        <ImportStep
          isSubmitting={state === "submit"}
          error={context.importError}
          skippedExtensionInstall={!!context.skippedExtensionInstall}
          canInstallExtension={canInstallExtension()}
          onContinue={async ({ wantsHistorySync, wantsBookmarkSync }) => {
            send("continue");

            let bookmarks = [];
            let history = [];

            if (wantsBookmarkSync) {
              try {
                const response = await getBookmarks({ extensionId });
                bookmarks = response.bookmarks;
                // Filter out the bar toolbar as they're very unlikely to be articles?
                // Not sure that's true..
                // const bookmarks = response.bookmarks.filter(
                //   (b) => !["Bookmarks Bar", "Bookmark Toolbar"].includes(b.path[0])
                // );
                analyticsService.logEvent(
                  events.onboardingCollectBrowserBookmarksFinished({ count: bookmarks.length })
                );
              } catch (error) {
                console.warn("Onboarding: could not sync browser bookmarks:", error.message);
                send({
                  type: "back",
                  data: {
                    error: new Error("Failed to import browser bookmarks"),
                  },
                });
                analyticsService.logEvent(
                  events.onboardingCollectBrowserBookmarksFailed({ error: error.message, debugError: error.cause })
                );
                return;
              }
            }

            if (wantsHistorySync) {
              try {
                const response = await getFullHistory({
                  extensionId,
                  noGoList: globalNoGoList,
                });
                if (DEBUG) {
                  console.log("Onboarding: did history sync:", response);
                }

                analyticsService.logEvent(
                  events.onboardingChromeHistoryDidSync({ count: response.history.visits.length })
                );

                history = response.history.visits;
              } catch (error) {
                console.warn("Onboarding: could not sync history:", error.message);

                const errorMessage = "Failed to sync browser history. Please try again.";
                analyticsService.logEvent(
                  events.onboardingChromeHistoryFailedToSync({ error: errorMessage, debugError: error.message })
                );

                send({
                  type: "back",
                  data: {
                    error: new Error(errorMessage),
                  },
                });
                return;
              }
            }

            const _visits = [...bookmarks, ...history];
            // Get unique visits - build an object from the non-duplicate items using the .url property as the object key
            const visits = Object.values(
              _visits.reduce((c, v) => {
                if (!c[v.url]) {
                  c[v.url] = v;
                }
                return c;
              }, {})
            );

            const updateUserStatusAndContinue = ({ totalImported }) => {
              if ([ACCOUNT_STATUS_CREATED, ACCOUNT_STATUS_UNKNOWN].includes(accountStatus)) {
                // Update account status
                doUserDataUpdate({ status: ACCOUNT_STATUS_READY, goList: [], noGoList: [] })
                  .then(() => {
                    if (DEBUG) {
                      console.log(`Onboarding: set user status to "${ACCOUNT_STATUS_READY}"`);
                    }
                    // Sync back with amplitude
                    analyticsService.setUserProperty({
                      propertyName: "accountStatus",
                      value: ACCOUNT_STATUS_READY,
                    });
                    send({ type: "continue", data: { totalImported } });
                  })
                  .catch((error) => {
                    console.error("Onboarding: failed to update user data", error);
                    const errorMsg = "Failed to update user data. Please try again.";
                    send({
                      type: "back",
                      data: {
                        error: new Error(errorMsg),
                      },
                    });
                    analyticsService.logEvent(
                      events.onboardingSubmitError({ error: errorMsg, debugError: error.message })
                    );
                  });
              } else {
                if (DEBUG) {
                  console.log(`Onboarding: skipping set user status as it is "${accountStatus}"`);
                }
                send({ type: "continue", data: { totalImported } });
              }
            };

            const submitAndContinue = (visits) => {
              if (DEBUG) {
                console.log("Onboarding: pushing history", visits);
              }

              analyticsService.logEvent(events.onboardingCollectSubmitStarted({ count: visits.length }));

              if (window.dryRun) {
                if (DEBUG) {
                  console.log("Onboarding: skipping submitting because running in dry mode", {
                    totalImported: visits.length,
                  });
                }
                send({ type: "continue", data: { totalImported: visits.length } });
              } else {
                if (!visits.length) {
                  updateUserStatusAndContinue({ totalImported: 0 });
                } else {
                  pushChunkedHistory({ visits })
                    .then((_response) => {
                      if (DEBUG) {
                        console.log("Onboarding: pushed history", { response: _response });
                      }
                      updateUserStatusAndContinue({ totalImported: visits.length });
                      analyticsService.logEvent(events.onboardingCollectSubmitted({ count: visits.length }));
                    })
                    .catch((error) => {
                      const errorMsg = "Failed to submit data. Please try again.";
                      send({
                        type: "back",
                        data: {
                          error: new Error(errorMsg, { cause: error }),
                        },
                      });
                      analyticsService.logEvent(
                        events.onboardingSubmitError({
                          error: errorMsg,
                          debugError: error.message,
                          count: visits.length,
                        })
                      );
                    });
                }
              }
            };

            // Sync user data with extension
            if (context.skippedExtensionInstall || !canInstallExtension()) {
              if (DEBUG) {
                console.log("Onboarding: skipping sync user data with extension");
              }
              submitAndContinue(visits);
            } else {
              syncUserData({ extensionId })
                .then(() => {
                  if (DEBUG) {
                    console.log("Onboarding: did sync user data with extension");
                  }
                })
                .catch((error) => {
                  const errorMsg = "Onboarding: failed to sync user data with extension";
                  console.error(errorMsg, error);
                  analyticsService.logEvent(
                    events.onboardingSubmitError({ error: errorMsg, debugError: error.message })
                  );
                })
                .finally(() => {
                  submitAndContinue(visits);
                });
            }
          }}
        />
      );
      break;
    case "finished":
      step = (
        <FinishedStep
          totalImported={context.totalImported || 0}
          onOpenProduct={() => history.push("/")}
          onAddMoreData={() => send({ type: "back" })}
          onOpenTour={() => history.push("/tour")}
        />
      );
      break;
    default:
      console.error("Onboarding: unhandled state", state);
      break;
  }

  return (
    <div className={styles.Onboarding}>
      {DEBUG && (
        <div className={cn(styles.debug, { [styles.fresh]: window.forceFreshAccountStatus })}>
          Step {window.dryRun ? "(dry)" : ""}: {state}{" "}
          <button
            onClick={() => {
              send({ type: "continue", data: {} });
            }}
          >
            continue
          </button>
        </div>
      )}
      {step}
    </div>
  );
}

import amplitude from "amplitude-js";
import { DEBUG, ANALYTICS_ENABLED } from "../config";
import { AnalyticsService, amplitudeEvent } from "js-shared-lib";

export const analyticsService = new AnalyticsService({
  amplitude,
  key: "4fc552a081596886e9aedc6d4135c4a4",
  debug: DEBUG,
  enabled: ANALYTICS_ENABLED,
  platform: "chrome-extension",
});

export const sources = new Proxy(
  {
    AUTO: "auto",

    RECOLLECT_POPOVER: "recollect-popover",
    ANNOTATION_POPOVER: "annotation-popover",
    CONTEXT_MENU: "context-menu",
  },
  {
    get(target, name, receiver) {
      if (!Reflect.has(target, name)) {
        if (DEBUG) {
          console.error(`Non-existent source ${name}`);
        }
        return undefined;
      }
      return Reflect.get(target, name, receiver);
    },
  }
);

export const events = {
  // Extension
  userLogout: () => amplitudeEvent("Extension: log out"),

  // Popup
  popupLogin: () => amplitudeEvent("Popup: clicked Log in"),
  popupLogout: () => amplitudeEvent("Popup: clicked Log out"),
  popupOptedIn: () => amplitudeEvent("Popup: clicked Automatically collect"),
  popupOptedOut: () => amplitudeEvent("Popup: clicked Stop collecting"),
  popupArticleRemembered: ({ artifactType }) => amplitudeEvent("Popup: clicked Remember article", { artifactType }),
  popupArticleForgot: ({ artifactType }) => amplitudeEvent("Popup: clicked Forget article", { artifactType }),
  popupFeedbackInitiated: () => amplitudeEvent("Popup: clicked Contact us"),
  popupWebAppInitiated: () => amplitudeEvent("Popup: clicked re:collect logo"),
  popupNoUser: ({ error }) => amplitudeEvent("Popup: saw signed out screen", { error }),
  popupNotificationsOpened: () => amplitudeEvent("Popup: clicked Notifications button"),
  popupRssFeedAdded: ({ hostname }) => amplitudeEvent("Popup: clicked Subscribe to feed", { hostname }),
  popupRssAddFeedFailed: ({ hostname, status }) =>
    amplitudeEvent("Popup: failed to subscribe to feed", { hostname, status }),
  // Recall
  recallDidQuery: ({ stackId, queryLength }) => amplitudeEvent("Recall: did Recall", { stackId, queryLength }),
  recallFailed: ({ queryLength, error }) => amplitudeEvent("Recall: failed to Recall", { queryLength, error }),
  recallDismissed: () => amplitudeEvent("Recall: clicked Done"),
  recallMinimized: () => amplitudeEvent("Recall: clicked Minimize stack"),
  recallRestored: () => amplitudeEvent("Recall: clicked Maximize stack"),
  recallRepositioned: () => amplitudeEvent("Recall: repositioned stack"),
  recallOpenedArticleLink: ({ stackId }) => amplitudeEvent("Recall: clicked article link", { stackId }),
  recallOpenedResultLink: ({ stackId, stackIndex }) =>
    amplitudeEvent("Recall: clicked result link", { stackId, stackIndex }),
  recallCopiedResultText: ({ stackId, stackIndex }) =>
    amplitudeEvent("Recall: copied result text", { stackId, stackIndex }),
  recallKeptResultToPage: ({ stackId, stackIndex }) =>
    amplitudeEvent("Recall: kept result to page", { stackId, stackIndex }),
  recallKeptResultToDailyLog: ({ stackId, stackIndex }) =>
    amplitudeEvent("Recall: kept result to Daily Log", { stackId, stackIndex }),
  recallRemovedResult: ({ stackId, stackIndex }) =>
    amplitudeEvent("Recall: marked bad result", { stackId, stackIndex }),
  recallMarkedGoodResult: ({ stackId, stackIndex }) =>
    amplitudeEvent("Recall: marked good result", { stackId, stackIndex }),
  recallFiltersToggle: () => amplitudeEvent("Recall: toggled filters"),
  recallSearchTypeSet: ({ type }) => amplitudeEvent("Recall: set search type", { type }),
  recallFiltersSet: ({ key, value }) => amplitudeEvent("Recall: set filter", { key, value }),

  // Annotations
  annotationCreatedHighlight: ({ source }) => amplitudeEvent("Annotation: added highlight annotation", { source }),
  annotationAddedNote: ({ isOnHighlight, source }) =>
    amplitudeEvent("Annotation: added note annotation", { isOnHighlight, source }),
  annotationUpdatedNote: ({ isOnHighlight, source }) =>
    amplitudeEvent("Annotation: updated note annotation", { isOnHighlight, source }),
  annotationDeleted: ({ count, source }) => amplitudeEvent("Annotation: deleted annotations", { count, source }),
};

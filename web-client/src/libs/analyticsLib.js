import amplitude from "amplitude-js";
import { DEBUG, ANALYTICS_ENABLED } from "../config";
import { AnalyticsService, amplitudeEvent } from "js-shared-lib";

export const analyticsService = new AnalyticsService({
  amplitude,
  key: "4fc552a081596886e9aedc6d4135c4a4",
  debug: DEBUG,
  enabled: ANALYTICS_ENABLED,
  platform: "web-client",
});

export const sources = new Proxy(
  {
    AUTO: "auto",
    EXTENSION: "extension",

    EDITOR: "editor",
    EDITOR_CARD: "editor-card",
    EDITOR_EXPANDED_CARD: "editor-expanded-card",
    EDITOR_EXPANDED_CARD_TOOLBAR: "editor-expanded-card-toolbar",
    EDITOR_EXPANDED_STACK: "editor-expanded-stack",
    EDITOR_EXPANDED_STACK_TOOLBAR: "editor-expanded-stack-toolbar",
    EDITOR_KEYBOARD: "editor-keyboard",
    EDITOR_NOTE_CARD: "editor-note-card",
    EDITOR_STACK_KEYBOARD: "editor-stack-keyboard",
    EDITOR_TOOLBAR: "editor-toolbar",

    PLAYGROUND: "playground",
    PLAYGROUND_CARD: "playground-card",
    PLAYGROUND_DOUBLE_CLICK: "playground-double-click",
    PLAYGROUND_EXPANDED_CARD: "playground-expanded-card",
    PLAYGROUND_EXPANDED_CARD_TOOLBAR: "playground-expanded-card-toolbar",
    PLAYGROUND_EXPANDED_STACK: "playground-expanded-stack",
    PLAYGROUND_EXPANDED_STACK_TOOLBAR: "playground-expanded-stack-toolbar",
    PLAYGROUND_KEYBOARD: "playground-keyboard",
    PLAYGROUND_NOTE_CARD: "playground-note-card",
    PLAYGROUND_STACK_KEYBOARD: "playground-stack-keyboard",
    PLAYGROUND_TOOLBAR: "playground-toolbar",

    DAILY_GOAL: "daily-goal",
    DAILY_LOG: "daily-log",
    DOWNLOADS: "downloads",
    HOME: "home",
    INTEGRATIONS: "integrations",
    LIBRARY: "library",
    MENU: "menu",
    NOTIFICATIONS: "notifications",
    PLAYGROUNDS: "playgrounds",
    RECALL: "recall",
    RSS_SUBSCRIPTIONS: "rss-subscriptions",
    RSS_SUBSCRIPTIONS_RECOMMENDATION: "rss-subscriptions-recommendation",
    SETTINGS: "settings",
    SETTINGS_HELP_MENU: "settings-help-menu",
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
  // Session
  userLogin: () => amplitudeEvent("User: log in"),
  userVisit: () => amplitudeEvent("User: visit"),
  userSessionStart: ({ url }) => amplitudeEvent("User: session start", { url }),
  userLogout: () => amplitudeEvent("User: log out"),

  // Help Menu
  helpMenuOpened: ({ source }) => amplitudeEvent("Help Menu: opened", { source }),
  helpMenuIntroVideoOpened: () => amplitudeEvent("Help Menu: clicked Introductory video"),
  helpMenuSupportGuideOpened: () => amplitudeEvent("Help Menu: clicked Help and support guide"),

  // ChangeLog
  changeLogOpened: ({ source }) => amplitudeEvent("Change Log: opened", { source }),

  // Nav
  homeOpened: ({ source }) => amplitudeEvent("Home: opened", { source }),
  recallToggled: ({ isOpen, source }) => amplitudeEvent("Recall: toggled", { isOpen, source }),
  dailyLogOpened: ({ source }) => amplitudeEvent("Daily Log: opened", { source }),
  playgroundsOpened: ({ source }) => amplitudeEvent("Playgrounds: opened", { source }),
  libraryOpened: ({ source }) => amplitudeEvent("Library: opened", { source }),
  subscriptionsOpened: ({ source }) => amplitudeEvent("Subscriptions: opened", { source }),
  integrationsOpened: ({ source }) => amplitudeEvent("Integrations: opened", { source }),
  settingsOpened: ({ source }) => amplitudeEvent("Settings: opened", { source }),
  downloadsOpened: ({ source }) => amplitudeEvent("Downloads: opened", { source }),
  notificationsOpened: ({ source }) => amplitudeEvent("Notifications: opened", { source }),

  // Home
  addMoreDataOpened: ({ source }) => amplitudeEvent("Add more data: opened", { source }),

  // Playgrounds
  playgroundsIdeasSorted: ({ sort, source }) => amplitudeEvent("Playgrounds: sorted ideas", { sort, source }),
  playgroundsArchiveOpened: ({ source }) => amplitudeEvent("Playgrounds: opened Archive", { source }),
  playgroundsDraftsOpened: ({ source }) => amplitudeEvent("Playgrounds: opened Drafts", { source }),
  playgroundsTrashOpened: ({ source }) => amplitudeEvent("Playgrounds: opened Trash", { source }),

  // Onboarding
  onboardingFlowStarted: ({ canInstallChromeExtension, hasOnboarded, accountIsReady, isMobile }) =>
    amplitudeEvent("Onboarding: started", { canInstallChromeExtension, hasOnboarded, accountIsReady, isMobile }),
  onboardingDataFlowStarted: () => amplitudeEvent("Onboarding: continued to data flow"),
  onboardingChromeExtensionStarted: () => amplitudeEvent("Onboarding: continued to install extension"),
  onboardingChromeExtensionPopupOpened: () => amplitudeEvent("Onboarding: opened popup to install extension"),
  onboardingChromeExtensionInstalled: () => amplitudeEvent("Onboarding: installed Chrome extension"),
  onboardingChromeExtensionFailed: ({ error, debugError }) =>
    amplitudeEvent("Onboarding: failed to install Chrome extension", { error, debugError }),
  onboardingCollectBrowserBookmarksFinished: ({ count }) =>
    amplitudeEvent("Onboarding: finished import browser bookmarks", { count }),
  onboardingCollectBrowserBookmarksFailed: ({ error, debugError }) =>
    amplitudeEvent("Onboarding: failed to import browser bookmarks", { error, debugError }),
  onboardingCollectSubmitStarted: ({ count }) =>
    amplitudeEvent("Onboarding: started to submit imported visits", { count }),
  onboardingCollectSubmitted: ({ count }) => amplitudeEvent("Onboarding: submitted imported visits", { count }),
  onboardingChromeHistoryDidSync: ({ count }) => amplitudeEvent("Onboarding: did sync Chrome History", { count }),
  onboardingChromeHistoryFailedToSync: ({ error, debugError }) =>
    amplitudeEvent("Onboarding: failed to sync Chrome History", { error, debugError }),
  onboardingSubmitError: ({ error, debugError, count }) =>
    amplitudeEvent("Onboarding: failed to submit", { error, debugError, count }),
  onboardingHasStartedProductOnboarding: ({ source }) =>
    amplitudeEvent("Onboarding: started product onboarding", { source }),
  onboardingHasCompletedProductOnboarding: () => amplitudeEvent("Onboarding: has completed product onboarding"),
  onboardingHasDismissedOnboardingProgress: () =>
    amplitudeEvent("Onboarding: has dismissed onboarding indexing status"),

  // Feedback
  feedbackDialogInitiated: ({ source }) => amplitudeEvent("Feedback: clicked Send feedback", { source }),
  feedbackDialogMessaged: ({ source }) => amplitudeEvent("Feedback: clicked Send message", { source }),
  feedbackDialogEmailed: ({ source }) => amplitudeEvent("Feedback: clicked Send us an email", { source }),
  feedbackDialogCalled: ({ source }) => amplitudeEvent("Feedback: clicked Book a call", { source }),

  // Shortcuts
  shortcutsDialogInitiated: ({ source }) => amplitudeEvent("Feedback: clicked Keyboard shortcuts", { source }),

  // Document - lifecycle
  exportDocumentDialogInitiated: ({ documentId, source }) =>
    amplitudeEvent("Document: clicked Export idea", { documentId, source }),
  documentCreated: ({ documentId, source }) => amplitudeEvent("Document: created", { documentId, source }),
  documentOpened: ({ documentId, source }) => amplitudeEvent("Document: opened", { documentId, source }),
  documentArchived: ({ documentId, source, archived }) =>
    amplitudeEvent("Document: archived", { documentId, source, archived }),
  documentTrashed: ({ documentId, source, trashed }) =>
    amplitudeEvent("Document: trashed", { documentId, source, trashed }),
  documentPinned: ({ documentId, source, pinned }) =>
    amplitudeEvent("Document: pinned", { documentId, source, pinned }),
  documentDeleted: ({ documentId, source }) => amplitudeEvent("Document: deleted", { documentId, source }),
  documentRenamed: ({ documentId, source }) => amplitudeEvent("Document: renamed", { documentId, source }),
  documentExportCopied: ({ documentId, type, source }) =>
    amplitudeEvent("Document: clicked copy export to clipboard", { documentId, type, source }),
  documentExportDownloaded: ({ documentId, type, source }) =>
    amplitudeEvent("Document: clicked download export", { documentId, type, source }),
  documentToggleDocumentView: ({ source }) => amplitudeEvent("Document: toggled Document view", { source }),
  documentToggleSplitView: ({ source }) => amplitudeEvent("Document: toggled Split view", { source }),
  documentTogglePlaygroundView: ({ source }) => amplitudeEvent("Document: toggled Playground view", { source }),
  documentResetZoom: ({ level, source }) => amplitudeEvent("Document: reset Zoom", { level, source }),
  documentOpenIdeaAsNewTab: ({ source }) => amplitudeEvent("Document: opened idea as new tab", { source }),

  // Recall
  recallFiltersToggle: ({ source }) => amplitudeEvent("Recall: toggled filters", { source }),
  recallSearchTypeSet: ({ type, source }) => amplitudeEvent("Recall: set search type", { type, source }),
  recallFiltersSet: ({ key, value, source }) => amplitudeEvent("Recall: set filter", { key, value, source }),

  // Document - connections
  documentQueryStackLoaded: ({ documentId, source, queryLength }) =>
    amplitudeEvent("Document: clicked Recall", { documentId, source, queryLength }),
  documentQueryStackDismissed: ({ documentId, reason, source }) =>
    amplitudeEvent("Stack: clicked Dismiss stack", { documentId, reason, source }),
  documentQueryStackAdvance: ({ documentId, source }) =>
    amplitudeEvent("Stack: clicked Next result", { documentId, source }),
  documentQueryStackRewind: ({ documentId, source }) =>
    amplitudeEvent("Stack: clicked Previous result", { documentId, source }),
  documentQueryStackJump: ({ documentId, source }) =>
    amplitudeEvent("Stack: clicked Jump to result", { documentId, source }),
  documentQueryStackRemove: ({ documentId, stackId, stackIndex, source }) =>
    amplitudeEvent("Stack: clicked Remove result", {
      documentId,
      stackId,
      stackIndex,
      source,
    }),
  documentQueryStackMarkGood: ({ documentId, stackId, stackIndex, source }) =>
    amplitudeEvent("Stack: clicked Mark good result", {
      documentId,
      stackId,
      stackIndex,
      source,
    }),
  documentQueryStackExpand: ({ documentId, stackId, stackIndex, source }) =>
    amplitudeEvent("Stack: clicked Expand result", {
      documentId,
      stackId,
      stackIndex,
      source,
    }),
  documentQueryStackCopy: ({ documentId, stackId, stackIndex, source }) =>
    amplitudeEvent("Stack: clicked Copy result", {
      documentId,
      stackId,
      stackIndex,
      source,
    }),
  // Document - cards
  documentCardKept: ({ documentId, stackId, stackIndex, sentenceIds, score, artifactType, source }) =>
    amplitudeEvent("Document: clicked Keep card", {
      documentId,
      stackId,
      stackIndex,
      sentenceIds,
      score,
      artifactType,
      source,
    }),
  documentHighlightCardKept: ({ documentId, artifactId, sentenceIds, artifactType, source }) =>
    amplitudeEvent("Document: clicked Keep card", { documentId, artifactId, sentenceIds, artifactType, source }),
  documentCardMarkedReasonKept: ({ documentId, reason, prevReason, source }) =>
    amplitudeEvent("Document: clicked reason for keeping card", { documentId, reason, prevReason, source }),
  documentCardExpanded: ({ documentId, source }) =>
    amplitudeEvent("Document: clicked Expand card", { documentId, source }),
  documentNoteAdded: ({ documentId, source }) => amplitudeEvent("Document: clicked Add note", { documentId, source }),
  documentCardNoteAdded: ({ documentId, source }) =>
    amplitudeEvent("Document: clicked Add note to card", { documentId, source }),
  documentCardSeparated: ({ documentId, source }) =>
    amplitudeEvent("Document: clicked Separate card", { documentId, source }),
  documentCardsJoined: ({ documentId, source }) =>
    amplitudeEvent("Document: clicked Join cards", { documentId, source }),
  documentCardsRemoved: ({ documentId, source, didCut, types }) =>
    amplitudeEvent("Document: clicked Remove cards", { documentId, source, didCut, types }),
  documentCardsReordered: ({ documentId, count, source }) =>
    amplitudeEvent("Document: clicked Reorder cards", { documentId, count, source }),
  documentExternalArtifactOpened: ({ documentId, source }) =>
    amplitudeEvent("Document: clicked external link", { documentId, source }),
  documentUndidChange: ({ documentId, source }) => amplitudeEvent("Document: undo", { documentId, source }),
  documentRedidChange: ({ documentId, source }) => amplitudeEvent("Document: redo", { documentId, source }),
  documentCardsCopied: ({ documentId, count, didCut, source }) =>
    amplitudeEvent("Document: did Copy cards", { documentId, count, didCut, source }),
  documentCardsCopyFailed: ({ documentId, error, source }) =>
    amplitudeEvent("Document: failed to Copy cards", { documentId, error, source }),
  documentCardsPasted: ({ documentId, count, source }) =>
    amplitudeEvent("Document: did Paste cards", { documentId, count, source }),
  documentCardsPasteFailed: ({ documentId, error, source }) =>
    amplitudeEvent("Document: failed to Paste cards", { documentId, error, source }),
  documentCardTweeted: ({ source }) => amplitudeEvent("Document: clicked Tweet note card", { source }),

  // Settings
  settingsExtensionInitiated: ({ source }) => amplitudeEvent("Settings: clicked Manage browser extension", { source }),
  settingsExtensionSwitchedStrategy: ({ isOptOut, source }) =>
    amplitudeEvent("Settings: switched extension auto-collect strategy", { isOptOut, source }),

  // Downloads
  downloadsMacClicked: ({ source }) => amplitudeEvent("Downloads: clicked Download Mac app", { source }),
  downloadsChromeExtensionClicked: ({ source }) =>
    amplitudeEvent("Downloads: clicked Download Chrome Browser Extension", { source }),

  // Library
  libraryArticlesRemoved: ({ count, isAll, source }) =>
    amplitudeEvent("Library: removed articles", { count, isAll, source }),
  libraryArticlesSorted: ({ sort, source }) => amplitudeEvent("Library: sorted articles", { sort, source }),
  libraryArticlesURLCopied: ({ source }) => amplitudeEvent("Library: copied article URL", { source }),

  // RSS Subscriptions
  rssAddFeedFailed: ({ hostname, status, source }) =>
    amplitudeEvent("RSS Subscriptions: failed to add feed", { hostname, status, source }),
  rssFeedAdded: ({ hostname, source }) => amplitudeEvent("RSS Subscriptions: added feed", { hostname, source }),
  rssFeedPaused: ({ hostname, source }) =>
    amplitudeEvent("RSS Subscriptions: clicked pause feed subscription", { hostname, source }),
  rssFeedRemoved: ({ hostname, source }) =>
    amplitudeEvent("RSS Subscriptions: clicked remove feed subscription", { hostname, source }),
  rssFeedToggledCollectLinks: ({ checked, source }) =>
    amplitudeEvent("RSS Subscriptions: toggled collect links from feed", { checked, source }),
  rssFeedArticleOpened: ({ source }) => amplitudeEvent("RSS Subscriptions: clicked article from feed", { source }),
  rssFeedLinkOpened: ({ source }) => amplitudeEvent("RSS Subscriptions: clicked link extracted from feed", { source }),

  // Integrations
  // - Readwise
  readwiseIntegrationFailed: ({ status, message, source }) =>
    amplitudeEvent("Readwise Integration: failed to add", { status, message, source }),
  readwiseIntegrationAdded: ({ hasReaderIntegration, hasClassicIntegration, source }) =>
    amplitudeEvent("Readwise Integration: added", { hasReaderIntegration, hasClassicIntegration, source }),
  readwiseIntegrationPaused: ({ source }) => amplitudeEvent("Readwise Integration: paused", { source }),
  readwiseIntegrationRemoved: ({ source }) => amplitudeEvent("Readwise Integration: removed", { source }),
  readwiseIntegrationToggledReader: ({ checked, source }) =>
    amplitudeEvent("Readwise Integration: toggled reader integration", { checked, source }),
  readwiseIntegrationToggledClassic: ({ checked, source }) =>
    amplitudeEvent("Readwise Integration: toggled classic integration", { checked, source }),
  readwiseIntegrationUpdatedAccessToken: ({ source }) =>
    amplitudeEvent("Readwise Integration: updated access token", { source }),
  // - Twitter
  twitterIntegrationFailed: ({ status, message, source }) =>
    amplitudeEvent("Twitter Integration: failed to add", { status, message, source }),
  twitterIntegrationAdded: ({ source }) => amplitudeEvent("Twitter Integration: added", { source }),
  twitterIntegrationPaused: ({ source }) => amplitudeEvent("Twitter Integration: paused", { source }),
  twitterIntegrationRemoved: ({ source }) => amplitudeEvent("Twitter Integration: removed", { source }),
  // - Google Drive
  googleDriveIntegrationFailed: ({ status, message, source }) =>
    amplitudeEvent("Google Drive Integration: failed to add", { status, message, source }),
  googleDriveIntegrationAdded: ({ source }) => amplitudeEvent("Google Drive Integration: added", { source }),
  googleDriveIntegrationPaused: ({ source }) => amplitudeEvent("Google Drive Integration: paused", { source }),
  googleDriveIntegrationRemoved: ({ source }) => amplitudeEvent("Google Drive Integration: removed", { source }),
  // - Apple Notes
  appleNotesIntegrationMacAppLaunched: ({ source }) =>
    amplitudeEvent("Apple Notes Integration: Mac app launched", { source }),
  appleNotesIntegrationMacAppDownloaded: ({ source }) =>
    amplitudeEvent("Apple Notes Integration: Mac app downloaded", { source }),
  appleNotesIntegrationPaused: ({ source }) => amplitudeEvent("Apple Notes Integration: paused", { source }),
  appleNotesIntegrationRemoved: ({ source }) => amplitudeEvent("Apple Notes Integration: removed", { source }),
  // Instapaper
  instapaperIntegrationSubmitted: ({ count }) => amplitudeEvent("Instapaper Integration: submitted visits", { count }),
  instapaperIntegrationSubmitFailed: ({ error, debugError, count }) =>
    amplitudeEvent("Instapaper Integration: submit failed", { error, debugError, count }),
  // Pocket
  pocketIntegrationSubmitted: ({ count }) => amplitudeEvent("Pocket Integration: submitted visits", { count }),
  pocketIntegrationSubmitFailed: ({ error, debugError, count }) =>
    amplitudeEvent("Pocket Integration: submit failed", { error, debugError, count }),

  // Daily Log
  dailyLogNoteAdded: ({ context, source }) => amplitudeEvent("Daily Log: added note", { context, source }),
  dailyLogNoteUpdated: ({ context, source }) => amplitudeEvent("Daily Log: updated note", { context, source }),
  dailyLogCardRemoved: ({ context, source }) => amplitudeEvent("Daily Log: removed card", { context, source }),
  dailyLogArticleOpened: ({ source }) => amplitudeEvent("Daily Log: clicked article from log", { source }),
  dailyLogCardKept: ({ stackId, stackIndex, source }) =>
    amplitudeEvent("Daily Log: kept card", {
      stackId,
      stackIndex,
      source,
    }),
  // Daily Goal
  dailyGoalAdded: ({ goal, source }) => amplitudeEvent("Daily Goal: added", { goal, source }),
  dailyGoalRefined: ({ refinedGoal, source }) => amplitudeEvent("Daily Goal: refined", { refinedGoal, source }),
};

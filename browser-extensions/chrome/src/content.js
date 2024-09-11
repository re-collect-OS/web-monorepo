// This file is injected as a content script

// Resources
// https://www.sitepoint.com/chrome-extensions-bridging-the-gap-between-layers/
// https://medium.com/@ryanseddon/rendering-to-iframes-in-react-d1cb92274f86
// https://medium.com/@isa.ugurchiev/creating-a-chrome-extension-with-cd5ab1f6aca1
// https://itnext.io/create-chrome-extension-with-reactjs-using-inject-page-strategy-137650de1f39#6186
// https://apitman.com/3/#chrome-extension-content-script-stylesheet-isolation

import React, { useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { shallow } from "zustand/shallow";
import * as Sentry from "@sentry/react";

import { doLaunchApp, loadCurrentUser } from "./libs/contentLib";
import {
  getSerializedDocumentStyles,
  rewriteFontPaths,
  injectSerializedGlobalStyles,
  rewriteGlobalPrefixedString,
} from "./utils/inject";
import { destroyDOMHighlight } from "./utils/highlight";

import { useStore } from "./store";

import AnnotationPanel from "./components/annotation-panel";
import PopoverPanel from "./components/popover-panel";

import config, { APP_STAGE, APP_VERSION, SENTRY_DSN, APP_ENV_DEVELOPMENT, DEBUG } from "./config";

function escapeRegExp(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}

try {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
    release: APP_VERSION,
    environment: APP_STAGE,
    autoSessionTracking: false,
    enabled: !APP_ENV_DEVELOPMENT,
    // https://forum.sentry.io/t/receiving-too-many-unrelated-errors-from-chrome-extension/4668/3
    allowUrls: [new RegExp(escapeRegExp(chrome.runtime.getURL("/")), "i")],
    integrations: [
      new Sentry.Integrations.GlobalHandlers({
        onerror: true,
        onunhandledrejection: false,
      }),
    ],
  });
} catch (error) {
  console.log("Failed to init Sentry with error:", error);
}

loadCurrentUser()
  .then((user) => {
    if (user?.username) {
      Sentry.setUser({ email: user.username });
    }
  })
  .catch((error) => {
    if (DEBUG) {
      console.warn("Failed to get current user", error);
    }
  });

const ANNOTATION_FRAME_ID = rewriteGlobalPrefixedString("_recollect_annotation_frame");
const POPOVER_FRAME_ID = rewriteGlobalPrefixedString("_recollect_popover_frame");

let mql = window.matchMedia("(prefers-color-scheme: dark)");
chrome.runtime.sendMessage({ action: "set-dark-mode", isDarkMode: mql.matches });
window.matchMedia("(prefers-color-scheme: dark)").addListener(({ matches }) => {
  chrome.runtime.sendMessage({ action: "set-dark-mode", isDarkMode: matches });
});

const framedPopoverSelector = (state) => ({
  doAnnotationsAddNoteCard: state.doAnnotationsAddNoteCard,
  doAnnotationsUpdateNoteCard: state.doAnnotationsUpdateNoteCard,
  doAnnotationsUpdateNoteForCard: state.doAnnotationsUpdateNoteForCard,
  doAnnotationsRemoveCard: state.doAnnotationsRemoveCard,
  doPopoverNavTabSet: state.doPopoverNavTabSet,
  doPopoverOpen: state.doPopoverOpen,
  doPopoverShowAnnotations: state.doPopoverShowAnnotations,
  doRecall: state.doRecall,
  isAuthenticated: !!state.user.username && state.user.status === "success",
  isAuthenticating: state.user.status === "loading",
  isDismissing: state.popover.isDismissing,
  isExpanded: state.popover.isExpanded,
  isOpen: state.popover.isOpen,
  navTab: state.popover.navTab,
  query: state.recall.query,
  tabInfo: state.tabInfo,
  username: state.user.username,
});

const FramedPopover = ({ serializedStyles }) => {
  const frameRef = useRef(null);
  const {
    doAnnotationsAddNoteCard,
    doAnnotationsUpdateNoteCard,
    doAnnotationsUpdateNoteForCard,
    doAnnotationsRemoveCard,
    doPopoverNavTabSet,
    doPopoverOpen,
    doPopoverShowAnnotations,
    doRecall,
    isAuthenticated,
    isAuthenticating,
    isDismissing,
    isExpanded,
    isOpen,
    navTab,
    query,
    tabInfo,
    username,
  } = useStore(framedPopoverSelector, shallow);

  if (!isOpen) {
    return null;
  }

  return (
    <PopoverPanel
      ref={frameRef}
      frameId={POPOVER_FRAME_ID}
      serializedStyles={serializedStyles}
      isOpen={isOpen}
      isDismissing={isDismissing}
      onClose={() => doPopoverOpen(false)}
      tabInfo={tabInfo}
      query={query}
      onQueryChange={({ query, options }) => doRecall({ query, url: tabInfo.url, options })}
      navTab={navTab}
      onNavTabChange={doPopoverNavTabSet}
      onLaunchApp={(path) => {
        doLaunchApp(path ? `${config.APP_URL}${path}` : config.APP_URL);
        doPopoverOpen(false);
      }}
      isExpanded={isExpanded}
      onShowAnnotations={doPopoverShowAnnotations}
      username={username}
      isAuthenticated={isAuthenticated}
      isAuthenticating={isAuthenticating}
      doAnnotationsAddNoteCard={doAnnotationsAddNoteCard}
      doAnnotationsUpdateNoteCard={doAnnotationsUpdateNoteCard}
      doAnnotationsUpdateNoteForCard={doAnnotationsUpdateNoteForCard}
      doAnnotationsRemoveCard={doAnnotationsRemoveCard}
    />
  );
};

const framedAnnotationsSelector = (state) => ({
  annotationOpenId: state.annotations.openId,
  annotations: state.annotations.cards,
  annotationNodes: state.annotations.nodes,
  doAnnotationOpenIdSet: state.doAnnotationOpenIdSet,
  doAnnotationsUpdateNoteForCard: state.doAnnotationsUpdateNoteForCard,
  doAnnotationsRemoveCard: state.doAnnotationsRemoveCard,
});

const EMPTY_RECT = { top: 0, left: 0, bottom: 0, right: 0 };
function getScreenRect({ model, annotationNodes, annotationOpenId }) {
  if (!model) {
    return EMPTY_RECT;
  }

  const spans = annotationNodes.find((h) => h.id === annotationOpenId)?.spans;
  if (!spans) {
    return EMPTY_RECT;
  }

  const startSpanRect = spans[0].getBoundingClientRect();
  const endSpanRect = spans[spans.length - 1].getBoundingClientRect();
  if (!startSpanRect || !endSpanRect) {
    return EMPTY_RECT;
  }

  return {
    top: startSpanRect.top,
    left: startSpanRect.left,
    bottom: endSpanRect.bottom,
    right: endSpanRect.right,
  };
}

const FramedAnnotations = ({ serializedStyles }) => {
  const frameRef = useRef(null);
  const {
    annotations,
    annotationNodes,
    doAnnotationsUpdateNoteForCard,
    doAnnotationsRemoveCard,
    annotationOpenId,
    doAnnotationOpenIdSet,
  } = useStore(framedAnnotationsSelector, shallow);

  if (!annotations.length || annotationOpenId === null) {
    return null;
  }

  const model = annotations.find((h) => h.id === annotationOpenId);
  if (!model) {
    console.log("[!] Could not find annotation with id", annotationOpenId);
    return null;
  }
  const noteModel = model.parentId ? annotations.find((h) => h.id === model.parentId) : null;
  const screenRect = getScreenRect({ model, annotationNodes, annotationOpenId });

  return (
    <AnnotationPanel
      key={model.id}
      ref={frameRef}
      screenRect={screenRect}
      highlitedText={model.text}
      noteBody={noteModel?.body}
      frameId={ANNOTATION_FRAME_ID}
      serializedStyles={serializedStyles}
      onClose={() => doAnnotationOpenIdSet(null)}
      onRemove={() => {
        doAnnotationOpenIdSet(null);
        doAnnotationsRemoveCard({ id: model.id });
      }}
      onSave={(body) => {
        doAnnotationsUpdateNoteForCard({ id: model.id, body });
      }}
    />
  );
};

// Inject styles required to deal with positioning the iframed components:
import annotationPanelStyles from "./components/annotation-panel/AnnotationPanel.css";
import popoverPanelStyles from "./components/popover-panel/PopoverPanel.css";
const serializedGlobalStyles = `
${rewriteFontPaths(rewriteGlobalPrefixedString(popoverPanelStyles))}
${rewriteFontPaths(rewriteGlobalPrefixedString(annotationPanelStyles))}
`;
if (document?.head) {
  // Note: this handles cleanup of existing injected DOM styles:
  injectSerializedGlobalStyles({
    target: document.head,
    globalStyles: serializedGlobalStyles,
  });
}

// Pass in serialized styles generated by the webpack build and inject them into the iframe:
import baseStyles from "./index.css";
const serializedStyles = `
${rewriteFontPaths(baseStyles)}
${getSerializedDocumentStyles()}
`;

const appSelector = (state) => ({
  doAuthAppDeInit: state.doAuthAppDeInit,
});

function App() {
  const { doAuthAppDeInit } = useStore(appSelector, shallow);
  useEffect(() => () => doAuthAppDeInit(), [doAuthAppDeInit]);
  return (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <FramedPopover serializedStyles={serializedStyles} />
      <FramedAnnotations serializedStyles={serializedStyles} />
    </Sentry.ErrorBoundary>
  );
}

const ROOT_ID = rewriteGlobalPrefixedString("_recollect_extension");
const ROOT_DESTRUCTION_EVENT = rewriteGlobalPrefixedString(`_recollect_destruction_event_${chrome.runtime.id}`);

function main() {
  // Init
  useStore
    .getState()
    .doAuthAppInit()
    .catch((error) => {
      console.log("[!] Failed to get session:", error);
    });

  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.append(root);
  }

  ReactDOM.render(<App />, root);
}

function destructor() {
  document.removeEventListener(ROOT_DESTRUCTION_EVENT, destructor);
  // Tear down content script: Unbind events, clear timers, restore DOM, etc.
  let root = document.getElementById(ROOT_ID);
  if (root) {
    ReactDOM.unmountComponentAtNode(root);
  }
  [...document.querySelectorAll("[data-recollect-type]")].forEach((el) => destroyDOMHighlight(el));
}

// Unload previous content script if needed
document.dispatchEvent(new CustomEvent(ROOT_DESTRUCTION_EVENT));
document.addEventListener(ROOT_DESTRUCTION_EVENT, destructor);
main();

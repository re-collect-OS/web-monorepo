import React, { useRef, useEffect, useCallback, useState } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import { useDrag } from "@use-gesture/react";
import {
  RecallIcon,
  IconButton,
  RemoveIcon,
  LoadingIndicator,
  SmallCrossIcon,
  SmallChevronDownIcon,
  RecallResults,
  KeepIcon,
  ExpandIcon,
  IconPickerButton,
  IconMenuTriggerButton,
  MenuItemSeparator,
  MenuHorizontalIcon,
  ClipboardIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  CalendarIcon,
  PlaygroundIcon,
  Toast,
  FiltersIcon,
  KeepConfirmationToast,
  MenuItem,
  Menu,
  RecallFilters,
} from "web-shared-lib";
import TextareaAutosize from "react-textarea-autosize";
import { useHistory } from "react-router-dom";

import { shallow } from "zustand/shallow";

import { useStore, DEFAULT_RECALL_OPTIONS } from "../../store";
import { useKeyState } from "../../libs/useKeyState";
import { useFocusWithin, useDeferredQueue } from "../../libs/hooksLib";
import apiLib from "../../libs/apiLib";

import { events, analyticsService } from "../../libs/analyticsLib";

import styles from "./Recall.module.css";

// Persist last known stack position styles
const _lastPosKey = "lastStackPositionStyle";
let lastStackPositionStyle = ["0px", "48px"];
(function loadLastPosition() {
  const arr = JSON.parse(localStorage.getItem(_lastPosKey));
  if (arr) {
    lastStackPositionStyle = arr;
  }
  // otherwise use default
})();
function persistLastPosition(point) {
  lastStackPositionStyle = [`${point[0]}px`, `${point[1]}px`];
  if (typeof Storage !== "undefined") {
    localStorage.setItem(_lastPosKey, JSON.stringify(lastStackPositionStyle));
  }
}

function getElLeftBottomPoint({ el, verticalConstraintsEl }) {
  if (!el || !verticalConstraintsEl) {
    return [0, 0];
  }

  const bounds = el.getBoundingClientRect();
  const constraintsBounds = verticalConstraintsEl.getBoundingClientRect();
  const x = bounds.left - constraintsBounds.left;
  const y = constraintsBounds.height - (bounds.top - constraintsBounds.top + bounds.height);

  return [x, y];
}

function MatchNav({
  documentId,
  isMarkedGood,
  onExpandClick,
  onIdeaKeepClick,
  onLogKeepClick,
  onCopyClick,
  onMarkGoodClick,
  onMarkBadClick,
}) {
  const playgroundMenuItem = (
    <MenuItem
      icon={<PlaygroundIcon />}
      textValue="keep-idea"
      title={"Keep to current Playground"}
      onSelect={onIdeaKeepClick}
    >
      Keep to Playground
    </MenuItem>
  );

  const dailyLogMenuItem = (
    <MenuItem icon={<CalendarIcon />} textValue="keep-daily-log" title={"Keep to Daily Log"} onSelect={onLogKeepClick}>
      Keep to Daily Log
    </MenuItem>
  );

  return (
    <div className={styles.matchNav}>
      <div className={styles.leftCol}>
        <IconButton icon={<ExpandIcon />} label={"Expand"} title={"Expand result"} onClick={onExpandClick} />
        <IconPickerButton
          icon={<KeepIcon />}
          pickerIcon={<SmallChevronDownIcon />}
          label={"Keep"}
          title={"Keep result to playground"}
          pickerTitle={"Keep to..."}
          menuContent={
            <Menu
              align="end"
              side="bottom"
              sideOffset={0}
              alignOffset={-8}
              avoidCollisions={false}
              className={styles.menu}
            >
              {documentId ? playgroundMenuItem : null}
              {documentId ? <MenuItemSeparator /> : null}
              {dailyLogMenuItem}
            </Menu>
          }
          onClick={documentId ? onIdeaKeepClick : onLogKeepClick}
        />
      </div>
      <div className={styles.rightCol}>
        <IconMenuTriggerButton
          icon={<MenuHorizontalIcon />}
          title={"More"}
          menuContent={
            <Menu
              align="end"
              side="bottom"
              sideOffset={0}
              alignOffset={-8}
              avoidCollisions={false}
              className={styles.menu}
            >
              <MenuItem icon={<ClipboardIcon />} textValue="copy" title={"Copy"} onSelect={onCopyClick}>
                Copy to clipboard
              </MenuItem>
              {!isMarkedGood && (
                <>
                  <MenuItem
                    icon={<ThumbsUpIcon />}
                    textValue="mark-good"
                    title={"Mark good result"}
                    variant={"violet"}
                    onSelect={onMarkGoodClick}
                  >
                    Mark good result
                  </MenuItem>
                  <MenuItem
                    icon={<ThumbsDownIcon />}
                    textValue="mark-bad"
                    title={"Mark bad result"}
                    variant={"destructive"}
                    onSelect={onMarkBadClick}
                  >
                    Mark bad result
                  </MenuItem>
                </>
              )}
            </Menu>
          }
        />
      </div>
    </div>
  );
}

const selector = (state) => ({
  doDailyLogAddKeptCard: state.doDailyLogAddKeptCard,
  doDocumentAddKeptCard: state.doDocumentAddKeptCard,
  doQueryStackCopy: state.doQueryStackCopy,
  doQueryStackExpand: state.doQueryStackExpand,
  doQueryStackJump: state.doQueryStackJump,
  doQueryStackLoad: state.doQueryStackLoad,
  doQueryStackMarkGoodResult: state.doQueryStackMarkGoodResult,
  doQueryStackRemoveResult: state.doQueryStackRemoveResult,
  doRecallMinimize: state.doRecallMinimize,
  doRecallOpen: state.doRecallOpen,
  hasRecallError: !!state.recall.errorMsg,
  isMinimized: state.recall.isMinimized,
  isRecalling: ["idle", "loading"].includes(state.recall.status),
  queryStacks: state.stacks,
  recallOptions: state.recall.options,
  recallQuery: state.recall.query,
  setShowFilters: state.doRecallFiltersOpen,
  showFilters: state.recall.areFiltersVisible,
});

export default function Recall({ documentId, contextUrls, getEditor, eventSource }) {
  const {
    doDailyLogAddKeptCard,
    doDocumentAddKeptCard,
    doQueryStackCopy,
    doQueryStackExpand,
    doQueryStackJump,
    doQueryStackLoad,
    doQueryStackMarkGoodResult,
    doQueryStackRemoveResult,
    doRecallMinimize,
    doRecallOpen,
    hasRecallError,
    isMinimized,
    isRecalling,
    queryStacks,
    recallOptions,
    recallQuery,
    setShowFilters,
    showFilters,
  } = useStore(selector, shallow);

  const canUseRecallFilters = useStore(
    useCallback((state) => "paragraph-embedding-v2" === state.user.defaultEngine, [])
  );
  const ref = useRef(null);
  const history = useHistory();
  const textareaRef = useRef(null);
  const confirmationToastRef = useRef(null);
  const onRecallTextAreaMount = useCallback((el) => {
    if (el) {
      textareaRef.current = el;
      el.select();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);
  const setQuery = useCallback(
    (query) => doQueryStackLoad({ documentId, query, contextUrls, source: eventSource }),
    [documentId, eventSource, doQueryStackLoad, contextUrls]
  );
  const setOptions = useCallback(
    (opts) => doQueryStackLoad({ documentId, contextUrls, source: eventSource, options: opts }),
    [documentId, eventSource, doQueryStackLoad, contextUrls]
  );
  const activeStack = queryStacks[queryStacks.length - 1];
  const query = recallQuery || activeStack?.query || "";
  const options = recallOptions || activeStack?.options || DEFAULT_RECALL_OPTIONS;

  const onClose = useCallback(() => doRecallOpen({ isOpen: false, eventSource }), [doRecallOpen, eventSource]);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const defer = useDeferredQueue();

  const bindFocus = useFocusWithin((has) => {
    setHasFocusWithin(has);
  });

  const { escKey } = useKeyState(
    { escKey: "esc" },
    {
      ignoreRepeatEvents: true,
      captureEvents: hasFocusWithin,
      ignoreInputAcceptingElements: false,
    }
  );

  useEffect(() => {
    if (escKey.down) {
      onClose();
    }
  }, [escKey, onClose]);

  const startPointRef = useRef([0, 0]);
  const verticalConstraintsRef = useRef(null);
  const verticalSpacerRef = useRef(null);
  const horizontalSpacerRef = useRef(null);
  const bindDrag = useDrag(({ first, down, movement: [mx, my] }) => {
    // Capture the position relative to the window on drag start:
    if (first) {
      startPointRef.current = getElLeftBottomPoint({
        el: ref.current,
        verticalConstraintsEl: verticalConstraintsRef.current,
      });
    }
    // While dragging update spacer dimensions:
    const leftOffset = Math.max(0, startPointRef.current[0] + mx);
    const bottomOffset = Math.max(0, startPointRef.current[1] - my);

    if (down) {
      Object.assign(horizontalSpacerRef.current.style, {
        width: `${leftOffset}px`,
      });
      Object.assign(verticalSpacerRef.current.style, {
        height: `${bottomOffset}px`,
      });
    } else if (!first) {
      persistLastPosition([Math.round(leftOffset), Math.round(bottomOffset)]);
    }
  });

  const handleExpand = (model) => {
    doQueryStackJump({ id: activeStack.id, index: model.index });
    // We got reports that the card text selection somehow persists and selects all text on the expanded view
    // cannot reproduce but attempting to work around by collapsing:
    // TODO test if this is still true
    window.getSelection().removeAllRanges();
    doQueryStackExpand({ documentId, id: activeStack.id, source: eventSource, history });
  };

  return (
    <div className={styles.verticalConstraints} ref={verticalConstraintsRef}>
      <div className={styles.horizontalConstraints}>
        <div
          ref={horizontalSpacerRef}
          className={cn(styles.spacer, styles.horizontal)}
          style={{ width: lastStackPositionStyle[0] }}
        />
        <div className={styles.Recall} ref={ref} {...bindFocus} tabIndex="0">
          <div className={styles.header}>
            <div className={styles.dragBar} {...bindDrag()}>
              <div className={styles.dragBarIndicator} />
            </div>

            <div className={styles.navWrapper}>
              <div className={styles.iconTitle}>
                <RecallIcon />
                {isRecalling ? (
                  <span>
                    Recalling
                    <LoadingIndicator inline />
                  </span>
                ) : (
                  "Recall"
                )}
              </div>
              <div className={styles.navControls}>
                <IconButton
                  className={styles.hidden}
                  icon={<RemoveIcon />}
                  variant={"dark"}
                  title={"Minimize Recall"}
                  onClick={() => doRecallMinimize(!isMinimized)}
                />
                <IconButton icon={<SmallCrossIcon />} title={"Close Recall"} onClick={() => onClose()} />
              </div>
            </div>

            <div className={styles.queryInput}>
              <div className={styles.inputWrapper}>
                <TextareaAutosize
                  ref={onRecallTextAreaMount}
                  className={styles.input}
                  maxRows={4}
                  placeholder={"Describe an idea or concept..."}
                  value={query}
                  onChange={(event) => {
                    // Strip out new lines from pasted content
                    setQuery(event.target.value?.replace(/[\n\r]+/g, " "));
                  }}
                  onKeyDown={(event) => {
                    // Prevent adding new lines
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                />
                {canUseRecallFilters && (
                  <IconButton
                    className={styles.toggleFiltersBtn}
                    icon={<FiltersIcon />}
                    title={"Toggle recall filters"}
                    onClick={() => setShowFilters((prev) => !prev)}
                  />
                )}
              </div>
              {canUseRecallFilters && showFilters && (
                <RecallFilters
                  options={options}
                  setOptions={(options) => setOptions({ ...options, source: "manual" })}
                  onReportFilterSet={({ key, value }) => {
                    analyticsService.logEvent(events.recallFiltersSet({ key, value, source: eventSource }));
                  }}
                />
              )}
            </div>
          </div>
          {!activeStack && (
            <div className={styles.emptyState}>
              Search and resurface your digital information to help you remember what you consumed, further your
              thinking, and spark new ideas.
            </div>
          )}
          {!!activeStack && (
            <div className={styles.resultsWrapper}>
              <Toast.Provider duration={10000} swipeDirection={"down"}>
                <RecallResults
                  query={activeStack?.query}
                  isLoading={isRecalling}
                  results={activeStack?.results || []}
                  markedGoodResultIds={[...new Set(activeStack?.markedGoodResults?.map((r) => r.matchSentence) || [])]}
                  hasError={hasRecallError}
                  onArtifactClick={() => {
                    analyticsService.logEvent(
                      events.documentExternalArtifactOpened({ documentId, source: eventSource })
                    );
                  }}
                  loadThumbnailFromS3Path={apiLib.loadThumbnailFromS3Path}
                  renderMatchNav={({ model }) => {
                    return (
                      <MatchNav
                        documentId={documentId}
                        isMarkedGood={activeStack.markedGoodResults
                          .map((r) => r.matchSentence)
                          .includes(model.matchSentence)}
                        model={model}
                        onIdeaKeepClick={() => {
                          const editor = getEditor();
                          const _keep = () => {
                            // 2. We have to defer the keep itself because the camera will change after layout does
                            doQueryStackJump({ id: activeStack.id, index: model.index });
                            const keptCard = doDocumentAddKeptCard({
                              id: documentId,
                              stackId: activeStack.id,
                              shouldAdvanceStack: true,
                              position: editor ? editor.getNextKeepPosition() : { x: 0, y: 0 },
                              source: eventSource,
                            });
                            // 3. Select card that we just added
                            const selectionUtil = editor?.selectionUtil;
                            if (selectionUtil && keptCard) {
                              selectionUtil.set(keptCard.id, true);
                            }
                          };

                          // 1. If we're in full screen editor we must switch panes before selecting the card
                          if (editor && !editor.isPlayground()) {
                            history.push(`/split/${documentId}`);
                            defer(_keep);
                          } else {
                            _keep();
                          }
                        }}
                        onLogKeepClick={() => {
                          doQueryStackJump({ id: activeStack.id, index: model.index });
                          doDailyLogAddKeptCard({ stackId: activeStack.id, source: eventSource });
                          confirmationToastRef.current.add({
                            title: "Result kept",
                            doAction: () => {
                              // TODO handle highlighting card in view
                              history.push("/daily-log");
                            },
                          });
                        }}
                        onExpandClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleExpand(model);
                        }}
                        onCopyClick={() => {
                          doQueryStackJump({ id: activeStack.id, index: model.index });
                          doQueryStackCopy({ documentId, id: activeStack.id, source: eventSource });
                        }}
                        onMarkGoodClick={() => {
                          doQueryStackJump({ id: activeStack.id, index: model.index });
                          doQueryStackMarkGoodResult({ documentId, id: activeStack.id, source: eventSource });
                        }}
                        onMarkBadClick={() => {
                          // Delay to allow menu to clean up before we rip out the DOM from under it
                          setTimeout(() => {
                            doQueryStackJump({ id: activeStack.id, index: model.index });
                            doQueryStackRemoveResult({ documentId, id: activeStack.id, source: eventSource });
                          }, 0);
                        }}
                      />
                    );
                  }}
                />
                <div className={styles.toastContainer}>
                  <Toast.Viewport className={styles.toastViewport} />
                  <KeepConfirmationToast ref={confirmationToastRef} />
                </div>
              </Toast.Provider>
            </div>
          )}
        </div>
      </div>
      <div
        ref={verticalSpacerRef}
        className={cn(styles.spacer, styles.vertical)}
        style={{ height: lastStackPositionStyle[1] }}
      />
    </div>
  );
}

Recall.propTypes = {
  contextUrls: PropTypes.array.isRequired,
  documentId: PropTypes.string,
  eventSource: PropTypes.string.isRequired,
  getEditor: PropTypes.func,
};

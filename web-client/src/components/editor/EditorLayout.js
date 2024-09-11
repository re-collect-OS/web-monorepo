import React, { useRef, useLayoutEffect, useEffect, useCallback } from "react";
import cn from "classnames";
import { useLocation, useParams } from "react-router-dom";
import {
  DocumentJustifiedIcon,
  Menu,
  MenuItem,
  MenuTrigger,
  PlaygroundIcon,
  SplitPlaygroundIcon,
  ZoomIcon,
  Toolbar,
} from "web-shared-lib";
import { useHistory } from "react-router-dom";
import useLocalStorage from "use-local-storage";
import { useDrag } from "@use-gesture/react";

import { events, sources, analyticsService } from "../../libs/analyticsLib";
import { usePrevious, useComponentQuery } from "../../libs/hooksLib";

import styles from "./EditorLayout.module.css";

function TextStatsToolbarButton({ setShowWordStats, showWordStats, wordCount, characterCount }) {
  return (
    <Toolbar.Button
      className={cn(styles.visualGroup, styles.stats)}
      aria-label="Stats"
      title={showWordStats ? "Change to character count" : "Change to word count"}
    >
      <div
        className={styles.button}
        onClick={(event) => {
          event.stopPropagation();
          setShowWordStats((prev) => !prev);
        }}
      >
        <span>
          {showWordStats ? (
            <>
              {`${wordCount} `}
              <span className={styles.unit}>{`word${wordCount === 1 ? "" : "s"}`}</span>
            </>
          ) : (
            <>
              {`${characterCount} `}
              <span className={styles.unit}>{`character${characterCount === 1 ? "" : "s"}`}</span>
            </>
          )}
        </span>
      </div>
    </Toolbar.Button>
  );
}

function EditorFloatingToolbar({ showWordStats, setShowWordStats, wordCount, characterCount }) {
  const showTextStats = showWordStats ? wordCount !== undefined : characterCount !== undefined;

  if (!showTextStats) return null;

  return (
    <Toolbar.Root className={styles.FloatingToolbar} aria-label="Editor navigation">
      <TextStatsToolbarButton
        setShowWordStats={setShowWordStats}
        showWordStats={showWordStats}
        wordCount={wordCount}
        characterCount={characterCount}
      />
      <div className={styles.spacer} />
    </Toolbar.Root>
  );
}

function PlaygroundFloatingToolbar({
  canZoomIn,
  canZoomOut,
  characterCount,
  doSetCanvasZoom,
  isCollapsed,
  layoutToggleValue = "edit",
  onEditorToggle,
  onPlaygroundToggle,
  onSplitToggle,
  setShowWordStats,
  showWordStats,
  wordCount,
  zoomValue,
}) {
  const showTextStats = showWordStats ? wordCount !== undefined : characterCount !== undefined;

  const statsButton = showTextStats ? (
    <TextStatsToolbarButton
      setShowWordStats={setShowWordStats}
      showWordStats={showWordStats}
      wordCount={wordCount}
      characterCount={characterCount}
    />
  ) : null;

  const isSplitPlayground = layoutToggleValue === "split";
  const isPlayground = isSplitPlayground || layoutToggleValue === "play";

  return (
    <Toolbar.Root className={styles.FloatingToolbar} aria-label="Navigation">
      {!isPlayground && statsButton}

      {isPlayground && (
        <>
          <MenuTrigger
            button={
              <Toolbar.Button
                className={styles.visualGroup}
                aria-label="Set zoom"
                title="Set zoom"
                onDoubleClick={() => doSetCanvasZoom(1.0)}
              >
                <div className={styles.button}>
                  <ZoomIcon />
                  <span>{`${zoomValue}%`}</span>
                </div>
              </Toolbar.Button>
            }
            menuContent={
              <Menu
                align="start"
                side="top"
                className={styles.menu}
                avoidCollisions={false}
                alignOffset={-8}
                container={document.body}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                }}
              >
                <MenuItem
                  textValue="Zoom in"
                  disabled={!canZoomIn}
                  onSelect={() => {
                    doSetCanvasZoom(null, false, true);
                  }}
                >
                  Zoom in
                </MenuItem>
                <MenuItem
                  textValue="Zoom out"
                  disabled={!canZoomOut}
                  onSelect={() => {
                    doSetCanvasZoom(null, false, false, true);
                  }}
                >
                  Zoom out
                </MenuItem>
                <MenuItem
                  textValue="Zoom to fit"
                  onSelect={() => {
                    doSetCanvasZoom(null, true);
                  }}
                >
                  Zoom to fit
                </MenuItem>
                <MenuItem
                  textValue="Zoom to 50%"
                  onSelect={() => {
                    doSetCanvasZoom(0.5);
                  }}
                >
                  Zoom to 50%
                </MenuItem>
                <MenuItem
                  textValue="Zoom to 100%"
                  onSelect={() => {
                    doSetCanvasZoom(1.0);
                  }}
                >
                  Zoom to 100%
                </MenuItem>
              </Menu>
            }
          />

          {statsButton}
        </>
      )}

      <div className={styles.spacer} />

      <Toolbar.ToggleGroup
        className={cn(styles.visualGroup, styles.isToggle)}
        type="single"
        value={layoutToggleValue}
        aria-label="Editor mode"
        onValueChange={(val) => {
          if (val === "play") {
            onPlaygroundToggle();
          } else if (val === "edit") {
            onEditorToggle();
          } else {
            onSplitToggle();
          }
        }}
      >
        <Toolbar.ToggleItem
          className={styles.button}
          value="edit"
          aria-label="Show text editor"
          title="Show text editor"
        >
          <DocumentJustifiedIcon />
        </Toolbar.ToggleItem>
        {!isCollapsed && (
          <Toolbar.ToggleItem
            className={styles.button}
            value="split"
            aria-label="Show split editor"
            title="Show split editor"
          >
            <SplitPlaygroundIcon />
          </Toolbar.ToggleItem>
        )}
        <Toolbar.ToggleItem className={styles.button} value="play" aria-label="Show playground" title="Show playground">
          <PlaygroundIcon />
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>
    </Toolbar.Root>
  );
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

const EditorLayout = React.forwardRef(
  (
    {
      canZoomIn,
      canZoomOut,
      canvas = null,
      cardCharacterCount,
      cardsToolbar,
      cardWordCount,
      documentId,
      doSetCanvasZoom,
      editor,
      editorCharacterCount,
      editorWordCount,
      layout,
      onClick,
      onSetLayout,
      onSetSplitLayoutWidth,
      splitLayoutMinWidth,
      splitLayoutWidth,
      toolbar,
      zoom,
    },
    ref
  ) => {
    const { search } = useLocation();
    const { artifactId } = useParams();

    const history = useHistory();
    const splitEditorRef = useRef(null);
    const splitEditorStartWidth = useRef(null);
    const [showWordStats, setShowWordStats] = useLocalStorage("floating_toolbar_show_word_stats", true);

    const isSplitPlayground = layout === "split";
    const isPlayground = isSplitPlayground || layout === "play";

    const _inlineSetEditorWidth = (width) =>
      splitEditorRef.current.style.setProperty("--split-editor-width", `${width}px`);

    const [callbackRef, isCollapsed] = useComponentQuery((node) => (ref.current = node), splitLayoutMinWidth * 2);
    // const isCollapsed = useMatchMedia(`(max-width: ${splitLayoutMinWidth * 2}px)`);
    const prevIsCollapsed = usePrevious(isCollapsed);
    const layoutBeforeCollapse = useRef(null);

    // Preserve URL structure when transitioning between layouts:
    const buildUrl = useCallback(
      (layout) => {
        if (artifactId) {
          return `/${layout}/${documentId}/${artifactId}/${search}`;
        }
        return `/${layout}/${documentId}${search}`;
      },
      [documentId, artifactId, search]
    );

    useEffect(() => {
      if (isCollapsed && !prevIsCollapsed) {
        if (!isPlayground || (isPlayground && !isSplitPlayground)) {
          return;
        }
        // If we collapse in a split view, collapse to playround
        layoutBeforeCollapse.current = layout;
        history.replace(buildUrl("play"));
        onSetLayout("play");
        analyticsService.logEvent(events.documentTogglePlaygroundView({ source: sources.AUTO }));
      } else if (!isCollapsed && prevIsCollapsed && layoutBeforeCollapse.current) {
        // Restore collapsed split layout
        history.replace(buildUrl(layoutBeforeCollapse.current));
        onSetLayout(layoutBeforeCollapse.current);
        layoutBeforeCollapse.current = null;
        analyticsService.logEvent(events.documentToggleSplitView({ source: sources.AUTO }));
      }
    }, [
      documentId,
      buildUrl,
      history,
      search,
      isCollapsed,
      prevIsCollapsed,
      isPlayground,
      isSplitPlayground,
      layout,
      onSetLayout,
    ]);

    // Inject min-width once
    useLayoutEffect(() => {
      splitEditorRef.current.style.setProperty("--split-editor-min-width", `${splitLayoutMinWidth}px`);
    }, [splitLayoutMinWidth]);

    // Sync editor width with the pref
    useLayoutEffect(() => {
      const width = isNumber(splitLayoutWidth) ? splitLayoutWidth : window.innerWidth / 2;
      _inlineSetEditorWidth(width);
    }, [splitLayoutWidth]);

    const bindDrag = useDrag(({ first, last, movement: [mx] }) => {
      if (first) {
        splitEditorStartWidth.current = splitEditorRef.current?.getBoundingClientRect().width ?? null;
      } else {
        if (!isNumber(splitEditorStartWidth.current)) return;

        const innerWidth = window.innerWidth;
        const widthPx = Math.round(
          innerWidth -
            Math.min(
              innerWidth - splitLayoutMinWidth,
              Math.max(splitLayoutMinWidth, splitEditorStartWidth.current + mx)
            )
        );

        if (last) {
          onSetSplitLayoutWidth(widthPx);
        } else {
          _inlineSetEditorWidth(widthPx);
        }
      }
    });

    const playgroundFloatingToolbar = (
      <PlaygroundFloatingToolbar
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        isCollapsed={isCollapsed}
        showWordStats={showWordStats}
        setShowWordStats={setShowWordStats}
        zoomValue={zoom}
        wordCount={cardWordCount}
        characterCount={cardCharacterCount}
        doSetCanvasZoom={doSetCanvasZoom}
        layoutToggleValue={layout}
        // how to preserve everything else in the URL...?
        // seems fragile.. should at least pass them in
        onEditorToggle={() => {
          if (!isPlayground) return;

          history.push(`/edit/${documentId}${window.location.search}`);
          onSetLayout("edit");
          analyticsService.logEvent(events.documentToggleDocumentView({ source: sources.PLAYGROUND_TOOLBAR }));
        }}
        onSplitToggle={() => {
          if (isSplitPlayground) {
            // Reset
            onSetSplitLayoutWidth(null);
            return;
          }

          history.push(`/split/${documentId}${window.location.search}`);
          onSetLayout("split");
          analyticsService.logEvent(
            events.documentToggleSplitView({
              source: isPlayground ? sources.PLAYGROUND_TOOLBAR : sources.EDITOR_TOOLBAR,
            })
          );
        }}
        onPlaygroundToggle={() => {
          if (isPlayground && !isSplitPlayground) return;

          history.push(`/play/${documentId}${window.location.search}`);
          onSetLayout("play");
          analyticsService.logEvent(events.documentTogglePlaygroundView({ source: sources.EDITOR_TOOLBAR }));
        }}
      />
    );

    const getHorizontalOffset = useCallback(() => {
      return layout === "split" ? splitEditorRef.current?.offsetWidth || 0 : 0;
    }, [layout]);

    return (
      <>
        <div ref={callbackRef} className={styles.EditorLayoutCanvas} onClick={onClick}>
          <div className={styles.aboveCanvas}>
            <div className={styles.topBar}>
              <div className={styles.leftCol}>{toolbar}</div>
              <div className={styles.rightCol}>{cardsToolbar}</div>
            </div>
            <div className={styles.splitEditorWrapper}>
              <div
                className={cn(styles.splitEditor, {
                  [styles.isFullscreen]: !isPlayground,
                  [styles.isHidden]: isPlayground && !isSplitPlayground,
                })}
                ref={splitEditorRef}
              >
                <>
                  <EditorFloatingToolbar
                    showWordStats={showWordStats}
                    setShowWordStats={setShowWordStats}
                    wordCount={editorWordCount}
                    characterCount={editorCharacterCount}
                  />
                  {!isPlayground && playgroundFloatingToolbar}
                </>
                <div className={styles.overflowWrapper}>{editor}</div>
                <div className={styles.dragHandle} {...bindDrag()}>
                  <div className={styles.dragBarIndicator} />
                </div>
              </div>
              {isPlayground && <div className={styles.playgroundToolbarWrapper}>{playgroundFloatingToolbar}</div>}
            </div>
          </div>
          <div>{React.cloneElement(canvas, { getHorizontalOffset })}</div>
        </div>
      </>
    );
  }
);

export default EditorLayout;

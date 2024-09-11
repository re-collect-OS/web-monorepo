import React, { useRef, useEffect, useState, useImperativeHandle, useCallback, useMemo, useLayoutEffect } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import { DirectionIcon, ExpandIcon, IconButton, Toolbar, RecallResultHeader, Thumbnail } from "web-shared-lib";
import { useDrag } from "@use-gesture/react";
import { screenToCanvas, extractHostname } from "js-shared-lib";
import { shallow } from "zustand/shallow";

import RTE from "./RTE";
import HoveringToolbar from "./HoveringToolbar";

import { usePrevious, useComponentSize } from "../../libs/hooksLib";
import apiLib from "../../libs/apiLib";
import { snapToGrid } from "../../utils/grid";
import Spring from "../../utils/spring";
import { DEBUG, CANVAS_GRID_SIZE } from "../../config";
import { useLiveStore, useStore } from "../../store";

import styles from "./Card.module.css";

export function ReadMoreLink({ href, title, label, textFragment, ...rest }) {
  // https://wicg.github.io/scroll-to-text-fragment/
  // https://web.dev/text-fragments/
  // https://caniuse.com/url-scroll-to-text-fragment

  if (!href) {
    console.warn("[DEBUG] Missing expected href. Bailing...", { href, title, label, textFragment });
    return null;
  }

  const hostname = extractHostname(href);

  const encodedTextFragment = textFragment ? encodeURIComponent(textFragment) : undefined;
  return (
    <a
      className={styles.ReadMoreLink}
      href={encodedTextFragment ? `${href}#:~:text=${encodedTextFragment}` : href}
      target="_blank"
      rel="noreferrer"
      title={`${title} - ${href}`}
      {...rest}
    >
      {label || hostname}
    </a>
  );
}

ReadMoreLink.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string,
  textFragment: PropTypes.string,
  title: PropTypes.string.isRequired,
};

export const BaseCard = React.forwardRef(
  (
    {
      children,
      className,
      footer,
      id,
      isEmbedded = false,
      isOnCanvas = false,
      isSelected = false,
      isShuffleMode = false,
      isStackResult = false,
      onClick,
      onDragStart,
      onReposition,
      onSelectCardStack,
      position,
      preventTextSelection = undefined,
      selectionUtil,
      spatialIndex,
      zIndex,
      ...rest
    },
    ref
  ) => {
    const containerRef = useRef();
    // Register with spatial index when size and pos changes
    const [containerCallbackRef, rect] = useComponentSize((node) => (containerRef.current = node));
    const shouldDebounce = useRef(true);
    useEffect(() => {
      if (!id || !spatialIndex || !position || !rect?.width || !rect?.height) {
        return;
      }
      spatialIndex.set(
        id,
        {
          width: rect.width,
          height: rect.height,
          x: position.x,
          y: position.y,
        },
        shouldDebounce.current
      );

      shouldDebounce.current = false;
    }, [spatialIndex, rect, position, id]);

    // Remove from index on un-mount
    useEffect(() => {
      if (!spatialIndex) {
        return;
      }
      return () => spatialIndex.remove(id, true);
    }, [spatialIndex, id]);

    const _preventTextSelection = preventTextSelection === undefined ? !isSelected : preventTextSelection;
    // Disable text selection on non-selected cards
    // (to enable range select with shift key pressed)
    // TODO disable on actively dragged cards as well
    useEffect(() => {
      if (!ref) {
        return;
      }
      const _el = containerRef.current;
      const onSelectStart = (event) => {
        // Make sure this doesn't travel up to parent
        // (who will block it by virtue of not being selected itself)
        event.stopPropagation();
        if (_preventTextSelection) {
          event.preventDefault();
        }
      };
      _el?.addEventListener("selectstart", onSelectStart);
      return () => _el?.removeEventListener("selectstart", onSelectStart);
    }, [_preventTextSelection, ref]);

    const dragStateRef = useRef({
      initialPoint: null,
      movement: null,
      multipleSelectionOffset: null,
      projectedInitialPoint: null,
      selRect: null,
      snapPos: null,
      stackDropRepositionMap: null,
      startPoint: position || { x: 0, y: 0 },
      wasJustDragged: false,
    });

    // Animation
    const springX = useRef(new Spring(1, 400, 40));
    const springY = useRef(new Spring(1, 400, 40));
    const raf = useRef(null);
    const _commitToDOM = useCallback(
      ({ x, y }) => {
        if (containerRef.current) {
          Object.assign(containerRef.current.style, {
            transform: `translate(${x}px, ${y}px)`,
            zIndex,
          });
        }
      },
      [zIndex]
    );
    const tick = useCallback(() => {
      _commitToDOM({ x: springX.current.x(), y: springY.current.x() });
      // Schedule the next tick if the springs haven't settled yet:
      raf.current = springX.current.done() && springY.current.done() ? null : requestAnimationFrame(tick);
    }, [_commitToDOM]);
    const stopRaf = useMemo(() => () => raf.current && cancelAnimationFrame(raf.current), []);
    React.useEffect(() => () => stopRaf(), [stopRaf]);

    const lastSetXRef = useRef(null);
    const lastSetYRef = useRef(null);
    const setPosition = useCallback(
      ({ x, y }, animated) => {
        const finalX = Math.round(x);
        const finalY = Math.round(y);

        // Don't touch the springs unless we have to:
        if (lastSetXRef.current === finalX && lastSetYRef.current === finalY) {
          return;
        }
        lastSetXRef.current = finalX;
        lastSetYRef.current = finalY;

        if (animated) {
          springX.current.setEnd(finalX);
          springY.current.setEnd(finalY);
          if (raf.current === null) {
            raf.current = requestAnimationFrame(tick);
          }
        } else {
          // Make sure springs are in sync otherwise they won't start from
          // the correct position next time we animate!
          springX.current.snap(finalX);
          springY.current.snap(finalY);
          _commitToDOM({ x: finalX, y: finalY });
        }
      },
      [tick, _commitToDOM]
    );

    const _setPosition = useRef(setPosition);
    _setPosition.current = setPosition;

    useImperativeHandle(ref, () => ({
      setPosition: (position, animated) => _setPosition.current(position, animated), // avoid capturing original setPosition
      el: containerRef.current,
    }));

    // Sync with store change (undo)
    useEffect(() => {
      if (position) {
        dragStateRef.current.startPoint = position;
        setPosition(position, raf.current ? true : false);
      }
    }, [position, setPosition]);

    // Sync with live camera (transient subscribe)
    const liveCameraRef = useRef(useLiveStore.getState().liveCamera);
    useLayoutEffect(
      () =>
        useLiveStore.subscribe(({ liveCamera }) => {
          liveCameraRef.current = liveCamera;

          // We're dragging if we have an initial pointer set
          const dragState = dragStateRef.current;
          const initial = dragState.initialPoint;
          if (initial) {
            const projectedInitialPoint = dragState.projectedInitialPoint;
            const _projectedInitialPoint = screenToCanvas({ x: initial[0], y: initial[1] }, liveCamera);
            if (
              _projectedInitialPoint.x !== projectedInitialPoint.x ||
              _projectedInitialPoint.y !== projectedInitialPoint.y
            ) {
              const dx = _projectedInitialPoint.x - projectedInitialPoint.x;
              const dy = _projectedInitialPoint.y - projectedInitialPoint.y;
              dragState.cameraOffset = { x: dx, y: dy };

              const { position, stackDropRepositionMap } = getNextDragPosition({
                dragState: { ...dragState },
                isLast: false,
                snap: false,
              });

              onReposition({
                dragSourceId: id,
                position,
                isFirst: false,
                isLast: false,
                isDragging: true,
                stackDropRepositionMap,
              });
            }
          }
        }),
      [id, getNextDragPosition, onReposition]
    );

    const getNextDragPosition = useCallback(
      ({ dragState = {}, isLast, snap }) => {
        const camera = liveCameraRef.current;

        let {
          startPoint,
          movement: [mx, my],
          snapPos,
          multipleSelectionOffset,
          selRect,
        } = dragState;

        // Because there is a chance the drag starts and as a side effect the card is selected
        // we have to be ready to override the selection with the current card (not possible to be
        // in this state and have multiple selected cards)
        let selectedIds = selectionUtil.getSelected();
        if (!selectedIds.length || !selectedIds.includes(id)) {
          if (DEBUG) {
            console.warn("[!] getNextDragPosition: overriding stale selection.");
          }
          selectedIds = [id];
        }

        const cameraOffsetX = dragState.cameraOffset?.x || 0;
        const cameraOffsetY = dragState.cameraOffset?.y || 0;
        const dragX = startPoint.x + cameraOffsetX + mx / camera.z;
        const dragY = startPoint.y + cameraOffsetY + my / camera.z;
        const dragPos = { x: dragX, y: dragY };
        const x = snap ? snapToGrid(dragX, CANVAS_GRID_SIZE) : Math.round(dragX);
        const y = snap ? snapToGrid(dragY, CANVAS_GRID_SIZE) : Math.round(dragY);
        const pos = { x, y };

        let _snapPos;
        let _stackDropRepositionMap;

        const multipleSelectionTopLeftPoint = multipleSelectionOffset
          ? {
              x: pos.x + multipleSelectionOffset.x,
              y: pos.y + multipleSelectionOffset.y,
            }
          : undefined;

        const stackIndex = spatialIndex.rectIdToStackIndexMap[id];
        if (snap) {
          _snapPos = spatialIndex.getStackSnapPoint({
            point: multipleSelectionTopLeftPoint || pos,
            selRect,
            selectedIds,
            stackIndex,
          });
        }

        _stackDropRepositionMap = spatialIndex.getStackDragRepositionMap({
          point: pos,
          draggedId: id,
          selectedIds,
        });

        if (!Object.keys(_stackDropRepositionMap).length && _snapPos && !snapPos) {
          snapPos = multipleSelectionOffset
            ? { x: _snapPos.x - multipleSelectionOffset.x, y: _snapPos.y - multipleSelectionOffset.y }
            : _snapPos;
        }

        return {
          pos,
          snapPos: _snapPos ? snapPos : undefined,
          position: snapPos || (isLast ? pos : dragPos),
          stackDropRepositionMap: _stackDropRepositionMap,
        };
      },
      [id, spatialIndex, selectionUtil]
    );

    // Shared handler between the drag handle and the full card (depending on shuffle mode flag)
    const dragHandler = ({
      initial,
      first: isFirst,
      last: isLast,
      movement: [mx, my],
      dragging: isDragging,
      event,
    }) => {
      event.stopPropagation();

      const dragState = dragStateRef.current;
      dragState.movement = [mx, my];
      const camera = liveCameraRef.current;

      if (isFirst && onDragStart) {
        onDragStart();
      }

      // If we have multiple cards selected we need to get the top of the selection bounds and snap to that
      if (isFirst) {
        // We capture the selected cards at this point but it's out of sync by one frame!
        if (selectionUtil.hasMultipleSelection()) {
          // Capture the common dragged rect
          dragState.selRect = spatialIndex.getCommonRect(selectionUtil.getSelected());
          // Capture the offset we have to apply so the dragged cards behave as one
          dragState.multipleSelectionOffset = {
            x: dragState.selRect.x - dragState.startPoint.x,
            y: dragState.selRect.y - dragState.startPoint.y,
          };
        } else {
          // Capture the dragged card rect
          dragState.selRect = spatialIndex.getRect(id);
        }

        // Capture the initial screen point projected onto the canvas
        // We need to do this because if the camera updates while the drag is active we need to
        // undo the movement of the camera so that the card feels stuck to the cursor.
        dragState.initialPoint = initial;
        dragState.projectedInitialPoint = screenToCanvas({ x: initial[0], y: initial[1] }, camera);
      }

      const { pos, snapPos, position, stackDropRepositionMap } = getNextDragPosition({
        dragState: { ...dragState },
        isLast,
        snap: true,
      });

      dragState.snapPos = snapPos;
      dragState.stackDropRepositionMap = stackDropRepositionMap;

      if (!dragState.wasJustDragged && isDragging) {
        dragState.wasJustDragged = true;
      }

      if (isLast) {
        dragState.startPoint = pos;
        // Reset
        dragState.projectedInitialPoint = null;
        dragState.initialPoint = null;
        dragState.cameraOffset = null;
        // Defer to give the click handler a chance to fire (depends on the active dragged state)
        setTimeout(() => {
          dragState.wasJustDragged = false;
        }, 0);
      }

      onReposition({ dragSourceId: id, position, isFirst, isLast, isDragging, stackDropRepositionMap });
    };

    // Card bindings
    const bindCardDrag = useDrag(dragHandler, {
      threshold: 8,
      keys: false,
      // Disabling an active gesture pauses it which is NOT what we want,
      // delay disabling the gesture if shuffle mode is turned off while we have an active drag
      // The drop will re-render the component so this gesture will get disabled before a new one
      //  has a chance to start.
      enabled: dragStateRef.current.wasJustDragged ? true : isShuffleMode,
    });
    const boundCardEvents = bindCardDrag();
    const _onPointerDown = boundCardEvents.onPointerDown;
    boundCardEvents.onPointerDown = (event) => {
      // Prevent pointer events from landing on canvas
      event.stopPropagation();
      // Otherwise delegate to gesture (which should be disabled if not in shuffle mode)
      if (_onPointerDown) {
        return _onPointerDown(event);
      }
    };
    // Drag handle bindings
    const bindDrag = useDrag(dragHandler, { threshold: 8, keys: false });

    return (
      <div
        ref={containerCallbackRef}
        className={cn(styles.Card, className, {
          [styles.isSelected]: isSelected,
          [styles.isEmbedded]: isEmbedded,
          [styles.isOnCanvas]: isOnCanvas && !isEmbedded,
          [styles.isDraggable]: isOnCanvas && isShuffleMode,
        })}
        onClick={(event) => {
          if (dragStateRef.current.wasJustDragged) {
            event.stopPropagation();
            return;
          }

          if (isShuffleMode && event.detail > 1) {
            // Handle double-click to select card stack
            onSelectCardStack(event);
          } else if (onClick) {
            onClick(event);
          }
        }}
        tabIndex={0}
        style={zIndex ? { zIndex } : undefined}
        {...boundCardEvents}
        {...rest}
      >
        {isOnCanvas && !!onReposition && (
          <div
            title={DEBUG ? id : undefined}
            className={cn(styles.dragBar, styles.isDraggable, { [styles.isHidden]: isShuffleMode })}
            {...bindDrag()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              if (dragStateRef.current.wasJustDragged) {
                event.stopPropagation();
                return;
              }

              if (event.detail > 1) {
                // Handle double-click to select card stack
                onSelectCardStack(event);
              } else {
                onClick(event);
              }
            }}
          >
            <div className={styles.dragBarIndicator} />
          </div>
        )}
        {isStackResult ? (
          <>
            {footer}
            {children && <div className={styles.bodyMultipleSections}>{children}</div>}
          </>
        ) : (
          <>
            {children && <div className={styles.body}>{children}</div>}
            {footer}
          </>
        )}
      </div>
    );
  }
);

BaseCard.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  className: PropTypes.string,
  footer: PropTypes.node,
  id: PropTypes.string,
  isEmbedded: PropTypes.bool,
  isOnCanvas: PropTypes.bool,
  isSelected: PropTypes.bool,
  isShuffleMode: PropTypes.bool,
  isStackResult: PropTypes.bool,
  onClick: PropTypes.func,
  onDragStart: PropTypes.func,
  onReposition: PropTypes.func,
  onSelectCardStack: PropTypes.func,
  position: PropTypes.object,
  readMoreLink: PropTypes.node,
  selectionUtil: PropTypes.object,
  spatialIndex: PropTypes.object,
  title: PropTypes.string,
  zIndex: PropTypes.number,
};

export const GoogleScreenshotKeptCard = React.forwardRef(({ model, onReadMore, onExpandClick, ...rest }, ref) => {
  const footer = (
    <RecallResultHeader
      className={styles.AttributionFooter}
      model={model}
      onReadMore={onReadMore}
      renderArtifactNav={
        onExpandClick
          ? () => (
              <IconButton
                icon={<ExpandIcon />}
                variant={"grey"}
                label={"Expand"}
                title={"Expand card"}
                onClick={onExpandClick}
              />
            )
          : undefined
      }
    />
  );

  return (
    <KeptCard ref={ref} footer={footer} {...rest}>
      <Thumbnail s3Path={model.thumbnailS3Path} doLoad={apiLib.loadThumbnailFromS3Path} isOnCanvas />
    </KeptCard>
  );
});

GoogleScreenshotKeptCard.propTypes = {
  model: PropTypes.object.isRequired,
  onExpandClick: PropTypes.func,
  onReadMore: PropTypes.func,
};

export const IdeaNoteKeptCard = React.forwardRef(({ model, onReadMore, onExpandClick, children, ...rest }, ref) => {
  const footer = (
    <RecallResultHeader
      className={styles.AttributionFooter}
      model={model}
      onReadMore={onReadMore}
      renderArtifactNav={
        onExpandClick
          ? () => (
              <IconButton
                icon={<ExpandIcon />}
                variant={"grey"}
                label={"Expand"}
                title={"Expand card"}
                onClick={onExpandClick}
              />
            )
          : undefined
      }
    />
  );

  return (
    <KeptCard ref={ref} footer={footer} {...rest}>
      {children}
    </KeptCard>
  );
});

IdeaNoteKeptCard.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  model: PropTypes.object.isRequired,
  onExpandClick: PropTypes.func,
  onReadMore: PropTypes.func,
};

export const PDFKeptCard = React.forwardRef(({ model, onReadMore, onExpandClick, children, ...rest }, ref) => {
  const footer = (
    <RecallResultHeader
      className={styles.AttributionFooter}
      model={model}
      onReadMore={onReadMore}
      renderArtifactNav={
        onExpandClick
          ? () => (
              <IconButton
                icon={<ExpandIcon />}
                variant={"grey"}
                label={"Expand"}
                title={"Expand card"}
                onClick={onExpandClick}
              />
            )
          : undefined
      }
    />
  );
  return (
    <KeptCard ref={ref} footer={footer} {...rest}>
      {children}
    </KeptCard>
  );
});

PDFKeptCard.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  model: PropTypes.object.isRequired,
  onExpandClick: PropTypes.func,
  onReadMore: PropTypes.func,
};

export const YouTubeKeptCard = React.forwardRef(({ model, onReadMore, onExpandClick, children, ...rest }, ref) => {
  const footer = (
    <RecallResultHeader
      className={styles.AttributionFooter}
      model={model}
      onReadMore={onReadMore}
      renderArtifactNav={
        onExpandClick
          ? () => (
              <IconButton
                icon={<ExpandIcon />}
                variant={"grey"}
                label={"Expand"}
                title={"Expand card"}
                onClick={onExpandClick}
              />
            )
          : undefined
      }
    />
  );
  return (
    <KeptCard ref={ref} footer={footer} {...rest}>
      {children}
    </KeptCard>
  );
});

YouTubeKeptCard.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  model: PropTypes.object.isRequired,
  onExpandClick: PropTypes.func,
  onReadMore: PropTypes.func,
};

export const TweetKeptCard = React.forwardRef(
  ({ model, tweet, onReadMore, onExpandClick, children, textFragment, ...rest }, ref) => {
    const footer = (
      <RecallResultHeader
        className={styles.AttributionFooter}
        model={model}
        onReadMore={onReadMore}
        renderArtifactNav={
          onExpandClick
            ? () => (
                <IconButton
                  icon={<ExpandIcon />}
                  variant={"grey"}
                  label={"Expand"}
                  title={"Expand card"}
                  onClick={onExpandClick}
                />
              )
            : undefined
        }
      />
    );
    return (
      <KeptCard ref={ref} footer={footer} {...rest}>
        {children}
      </KeptCard>
    );
  }
);

TweetKeptCard.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  model: PropTypes.object.isRequired,
  onExpandClick: PropTypes.func,
  onReadMore: PropTypes.func,
  textFragment: PropTypes.string,
  tweet: PropTypes.object.isRequired,
};

export const ArticleKeptCard = React.forwardRef(({ model, onReadMore, onExpandClick, children, ...rest }, ref) => {
  const footer = (
    <RecallResultHeader
      className={styles.AttributionFooter}
      model={model}
      onReadMore={onReadMore}
      renderArtifactNav={
        onExpandClick
          ? () => (
              <IconButton
                icon={<ExpandIcon />}
                variant={"grey"}
                label={"Expand"}
                title={"Expand card"}
                onClick={onExpandClick}
              />
            )
          : undefined
      }
    />
  );
  return (
    <KeptCard ref={ref} footer={footer} {...rest}>
      {children}
    </KeptCard>
  );
});

ArticleKeptCard.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  model: PropTypes.object.isRequired,
  onExpandClick: PropTypes.func,
  onReadMore: PropTypes.func,
};

export const KeptCard = React.forwardRef(
  ({ children, isSelected = false, onExpand, onGenerate, onSetReason, reason, footer, ...rest }, ref) => {
    const baseCardRef = useRef(null);
    const [showReasonPoll, setShowReasonPoll] = useState(false);
    // If reason is undefined it's a card that predates the polls
    // for which we don't want to show the polls:
    const hasPoll = !!reason || reason === null;
    const isPollExpanded = hasPoll && showReasonPoll;
    // (mihai:) Mar 31, 2022 disabled showing polls until we use the data.
    // (showReasonPoll || reason === null) to re-enable

    const focus = () => baseCardRef.current?.el.focus({ preventScroll: true });
    const blur = () => baseCardRef.current?.el.blur();
    const setPosition = baseCardRef.current?.setPosition;

    useImperativeHandle(ref, () => ({ focus, blur, setPosition, el: baseCardRef.current?.el }));

    // TODO can't remember why we needed this?
    // const prevIsSelected = usePrevious(isSelected);
    // useEffect(() => {
    //   if (prevIsSelected && !isSelected) {
    //     blur();
    //   }
    // }, [prevIsSelected, isSelected]);

    // Really avoid re-rendering the toolbar which is portalled into body
    // Not sure why but otherwise it takes two clicks to trigger. First click just shifts focus.
    const toolbar = useMemo(() => {
      return (
        <HoveringToolbar
          key={"stable"}
          target={baseCardRef.current?.el}
          onGenerate={(textContent, event) => {
            event.preventDefault();
            event.stopPropagation();
            window.getSelection().removeAllRanges();

            // Strip out overflow indicators from start and end of the selection...
            const normalizedTextContent = textContent.replace(/(^\.\.\.|\.\.\.$)/gi, "");

            onGenerate(normalizedTextContent);
          }}
        />
      );
    }, [onGenerate]);

    return (
      <BaseCard
        ref={baseCardRef}
        className={styles.isKeptCard}
        isSelected={isSelected}
        onKeyDown={(event) => {
          if (isSelected && event.key === "Enter") {
            // Expand card
            event.preventDefault();
            onExpand();
          } else if (event.key === "Tab") {
            // Trap focus
            event.preventDefault();
          }
        }}
        onDragStart={() => {
          // Deselect any text to avoid leaving behind a hover menu
          window.getSelection().removeAllRanges();
        }}
        footer={footer}
        {...rest}
      >
        {children}
        {!!onGenerate && toolbar}
        {isPollExpanded && !!onSetReason && (
          <div className={styles.queryPoll}>
            <div className={styles.queryPollPrompt}>
              <DirectionIcon className={styles.icon} />
              <div className={styles.label}>Why did you keep this card?</div>
            </div>
            <Toolbar.Root
              className={styles.ToggleToolbar}
              aria-label="Poll"
              onClick={(event) => event.stopPropagation()}
            >
              <Toolbar.ToggleGroup
                className={styles.toggleGroup}
                type="single"
                value={reason}
                aria-label="Reason for keeping card"
                onValueChange={(value) => {
                  if (value) {
                    onSetReason(value);
                  }
                  // Collapse poll if it was expanded manually:
                  if (showReasonPoll) {
                    setShowReasonPoll(false);
                  }
                }}
              >
                <Toolbar.ToggleItem
                  className={styles.toggleItem}
                  value="related"
                  title="The idea was related to what I was searching for"
                >
                  Related
                </Toolbar.ToggleItem>
                <Toolbar.ToggleItem className={styles.toggleItem} value="inspirational" title="The idea inspired me">
                  Inspirational
                </Toolbar.ToggleItem>
                <Toolbar.ToggleItem className={styles.toggleItem} value="not-sure" title="I'm not sure why">
                  Not sure
                </Toolbar.ToggleItem>
              </Toolbar.ToggleGroup>
            </Toolbar.Root>
          </div>
        )}
      </BaseCard>
    );
  }
);

KeptCard.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  isSelected: PropTypes.bool,
  onExpand: PropTypes.func,
  onGenerate: PropTypes.func,
  onSetReason: PropTypes.func,
  reason: PropTypes.oneOf([null, undefined, "related", "inspirational", "not-sure"]),
};

const selector = (state) => ({
  doDocumentBeginUndoCapture: state.doDocumentBeginUndoCapture,
  doDocumentEndUndoCapture: state.doDocumentEndUndoCapture,
});

export const NoteCard = React.forwardRef(
  (
    {
      value,
      onGenerate,
      setValue,
      children = [],
      isSelected = false,
      highlights,
      onHighlightClick,
      onAltEnterKeyDown,
      forwardShuffleModeEvent,
      ...rest
    },
    ref
  ) => {
    const baseCardRef = useRef(null);
    const editorRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);

    const { doDocumentBeginUndoCapture, doDocumentEndUndoCapture } = useStore(selector, shallow);

    const focus = () => baseCardRef.current?.el.focus({ preventScroll: true });
    const blur = () => baseCardRef.current?.el.blur();
    const blurEditor = () => editorRef.current?.blur();
    const deselectEditor = () => editorRef.current?.deselect();
    const focusEditor = (selectEnd) => editorRef.current?.focus(selectEnd);
    const editorHasFocus = () => editorRef.current?.hasFocus();
    const editorHasSelection = () => editorRef.current?.hasSelection();
    const setPosition = baseCardRef.current?.setPosition;
    const isReadOnly = !setValue;

    useImperativeHandle(ref, () => ({
      focus,
      blur,
      focusEditor,
      blurEditor,
      deselectEditor,
      editorHasFocus,
      editorHasSelection,
      setPosition,
      el: baseCardRef.current?.el,
      editorRef: editorRef,
    }));

    // const prevIsSelected = usePrevious(isSelected);
    // const prevIsReadOnly = usePrevious(isReadOnly);
    const prevValue = usePrevious(value);

    const expectedEditRef = useRef(false);

    useLayoutEffect(() => {
      if (expectedEditRef.current) {
        // Reset flag, otherwise noop
        expectedEditRef.current = false;
      } else if (prevValue && value !== prevValue) {
        // Reset editor to match unexpected new value
        if (DEBUG) {
          console.warn("[WARN] Unexpected note card value reset RTE", value);
        }
        editorRef.current.reset(value);
      }
    }, [value, prevValue]);

    return (
      <BaseCard
        ref={baseCardRef}
        className={cn(styles.isNoteCard, { [styles.isEditing]: isEditing })}
        isSelected={isSelected}
        onKeyDown={(event) => {
          if (event.key === "Escape" && editorHasFocus()) {
            // Switch focus back to the card
            event.preventDefault();
            blurEditor();
            focus();
          } else if (isSelected && event.key === "Enter" && !editorHasFocus()) {
            // Focus editor
            event.preventDefault();
            focusEditor(true);
          } else if (event.key === "Tab") {
            // Trap focus
            event.preventDefault();
          } else if (event.key === "Alt") {
            // RTE captures Alt key so the event never makes it to the Editor
            // We manually forward the event so we can easily grab focused note cards (1)
            forwardShuffleModeEvent(true);
          }
        }}
        onKeyUp={(event) => {
          // RTE captures Alt key so the event never makes it to the Editor
          // We manually forward the event so we can easily grab focused note cards (2)
          if (event.key === "Alt") {
            forwardShuffleModeEvent(false);
          }
        }}
        onDragStart={() => {
          // Avoid a whole class of problems by not allowing card drags while editing
          if (isEditing) {
            setIsEditing(() => {
              blurEditor();

              return false;
            });
          }
        }}
        {...rest}
      >
        <RTE
          ref={editorRef}
          placeholder="Add a note"
          className={styles.RTE}
          value={value}
          setValue={
            setValue
              ? (value) => {
                  // Mark edit as expected so we don't reset the RTE value
                  expectedEditRef.current = true;
                  setValue(value);
                }
              : undefined
          }
          onGenerate={onGenerate || undefined}
          readOnly={isReadOnly}
          onFocus={() => {
            setIsEditing(() => {
              doDocumentBeginUndoCapture();

              return true;
            });
          }}
          onBlur={() => {
            setIsEditing(() => {
              // deselectEditor();
              doDocumentEndUndoCapture();

              return false;
            });
          }}
          highlights={highlights}
          onHighlightClick={onHighlightClick}
          onAltEnterKeyDown={onAltEnterKeyDown}
        />
        {children}
      </BaseCard>
    );
  }
);

NoteCard.propTypes = {
  children: PropTypes.arrayOf(PropTypes.node),
  forwardShuffleModeEvent: PropTypes.func,
  highlights: PropTypes.arrayOf(PropTypes.object),
  isSelected: PropTypes.bool,
  onGenerate: PropTypes.func,
  onHighlightClick: PropTypes.func,
  onAltEnterKeyDown: PropTypes.func,
  setValue: PropTypes.func,
  value: PropTypes.array.isRequired,
};

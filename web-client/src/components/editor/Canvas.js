import React, { useEffect, useMemo, useImperativeHandle, useRef, useState, useCallback } from "react";
import cn from "classnames";
import PropTypes from "prop-types";
import { useDrag } from "@use-gesture/react";
import {
  debounce,
  panCamera,
  rectFromPoints,
  screenToCanvas,
  zoomCamera,
  zoomIn,
  zoomOut,
  zoomReset,
  getViewport,
  zoomToFit,
  panIntoView,
  MIN_ZOOM,
  MIN_ZOOM_ABSOLUTE,
  MAX_ZOOM,
} from "js-shared-lib";
import { DocumentStackIcon } from "web-shared-lib";
import { shallow } from "zustand/shallow";

import { useKeyState, KeyStateLayer } from "../../libs/useKeyState";
import { usePrevious } from "../../libs/hooksLib";
import { snapToGrid } from "../../utils/grid";
import { CANVAS_GRID_SIZE } from "../../config";
import { useLiveStore } from "../../store";

import styles from "./Canvas.module.css";

const zoomedInBackground =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAFUlEQVR42mNgkCQAQQg/GFUwfBQAAKCGAwjwRI90AAAAAElFTkSuQmCC";

const ORIGIN = { x: 81, y: 8 }; // Inset relative to Layout
const VERTICAL_OFFSET = 42; // Top toolbar height
const MAX_ZOOM_STEP = 10;

// Adapted from https://stackoverflow.com/a/13650579
// via: https://github.com/tldraw/tldraw/blob/2567cedcd268c8e71045d45fb76388f96e7251f4/packages/core/src/hooks/useZoomEvents.ts
function normalizeWheel(event) {
  const { deltaY, deltaX } = event;

  let deltaZ = 0;

  if (event.ctrlKey || event.metaKey) {
    const signY = Math.sign(event.deltaY);
    const absDeltaY = Math.abs(event.deltaY);

    let dy = deltaY;

    if (absDeltaY > MAX_ZOOM_STEP) {
      dy = MAX_ZOOM_STEP * signY;
    }

    deltaZ = dy;
  }

  return [deltaX, deltaY, deltaZ];
}

const selector = (state) => ({
  setLiveCamera: state.setLiveCamera,
});

const Canvas = React.forwardRef(
  (
    {
      camera: initialCamera,
      doUpdateCamera,
      children,
      getHorizontalOffset,
      onClick,
      onDoubleClick,
      onRangeSelect,
      isShuffleMode,
      spatialIndex,
    },
    ref
  ) => {
    const canvasRef = useRef(null);
    const prevCamera = usePrevious(initialCamera);
    const dragSelectRectRef = useRef(null);
    const intersectionObserverRef = useRef(null);

    const [camera, setCamera] = useState(initialCamera);
    const { setLiveCamera } = useLiveStore(selector, shallow);

    React.useLayoutEffect(() => {
      setLiveCamera(camera);
    }, [camera, setLiveCamera]);

    const [isDragSelectMode, setIsDragSelectMode] = useState(false);
    const [isPanMode, setIsPanMode] = useState(false);
    const [isPanning, setIsPanning] = useState(false);

    const getContainerRect = useCallback(() => {
      const horizontalOffset = getHorizontalOffset ? getHorizontalOffset() : 0;
      return {
        x: ORIGIN.x + horizontalOffset,
        y: ORIGIN.y + VERTICAL_OFFSET,
        width: canvasRef.current?.offsetWidth - horizontalOffset,
        height: canvasRef.current?.offsetHeight - VERTICAL_OFFSET,
      };
    }, [getHorizontalOffset]);

    useEffect(() => {
      // Prevent browser from zooming in and out - conflicts with our canvas hot keys
      // We do this here instead of at the Canvas level to allow Editor to catch some of those key events too
      const handler = (event) => {
        const keyCodes = [61, 107, 173, 109, 187, 189];
        if ((event.ctrlKey || event.metaKey) && keyCodes.indexOf(event.which) != -1) {
          event.preventDefault();
        }
      };
      document.addEventListener("keydown", handler);

      return () => {
        document.removeEventListener("keydown", handler);
      };
    });

    useEffect(() => {
      intersectionObserverRef.current = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("viewport__active");
            return;
          }
          entry.target.classList.remove("viewport__active");
        },
        { root: null, threshold: 0.1 }
      );
    }, []);

    useImperativeHandle(ref, () => ({
      getCamera: () => camera,
      isDragSelectMode: () => isDragSelectMode,
      // What rect of the screen is the canvas taking up
      getScreenViewportRect: () => {
        const horizontalOffset = getHorizontalOffset ? getHorizontalOffset() : 0;
        return {
          x: ORIGIN.x + horizontalOffset,
          y: ORIGIN.y + VERTICAL_OFFSET,
          width: canvasRef.current ? canvasRef.current.offsetWidth - horizontalOffset - ORIGIN.x : 0,
          height: canvasRef.current ? canvasRef.current.offsetHeight - VERTICAL_OFFSET - ORIGIN.y : 0,
        };
      },
      // What rect of the canvas is visible in the screen viewport
      getCanvasViewportRect: () => {
        return getViewport(camera, ref.current.getScreenViewportRect());
      },
      zoom: (value) => {
        setCamera((c) => zoomReset(getContainerRect(), c, value));
      },
      zoomIn: () => {
        setCamera((c) => zoomIn(getContainerRect(), c));
      },
      zoomOut: () => {
        setCamera((c) => getZoomedOutCamera(c));
      },
      canZoomOut: () => {
        if (camera.z > MIN_ZOOM) {
          return true;
        }

        const minZoomCamera = getMinZoomCamera(camera, true);
        return camera.z > minZoomCamera.z;
      },
      canZoomIn: () => {
        return camera.z < MAX_ZOOM;
      },
      // Fit rect into screen viewport (pan / zoom)
      zoomToFit: (rect, canZoomOut = true) => {
        setCamera(getMinZoomCamera(camera, canZoomOut, rect));
      },
      panRectIntoView: (rect) => {
        setCamera(panIntoView(camera, ref.current.getScreenViewportRect(), rect));
      },
    }));

    // Push camera to store (debounced)
    const debouncedUpdateCamera = useMemo(
      () =>
        debounce(
          (camera) => {
            doUpdateCamera(camera);
          },
          { delay: 250 }
        ),
      [doUpdateCamera]
    );

    const debouncedOnRangeSelect = useMemo(
      // TODO I probably want a throttle?
      () =>
        debounce(
          (ids, shiftKey, metaKey) => {
            onRangeSelect(ids, shiftKey, metaKey);
          },
          { delay: 8 }
        ),
      [onRangeSelect]
    );

    const needsUpdateCamera = !!doUpdateCamera;
    useEffect(() => {
      if (!needsUpdateCamera) return;

      if (!prevCamera || prevCamera.x !== camera.x || prevCamera.y !== camera.y || prevCamera.z !== camera.z) {
        debouncedUpdateCamera(camera);
      }
    }, [camera, prevCamera, needsUpdateCamera, debouncedUpdateCamera]);

    const {
      spaceKey,
      zoomInKey,
      zoomOutKey,
      zoomResetKey,
      zoomFitKey,
      // keyStateQuery: keyQuery,
    } = useKeyState(
      {
        spaceKey: "space",
        zoomInKey: ["meta+plus", "ctrl+plus"],
        zoomOutKey: ["meta+minus", "ctrl+minus"],
        zoomResetKey: ["meta+0", "ctrl+0"],
        zoomFitKey: "ctrl+1",
      },
      { captureEvents: false }
    );

    const getMinZoomCamera = useCallback(
      (currentCamera, canZoomOut = true, rect) => {
        const globalRect = rect ? rect : spatialIndex.globalRect;
        if (globalRect?.width && globalRect?.height) {
          const fitCamera = zoomToFit(
            currentCamera,
            ref.current.getScreenViewportRect(),
            globalRect,
            canZoomOut,
            MIN_ZOOM_ABSOLUTE
          );
          if (fitCamera) {
            return fitCamera;
          }
        }
        return currentCamera;
      },
      [ref, spatialIndex]
    );

    const getZoomedOutCamera = useCallback(
      (camera) => {
        const minZoomCamera = getMinZoomCamera(camera);
        if (camera.z <= MIN_ZOOM && minZoomCamera.z < MIN_ZOOM) {
          return minZoomCamera;
        } else {
          return zoomOut(getContainerRect(), camera);
        }
      },
      [getMinZoomCamera, getContainerRect]
    );

    useEffect(() => {
      if (spaceKey.pressed && !isPanMode && !isDragSelectMode) {
        setIsPanMode(true);
      } else if (spaceKey.up && isPanMode) {
        setIsPanMode(false);
      } else if (zoomInKey.down) {
        setCamera((c) => zoomIn(getContainerRect(), c));
      } else if (zoomOutKey.down) {
        setCamera((c) => getZoomedOutCamera(c));
      } else if (zoomResetKey.down) {
        setCamera((c) => zoomReset(getContainerRect(), c, 1.0));
      } else if (zoomFitKey.down) {
        setCamera((c) => getMinZoomCamera(c, true));
      }
    }, [
      getContainerRect,
      getMinZoomCamera,
      getZoomedOutCamera,
      isDragSelectMode,
      isPanMode,
      setCamera,
      spaceKey,
      zoomFitKey,
      zoomInKey,
      zoomOutKey,
      zoomResetKey,
    ]);

    useEffect(() => {
      const preventGesture = (event) => event.preventDefault();
      document.addEventListener("gesturestart", preventGesture);
      document.addEventListener("gesturechange", preventGesture);

      return () => {
        document.removeEventListener("gesturestart", preventGesture);
        document.removeEventListener("gesturechange", preventGesture);
      };
    }, []);

    useEffect(() => {
      function handleWheel(event) {
        event.preventDefault();
        const { clientX, clientY, ctrlKey, metaKey } = event;
        const [deltaX, deltaY, deltaZ] = normalizeWheel(event);

        if (ctrlKey || metaKey) {
          setCamera((c) => {
            const minZoomCamera = getMinZoomCamera(c);
            return zoomCamera(
              c,
              { x: clientX, y: clientY },
              deltaZ / 100,
              Math.min(minZoomCamera.z, MIN_ZOOM),
              MAX_ZOOM
            );
          });
        } else {
          setCamera((c) => panCamera(c, deltaX, deltaY));
        }
      }

      const el = canvasRef.current;
      if (!el) return;

      el.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        el.removeEventListener("wheel", handleWheel);
      };
    }, [ref, setCamera, getMinZoomCamera]);

    const isReadOnly = !onRangeSelect;

    const bindDrag = useDrag(
      ({
        memo,
        buttons,
        first,
        last,
        down,
        delta: [dx, dy],
        cancel,
        initial: [startX, startY],
        xy: [endX, endY],
        dragging,
        event,
      }) => {
        const { wasMiddleButton, shiftKey, metaKey } = memo || {};
        // RTE scroll behavior is triggering a drag, bail if we don't have a button:
        if (buttons === undefined) return;

        startX -= ORIGIN.x;
        startY -= ORIGIN.y;
        endX -= ORIGIN.x;
        endY -= ORIGIN.y;

        const isMiddleButton = first ? buttons === 4 : wasMiddleButton;

        const updateDragSelectRect = (visible = true) => {
          const rect = rectFromPoints({ x: startX, y: startY }, { x: endX, y: endY });
          Object.assign(dragSelectRectRef.current?.style, {
            visibility: visible ? "visible" : "hidden",
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transform: `translate(${Math.round(rect.x)}px, ${Math.round(rect.y)}px)`,
          });

          return { width: rect.width, height: rect.height, x: Math.round(rect.x), y: Math.round(rect.y) };
        };

        if (first && isMiddleButton && !isPanMode) {
          setIsPanMode(true);
        } else if (dragging && !isPanMode && !isDragSelectMode) {
          if (!isReadOnly) {
            setIsDragSelectMode(true);
            updateDragSelectRect();
          }
        } else if (!isMiddleButton && !isPanMode && !isDragSelectMode) {
          cancel();
          return;
        }

        if (isPanMode) {
          if (dragging && !isPanning) {
            setIsPanning(true);
          } else if (last) {
            setIsPanning(false);
            if (isPanMode) {
              setIsPanMode(false);
            }
          }

          if (down) {
            setCamera((c) => panCamera(c, -dx, -dy));
          }
        } else if (isDragSelectMode) {
          const selRect = updateDragSelectRect(!last);
          if (!last) {
            debouncedOnRangeSelect(
              rectFromPoints(
                screenToCanvas({ x: selRect.x, y: selRect.y }, camera),
                screenToCanvas({ x: selRect.x + selRect.width, y: selRect.y + selRect.height }, camera)
              ),
              shiftKey,
              metaKey
            );
          }
          if (last) {
            // Skip to next frame to give Editor a chance to check for mode
            if (isDragSelectMode) {
              setTimeout(() => {
                setIsDragSelectMode(false);
              }, 0);
            }
          }
        }

        // Returns as "memo" in next call
        return { isMiddleButton, shiftKey: event.shiftKey, metaKey: event.metaKey };
      },
      { pointer: { buttons: [1, 4] }, threshold: 10, enabled: isDragSelectMode || isPanMode ? true : !isShuffleMode }
    );

    const transform = `scale(${camera.z}) translate(${camera.x}px, ${camera.y}px)`;
    const zoom = camera.z;

    const dragHandlers = bindDrag();
    const _onPointerDown = dragHandlers.onPointerDown;
    dragHandlers.onPointerDown = (event) => {
      // Always stop pointer events regardless if gesture is enabled or not
      // (otherwise we risk browser starting to select text)
      event.stopPropagation();
      if (_onPointerDown) {
        return _onPointerDown(event);
      }
    };
    // No idea why but the lib enables keyboard drag simulations by default??
    // https://github.com/pmndrs/use-gesture/blob/a521a171fcce65622f7ebb46b3740048c352484b/packages/core/src/engines/DragEngine.ts#L9
    delete dragHandlers["onKeyUp"];
    delete dragHandlers["onKeyDown"];

    return (
      <KeyStateLayer>
        <div
          id={"editor-canvas"}
          className={cn(styles.canvasWrapper, {
            [styles.isPanMode]: isPanMode,
            [styles.isPanning]: isPanning,
          })}
          ref={canvasRef}
          style={{ "--zoom": zoom }}
          onClick={(event) => {
            if (!onClick || event.detail > 1) return;

            onClick(event);
          }}
          onDoubleClick={(event) => {
            if (!onDoubleClick) return;

            const clientRect = canvasRef.current.getBoundingClientRect();
            const screenPoint = {
              x: event.clientX - clientRect.x,
              y: event.clientY - clientRect.y,
            };

            const canvasPoint = screenToCanvas(screenPoint, camera);
            const snapCanvasPoint = {
              x: snapToGrid(canvasPoint.x, CANVAS_GRID_SIZE),
              y: snapToGrid(canvasPoint.y, CANVAS_GRID_SIZE),
            };
            onDoubleClick(snapCanvasPoint);
          }}
          onScroll={(event) => {
            // Undo scroll events that make it through, convert to a pan
            const verticalOffset = event.target.scrollTop;
            const horizontalOffset = event.target.scrollLeft;
            if (horizontalOffset !== 0 || verticalOffset !== 0) {
              if (horizontalOffset !== 0) event.target.scrollLeft = 0;
              if (verticalOffset !== 0) event.target.scrollTop = 0;
              setCamera({
                x: camera.x - horizontalOffset,
                y: camera.y - verticalOffset,
                z: camera.z,
              });
            }
          }}
          {...dragHandlers}
        >
          <div
            className={cn(styles.background, { [styles.readOnly]: isReadOnly })}
            style={{
              backgroundImage: zoom > 1 ? `url(${zoomedInBackground})` : null,
              backgroundSize: `${zoom * CANVAS_GRID_SIZE}px`,
              backgroundPosition: `${zoom * camera.x}px ${zoom * camera.y}px`,
            }}
          />
          <div className={styles.canvas} style={{ transform }}>
            {!isReadOnly && (
              /* Note: 1 child or more because the stack backgrounds as passed in as a child */
              <div className={cn(styles.centerTop, { [styles.isHidden]: React.Children.count(children) > 1 })}>
                <div className={styles.centerWrapper}>
                  <div className={styles.icon}>
                    <DocumentStackIcon width={83} strokeWidth={0.5} />
                  </div>
                  <div className={styles.copy}>
                    Keep track of recalled ideas and notes as you're ideating. Double click anywhere to add a note card.
                  </div>
                </div>
              </div>
            )}
            {children}
          </div>
          <div ref={dragSelectRectRef} className={styles.dragSelectRectangle} />
        </div>
      </KeyStateLayer>
    );
  }
);
export default Canvas;

Canvas.propTypes = {
  camera: PropTypes.object.isRequired,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  doUpdateCamera: PropTypes.func,
  getHorizontalOffset: PropTypes.func,
  isShuffleMode: PropTypes.bool,
  onClick: PropTypes.func,
  onDoubleClick: PropTypes.func,
  onRangeSelect: PropTypes.func,
  spatialIndex: PropTypes.object.isRequired,
};

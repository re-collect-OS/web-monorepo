import React, { useRef, forwardRef } from "react";
import { useDrag } from "@use-gesture/react";
import cn from "classnames";
import Frame from "react-frame-component";

import { events, analyticsService } from "../../libs/analyticsLib";
import { rewriteGlobalPrefixedString } from "../../utils/inject";

// Note: styles expected to be injected by the content script

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

const Panel = forwardRef(
  (
    {
      children,
      serializedStyles,
      isMinimized,
      isMaximized,
      frameId,
      idealWidth,
      idealHeight,
      initialPosition = ["100%", "0px"],
      isVisible = true,
    },
    ref
  ) => {
    const frameWrapperRef = useRef(null);
    const startPointRef = useRef([0, 0]);
    const lastStackPositionStyleRef = useRef(initialPosition);
    const verticalConstraintsRef = useRef(null);
    const verticalSpacerRef = useRef(null);
    const horizontalSpacerRef = useRef(null);

    const lastStackPositionStyle = lastStackPositionStyleRef.current;
    const persistLastPosition = (point) => {
      lastStackPositionStyleRef.current = [`${point[0]}px`, `${point[1]}px`];
      // TODO persist (send to background script)
      // localStorage.setItem(_lastPosKey, JSON.stringify(lastStackPositionStyle));
    };

    const bindDrag = useDrag(
      ({ first, last, down, movement: [mx, my] }) => {
        // Capture the position relative to the window on drag start:
        if (first) {
          startPointRef.current = getElLeftBottomPoint({
            el: frameWrapperRef.current,
            verticalConstraintsEl: verticalConstraintsRef.current,
          });
        }

        // While dragging update spacer dimensions:
        const leftOffset = Math.max(0, startPointRef.current[0] + mx);
        const bottomOffset = Math.max(0, startPointRef.current[1] - my);

        if (down) {
          Object.assign(horizontalSpacerRef.current.style, {
            width: `${Math.round(leftOffset)}px`,
          });
          Object.assign(verticalSpacerRef.current.style, {
            height: `${Math.round(bottomOffset)}px`,
          });
        } else if (!first) {
          persistLastPosition([Math.round(leftOffset), Math.round(bottomOffset)]);
        }

        if (last) {
          analyticsService.logEvent(events.recallRepositioned());
        }
      },
      { threshold: 8, keys: false }
    );

    const frame = (
      <Frame
        key={"frame"}
        ref={ref}
        id={frameId}
        head={<style dangerouslySetInnerHTML={{ __html: serializedStyles }} />}
        className={rewriteGlobalPrefixedString("_recollectFrame")}
        frameBorder={0}
      >
        {children}
      </Frame>
    );

    // Note: we re-create the div hierarchy in the minimized case to avoid un-mounting
    // the frame component:

    if (isMaximized) {
      return (
        <div
          key={"constraintWrapper"}
          className={rewriteGlobalPrefixedString("_recollectMaximizedConstraints")}
          style={!isVisible ? { visibility: "hidden" } : undefined}
        >
          <div key={"horizontalConstraints"}>
            <div key={"horizontalSpacer"} />
            <div
              key={"frameWrapper"}
              className={rewriteGlobalPrefixedString("_recollectMaximizedFrameWrapper")}
              ref={frameWrapperRef}
            >
              {frame}
            </div>
          </div>
          <div key={"verticalSpacer"} />
        </div>
      );
    }

    if (isMinimized) {
      return (
        <div
          key={"constraintWrapper"}
          className={rewriteGlobalPrefixedString("_recollectMinimizedConstraints")}
          style={!isVisible ? { visibility: "hidden" } : undefined}
        >
          <div key={"horizontalConstraints"}>
            <div key={"horizontalSpacer"} />
            <div
              key={"frameWrapper"}
              className={rewriteGlobalPrefixedString("_recollectMinimizedFrameWrapper")}
              ref={frameWrapperRef}
            >
              {frame}
            </div>
          </div>
          <div key={"verticalSpacer"} />
        </div>
      );
    }

    return (
      <div
        key={"constraintWrapper"}
        className={rewriteGlobalPrefixedString("_recollectVerticalConstraints")}
        ref={verticalConstraintsRef}
        style={!isVisible ? { visibility: "hidden" } : undefined}
      >
        <div key={"horizontalConstraints"} className={rewriteGlobalPrefixedString("_recollectHorizontalConstraints")}>
          <div
            key={"horizontalSpacer"}
            ref={horizontalSpacerRef}
            className={cn(
              rewriteGlobalPrefixedString("_recollectSpacer"),
              rewriteGlobalPrefixedString("_recollectHorizontal")
            )}
            style={{ width: lastStackPositionStyle[0] }}
          />
          <div
            key={"frameWrapper"}
            className={rewriteGlobalPrefixedString("_recollectFrameWrapper")}
            ref={frameWrapperRef}
            style={{
              height: `min(100vh, ${idealHeight || 650}px)`,
              width: `${idealWidth || 400}px`,
            }}
          >
            <div className={rewriteGlobalPrefixedString("_recollectDragBar")} {...bindDrag()}>
              <div className={rewriteGlobalPrefixedString("_recollectDragBarIndicator")} />
            </div>
            {frame}
          </div>
        </div>
        <div
          key={"verticalSpacer"}
          ref={verticalSpacerRef}
          className={cn(
            rewriteGlobalPrefixedString("_recollectSpacer"),
            rewriteGlobalPrefixedString("_recollectVertical")
          )}
          style={{ height: lastStackPositionStyle[1] }}
        />
      </div>
    );
  }
);

export default Panel;

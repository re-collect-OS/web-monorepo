import React, { forwardRef, useCallback, useState } from "react";
import PropTypes from "prop-types";
import Frame from "react-frame-component";
import cn from "classnames";

import AnnotationPopover from "../annotation-popover";
import { rewriteGlobalPrefixedString } from "../../utils/inject";

const OFFSET_MARGIN = 8;
const MAX_HEIGHT = 400;

const AnnotationPanel = forwardRef(({ frameId, screenRect, serializedStyles, ...rest }, ref) => {
  const [maxHeight, setMaxHeight] = useState(null);
  const [contentIsMounted, setContentIsMounted] = useState(false);

  const reposition = useCallback(() => {
    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect();
      const { innerWidth: screenWidth, innerHeight: screenHeight } = window;

      let top = screenRect.bottom + OFFSET_MARGIN;
      let cappedHeight = null;
      const roomAbove = Math.round(screenRect.top - OFFSET_MARGIN * 2);
      const roomBelow = Math.round(
        screenHeight - (OFFSET_MARGIN + screenRect.top + (screenRect.bottom - screenRect.top) + OFFSET_MARGIN)
      );

      // If we can't fit below
      if (roomBelow < height) {
        // If we can fit above or the available max height above is greater than below, move to top
        if (roomAbove >= height || roomAbove > roomBelow) {
          top = Math.max(OFFSET_MARGIN, screenRect.top - height - OFFSET_MARGIN);
          if (roomAbove < height) {
            cappedHeight = roomAbove;
          }
        } else {
          cappedHeight = roomBelow;
        }
      }

      let left = screenRect.left;
      if (left + width + OFFSET_MARGIN > screenWidth) {
        left = screenWidth - width - OFFSET_MARGIN;
      }
      ref.current.style.top = `${Math.round(top)}px`;
      ref.current.style.left = `${Math.round(left)}px`;

      if (!cappedHeight && height >= MAX_HEIGHT) {
        cappedHeight = MAX_HEIGHT;
      }

      if (cappedHeight) {
        const roundCappedHeight = Math.round(cappedHeight);
        ref.current.style.height = `${roundCappedHeight}px`;
        if (maxHeight !== roundCappedHeight) {
          setMaxHeight(roundCappedHeight);
        }
      } else if (maxHeight) {
        setMaxHeight(null);
      }
    }
  }, [ref, screenRect, maxHeight]);

  const handleIframeResize = useCallback(
    (height) => {
      if (ref.current) {
        ref.current.style.height = `${height}px`;
        reposition();
      }
    },
    [ref, reposition]
  );

  return (
    <Frame
      ref={ref}
      id={frameId}
      head={<style dangerouslySetInnerHTML={{ __html: serializedStyles }} />}
      className={cn(rewriteGlobalPrefixedString("_recollectFramedAnnotationPanel"), {
        [rewriteGlobalPrefixedString("_recollectMounting")]: contentIsMounted,
      })}
      frameBorder={0}
      contentDidMount={() => {
        setContentIsMounted(true);
      }}
    >
      <AnnotationPopover doResizeIframe={handleIframeResize} maxHeight={maxHeight} {...rest} />
    </Frame>
  );
});

AnnotationPanel.propTypes = {
  frameId: PropTypes.string.isRequired,
  screenRect: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number,
    bottom: PropTypes.number,
    right: PropTypes.number,
  }),
  serializedStyles: PropTypes.string.isRequired,
};

export default AnnotationPanel;

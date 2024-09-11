import React, { useState, useEffect, forwardRef, useCallback } from "react";
import PropTypes from "prop-types";
import Frame from "react-frame-component";
import cn from "classnames";

import Popover from "../popover";

import { rewriteGlobalPrefixedString } from "../../utils/inject";

export const POPOVER_ANIMATION_TIME = 500;

const PopoverPanel = forwardRef(({ frameId, serializedStyles, isOpen, onClose, isDismissing, ...rest }, ref) => {
  const [contentIsMounted, setContentIsMounted] = useState(false);
  const handleIframeResize = useCallback(
    (height) => {
      if (isOpen && ref.current) {
        ref.current.style.height = `${height}px`;
      }
    },
    [isOpen, ref]
  );

  useEffect(() => {
    const handleDocumentClick = () => {
      onClose();
    };
    const handleKeypress = (event) => {
      // ESC
      if (event.keyCode === 27) {
        onClose();
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keyup", handleKeypress);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.addEventListener("keyup", handleKeypress);
    };
  }, [onClose]);

  return (
    <Frame
      ref={ref}
      id={frameId}
      head={<style dangerouslySetInnerHTML={{ __html: serializedStyles }} />}
      className={cn(rewriteGlobalPrefixedString("_recollectFramedPopover"), {
        [rewriteGlobalPrefixedString("_recollectMounting")]: isOpen && contentIsMounted && !isDismissing,
        [rewriteGlobalPrefixedString("_recollectUnmounting")]: isDismissing,
      })}
      frameBorder={0}
      contentDidMount={() => {
        setContentIsMounted(true);
      }}
    >
      <Popover
        doResizeIframe={handleIframeResize}
        onClose={onClose}
        menuContainer={ref.current?.contentWindow?.document?.body}
        {...rest}
      />
    </Frame>
  );
});

PopoverPanel.propTypes = {
  frameId: PropTypes.string.isRequired,
  serializedStyles: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isDismissing: PropTypes.bool.isRequired,
};

export default PopoverPanel;

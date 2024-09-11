import React, { useRef, useLayoutEffect } from "react";
import { ExternalIcon, UnlinkIcon, IconButton, Toolbar } from "web-shared-lib";
import { Popover } from "../../libs/textSelectionPopover";

import styles from "./LinkToolbar.module.css";

function Wrapper({ target, mount, children }) {
  return (
    <Popover
      target={target}
      mount={mount}
      render={({ clientRect, isCollapsed }) => {
        if (clientRect == null || !isCollapsed) return null;
        return React.cloneElement(children, { clientRect });
      }}
    />
  );
}

function LinkToolbar({ clientRect, isLink, doRemoveLink, doMarkExpectedInput }) {
  const ref = useRef();
  const linkRef = useRef();
  const linkLabelRef = useRef();

  useLayoutEffect(() => {
    setTimeout(() => {
      const el = ref.current;
      if (!el) return;

      el.style.top = `${clientRect.bottom + window.pageYOffset + 8}px`;
      el.style.left = `${Math.max(
        clientRect.left + window.pageXOffset - el.offsetWidth / 2 + clientRect.width / 2,
        4
      )}px`;

      const newUrl = isLink();
      if (newUrl) {
        linkRef.current.href = newUrl;
        linkLabelRef.current.innerHTML = newUrl;
        el.style.visibility = "visible";
      } else {
        el.style.visibility = "hidden";
      }
    }, 0);
  }, [clientRect, isLink]);

  return (
    <Toolbar.Root
      ref={ref}
      className={styles.Toolbar}
      aria-label="Link options"
      onPointerDown={() => {
        // Cool story: the RTE needs to know a click through to the toolbar is about to happen
        // to avoid dismissing the toolbar on blur - and this is the only event that fires before
        // the blur and click events
        doMarkExpectedInput(true);
      }}
      onPointerUp={() => {
        // Clean up after
        doMarkExpectedInput(false);
      }}
    >
      <Toolbar.Link asChild>
        <a ref={linkRef} rel="noreferrer" target="_blank" className={styles.linkButton}>
          <ExternalIcon className={styles.icon} />
          <span className={styles.linkLabel} ref={linkLabelRef} />
        </a>
      </Toolbar.Link>
      <Toolbar.Button asChild>
        <IconButton
          className={styles.unlinkButton}
          icon={<UnlinkIcon />}
          onClick={() => {
            doRemoveLink();
            // Hide
            ref.current.style.visibility = "hidden";
          }}
          title={"Remove link"}
          variant={"grey"}
          size={"large"}
          full
        />
      </Toolbar.Button>
    </Toolbar.Root>
  );
}

export default function WrappedToolbar({ target, mount, ...props }) {
  return (
    <Wrapper target={target} mount={mount}>
      <LinkToolbar {...props} />
    </Wrapper>
  );
}

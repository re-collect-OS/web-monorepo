import React, { useRef, useLayoutEffect, useImperativeHandle } from "react";
import cn from "classnames";
import { RecallIcon, LinkIcon, UnlinkIcon, Toolbar } from "web-shared-lib";
import { Popover } from "../../libs/textSelectionPopover";

import styles from "./HoveringToolbar.module.css";

function HoveringToolbar({
  textContent,
  clientRect,
  isBold,
  isItalic,
  isLink,
  onGenerate,
  doToggleBold,
  doToggleItalic,
  doToggleLink,
  doMarkExpectedInput,
}) {
  const ref = useRef();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.top = `${clientRect.bottom + window.pageYOffset + 8}px`;
    el.style.left = `${Math.max(
      clientRect.left + window.pageXOffset - el.offsetWidth / 2 + clientRect.width / 2,
      4
    )}px`;
  }, [clientRect]);

  const canBold = !!doToggleBold;
  const canItalic = !!doToggleItalic;
  const canLink = !!doToggleLink;
  const hasTextToolbar = canBold || canItalic || canLink;
  const values = hasTextToolbar
    ? [...(isBold() ? ["bold"] : []), ...(isItalic() ? ["italic"] : []), ...(isLink() ? ["link"] : [])]
    : [];

  return (
    <Toolbar.Root
      ref={ref}
      className={styles.Toolbar}
      aria-label="Formatting options"
      onPointerDown={() => {
        // Cool story: the RTE needs to know a click through to the toolbar is about to happen
        // to avoid dismissing the toolbar on blur - and this is the only event that fires before
        // the blur and click events
        if (doMarkExpectedInput) {
          doMarkExpectedInput(true);
        }
      }}
      onPointerUp={() => {
        // Clean up after
        if (doMarkExpectedInput) {
          doMarkExpectedInput(false);
        }
      }}
    >
      <Toolbar.Button asChild>
        <button className={cn(styles.toolbarItem, styles.recallButton)} onClick={onGenerate.bind(null, textContent)}>
          <RecallIcon />
          Recall
        </button>
      </Toolbar.Button>
      {hasTextToolbar && (
        <>
          <Toolbar.Separator className={styles.separator} />
          <Toolbar.ToggleGroup
            type="multiple"
            className={styles.toggleGroup}
            aria-label="Text formatting"
            value={values}
            onValueChange={(newValues) => {
              if (values.includes("bold") !== newValues.includes("bold")) {
                doToggleBold();
              } else if (values.includes("italic") !== newValues.includes("italic")) {
                doToggleItalic();
              } else if (values.includes("link") !== newValues.includes("link")) {
                doToggleLink();
              }
            }}
          >
            {canBold && (
              <Toolbar.ToggleItem
                className={cn(styles.toolbarItem, styles.toggleButton, styles.bold)}
                value="bold"
                aria-label="Bold"
              >
                B
              </Toolbar.ToggleItem>
            )}
            {canItalic && (
              <Toolbar.ToggleItem
                className={cn(styles.toolbarItem, styles.toggleButton, styles.italic)}
                value="italic"
                aria-label="Italic"
              >
                I
              </Toolbar.ToggleItem>
            )}
            {canLink && (
              <Toolbar.ToggleItem
                className={cn(styles.toolbarItem, styles.toggleButton)}
                value="link"
                aria-label="Link"
              >
                {values.includes("link") ? <UnlinkIcon /> : <LinkIcon />}
              </Toolbar.ToggleItem>
            )}
          </Toolbar.ToggleGroup>
        </>
      )}
    </Toolbar.Root>
  );
}

const WrappedToolbar = React.forwardRef(({ target, mount, ...props }, ref) => {
  const isCollapsedRef = useRef(null);

  useImperativeHandle(ref, () => ({
    isCollapsed: () => isCollapsedRef.current,
  }));

  return (
    <Popover
      target={target}
      mount={mount}
      render={({ clientRect, isCollapsed, textContent }) => {
        isCollapsedRef.current = !target || clientRect == null || isCollapsed;

        if (isCollapsedRef.current) {
          return null;
        }

        return <HoveringToolbar clientRect={clientRect} textContent={textContent} {...props} />;
      }}
    />
  );
});

export default WrappedToolbar;

// Flattened this for convenience but we'll need it when we have more types of toolbars:
// function Wrapper({ target, mount, children }) {
//   return (
//     <Popover
//       target={target}
//       mount={mount}
//       render={({ clientRect, isCollapsed, textContent }) => {
//         if (!target || clientRect == null || isCollapsed) return null;
//         return React.cloneElement(children, { clientRect, textContent });
//       }}
//     />
//   );
// }

// return (
//   <Wrapper target={target} mount={mount}>
//     <HoveringToolbar {...props} />
//   </Wrapper>
// );

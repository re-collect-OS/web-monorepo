import React, { useRef, useLayoutEffect } from "react";
import { Popover } from "../../libs/textSelectionPopover";
import { KeepIcon, VisualMenuItem, Toolbar } from "web-shared-lib";
import styles from "./TextSelectionMenu.module.css";

function Wrapper({ targetRef, target, mount, children }) {
  return (
    <Popover
      targetRef={targetRef}
      target={target}
      mount={mount}
      render={({ clientRect, isCollapsed, textContent }) => {
        const _target = target || targetRef?.current;

        if (!_target || clientRect == null || isCollapsed) return null;

        return React.cloneElement(children, { clientRect, textContent });
      }}
    />
  );
}

function TextSelectionMenu({ clientRect, textContent, onKeep, contextLabel }) {
  // onAddNote
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

  const getSelectedRange = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const start = +range.startContainer.parentNode.dataset.sentence;
    const end = +range.endContainer.parentNode.dataset.sentence;
    const startPage = +range.startContainer.parentNode.dataset.page;
    const endPage = +range.endContainer.parentNode.dataset.page;

    selection.removeAllRanges();
    return {
      start: start >= 0 ? start : undefined,
      end: end >= 0 ? end : undefined,
      startPage: startPage >= 0 ? startPage : undefined,
      endPage: endPage >= 0 ? endPage : undefined,
    };
  };

  // 11/1/2023 disabled
  if (contextLabel === "Daily Log") {
    return null;
  }

  return (
    <Toolbar.Root ref={ref} className={styles.TextSelectionMenu} orientation={"vertical"} aria-label="Keep selection">
      <Toolbar.Button asChild>
        <VisualMenuItem
          icon={<KeepIcon />}
          onClick={() => {
            onKeep(getSelectedRange(), textContent);
          }}
        >
          Keep to {contextLabel}
        </VisualMenuItem>
      </Toolbar.Button>
      {/*<Toolbar.Button asChild>
        <VisualMenuItem
          icon={<WriteIcon />}
          onClick={() => {
            onAddNote(getSelectedRange(), textContent);
          }}
        >
          Add note
        </VisualMenuItem>
      </Toolbar.Button>*/}
    </Toolbar.Root>
  );
}

export default function WrappedTextSelectionMenu({ targetRef, target, mount, ...props }) {
  return (
    <Wrapper targetRef={targetRef} target={target} mount={mount}>
      <TextSelectionMenu {...props} />
    </Wrapper>
  );
}

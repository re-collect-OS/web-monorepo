// https://github.com/juliankrispel/use-text-selection 1.1.3
import { useCallback, useLayoutEffect, useState } from "react";

function roundValues(_rect) {
  const rect = {
    ..._rect,
  };
  for (const key of Object.keys(rect)) {
    rect[key] = Math.round(rect[key]);
  }
  return rect;
}

function shallowDiff(prev, next) {
  if (prev != null && next != null) {
    for (const key of Object.keys(next)) {
      if (prev[key] != next[key]) {
        return true;
      }
    }
  } else if (prev != next) {
    return true;
  }
  return false;
}

export function useTextSelection({ target, targetRef }) {
  // Mihai 5/16/22 Allow passing in ref
  if (targetRef) {
    target = targetRef.current;
  }

  const [clientRect, setRect] = useState();
  const [isCollapsed, setIsCollapsed] = useState();
  const [textContent, setText] = useState();

  const reset = useCallback(() => {
    setRect(undefined);
    setIsCollapsed(undefined);
    setText(undefined);
  }, []);

  const handler = useCallback(() => {
    let newRect;
    const selection = window.getSelection();

    if (selection == null || !selection.rangeCount) {
      reset();
      return;
    }

    const range = selection.getRangeAt(0);

    if (target != null && !target.contains(range.commonAncestorContainer)) {
      reset();
      return;
    }

    if (range == null) {
      reset();
      return;
    }

    const contents = range.cloneContents();

    if (contents.textContent != null) setText(contents.textContent);

    const rects = range.getClientRects();

    if (rects.length === 0 && range.commonAncestorContainer != null) {
      const el = range.commonAncestorContainer;
      if (el && el.getBoundingClientRect) {
        newRect = roundValues(el.getBoundingClientRect().toJSON());
      }
    } else {
      if (rects.length < 1) return;
      // Changed this to getBoundingClientRect from rects[0]
      if (range.getBoundingClientRect) {
        newRect = roundValues(range.getBoundingClientRect().toJSON());
      }
    }

    if (!newRect) {
      return;
    }

    setRect((oldRect) => {
      if (shallowDiff(oldRect, newRect)) {
        return newRect;
      }
      return oldRect;
    });

    setIsCollapsed(range.collapsed);
  }, [target, reset]);

  useLayoutEffect(() => {
    document.addEventListener("selectionchange", handler);
    document.addEventListener("keydown", handler);
    document.addEventListener("keyup", handler);
    window.addEventListener("resize", handler);

    return () => {
      document.removeEventListener("selectionchange", handler);
      document.removeEventListener("keydown", handler);
      document.removeEventListener("keyup", handler);
      window.removeEventListener("resize", handler);
    };
  }, [target, handler]);

  return {
    clientRect,
    isCollapsed,
    textContent,
  };
}

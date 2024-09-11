import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";

export function usePrevious(value) {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef();

  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current;
}

export const useMatchMedia = (query) => {
  const mql = useRef(window.matchMedia(query));
  const [match, setMatch] = useState(mql.current.matches);

  useEffect(() => {
    const onChange = (event) => setMatch(event.matches);
    const _mql = mql.current; // capture in return block
    _mql.addListener(onChange);
    return () => {
      _mql.removeListener(onChange);
    };
  }, []);

  return match;
};

export function useComponentSize(ref_callback) {
  const resizeObserverRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onResize = useCallback((entries) => {
    const entry = entries[0];
    setSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  }, []);

  const ref = useCallback(
    (node) => {
      if (node === null) {
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
      } else {
        resizeObserverRef.current = new ResizeObserver(onResize);
        resizeObserverRef.current.observe(node);
      }

      if (ref_callback) {
        ref_callback(node);
      }
    },
    [onResize]
  );

  return [ref, size];
}

// Based on https://github.com/Bedrock-Layouts/Bedrock/blob/main/packages/use-container-query/src/index.tsx
export function useComponentQuery(ref_callback, width = 1, maxWidth) {
  const resizeObserverRef = useRef(null);
  const [matches, setMatch] = useState(false);

  const onResize = useCallback((entries) => {
    const entry = entries[0];
    const nodeWidth = entry.borderBoxSize?.inlineSize ?? entry.contentRect.width;
    //nodeWidth can be zero when it is switching from one node to another.  This will ignore that.
    if (nodeWidth > 0) {
      const newMatch = maxWidth === undefined ? nodeWidth <= width : nodeWidth >= width && nodeWidth <= maxWidth;
      setMatch(newMatch);
    }
  }, []);

  const ref = useCallback(
    (node) => {
      if (node === null) {
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
      } else {
        resizeObserverRef.current = new ResizeObserver(onResize);
        resizeObserverRef.current.observe(node);
      }

      if (ref_callback) {
        ref_callback(node);
      }
    },
    [onResize]
  );

  return [ref, matches];
}

// Forked from useDelayedUnmount: https://github.com/kenmueller/use-delayed-unmount
export const useDelayedUnmount = (isInitiallyMounted, delay = 300) => {
  const [state, setState] = useState({ isMounted: isInitiallyMounted, isUnmounting: false });
  const timeoutRef = useRef(null);

  const setIsMounted = useCallback(
    (_isMounted) => {
      // Since we delay setting the mount state we compute the logical "open" state:
      const isOpen = state.isUnmounting ? false : state.isMounted;

      // Support useState callback pattern
      if (typeof _isMounted === "function") {
        _isMounted = _isMounted(isOpen);
      }

      if (isOpen === _isMounted) {
        return;
      }

      if (_isMounted) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setState({
          isMounted: true,
          isUnmounting: false,
        });
      } else {
        setState({
          isMounted: true,
          isUnmounting: true,
        });
        timeoutRef.current = setTimeout(() => {
          setState({
            isMounted: false,
            isUnmounting: false,
          });
          timeoutRef.current = null;
        }, delay);
      }
    },
    [state, setState, delay]
  );
  return [[state.isMounted, state.isUnmounting], setIsMounted];
};

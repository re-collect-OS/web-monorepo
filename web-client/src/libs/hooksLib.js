import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { usePrevious, useMatchMedia, useComponentSize, useComponentQuery } from "web-shared-lib";

// Proxy shared hooks:

export { usePrevious, useMatchMedia, useComponentSize, useComponentQuery };

//

export function useFormFields(initialState) {
  const [fields, setValues] = useState(initialState);

  return [
    fields,
    function (event) {
      setValues({
        ...fields,
        [event.target.id]: event.target.value,
      });
    },
  ];
}

export function useEffectOnce(effect, deps) {
  const [hasCompleted, setHasCompleted] = useState(false);
  useEffect(() => {
    if (hasCompleted) return;
    setHasCompleted(true);
    effect();
  }, [effect, hasCompleted, setHasCompleted, ...(deps ?? [])]); /* eslint-disable-line react-hooks/exhaustive-deps */
}

export const useFocusWithin = (callback) => {
  const state = useRef({ hasFocus: false }).current;

  const onFocus = () => {
    if (!state.hasFocus) {
      if (callback) {
        callback(true);
      }
      state.hasFocus = true;
    }
  };
  const onBlur = (event) => {
    // Don't trigger if moving focus within the element
    if (state.hasFocus && !event.currentTarget.contains(event.relatedTarget)) {
      if (callback) {
        callback(false);
      }
      state.hasFocus = false;
    }
  };

  return {
    onFocus,
    onBlur,
  };
};

// deferQueue is a list of effects we want to run on next render:

export const useDeferredQueue = () => {
  const deferQueue = useRef([]);

  useLayoutEffect(() => {
    if (deferQueue.current.length) {
      deferQueue.current.forEach((fn) => fn());
      deferQueue.current = [];
    }
  });

  const push = useCallback(
    (cb) => {
      if (cb) deferQueue.current.push(cb);
    },
    [deferQueue]
  );

  return push;
};

export const useSessionStorage = (key, val) => {
  const initialValue = useRef(window.sessionStorage.getItem(key));
  const [value, setValue] = useState(initialValue.current === null ? val : initialValue.current);

  useEffect(() => {
    if (value !== undefined) {
      window.sessionStorage.setItem(key, value);
    }
  }, [key, value]);

  return [value, setValue];
};

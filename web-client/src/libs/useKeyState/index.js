// useKeyState - keyboard events as values ( ¿ )
// https://use-key-state.mihaicernusca.com

import React from "react";

//  Event Emitter

class EventEmitter {
  constructor() {
    this.events = {};
  }
  _getWeightedEventListByName(eventName) {
    if (typeof this.events[eventName] === "undefined") {
      this.events[eventName] = [];
    }
    return this.events[eventName];
  }
  on(eventName, fn, priority = 0) {
    const weightedLists = this._getWeightedEventListByName(eventName);
    if (!weightedLists[priority]) {
      weightedLists[priority] = new Set();
    }
    weightedLists[priority].add(fn);
  }
  once(eventName, fn) {
    const self = this;
    const onceFn = function (...args) {
      self.removeListener(eventName, onceFn);
      fn.apply(self, args);
    };
    this.on(eventName, onceFn);
  }
  emit(eventName, ...args) {
    const prioritizedCallbacks = [...this._getWeightedEventListByName(eventName)]
      .reverse() // highest weight first
      .map((list) => Array.from(list)) // preserving insertion order
      .flat();
    prioritizedCallbacks.forEach(
      function (fn) {
        fn.apply(this, args);
      }.bind(this)
    );
  }
  removeListener(eventName, fn) {
    this._getWeightedEventListByName(eventName).forEach((list) => list.delete(fn));
  }
}

// Document Event Listener

const eventEmitter = new EventEmitter();
const boundEvents = {};
function emitDomEvent(event) {
  eventEmitter.emit(event.type, event);
}

const DocumentEventListener = {
  addEventListener(eventName, listener, priority) {
    if (!boundEvents[eventName]) {
      document.addEventListener(eventName, emitDomEvent, true);
    }
    eventEmitter.on(eventName, listener, priority);
  },
  removeEventListener(eventName, listener) {
    eventEmitter.removeListener(eventName, listener);
  },
};

// Key State

function KeyState(isDown = false, justReset = false) {
  this.pressed = isDown; //current (live) combo pressed state
  this.down = isDown; //only true for one read after combo becomes valid
  this.up = justReset; //only true for one read after combo is no longer valid
}

function _get(context, key) {
  const expiredKey = `_${key}Expired`;
  const valueKey = `_${key}`;
  if (context[expiredKey]) {
    return false;
  }
  context[expiredKey] = true;
  return context[valueKey];
}

function _set(context, key, value) {
  const expiredKey = `_${key}Expired`;
  const valueKey = `_${key}`;
  context[expiredKey] = false;
  context[valueKey] = value;
}

Object.defineProperty(KeyState.prototype, "down", {
  get: function () {
    return _get(this, "down");
  },
  set: function (value) {
    _set(this, "down", value);
  },
});

Object.defineProperty(KeyState.prototype, "up", {
  get: function () {
    return _get(this, "up");
  },
  set: function (value) {
    _set(this, "up", value);
  },
});

// Utils

// toCodes: maps our string notation to possible key event codes
// See: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
// Returns an array because browser / platform inconsistencies and we don't care to
// distinguish between left and right keys usually. If we can't map it we pass
// it through which means everyone is free to use the actual codes in the rules
// if they need more.
function toCodes(input) {
  if (!input.length) {
    return [];
  }

  const str = input.toLowerCase();
  const len = str.length;

  if (len === 1 && str.match(/[a-z]/i)) {
    // a-z
    return [`Key${str.toUpperCase()}`];
  } else if (len === 1 && str.match(/[0-9]/i)) {
    // 0-9
    return [`Digit${str}`];
  }

  switch (str) {
    case "[":
      return ["BracketLeft"];
    case "]":
      return ["BracketRight"];
    case "\\":
    case "backslash":
      return ["Backslash"];
    case "period":
    case ".":
      return ["Period"];
    case "comma":
    case ",":
      return ["Comma", "NumpadComma"];
    case "slash":
    case "/":
      return ["Slash"];
    case "backquote":
    case "`":
      return ["Backquote"];
    case "delete":
    case "backspace":
      return ["Backspace", "Delete"];
    case "tab":
      return ["Tab"];
    case "enter":
    case "return":
      return ["Enter", "NumpadEnter"];
    case "shift":
      return ["ShiftLeft", "ShiftRight"];
    case "ctrl":
    case "cntrl":
    case "control":
      return ["ControlRight", "ControlLeft"];
    case "option":
    case "opt":
    case "alt":
      return ["AltLeft", "AltRight"];
    case "esc":
    case "escape":
      return ["Escape"];
    case "space":
      return ["Space"];
    case "left":
      return ["ArrowLeft"];
    case "up":
      return ["ArrowUp"];
    case "right":
      return ["ArrowRight"];
    case "down":
      return ["ArrowDown"];
    case "cmd":
    case "command":
    case "win":
    case "meta":
      return ["OSLeft", "OSRight", "MetaLeft", "MetaRight"];
    case "plus":
    case "equal":
    case "equals":
    case "=":
      return ["Equal"];
    case "minus":
      return ["Minus"];
    case "f1":
    case "f2":
    case "f3":
    case "f4":
    case "f5":
    case "f6":
    case "f8":
    case "f9":
    case "f10":
    case "f11":
    case "f12":
      return [str.toUpperCase()];
    default:
      // Pass input through to allow using specific event codes directly:
      return [input];
  }
}

function matchRule(rule, isDown) {
  function matchRuleStr(ruleStr) {
    const parts = parseRuleStr(ruleStr);
    const results = parts.map((str) => isDown(toCodes(str)));
    return results.every((r) => r === true);
  }

  if (Array.isArray(rule)) {
    return rule.some((ruleStr) => matchRuleStr(ruleStr, isDown) === true);
  }
  return matchRuleStr(rule, isDown);
}

function extractCaptureSet(rulesMap) {
  const captureSet = new Set();
  Object.entries(rulesMap).forEach(([, value]) => {
    const rules = Array.isArray(value) ? value : [value];
    rules.forEach((rule) => {
      const parts = parseRuleStr(rule);
      parts.forEach((part) => {
        toCodes(part).forEach((code) => captureSet.add(code));
      });
    });
  });
  return captureSet;
}

function parseRuleStr(rule) {
  return rule.split("+").map((str) => str.trim());
}

function mapRulesToState(rulesMap, prevState = {}, isDown = () => false) {
  const keysToState = { ...prevState };
  Object.entries(rulesMap).forEach(([key, rule]) => {
    const matched = matchRule(rule, isDown);
    const prevKeyState = keysToState[key];
    if (prevKeyState) {
      if (prevKeyState.pressed !== matched) {
        const up = prevKeyState.pressed && !matched;
        keysToState[key] = new KeyState(matched, up);
      }
    } else {
      keysToState[key] = new KeyState();
    }
  });
  return keysToState;
}

function validateRulesMap(map) {
  // Expecting an object
  if (!map || typeof map !== "object") {
    throw new Error(`useKeyState: expecting an object {key:value<String|Array>} as first parameter.`);
  }
  // Expecting string or array values for each key
  Object.entries(map).forEach(([key, value]) => {
    const isArray = Array.isArray(value);
    const isString = typeof value === "string";
    if (!isString && !isArray) {
      throw new Error(`useKeyState: expecting string or array value for key ${key}.`);
    }
    if (isArray) {
      value.forEach((rule) => {
        if (typeof rule !== "string") {
          throw new Error(`useKeyState: expecting array of strings for key ${key}`);
        }
      });
    }
  });
}

// Utils

function deepEqual(o1, o2) {
  return JSON.stringify(o1) === JSON.stringify(o2);
}

function isInputAcceptingTarget(event) {
  // content editable
  if (event.target.isContentEditable) {
    return true;
  }
  // form elements
  var tagName = (event.target || event.srcElement).tagName;
  return tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA";
}

// Config

const defaultConfig = {
  captureEvents: false, // call event.preventDefault()
  ignoreRepeatEvents: true, // filter out repeat key events (whos event.repeat property is true)
  ignoreCapturedEvents: true, // respect the defaultPrevented event flag
  ignoreInputAcceptingElements: true, // filter out events from all forms of inputs
  priority: undefined, // see DepthContext below
  debug: false,
};

// DepthContext
// We want to mimic the DOM bubbling behavior of giving deeper children a chance to capture events.
// We subscribe to a global key handler on component mount in a filo fashion (useEffect (our subscription) is called in a bottom-up fashion).
// Late mounted children however would get added to the end of the priority list despite being deeper in the tree.
// To enforce a depth priority, you can wrap your app layers in <KeyStateLayer> components that keep track of depth relative to parent <KeyStateLayer>.
// Key callbacks will be sorted first by depth and then by insertion order.
// Alternatively set priority config option. This will override other default or inferred priorities.

export const DepthContext = React.createContext(0);

export function KeyStateLayer({ children }) {
  const parentDepth = React.useContext(DepthContext);
  return <DepthContext.Provider value={parentDepth + 1}>{children}</DepthContext.Provider>;
}

// useKeyState ¿

export const useKeyState = function (rulesMap = {}, configOverrides = {}) {
  const configRef = React.useRef({ ...defaultConfig, ...configOverrides });
  React.useEffect(() => {
    // configOverrides is likely to always be different:
    if (!deepEqual(configOverrides, configRef.current)) {
      configRef.current = { ...defaultConfig, ...configOverrides };
    }
  }, [configOverrides]);
  const inferredPriority = React.useContext(DepthContext);
  const depth = configRef.current.priority || inferredPriority || 0;

  // Maintain a copy of the rules map passed in
  const rulesMapRef = React.useRef({});
  // Validate and update rulesMap when it changes to enable dynamic rules
  React.useEffect(() => {
    // rulesMap is likely to always be different:
    if (!deepEqual(rulesMap, rulesMapRef.current)) {
      validateRulesMap(rulesMap);
      rulesMapRef.current = rulesMap;
    }
  }, [rulesMap]);
  // Keep track of what keys are down
  const keyMapRef = React.useRef({});
  // This gets passed back to the caller and is updated
  // once any hotkey rule matches or stops matching
  const [state, setState] = React.useState(() => mapRulesToState(rulesMap));
  // Query live key state and some common key utility fns:
  // This object gets merged into return object
  const keyStateQuery = {
    pressed: (input) => {
      return matchRule(input, isDown);
    },
    space: () => {
      return isDown(toCodes("space"));
    },
    shift: () => {
      return isDown(toCodes("shift"));
    },
    ctrl: () => {
      return isDown(toCodes("ctrl"));
    },
    alt: () => {
      return isDown(toCodes("alt"));
    },
    option: () => {
      return isDown(toCodes("option"));
    },
    meta: () => {
      return isDown(toCodes("meta"));
    },
    esc: () => {
      return isDown(toCodes("esc"));
    },
  };

  // Re-render the component if the key states have changed.
  // Must capture state value in a ref because the actual
  // updateKeyState function captures the initial value:
  const stateRef = React.useRef(state);
  React.useLayoutEffect(() => {
    stateRef.current = state;
  });

  const updateKeyState = React.useCallback(() => {
    const nextState = mapRulesToState(rulesMapRef.current, stateRef.current, isDown);
    const isEquivalentState = deepEqual(stateRef.current, nextState);

    if (configRef.current.debug) {
      console.log("useKeyState: rulesMap", { ...rulesMapRef.current }, "keyMap", {
        ...keyMapRef.current,
      });
    }

    if (!isEquivalentState) {
      setState(nextState);
    }
  }, []);

  function isDown(codes) {
    const results = codes.map((code) => keyMapRef.current[code] || false);
    return results.some((r) => r === true);
  }

  // Event handlers

  const handleUp = React.useCallback(
    (event) => {
      if (configRef.current.debug) {
        console.log("useKeyState: up", event.code);
      }
      // If we have an up event for an already captured down, process it regardless of source.
      // This is because the down could have come in before the input got focus.
      const isDown = !!keyMapRef.current[event.code];
      // Ignore events from input accepting elements (inputs etc)
      if (configRef.current.ignoreInputAcceptingElements && isInputAcceptingTarget(event) && !isDown) {
        if (configRef.current.debug) {
          console.log("useKeyState: Ignoring captured up event:", event.code);
        }
        return;
      }
      // If Meta goes up, throw everything away because we might have stuck
      // keys (OSX gets no keyup events while the cmd key is held down)
      // http://web.archive.org/web/20160304022453/http://bitspushedaround.com/on-a-few-things-you-may-not-know-about-the-hellish-command-key-and-javascript-events/
      if (toCodes("meta").includes(event.code)) {
        keyMapRef.current = {};
      }

      delete keyMapRef.current[event.code];
      updateKeyState();
    },
    [updateKeyState]
  );

  const handleDown = React.useCallback(
    (event) => {
      if (configRef.current.debug) {
        console.log("useKeyState: down", event.code);
      }

      // Ignore events from input accepting elements (inputs etc)
      if (configRef.current.ignoreInputAcceptingElements && isInputAcceptingTarget(event)) {
        if (configRef.current.debug) {
          console.log("useKeyState: Ignoring event from input accepting element:", event.code);
        }
        return;
      }

      // Ignore handled event
      if (event.defaultPrevented && configRef.current.ignoreCapturedEvents) {
        if (configRef.current.debug) {
          console.log("useKeyState: Ignoring captured down event:", event.code);
        }
        return;
      }

      // Capture event if it is part of our rules and hook is configured to do so:
      if (configRef.current.captureEvents) {
        const captureSet = extractCaptureSet(rulesMapRef.current);
        if (captureSet.has(event.code)) {
          event.preventDefault();
        }
      }

      // Handle key repeat
      if (event.repeat && keyMapRef.current[event.code]) {
        if (configRef.current.ignoreRepeatEvents) {
          if (configRef.current.debug) {
            console.log("useKeyState: Ignoring event from repeat key event:", event.code);
          }
        } else {
          // handle it as a key up (drop every other frame, hack)
          handleUp(event);
        }
        return;
      }

      // Handle key that didn't receive a key up event - happens when meta key is down
      if (keyMapRef.current[event.code]) {
        delete keyMapRef.current[event.code];
        updateKeyState();
      }

      keyMapRef.current[event.code] = true;
      updateKeyState();
    },
    [handleUp, updateKeyState]
  );

  // Mark handlers to help debug callback order
  if (configRef.current.debug) {
    handleDown.prototype.debugFlag = configRef.current.debug;
    handleUp.prototype.debugFlag = configRef.current.debug;
    window.keyStateEventEmitter = eventEmitter;
  }

  const handleBlur = React.useCallback(() => {
    if (configRef.current.debug) {
      console.log("useKeyState: clearing keyMap on document blur");
    }
    keyMapRef.current = {};
    updateKeyState();
  }, [updateKeyState]);

  React.useEffect(() => {
    DocumentEventListener.addEventListener("keydown", handleDown, depth);
    DocumentEventListener.addEventListener("keyup", handleUp, depth);
    window.addEventListener("blur", handleBlur);
    return () => {
      DocumentEventListener.removeEventListener("keydown", handleDown);
      DocumentEventListener.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [handleDown, handleUp, handleBlur, depth]);

  return { ...state, keyStateQuery };
};

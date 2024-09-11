import { tabbable } from "tabbable";

// Contain focus

export const getFirstFocusableElement = (el) => {
  return tabbable(el)[0] || el;
};

export const containFocus = (el, event) => {
  if (el && !el.contains(event.target)) {
    event.stopPropagation();
    event.preventDefault();
    getFirstFocusableElement(el).focus();
  }
};

// TODO
// How can we trap focus inside a card since we can have multiple selected cards?
// If multiple selection, block tab. Otherwise contain focus? Implies moving control up one level to editor.
//
// React.useEffect(() => {
//   const cb = containFocus.bind(null, ref.current);
//   window.document.addEventListener("focus", cb, true);
//   return () => {
//     window.document.removeEventListener("focus", cb, true);
//   };
// }, [ref]);

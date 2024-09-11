/**
 * Debounce function.
 *
 * Debouncing enforces that a function not be called again until
 * a certain amount of time has passed without it being called. As
 * in "execute this function only if 100 milliseconds have passed
 * without it being called."
 */
export default function debounce(fn, { delay = 500, edges } = {}) {
  let timeout = null;
  let nCalls = 0;

  return (...args) => {
    nCalls += 1;
    if (edges && nCalls === 1) {
      fn(...args);
    }
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (!edges || nCalls > 1) {
        fn(...args);
      }
      timeout = null;
      nCalls = 0;
    }, delay);
  };
}

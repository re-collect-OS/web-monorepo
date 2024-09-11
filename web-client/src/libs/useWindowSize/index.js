import { useReducer, useEffect } from "react";
import { debounce } from "js-shared-lib";

const captureDocumentSize = () => {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  };
};

const dimensionsReducer = (state, action) => {
  switch (action.type) {
    case "update":
      return {
        ...state,
        ...action.newDimensions,
      };
  }
  return state;
};

const captureDimensions = () => ({
  windowSize: captureDocumentSize(),
});

export const useWindowSize = (isTouchDevice) => {
  const [state, dispatch] = useReducer(dimensionsReducer, {}, captureDimensions);

  useEffect(() => {
    const handler = () => {
      const newDimensions = captureDimensions();
      dispatch({ type: "update", newDimensions });
    };
    const onResize = isTouchDevice ? handler : debounce(handler, { delay: 250 });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isTouchDevice]);

  return state;
};

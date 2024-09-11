import React, { useRef, useState, useEffect, useImperativeHandle, useCallback } from "react";
import PropTypes from "prop-types";
import cn from "classnames";

import { CANVAS_GRID_SIZE } from "../../config";

import styles from "./CardStack.module.css";

const CardStacks = React.forwardRef(({ spatialIndex }, ref) => {
  const cardStackRefs = useRef({});
  const [stacks, setStacks] = useState(spatialIndex.stacks);

  useImperativeHandle(ref, () => ({
    setPosition: (index, rect) => {
      const stackRef = cardStackRefs.current[index];
      if (!stackRef) {
        return;
      }

      stackRef.setPosition(rect);
    },
  }));

  // Track mount state
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // TODO add listener instead!
    spatialIndex.onStackIndexUpdate = ({ stacks }) => {
      if (mountedRef.current) {
        setStacks(stacks);
      }
    };
  }, [spatialIndex]);

  return (
    <>
      {stacks.map((ids, index) => {
        return (
          <CardStack
            ref={(element) => (cardStackRefs.current[index] = element)}
            key={index}
            ids={ids}
            spatialIndex={spatialIndex}
          />
        );
      })}
    </>
  );
});

CardStacks.propTypes = {
  spatialIndex: PropTypes.object.isRequired,
};

const CardStack = React.forwardRef(({ ids, spatialIndex, className, ...rest }, ref) => {
  const containerRef = useRef();
  const setStyles = useCallback(
    ({ x, y, width, height }) => {
      Object.assign(containerRef.current.style, {
        transform: `translate(${Math.round(x - CANVAS_GRID_SIZE)}px, ${Math.round(y - CANVAS_GRID_SIZE)}px)`,
        ...(width ? { width: `${width + 2 * CANVAS_GRID_SIZE}px` } : {}),
        ...(height ? { height: `${height + 2 * CANVAS_GRID_SIZE}px` } : {}),
      });
    },
    [containerRef]
  );

  const _setStyles = useRef(null);
  _setStyles.current = setStyles;

  useImperativeHandle(ref, () => ({
    setPosition: (rect) => _setStyles.current(rect), // avoid capturing original setStyles - why?
    el: containerRef.current,
  }));

  // Set initial position
  useEffect(() => {
    const rect = spatialIndex.getCommonRect(ids);
    _setStyles.current(rect);
  }, [spatialIndex, ids]);

  return <div ref={containerRef} className={cn(styles.CardStack, className)} {...rest} />;
});

CardStack.propTypes = {
  ids: PropTypes.array.isRequired,
  spatialIndex: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default CardStacks;

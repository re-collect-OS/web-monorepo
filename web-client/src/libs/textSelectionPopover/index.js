// https://github.com/juliankrispel/react-text-selection-popover 1.2.0
import React from "react";
import { createPortal } from "react-dom";
import { useTextSelection } from "../useTextSelection";

function Portal({ children, mount }) {
  return createPortal(children, mount || document.body);
}

export function Popover(props) {
  const { render: Render, targetRef, target } = props;
  const textSelectionProps = useTextSelection({ targetRef, target });

  return (
    <Portal mount={props.mount}>
      <Render {...textSelectionProps} />
    </Portal>
  );
}

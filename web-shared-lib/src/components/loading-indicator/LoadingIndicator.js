import React from "react";
import cn from "classnames";

import styles from "./LoadingIndicator.module.css";

export default function LoadingIndicator({ inline, className }) {
  if (inline) {
    return (
      <span className={cn(styles.LoadingIndicator, styles.isInline, className)}>
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    );
  }

  return (
    <div className={cn(styles.LoadingIndicator, className)}>
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </div>
  );
}

import React from "react";
import cn from "classnames";
import { SmallCrossIcon, IconButton } from "web-shared-lib";

import styles from "./BaseIntegration.module.css";

export default function BaseIntegration({ className, icon, title, children, onCollapse }) {
  return (
    <div className={cn(styles.BaseIntegration, className)}>
      <div className={styles.header}>
        <div className={styles.icon}>{icon}</div>
        <div className={styles.titleWrapper}>
          <div className={styles.title}>{title}</div>
        </div>
        <IconButton icon={<SmallCrossIcon />} title={"Dismiss"} onClick={onCollapse} />
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

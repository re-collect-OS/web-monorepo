import React, { useEffect } from "react";

import PageHeader from "../common/page-header";
import { ChangeLog } from "../common/change-log";

import styles from "./Notifications.module.css";

export default function Notifications({ onMount, ...rest }) {
  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, [onMount]);
  return (
    <div className={styles.Notifications}>
      <PageHeader title={"Notifications"} description={"Catch up on what you've missed."} />
      <ChangeLog className={styles.feed} {...rest} />
    </div>
  );
}

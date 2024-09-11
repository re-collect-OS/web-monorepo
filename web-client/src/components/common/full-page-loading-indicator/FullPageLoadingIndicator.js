import React from "react";
import { LoadingIndicator } from "web-shared-lib";

import styles from "./FullPageLoadingIndicator.module.css";

function FullPageLoadingIndicator() {
  return (
    <div className={styles.FullPageLoadingIndicator}>
      <LoadingIndicator />
    </div>
  );
}

export default FullPageLoadingIndicator;

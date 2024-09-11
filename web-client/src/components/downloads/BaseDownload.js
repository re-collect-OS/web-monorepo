import React from "react";

import { IconButton, DownloadIcon } from "web-shared-lib";

import styles from "./BaseDownload.module.css";

export default function BaseDownload({ title, children, onDownloadClick, isNew }) {
  return (
    <div className={styles.BaseDownload}>
      <div className={styles.titleWrapper}>
        <div className={styles.title}>
          <>
            {title}
            {isNew && <div className={styles.isNewIndicator}>NEW</div>}
          </>
        </div>
        <div className={styles.description}>{children}</div>
      </div>
      <div className={styles.nav}>
        <IconButton
          icon={<DownloadIcon />}
          title={"Download"}
          label={"Download"}
          variant={"violet"}
          onClick={onDownloadClick}
        />
      </div>
    </div>
  );
}

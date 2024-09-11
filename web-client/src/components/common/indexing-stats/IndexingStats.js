import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { shallow } from "zustand/shallow";
import { Link } from "react-router-dom";
import cn from "classnames";
import { SmallCrossIcon } from "web-shared-lib";

import { useStore } from "../../../store";

import styles from "./IndexingStats.module.css";

const selector = (state) => ({
  doSync: state.doUserIndexingStatsLoad,
  stats: state.userData.indexingStats,
});

const INDEX_CONTENT_PROVIDED = "content provided";
const INDEX_CONTENT_RETRIEVAL_REQUIRED = "content retrieval required";
const INDEX_CONTENT_RETRIEVAL_COMPLETE = "content retrieval complete";
const INDEX_CONTENT_RETRIEVAL_FAILED = "content retrieval failed";
const INDEX_CONTENT_RETRIEVAL_IN_PROGRESS = "content retrieval in progress";
const INDEX_PROCESSING_REQUIRED = "processing required";
const INDEX_PROCESSING_COMPLETE = "processing complete";
const INDEX_PROCESSING_FAILED = "processing failed";
const INDEX_PROCESSING_IN_PROGRESS = "processing in progress";
const INDEX_REMOVING = "removing";

const INDEX_IN_PROGRESS_STATES = [
  INDEX_CONTENT_RETRIEVAL_COMPLETE,
  INDEX_CONTENT_RETRIEVAL_IN_PROGRESS,
  INDEX_CONTENT_RETRIEVAL_REQUIRED,
  INDEX_PROCESSING_REQUIRED,
  INDEX_PROCESSING_IN_PROGRESS,
  INDEX_CONTENT_PROVIDED,
];
const INDEX_FAILED_STATES = [INDEX_PROCESSING_FAILED, INDEX_CONTENT_RETRIEVAL_FAILED];
const INDEX_SUCCESS_STATES = [INDEX_PROCESSING_COMPLETE];
const INDEX_FINAL_STATES = [...INDEX_SUCCESS_STATES, ...INDEX_FAILED_STATES];

let tid;

export default function IndexingStats({ onClose, onComplete, forceFreshAccountStatus = false }) {
  const { stats, doSync } = useStore(selector, shallow);

  useEffect(() => {
    doSync();
    tid = setInterval(doSync, 25000);
    return () => {
      if (tid) {
        clearInterval(tid);
      }
    };
  }, [doSync]);

  const keys = Object.keys(stats);
  const removed = stats[INDEX_REMOVING] || 0;
  const total = keys.reduce((acc, key) => acc + stats[key], 0) - removed || 0;
  const finalized = keys.reduce((acc, key) => acc + (INDEX_FINAL_STATES.includes(key) ? stats[key] : 0), 0) || 0;
  const working = keys.reduce((acc, key) => acc + (INDEX_IN_PROGRESS_STATES.includes(key) ? stats[key] : 0), 0) || 0;
  let workingProgress = total ? Math.min(100, Math.round((working / total) * 100)) : 0;
  let finalizedProgress = total ? Math.min(100, Math.round((finalized / total) * 100)) : 0;

  if (forceFreshAccountStatus) {
    finalizedProgress = 42;
    workingProgress = 60;
  }

  useEffect(() => {
    if (finalizedProgress >= 100) {
      clearInterval(tid);
      onComplete();
    }
  }, [finalizedProgress, onComplete]);

  let title;
  const aboutDone = finalizedProgress >= 95;

  if (total || forceFreshAccountStatus) {
    if (aboutDone) {
      title = "Your account is ready to use";
    } else {
      title = "We’re busy processing your data...";
    }
  } else {
    title = (
      <>
        Waiting for <Link to={"/welcome"}>more data...</Link>
      </>
    );
  }

  return (
    <div className={styles.IndexingStats}>
      <div className={styles.header}>
        <div className={styles.label}>{title}</div>
        {onClose && aboutDone && (
          <button className={styles.dismissBtn} title="Dismiss" onClick={onClose}>
            <SmallCrossIcon width={8} />
          </button>
        )}
      </div>
      <div className={styles.graph}>
        <div className={styles.working} style={{ width: `${workingProgress}%` }} />
        <div className={styles.finalized} style={{ width: `${finalizedProgress}%` }} />
        <div className={cn(styles.stat, { [styles.isFinished]: finalizedProgress >= 98 })}>{finalizedProgress}%</div>
      </div>
    </div>
  );
}

IndexingStats.propTypes = {
  onClose: PropTypes.func,
  onComplete: PropTypes.func.isRequired,
  forceFreshAccountStatus: PropTypes.bool,
};

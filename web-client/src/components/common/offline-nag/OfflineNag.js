import React, { useState, useEffect } from "react";
import { NoConnectionIcon, Dialog } from "web-shared-lib";
import { shallow } from "zustand/shallow";

import { useStore } from "../../../store";
import { usePrevious } from "../../../libs/hooksLib";

import styles from "./OfflineNag.module.css";

const selector = (state) => ({
  doDocumentsScheduleSync: state.doDocumentsScheduleSync,
});

const OfflineNag = React.forwardRef((_, ref) => {
  const [onLine, setOnline] = useState(window.navigator.onLine);
  const prevOnLine = usePrevious(onLine);
  const { doDocumentsScheduleSync } = useStore(selector, shallow);

  useEffect(() => {
    const setOnlineStatus = () => setOnline(window.navigator.onLine);
    window.addEventListener("online", setOnlineStatus);
    window.addEventListener("offline", setOnlineStatus);
    return () => {
      window.removeEventListener("online", setOnlineStatus);
      window.removeEventListener("offline", setOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (prevOnLine === false && onLine) {
      doDocumentsScheduleSync();
    }
  }, [onLine, prevOnLine, doDocumentsScheduleSync]);

  if (onLine) {
    return null;
  }

  return (
    <Dialog.Root open={open} modal={false}>
      <Dialog.Portal>
        <Dialog.Content ref={ref} className={styles.content}>
          <div className={styles.icon}>
            <NoConnectionIcon />
          </div>
          <div className={styles.label}>Cannot sync ideas. Please check your internet connection.</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

export default OfflineNag;

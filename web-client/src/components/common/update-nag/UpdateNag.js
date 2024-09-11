import React, { useState, useEffect, useRef } from "react";
import { IconButton, Dialog } from "web-shared-lib";
import { shallow } from "zustand/shallow";

import { getDeployRef } from "../../../libs/versionLib";
import { DEBUG, APP_STAGE, APP_ENV_DEVELOPMENT } from "../../../config";

import { useStore } from "../../../store";

import styles from "./UpdateNag.module.css";

const _poll = ({ startVersion, delay, resolve, reject }) => {
  getDeployRef()
    .then((version) => {
      if (startVersion === version) {
        setTimeout(() => _poll({ startVersion, delay, resolve, reject }), delay);
      } else {
        resolve(version);
      }
    })
    .catch((error) => {
      reject(error);
    });
};

function pollForUpdate({ startVersion, delay = 10 * 60 * 1000 }) {
  return new Promise((resolve, reject) => {
    _poll({ startVersion, delay, resolve, reject });
  });
}

const selector = (state) => ({
  doUpdateSetVersion: state.doUpdateSetVersion,
});

const UpdateNag = React.forwardRef((_, ref) => {
  const [open, setOpen] = useState(false);
  const [didDismiss, setDidDismiss] = useState(false);
  const version = useRef(null);
  const { doUpdateSetVersion } = useStore(selector, shallow);

  // Sync initial ref on load
  useEffect(() => {
    if (APP_ENV_DEVELOPMENT || APP_STAGE !== "prod") {
      return;
    }

    getDeployRef()
      .then((v) => {
        version.current = v;
        // Update store
        doUpdateSetVersion(v);
      })
      .catch((error) => {
        if (DEBUG) {
          console.warn(error);
        }
      })
      .finally(() => {
        if (version.current) {
          if (DEBUG) {
            console.log("Polling for update", version.current);
          }
          pollForUpdate({ startVersion: version.current })
            .then(() => {
              setOpen(true);
            })
            .catch((error) => {
              if (DEBUG) {
                console.warn(error);
              }
            });
        } else {
          if (DEBUG) {
            console.log("Skipping version poll. Given version:", version.current);
          }
        }
      });
  }, [doUpdateSetVersion]);

  if (!open || didDismiss) {
    return null;
  }

  return (
    <Dialog.Root open={open} modal={false}>
      <Dialog.Portal>
        <Dialog.Content ref={ref} className={styles.content}>
          <div className={styles.label}>
            A new version of re:collect is available. Please refresh your page to update.
          </div>
          <div className={styles.nav}>
            <IconButton
              className={styles.button}
              type={"button"}
              variant={"violet"}
              label={"Refresh"}
              title={"Refresh"}
              size={"large"}
              full
              onClick={() => location.reload()}
            />
            <IconButton
              className={styles.button}
              type={"button"}
              label={"Not now"}
              title={"Not now"}
              size={"large"}
              full
              onClick={() => setDidDismiss(true)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

export default UpdateNag;

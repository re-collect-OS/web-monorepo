import React, { useState, useEffect, useRef } from "react";
import { IconButton, Dialog } from "web-shared-lib";
import { shallow } from "zustand/shallow";
import { getISOTimestamp } from "js-shared-lib";

import { useSessionStorage } from "../../../libs/hooksLib";
import { useStore } from "../../../store";
import {
  canInstallExtension,
  openChromeExtensionInstaller,
  pingChromeExtension,
  pollForChromeExtension,
  extensionId,
} from "../../../libs/chromeExtensionLib";

import styles from "./ExtensionNag.module.css";

const selector = (state) => ({
  doAuthSyncLoginWithExtension: state.doAuthSyncLoginWithExtension,
});

const ExtensionNag = React.forwardRef((_, ref) => {
  const [open, setOpen] = useState(false);
  const [dismissedOn, setDismissedOn] = useSessionStorage("extensionnag_dismissed_on");
  const { doAuthSyncLoginWithExtension } = useStore(selector, shallow);
  const didDismiss = !!dismissedOn;

  const isMounted = useRef(true);
  useEffect(() => () => (isMounted.current = false), []);

  useEffect(() => {
    if (!canInstallExtension() || didDismiss) {
      return;
    }
    // Nag if we don't find the extension
    pingChromeExtension(extensionId).catch(() => {
      if (isMounted.current) setOpen(true);
    });
  }, [didDismiss]);

  if (!open || didDismiss) {
    return null;
  }

  return (
    <Dialog.Root open={open} modal={false}>
      <Dialog.Portal>
        <Dialog.Content ref={ref} className={styles.content}>
          <div className={styles.label}>Get the most of out re:collect by installing the Chrome extension.</div>
          <div className={styles.nav}>
            <IconButton
              className={styles.button}
              type={"button"}
              variant={"violet"}
              label={"Install extension"}
              title={"Install extension"}
              size={"large"}
              full
              onClick={() => {
                openChromeExtensionInstaller(extensionId);
                pollForChromeExtension({ extensionId })
                  .then(() => {
                    doAuthSyncLoginWithExtension()
                      .then(() => {
                        setOpen(false);
                      })
                      .catch(({ code }) => {
                        const errorMsg =
                          code === "Could not find extension"
                            ? "Failed to get current session. Please try again."
                            : "Failed to communicate with extension. Please try again.";
                        console.warn("ExtensionNag: could not find extension:", errorMsg);
                      });
                  })
                  .catch((error) => {
                    console.warn("ExtensionNag: could not find extension:", error.message);
                  });
              }}
            />
            <IconButton
              className={styles.button}
              type={"button"}
              label={"Not now"}
              title={"Not now"}
              size={"large"}
              full
              onClick={() => setDismissedOn(getISOTimestamp())}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

export default ExtensionNag;

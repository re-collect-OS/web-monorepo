import React, { useState, useEffect } from "react";
import { IconButton, Dialog } from "web-shared-lib";
import { canConnectToAmplitude } from "js-shared-lib";

import { APP_ENV_DEVELOPMENT } from "../../../config";

import ShieldSrc from "./shield.svg";

import styles from "./AmplitudeNag.module.css";

const SUPPORT_GUIDE_URL =
  "https://www.notion.so/re-collect/re-collect-Help-and-Support-Guide-acb140d8b0fa42ddbbe21d96fa3bfa75?pvs=4#92e7751741894c698debb315c602593d";

const AmplitudeNag = React.forwardRef((_, ref) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function runAsync() {
      // Disable for dev builds
      if (APP_ENV_DEVELOPMENT) return;
      // const isBrave = (navigator.brave && (await navigator.brave.isBrave())) || false;
      // if (!isBrave) return;

      const canConnect = await canConnectToAmplitude();
      if (canConnect) return;

      setOpen(true);
    }

    runAsync();
  }, []);

  if (!open) {
    return null;
  }

  return (
    <Dialog.Root open={open} modal={false}>
      <Dialog.Portal>
        <Dialog.Content ref={ref} className={styles.content}>
          <div className={styles.labelIconWrapper}>
            <div className={styles.icon}>
              <img src={ShieldSrc} alt="adblock shield icon" />
            </div>
            <div className={styles.label}>
              Your ad blocker is interfering with our service. Please try{" "}
              <a href={SUPPORT_GUIDE_URL} target="_blank" rel="noreferrer">
                disabling it for this page only
              </a>
              .
            </div>
          </div>
          <div className={styles.nav}>
            <IconButton
              className={styles.button}
              type={"button"}
              label={"Learn how"}
              title={"Learn how"}
              size={"large"}
              full
              onClick={() => window.open(SUPPORT_GUIDE_URL, "_blank")}
            />
            <IconButton
              className={styles.button}
              type={"button"}
              label={"Dismiss"}
              title={"Dismiss"}
              size={"large"}
              full
              onClick={() => setOpen(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

export default AmplitudeNag;

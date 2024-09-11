import React, { useState, useEffect } from "react";
import { IconButton, Dialog } from "web-shared-lib";
import { canConnectToAmplitude } from "js-shared-lib";

import styles from "./BraveNag.module.css";
import BraveShieldSrc from "./brave.svg";

const BraveNag = React.forwardRef((_, ref) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function runAsync() {
      const isBrave = (navigator.brave && (await navigator.brave.isBrave())) || false;
      if (!isBrave) return;

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
          <div className={styles.icon}>
            <img src={BraveShieldSrc} alt="Brave browser logo" />
          </div>
          <div className={styles.label}>
            The Brave shield is interfering with our service. Please try{" "}
            <a
              href="https://support.brave.com/hc/en-us/articles/360022806212-How-do-I-use-Shields-while-browsing-"
              target="_blank"
              rel="noreferrer"
            >
              lowering the shield
            </a>
            .
          </div>
          <div className={styles.nav}>
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

export default BraveNag;

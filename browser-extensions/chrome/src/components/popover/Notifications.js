import React, { useEffect } from "react";
import cn from "classnames";
import PropTypes from "prop-types";
import { IconButton, SmallCrossIcon, Toolbar, SmallChevronLeftIcon } from "web-shared-lib";
import { shallow } from "zustand/shallow";

import config from "../../config";

import { useStore } from "../../store";

import styles from "./Notifications.module.css";

const selector = (state) => ({
  lastAppVersion: state.version.lastAppVersion,
  doVersionMarkSeen: state.doVersionMarkSeen,
});

function Notifications({ className, onGoBack, onClose }) {
  const { lastAppVersion, doVersionMarkSeen } = useStore(selector, shallow);

  useEffect(() => {
    doVersionMarkSeen();
  }, [doVersionMarkSeen]);

  return (
    <div className={cn(className, styles.Notifications)}>
      <Toolbar.Root className={styles.navBar} aria-label="Navigation">
        <div className={styles.title}>Notifications</div>
        <Toolbar.Button asChild>
          <IconButton
            type={"button"}
            title={"Go back"}
            label={"Back"}
            icon={<SmallChevronLeftIcon />}
            onClick={onGoBack}
          />
        </Toolbar.Button>
        <div className={styles.flex} />
        <Toolbar.Button asChild>
          <IconButton type={"button"} title={"Dismiss"} icon={<SmallCrossIcon />} onClick={onClose} />
        </Toolbar.Button>
      </Toolbar.Root>
      <iframe src={`${config.APP_URL}/changelog?lastVersion=${lastAppVersion}`} className={styles.iframe}></iframe>
    </div>
  );
}

Notifications.propTypes = {
  className: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onGoBack: PropTypes.func.isRequired,
};

export default Notifications;

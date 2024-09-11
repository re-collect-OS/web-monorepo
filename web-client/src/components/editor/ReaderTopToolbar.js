import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { IconButton, CrossIcon, Toolbar, ArticleIcon } from "web-shared-lib";

import { useKeyState } from "../../libs/useKeyState";

import styles from "./ReaderTopToolbar.module.css";

export default function ReaderTopToolbar({ title, onClose }) {
  const { escKey } = useKeyState(
    {
      escKey: "esc",
    },
    {
      ignoreRepeatEvents: true,
      captureEvents: false,
    }
  );

  useEffect(() => {
    if (escKey.down) {
      onClose();
    }
  }, [escKey, onClose]);

  return (
    <Toolbar.Root className={styles.Toolbar} aria-label="Navigation">
      <div className={styles.leftCol}>
        <Toolbar.Button asChild>
          <IconButton icon={<ArticleIcon />} label={title} title={title} onClose={onClose} closeTitle={"Dismiss"} />
        </Toolbar.Button>
      </div>
      <div className={styles.rightCol}>
        <Toolbar.Button asChild>
          <IconButton icon={<CrossIcon />} title={"Dismiss"} onClick={onClose} />
        </Toolbar.Button>
      </div>
    </Toolbar.Root>
  );
}

ReaderTopToolbar.propTypes = {
  onClose: PropTypes.func.isRequired,
  onNext: PropTypes.func,
  onPrev: PropTypes.func,
};

import React from "react";
import PropTypes from "prop-types";
import { useHistory } from "react-router-dom";
import { IconButton, PlaygroundIcon, Toolbar } from "web-shared-lib";
import { isValidIsoDate } from "js-shared-lib";

import styles from "./TopToolbar.module.css";

export default function TopToolbar({ documentTitle, isArchived, isDraftTitle, isTrashed, onRenameClick }) {
  const history = useHistory();

  const onClose = () => {
    if (isTrashed) {
      history.push("/playgrounds/trash");
    } else if (isArchived) {
      history.push("/playgrounds/archive");
    } else if (isDraftTitle) {
      history.push("/playgrounds/drafts");
    } else {
      history.push("/playgrounds");
    }
  };
  const closeTitle = isArchived ? "Go back to archived Playgrounds" : "Go back to Playgrounds";
  const title = isValidIsoDate(documentTitle) ? "Draft Playground" : documentTitle;

  return (
    <Toolbar.Root className={styles.Toolbar} aria-label="Navigation">
      <div className={styles.leftCol}>
        <>
          <Toolbar.Button asChild>
            <IconButton
              icon={<PlaygroundIcon />}
              label={title}
              title={title}
              onClick={() => {
                onRenameClick();
              }}
              onClose={onClose}
              closeTitle={closeTitle}
            />
          </Toolbar.Button>
        </>
      </div>
    </Toolbar.Root>
  );
}

TopToolbar.propTypes = {
  documentTitle: PropTypes.string.isRequired,
  isArchived: PropTypes.bool.isRequired,
  isDraftTitle: PropTypes.bool.isRequired,
  isTrashed: PropTypes.bool.isRequired,
  isEditingCards: PropTypes.bool,
};

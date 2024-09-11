import React from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import { IconButton, RecallIcon, TabIcon, Toolbar, LoadingIndicator } from "web-shared-lib";

export const PAGE_NAV_TAB = "page";
export const RECALL_NAV_TAB = "recall";

import styles from "./TabBar.module.css";

function TabBar({ className, value, isRecalling, onChange }) {
  return (
    <Toolbar.Root className={cn(className, styles.TabBar)} aria-label="Navigation">
      <Toolbar.Button asChild>
        <IconButton
          className={cn(styles.tabBtn, { [styles.isActive]: value === PAGE_NAV_TAB })}
          type={"button"}
          title={"Current Tab"}
          label={"Current Tab"}
          icon={<TabIcon />}
          onClick={() => onChange(PAGE_NAV_TAB)}
          full
        />
      </Toolbar.Button>
      <Toolbar.Separator className={styles.separator} />
      <Toolbar.Button asChild>
        <IconButton
          className={cn(styles.tabBtn, { [styles.isActive]: value === RECALL_NAV_TAB })}
          type={"button"}
          title={"Recall"}
          icon={<RecallIcon />}
          onClick={() => onChange(RECALL_NAV_TAB)}
          full
        >
          {isRecalling ? (
            <span>
              Recalling
              <LoadingIndicator inline />
            </span>
          ) : (
            "Recall"
          )}
        </IconButton>
      </Toolbar.Button>
    </Toolbar.Root>
  );
}

TabBar.propTypes = {
  className: PropTypes.string,
  isRecalling: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOf([PAGE_NAV_TAB, RECALL_NAV_TAB]).isRequired,
};

export default TabBar;

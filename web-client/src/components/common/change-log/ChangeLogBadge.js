import React from "react";
import PropTypes from "prop-types";
import cn from "classnames";

import styles from "./ChangeLogBadge.module.css";

const ChangeLogBadge = React.forwardRef(({ version, className, onClick, unread = false }, ref) => {
  return (
    <div ref={ref} className={cn(className, styles.ChangeLogBadge)}>
      <div className={styles.version}>
        {version}
        {unread ? " (new)" : ""}
      </div>
      <a href={"#"} onClick={onClick} className={styles.link}>
        Release notes
      </a>
    </div>
  );
});

ChangeLogBadge.propTypes = {
  className: PropTypes.string,
  onClick: PropTypes.func,
  unread: PropTypes.bool,
  version: PropTypes.string.isRequired,
};

ChangeLogBadge.displayName = "ChangeLogBadge";

export default ChangeLogBadge;

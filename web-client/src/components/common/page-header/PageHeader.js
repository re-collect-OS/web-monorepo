import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";

import styles from "./PageHeader.module.css";

const PageHeader = ({ title, description, children, size = "large", ...rest }) => {
  return (
    <div className={cn(styles.PageHeader, { [styles.small]: size === "small" })} {...rest}>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {children && <div className={styles.description}>{children}</div>}
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  size: PropTypes.oneOf(["small", "large"]),
};

export default PageHeader;

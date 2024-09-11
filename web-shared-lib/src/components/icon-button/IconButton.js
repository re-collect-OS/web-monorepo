import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";

import { SmallCrossIcon } from "../icons";

import styles from "./IconButton.module.css";

const IconButton = React.forwardRef(
  (
    {
      as: Component = "button",
      className,
      variant = "grey",
      onClick,
      onClose,
      icon,
      title,
      closeTitle = "Dismiss",
      label,
      size = "default",
      full = false,
      children,
      ...props
    },
    ref
  ) => {
    const isTab = !!onClose;
    const classnames = cn(className, styles.IconButton, {
      [styles.isDark]: variant === "dark",
      [styles.isDestructive]: variant === "destructive", // TODO destructive should be a prop not a variant?
      [styles.isGrey]: ["grey", "destructive"].includes(variant),
      [styles.isViolet]: variant === "violet",
      [styles.isRose]: variant === "rose",
      [styles.isMedium]: size === "medium",
      [styles.isLarge]: size === "large",
      [styles.isFull]: !!full,
      [styles.hasNoIcon]: !icon,
      [styles.hasNoLabel]: !label && !children,
      [styles.isTabWrapper]: isTab,
    });

    if (isTab) {
      return (
        <div className={styles.tabWrapper}>
          <Component ref={ref} className={classnames} title={title} onClick={onClick} {...props}>
            {icon && <div className={styles.icon}>{icon}</div>}
            {label && <div className={styles.label}>{label}</div>}
            {!label && children && <div className={styles.label}>{children}</div>}
          </Component>
          <div className={styles.closeButtonWrapper}>
            <button
              className={cn(styles.closeButton, { [styles.isDark]: variant === "dark" })}
              title={closeTitle}
              onClick={onClose}
            >
              <SmallCrossIcon width={8} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <Component ref={ref} className={classnames} title={title} onClick={onClick} {...props}>
        {icon && <div className={styles.icon}>{icon}</div>}
        {label && <div className={styles.label}>{label}</div>}
        {!label && children && <div className={styles.label}>{children}</div>}
      </Component>
    );
  }
);

IconButton.propTypes = {
  as: PropTypes.elementType,
  children: PropTypes.node,
  className: PropTypes.string,
  closeTitle: PropTypes.string,
  full: PropTypes.bool,
  icon: PropTypes.element,
  label: PropTypes.string,
  onClick: PropTypes.func,
  onClose: PropTypes.func,
  size: PropTypes.oneOf(["default", "medium", "large"]),
  title: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["default", "dark", "destructive", "grey", "violet", "rose"]),
};

export default IconButton;

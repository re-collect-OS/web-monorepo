import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";

import styles from "./BaseCard.module.css";

export default function BaseCard({
  children,
  childCard,
  className,
  header,
  footer,
  isSelected,
  isEditing,
  onClick,
  ...rest
}) {
  let _childCard = childCard;
  if (childCard) {
    _childCard = React.cloneElement(childCard, { isChildCard: true });
  }

  return (
    <div
      className={cn(styles.BaseCard, className, { [styles.isSelected]: isSelected, [styles.isEditing]: isEditing })}
      onClick={onClick}
      {...rest}
    >
      {!!header && header}
      <div className={styles.body}>{children}</div>
      {!!_childCard && <div className={styles.childCard}>{_childCard}</div>}
      {!!footer && footer}
    </div>
  );
}

BaseCard.propTypes = {
  childCard: PropTypes.node,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  className: PropTypes.string,
  footer: PropTypes.node,
  header: PropTypes.node,
  isEditing: PropTypes.bool,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
};

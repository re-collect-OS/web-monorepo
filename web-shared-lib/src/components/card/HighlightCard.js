import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";

import BaseCard from "./BaseCard";

import styles from "./HighlightCard.module.css";

export default function HighlightCard({ className, isChildCard, ...rest }) {
  return <BaseCard className={cn(className, styles.HighlightCard, { [styles.isChildCard]: isChildCard })} {...rest} />;
}

HighlightCard.propTypes = {
  className: PropTypes.string,
  isChildCard: PropTypes.bool,
};

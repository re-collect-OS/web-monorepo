import React from "react";
import cn from "classnames";

import BaseCard from "./BaseCard";

import styles from "./NoteCard.module.css";

export default function NoteCard({ className, ...rest }) {
  return <BaseCard className={cn(className, styles.NoteCard)} {...rest} />;
}

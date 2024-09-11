import React from "react";
import cn from "classnames";
import { LoadingIndicator } from "web-shared-lib";

import styles from "./Widget.module.css";

export function WidgetNavButton({ icon, title, onClick, ...rest }) {
  return (
    <button className={styles.navButton} title={title} onClick={onClick} {...rest}>
      {icon}
    </button>
  );
}

export function WidgetHeader({ title, children }) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>{title}</div>
      <div className={styles.nav}>{children}</div>
    </div>
  );
}

export function WidgetInfoHeader({ title, children }) {
  return (
    <div className={styles.infoHeader}>
      <div className={styles.infoHeaderTitle}>{title}</div>
      <div className={styles.infoHeaderDescription}>{children}</div>
    </div>
  );
}

export function WidgetSectionHeader({ label }) {
  return <div className={styles.sectionHeader}>{label}</div>;
}

export function WidgetLoadingIndicator() {
  return <LoadingIndicator className={styles.loadingIndicator} />;
}

export function WidgetRow({ as: Component = "button", className, children, ...rest }) {
  return (
    <Component className={cn(styles.row, className)} {...rest}>
      {children}
    </Component>
  );
}

export function WidgetIconRow({ className, label, icon, ...rest }) {
  return (
    <WidgetRow className={cn(className, styles.iconRow)} {...rest}>
      <div className={styles.iconRowLabel}>{label}</div>
      <div className={styles.iconRowIcon}>{icon}</div>
    </WidgetRow>
  );
}

export default function Widget({ className, children, ...rest }) {
  return (
    <div className={cn(styles.Widget, className)} {...rest}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

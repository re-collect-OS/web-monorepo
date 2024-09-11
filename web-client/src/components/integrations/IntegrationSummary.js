import React from "react";

import styles from "./IntegrationSummary.module.css";

export default function IntegrationSummary({ icon, title, description, button }) {
  return (
    <div className={styles.IntegrationSummary}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.titleWrapper}>
        <div className={styles.title}>{title}</div>
        <div className={styles.description}>{description}</div>
      </div>
      <div className={styles.nav}>{button}</div>
    </div>
  );
}

import React from "react";
import { Logo } from "web-shared-lib";

import styles from "./Deactivated.module.css";

function Deactivated() {
  const logo = <Logo height={36} className={styles.logo} />;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {logo}
      <div className={styles.content}>
        <h1>Your account has been deactivated</h1>
        <p>
          Due to inactivity, your account has been deactivated. If you'd like to restore your account please{" "}
          <a href="mailto:hello@re-collect.ai">reach out</a>.
        </p>
      </div>
    </div>
  );
}

export default Deactivated;

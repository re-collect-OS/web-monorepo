import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";

import styles from "./Echo.module.css";

function Echo() {
  const [accessToken, setAccessToken] = useState();
  useEffect(() => {
    Auth.currentSession().then((session) => {
      setAccessToken(session.getAccessToken().getJwtToken());
    });
  }, []);

  return (
    <div className={styles.Echo}>
      <div className={styles.code}>
        <div>
          <strong>Accept</strong>: application/json, text/plain, */*
        </div>
        <div>
          <strong>Authorization</strong>: Bearer {accessToken}
        </div>
      </div>
    </div>
  );
}

export default Echo;

import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { shallow } from "zustand/shallow";
import { DoorEnterIcon, IconButton, Logo } from "web-shared-lib";

import { useStore } from "../../store";
import { events, analyticsService } from "../../libs/analyticsLib";

import styles from "./UnauthenticatedUI.module.css";

const selector = (state) => ({
  errorMsg: state.user.errorMsg,
});

function UnauthenticatedUI({ onLaunchApp }) {
  const { errorMsg } = useStore(selector, shallow);

  useEffect(() => {
    analyticsService.logEvent(events.popupNoUser({ error: errorMsg }));
  }, [errorMsg]);

  return (
    <div className={styles.UnauthenticatedUI}>
      <form
        className={styles.loginForm}
        onSubmit={() => {
          onLaunchApp();
        }}
      >
        <div>
          <Logo height={36} />
          <p>You're signed out. Launch the re:collect web app to continue:</p>
        </div>
        <IconButton
          className={styles.signInButton}
          icon={<DoorEnterIcon />}
          type="submit"
          size="large"
          variant="violet"
          label={"Launch re:collect to Log in"}
          title="Launch re:collect to Log in"
          full
        />
      </form>
    </div>
  );
}

UnauthenticatedUI.propTypes = {
  onLaunchApp: PropTypes.func.isRequired,
};

export default UnauthenticatedUI;

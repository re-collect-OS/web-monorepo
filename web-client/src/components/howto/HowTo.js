import React from "react";
import { Logo, IconButton } from "web-shared-lib";

import { shallow } from "zustand/shallow";
import { useHistory, Link } from "react-router-dom";

import { events, analyticsService } from "../../libs/analyticsLib";
import { useStore } from "../../store";

import apiLib from "../../libs/apiLib";
const { USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING } = apiLib;

import styles from "./HowTo.module.css";

const selector = (state) => ({
  doSetAccountSetting: state.doSetAccountSetting,
  hasCompletedProductOnboarding:
    !window.forceFreshAccountStatus && !!state.user.accountSettings[USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING],
});

const loomVideoId = "4bc085dcc8394bd6ba80396197b1475a";

export default function HowTo() {
  const { doSetAccountSetting, hasCompletedProductOnboarding } = useStore(selector, shallow);
  const history = useHistory();
  const iframe = `<iframe src="https://www.loom.com/embed/${loomVideoId}" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>`;
  const isOnboarding = !hasCompletedProductOnboarding;
  const logo = <Logo height={36} className={styles.logo} />;

  return (
    <div className={styles.HowTo}>
      <div className={styles.wrapper}>
        <Link to="/">{logo}</Link>
        <p>
          We’re excited to get you started. Please watch this quick introductory video to learn about re:collect and its
          features.
        </p>
        <IconButton
          className={styles.button}
          type={"submit"}
          label={"Go back to re:collect"}
          variant={"grey"}
          size={"large"}
          title={"Go back to re:collect"}
          onClick={() => {
            if (isOnboarding) {
              doSetAccountSetting({ key: USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING });
              analyticsService.logEvent(events.onboardingHasCompletedProductOnboarding());
            }
            history.push("/");
          }}
        />
        <div
          style={{
            position: "relative",
            paddingBottom: "60%",
            height: 0,
            marginTop: 32,
            borderRadius: 8,
            overflow: "hidden",
          }}
          dangerouslySetInnerHTML={{ __html: iframe }}
        />
      </div>
    </div>
  );
}

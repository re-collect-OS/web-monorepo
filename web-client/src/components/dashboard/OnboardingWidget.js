import React, { useState } from "react";
import { shallow } from "zustand/shallow";
import { CrossIcon, VideoIcon, DownloadIcon, ConnectIcon } from "web-shared-lib";
import { useHistory } from "react-router-dom";

import { useStore } from "../../store";
import { events, analyticsService, sources } from "../../libs/analyticsLib";
import apiLib from "../../libs/apiLib";
const { USER_SETTING_HAS_DISMISSED_ONBOARDING_PROGRESS } = apiLib;

import IndexingStats from "../common/indexing-stats";

import Widget, { WidgetHeader, WidgetNavButton, WidgetIconRow } from "./Widget";

import styles from "./OnboardingWidget.module.css";

function isMac() {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

const selector = (state) => ({
  needsOnboardingProgress: !state.user.accountSettings[USER_SETTING_HAS_DISMISSED_ONBOARDING_PROGRESS],
  doSetAccountSetting: state.doSetAccountSetting,
});

export default function OnboardingWidget({ forceFreshAccountStatus = false }) {
  const { needsOnboardingProgress, doSetAccountSetting } = useStore(selector, shallow);
  const [showSidecarDownload] = useState(isMac());
  const [canDismiss, setCanDismiss] = useState(false);
  const history = useHistory();

  if (!needsOnboardingProgress && !forceFreshAccountStatus) {
    return null;
  }

  return (
    <Widget className={styles.OnboardingWidget}>
      <WidgetHeader title={"Onboarding"}>
        {canDismiss && (
          <WidgetNavButton
            icon={<CrossIcon />}
            title={"Dismiss oboarding status"}
            onClick={() => {
              doSetAccountSetting({ key: USER_SETTING_HAS_DISMISSED_ONBOARDING_PROGRESS });
              analyticsService.logEvent(events.onboardingHasDismissedOnboardingProgress());
            }}
          />
        )}
      </WidgetHeader>
      <WidgetIconRow
        label={"See what re:collect can do"}
        icon={<VideoIcon />}
        onClick={() => {
          history.push("/tour");
          analyticsService.logEvent(events.onboardingHasStartedProductOnboarding({ source: sources.HOME }));
        }}
      />
      {showSidecarDownload && (
        <WidgetIconRow
          label={"Download Mac Sidecar companion app"}
          icon={<DownloadIcon />}
          onClick={() => {
            history.push("/downloads");
            analyticsService.logEvent(events.downloadsOpened({ source: sources.HOME }));
          }}
        />
      )}
      <WidgetIconRow
        label={"Connect other services you use"}
        icon={<ConnectIcon />}
        onClick={() => {
          history.push("/integrations");
          analyticsService.logEvent(events.integrationsOpened({ source: sources.HOME }));
        }}
      />
      <IndexingStats forceFreshAccountStatus={forceFreshAccountStatus} onComplete={() => setCanDismiss(true)} />
    </Widget>
  );
}

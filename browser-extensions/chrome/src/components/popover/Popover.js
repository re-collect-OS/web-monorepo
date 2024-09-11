import React, { useLayoutEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import { LoadingIndicator, useComponentSize } from "web-shared-lib";
import { relativeTimeAgo } from "js-shared-lib";
import { shallow } from "zustand/shallow";

import AuthenticatedUI from "./AuthenticatedUI";
import UnauthenticatedUI from "./UnauthenticatedUI";

import { events, analyticsService } from "../../libs/analyticsLib";

import { useStore } from "../../store";

import styles from "./Popover.module.css";

const MAX_HEIGHT = 850;
const MIN_HEIGHT = 240;

const selector = (state) => ({
  status: state.tabState.status,
  error: state.tabState.error,
  canCollect: state.tabState.canCollect,
  canAutoCollect: state.tabState.canAutoCollect,
  isAutoCollecting: state.tabState.isAutoCollecting,
  isRemembered: state.tabState.isRemembered,
  isSubscribed: state.tabState.isSubscribed,
  rememberedTime: state.doTabStateRememberedTimeGet(),
  doAuthLogout: state.doAuthLogout,
  doTabSubmitVisit: state.doTabSubmitVisit,
  doTabForgetVisit: state.doTabForgetVisit,
  doTabOptIn: state.doTabOptIn,
  doTabOptOut: state.doTabOptOut,
  doTabSubscribe: state.doTabSubscribe,
});

function Popover({
  doResizeIframe,
  isAuthenticated,
  isAuthenticating,
  isExpanded,
  onClose,
  onLaunchApp,
  tabInfo,
  ...rest
}) {
  const {
    canAutoCollect,
    canCollect,
    doAuthLogout,
    doTabForgetVisit,
    doTabOptIn,
    doTabOptOut,
    doTabSubmitVisit,
    doTabSubscribe,
    error,
    isAutoCollecting,
    isRemembered,
    isSubscribed,
    rememberedTime,
    status,
  } = useStore(selector, shallow);

  const rememberedTimeAgo = useMemo(() => (rememberedTime ? relativeTimeAgo(rememberedTime) : null), [rememberedTime]);
  const handleLaunchApp = useCallback(
    (path) => {
      onLaunchApp(path);
      analyticsService.logEvent(events.popupWebAppInitiated());
    },
    [onLaunchApp]
  );

  const [callbackRef, rect] = useComponentSize();
  useLayoutEffect(() => {
    if (doResizeIframe) {
      let height = Math.max(rect.height, MIN_HEIGHT);
      doResizeIframe(isExpanded ? MAX_HEIGHT : Math.min(MAX_HEIGHT, height));
    }
  }, [isExpanded, rect, doResizeIframe]);

  const isLoading = isAuthenticating ? true : isAuthenticated && (status === "loading" || !tabInfo);

  return (
    <div
      ref={callbackRef}
      className={cn(styles.Popover, { [styles.isExpanded]: isExpanded, [styles.isLoading]: isLoading })}
    >
      {isLoading && <LoadingIndicator />}
      {!isLoading && !isAuthenticated && <UnauthenticatedUI onLaunchApp={handleLaunchApp} onClose={onClose} />}
      {!isLoading && isAuthenticated && (
        <AuthenticatedUI
          error={error}
          canCollect={canCollect}
          canAutoCollect={canAutoCollect}
          tabInfo={tabInfo}
          onClose={onClose}
          onLaunchApp={handleLaunchApp}
          isExpanded={isExpanded}
          onLogout={() =>
            doAuthLogout().catch(() => {
              // noop
            })
          }
          isRemembered={isRemembered}
          isSubscribed={isSubscribed}
          isAutoCollecting={isAutoCollecting}
          rememberedTimeAgo={rememberedTimeAgo}
          onForgetVisit={doTabForgetVisit}
          onSubmitVisit={doTabSubmitVisit}
          onSubscribe={doTabSubscribe}
          onOptIn={doTabOptIn}
          onOptOut={doTabOptOut}
          status={status}
          {...rest}
        />
      )}
    </div>
  );
}

Popover.propTypes = {
  doResizeIframe: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  isAuthenticating: PropTypes.bool.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLaunchApp: PropTypes.func.isRequired,
  tabInfo: PropTypes.object.isRequired,
};

export default Popover;

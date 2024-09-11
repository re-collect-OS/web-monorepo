import React from "react";
import { Route, Redirect, useLocation } from "react-router-dom";
import { shallow } from "zustand/shallow";

import UpdateNag from "./common/update-nag";
import AmplitudeNag from "./common/amplitude-nag";
import OfflineNag from "./common/offline-nag";
import ExtensionNag from "./common/extension-nag";
import FullPageLoadingIndicator from "./common/full-page-loading-indicator";

import { ErrorUnavailableComponent, ErrorBoundaryComponent } from "./error";

import { useStore } from "../store";

const selector = (state) => ({
  syncStatus: state.sync.status,
  isLoggedIn: !!state.user.email && state.user.status === "success",
});

export default function AuthenticatedRoute({ children, ...rest }) {
  const { pathname, search } = useLocation();
  const { syncStatus, isLoggedIn } = useStore(selector, shallow);

  if (syncStatus === "loading") {
    return <FullPageLoadingIndicator />;
  }

  if (syncStatus === "error") {
    return <ErrorBoundaryComponent />;
  }

  if (syncStatus === "error-maintenace") {
    return <ErrorUnavailableComponent />;
  }

  return (
    <>
      <Route {...rest}>{isLoggedIn ? children : <Redirect to={`/login?redirect=${pathname}${search}`} />}</Route>
      <UpdateNag />
      <AmplitudeNag />
      <OfflineNag />
      <ExtensionNag />
    </>
  );
}

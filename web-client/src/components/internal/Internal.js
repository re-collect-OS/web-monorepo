import React, { Suspense } from "react";
import { Route, Switch } from "react-router-dom";
import { shallow } from "zustand/shallow";

import { useStore } from "../../store";

import NotFound from "../NotFound";

const InvitationsComponent = React.lazy(() => import("./Invitations"));
const AccountsComponent = React.lazy(() => import("./Accounts"));
const StatsComponent = React.lazy(() => import("./Stats"));
const IconsComponent = React.lazy(() => import("./Icons"));

const selector = (state) => ({
  isAdmin: state.user.isUserAdmin,
  didLoad: state.sync.status === "success",
});

function AdminRoute(props) {
  const { didLoad, isAdmin } = useStore(selector, shallow);

  if (!didLoad) {
    return null;
  }

  if (!isAdmin) {
    return <NotFound />;
  }

  return <Route {...props} />;
}

export default function Internal() {
  return (
    <Switch>
      <AdminRoute exact path="/internal/invitations">
        <Suspense fallback={<div>Loading...</div>}>
          <InvitationsComponent />
        </Suspense>
      </AdminRoute>
      <AdminRoute exact path="/internal/accounts">
        <Suspense fallback={<div>Loading...</div>}>
          <AccountsComponent />
        </Suspense>
      </AdminRoute>
      <AdminRoute exact path="/internal/stats">
        <Suspense fallback={<div>Loading...</div>}>
          <StatsComponent />
        </Suspense>
      </AdminRoute>
      <Route exact path="/internal/icons">
        <Suspense fallback={<div>Loading...</div>}>
          <IconsComponent />
        </Suspense>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

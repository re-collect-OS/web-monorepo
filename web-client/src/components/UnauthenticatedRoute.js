import React from "react";
import { Route, Redirect } from "react-router-dom";
import { shallow } from "zustand/shallow";

import OfflineNag from "./common/offline-nag";

import { useStore } from "../store";

function querystring(name, url = window.location.href) {
  name = name.replace(/[[]]/g, "\\$&");

  const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i");
  const results = regex.exec(url);

  if (!results) {
    return null;
  }
  if (!results[2]) {
    return "";
  }

  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

const selector = (state) => ({
  isLoggedIn: !!state.user.email && state.user.status === "success",
});

export default function UnauthenticatedRoute({ children, ...rest }) {
  const { isLoggedIn } = useStore(selector, shallow);
  const redirect = querystring("redirect");

  return (
    <>
      <Route {...rest}>
        {isLoggedIn ? <Redirect to={redirect === "" || redirect === null ? "/" : redirect} /> : children}
      </Route>
      <OfflineNag />
    </>
  );
}

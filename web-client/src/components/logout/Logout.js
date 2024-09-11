import React from "react";
import { shallow } from "zustand/shallow";
import { useHistory } from "react-router-dom";

import { useStore } from "../../store";
import { useQuery } from "../../utils/router";

const selector = (state) => ({
  doAuthLogout: state.doAuthLogout,
  isLoading: state.user.status === "loading",
  hasError: state.user.status === "error",
});

export default function Logout() {
  const { doAuthLogout } = useStore(selector, shallow);
  const history = useHistory();
  const routerQuery = useQuery();
  const redirect = routerQuery.get("redirect");

  React.useEffect(() => {
    setTimeout(() => {
      doAuthLogout()
        .catch(() => {
          // noop
        })
        .finally(() => {
          history.replace(redirect ? redirect : "/login");
        });
    }, 1000);
  }, [doAuthLogout, history, redirect]);

  return <p style={{ padding: 40, color: "#666" }}>Logging out...</p>;
}

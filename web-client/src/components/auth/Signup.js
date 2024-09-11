import React from "react";
import { shallow } from "zustand/shallow";
import { useHistory } from "react-router-dom";

import { useFormFields } from "../../libs/hooksLib";
import { useStore } from "../../store";
import { useQuery } from "../../utils/router";

import ConfirmationForm from "./ConfirmationForm";
import SignupForm from "./SignupForm";

import styles from "./Signup.module.css";

const selector = (state) => ({
  doAuthConfirmSignup: state.doAuthConfirmSignup,
  doAuthSignup: state.doAuthSignup,
  doAuthLogin: state.doAuthLogin,
  isLoading: state.user.status === "loading",
  needsConfirmation: state.user.status === "needs-confirmation",
  hasError: state.user.status === "error",
  errorMsg: state.user.errorMsg,
});

export default function Signup() {
  const routerQuery = useQuery();
  const invitation = routerQuery.get("invitation");
  const [fields, handleFieldChange] = useFormFields({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    confirmationCode: "",
  });
  const history = useHistory();
  const { doAuthConfirmSignup, doAuthSignup, doAuthLogin, isLoading, needsConfirmation, hasError, errorMsg } = useStore(
    selector,
    shallow
  );

  async function handleSignupSubmit(event) {
    event.preventDefault();

    doAuthSignup({ name: fields.name, email: fields.email, password: fields.password, invitation: invitation });
  }

  async function handleConfirmationSubmit(event) {
    event.preventDefault();

    doAuthConfirmSignup({ email: fields.email, code: fields.confirmationCode }).then(() => {
      doAuthLogin({ email: fields.email, password: fields.password })
        .then(() => {
          history.replace("/welcome");
        })
        .catch(() => {
          // noop
        });
    });
  }

  return (
    <div className={styles.Signup}>
      {needsConfirmation ? (
        <ConfirmationForm
          fields={fields}
          handleSubmit={handleConfirmationSubmit}
          handleFieldChange={handleFieldChange}
          hasError={hasError}
          isLoading={isLoading}
        />
      ) : (
        <SignupForm
          fields={fields}
          handleSubmit={handleSignupSubmit}
          handleFieldChange={handleFieldChange}
          hasError={hasError}
          errorMsg={errorMsg}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

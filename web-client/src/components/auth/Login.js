import React from "react";
import { shallow } from "zustand/shallow";

import { useFormFields } from "../../libs/hooksLib";
import { useStore } from "../../store";

import LoginForm from "./LoginForm";
import ConfirmationForm from "./ConfirmationForm";

import styles from "./Login.module.css";

const selector = (state) => ({
  doAuthLogin: state.doAuthLogin,
  doAuthConfirmSignup: state.doAuthConfirmSignup,
  needsConfirmation: state.user.status === "needs-confirmation",
  isLoading: state.user.status === "loading",
  hasError: state.user.status === "error",
});

export default function Login() {
  const { doAuthLogin, doAuthConfirmSignup, needsConfirmation, hasError, isLoading } = useStore(selector, shallow);
  const [fields, handleFieldChange] = useFormFields({ email: "", password: "", confirmationCode: "" });

  async function handleLoginSubmit(event) {
    event.preventDefault();

    doAuthLogin({ email: fields.email, password: fields.password }).catch(() => {
      // noop
    });
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
    <div className={styles.Login}>
      {needsConfirmation ? (
        <ConfirmationForm
          fields={fields}
          handleSubmit={handleConfirmationSubmit}
          handleFieldChange={handleFieldChange}
        />
      ) : (
        <LoginForm
          fields={fields}
          handleSubmit={handleLoginSubmit}
          handleFieldChange={handleFieldChange}
          hasError={hasError}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

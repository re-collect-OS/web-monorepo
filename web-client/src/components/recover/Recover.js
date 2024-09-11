import React, { useState } from "react";
import cn from "classnames";
import { CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";
import { Link } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { shallow } from "zustand/shallow";
import { Logo, IconButton } from "web-shared-lib";

import { useStore } from "../../store";
import { useFormFields } from "../../libs/hooksLib";
import config from "../../config";
import { MIN_PASSWORD_LENGTH } from "../../config";

import styles from "./Recover.module.css";

const selector = (state) => ({
  doAuthLogin: state.doAuthLogin,
});

function FormGroup({ className, children, ...rest }) {
  return (
    <div className={cn(styles.formGroup, className)} {...rest}>
      {children}
    </div>
  );
}

function RecoverForm({ className, onSubmit, children, ...rest }) {
  return (
    <div className={cn(styles.Recover, className)} {...rest}>
      <form className={styles.form} onSubmit={onSubmit}>
        {children}
      </form>
    </div>
  );
}

function VerifyCodeStep({ email, cognitoUser, onContinue }) {
  const [fields, handleFieldChange] = useFormFields({ verificationCode: "", newPassword: "" });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <RecoverForm
      onSubmit={(event) => {
        event.preventDefault();

        setIsLoading(true);

        cognitoUser.confirmPassword(fields.verificationCode, fields.newPassword, {
          onSuccess() {
            onContinue({ password: fields.newPassword });
          },
          onFailure(error) {
            setError(error.message);
            setIsLoading(false);
          },
        });
      }}
    >
      <Logo height={36} />
      <h1>Enter verification code</h1>
      <p>Please enter the verification code included in the email we just sent to {email}</p>
      <FormGroup>
        <label htmlFor="verificationCode">Verification code</label>
        <input
          required
          id="verificationCode"
          type="number"
          value={fields.verificationCode}
          onChange={handleFieldChange}
          autoFocus
        />
      </FormGroup>
      <FormGroup>
        <label htmlFor="newPassword">New password</label>
        <input
          required
          id="newPassword"
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          value={fields.newPassword}
          onChange={handleFieldChange}
        />
      </FormGroup>
      {error && <div className={styles.formErrorText}>{error}</div>}
      <IconButton
        className={styles.submitButton}
        type="submit"
        size={"large"}
        label={"Change password"}
        title={"Change password"}
        variant={"grey"}
        disabled={isLoading}
        full
      />
    </RecoverForm>
  );
}

function EnterEmailStep({ onContinue }) {
  const [fields, handleFieldChange] = useFormFields({ email: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <RecoverForm
      onSubmit={(event) => {
        event.preventDefault();
        setIsLoading(true);

        const cognitoUser = new CognitoUser({
          Username: fields.email,
          Pool: new CognitoUserPool({
            UserPoolId: config.cognito.USER_POOL_ID,
            ClientId: config.cognito.APP_CLIENT_ID,
          }),
        });

        cognitoUser.forgotPassword({
          inputVerificationCode() {
            onContinue({ email: fields.email, cognitoUser });
          },
          onFailure: function (error) {
            setError(error.message);
            setIsLoading(false);
          },
        });
      }}
    >
      <Logo height={36} />
      <h1>Reset your password</h1>
      <p>Enter your email and we'll send you instructions on how to reset your password.</p>
      <p>
        <Link to={"/login"}>Return to login?</Link>
      </p>
      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input required id="email" type="email" value={fields.email} onChange={handleFieldChange} autoFocus />
      </div>
      {error && <div className={styles.formErrorText}>{error}</div>}
      <IconButton
        className={styles.submitButton}
        type="submit"
        size={"large"}
        label={"Send instructions"}
        title={"Send instructions"}
        variant={"grey"}
        disabled={isLoading}
        full
      />
    </RecoverForm>
  );
}

export default function Recover() {
  const { doAuthLogin } = useStore(selector, shallow);
  const [email, setEmail] = useState(null);
  const [cognitoUser, setCognitoUser] = useState(null);
  const [step, setStep] = useState("start"); // ["start", "verify-code"]
  const history = useHistory();

  if (step === "start") {
    return (
      <EnterEmailStep
        onContinue={({ email, cognitoUser }) => {
          setEmail(email);
          setCognitoUser(cognitoUser);
          setStep("verify-code");
        }}
      />
    );
  } else if (step === "verify-code") {
    return (
      <VerifyCodeStep
        email={email}
        cognitoUser={cognitoUser}
        onContinue={({ password }) => {
          doAuthLogin({ email, password })
            .then(() => {
              history.replace("/login");
            })
            .catch(() => {
              // noop
            });
        }}
      />
    );
  }
}

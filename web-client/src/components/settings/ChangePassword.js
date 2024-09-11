import React, { useState } from "react";
import cn from "classnames";
import { Auth } from "aws-amplify";
import { useHistory } from "react-router-dom";
import { Link } from "react-router-dom";
import { Logo, IconButton } from "web-shared-lib";

import { useFormFields } from "../../libs/hooksLib";

import styles from "./ChangePassword.module.css";

function FormGroup({ className, children, ...rest }) {
  return (
    <div className={cn(styles.formGroup, className)} {...rest}>
      {children}
    </div>
  );
}

function ChangePasswordForm({ className, onSubmit, children, ...rest }) {
  return (
    <div className={cn(styles.ChangePasswordForm, className)} {...rest}>
      <form className={styles.form} onSubmit={onSubmit}>
        {children}
      </form>
    </div>
  );
}

export default function ChangePassword() {
  const history = useHistory();
  const [fields, handleFieldChange] = useFormFields({
    password: "",
    oldPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function validateForm() {
    return fields.oldPassword.length > 0 && fields.password.length > 0 && fields.password === fields.confirmPassword;
  }

  async function onSubmit(event) {
    event.preventDefault();

    setIsLoading(true);

    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(currentUser, fields.oldPassword, fields.password);
      history.push("/settings?passwordChanged=1");
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.ChangePassword}>
      <ChangePasswordForm onSubmit={onSubmit}>
        <Link to={"/"}>
          <Logo height={36} />
        </Link>
        <FormGroup>
          <label htmlFor="oldPassword">Existing password</label>
          <input id="oldPassword" type="password" value={fields.oldPassword} onChange={handleFieldChange} autoFocus />
        </FormGroup>
        <FormGroup>
          <label htmlFor="password">New password</label>
          <input id="password" type="password" value={fields.password} onChange={handleFieldChange} />
        </FormGroup>
        <FormGroup>
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" type="password" value={fields.confirmPassword} onChange={handleFieldChange} />
        </FormGroup>
        <p>
          <Link to={"/logout?redirect=/recover"}>Forgot your password?</Link>
        </p>
        {error && <div className={styles.formErrorText}>{error}</div>}
        <IconButton
          className={styles.submitButton}
          disabled={isLoading || !validateForm()}
          type={"submit"}
          size={"large"}
          variant={"grey"}
          label={"Change password"}
          title={"Change password"}
          full
        />
      </ChangePasswordForm>
    </div>
  );
}

import React from "react";
import { Logo, IconButton, DoorEnterIcon } from "web-shared-lib";

import { MIN_PASSWORD_LENGTH } from "../../config";

import styles from "./AuthForm.module.css";

export default function LoginForm({ handleSubmit, fields, handleFieldChange, hasError, isLoading }) {
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Logo height={36} />
      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input required type="email" id="email" value={fields.email} autoFocus onChange={handleFieldChange} />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="password">Password</label>
        <input
          required
          type="password"
          id="password"
          minLength={MIN_PASSWORD_LENGTH}
          value={fields.password}
          onChange={handleFieldChange}
        />
      </div>
      <p>
        <a href={"/recover"}>Forgot your password?</a>
      </p>
      {hasError && <div className={styles.formErrorText}>Log in failed</div>}
      <IconButton
        className={styles.submitButton}
        disabled={isLoading}
        icon={<DoorEnterIcon />}
        type="submit"
        size="large"
        variant="grey"
        label={"Log in with email"}
        title="Log in with email"
        full
      />
    </form>
  );
}

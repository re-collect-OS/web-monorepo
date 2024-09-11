import React from "react";
import { Logo, IconButton, DoorEnterIcon } from "web-shared-lib";

import { MIN_PASSWORD_LENGTH } from "../../config";

import styles from "./AuthForm.module.css";

export default function SignupForm({ handleSubmit, fields, handleFieldChange, hasError, errorMsg, isLoading }) {
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Logo height={36} />
      <div className={styles.formGroup}>
        <label htmlFor="name">Preferred Name</label>
        <input
          required
          id="name"
          type="text"
          value={fields.name}
          onChange={handleFieldChange}
          placeholder={"What should we call you?"}
          autoFocus
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input required id="email" type="email" value={fields.email} onChange={handleFieldChange} />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="password">Password</label>
        <input
          required
          id="password"
          type="password"
          value={fields.password}
          minLength={MIN_PASSWORD_LENGTH}
          onChange={handleFieldChange}
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          required
          id="confirmPassword"
          type="password"
          onChange={handleFieldChange}
          minLength={MIN_PASSWORD_LENGTH}
          value={fields.confirmPassword}
        />
      </div>
      <p>
        <a href={"/login"}>Already have an account?</a>
      </p>
      {hasError && <div className={styles.formErrorText}>{errorMsg || "Sign up failed. Please try again later."}</div>}
      <IconButton
        className={styles.submitButton}
        disabled={isLoading}
        icon={<DoorEnterIcon />}
        type="submit"
        size="large"
        variant="grey"
        label={"Sign up with email"}
        title="Sign up with email"
        full
      />
    </form>
  );
}

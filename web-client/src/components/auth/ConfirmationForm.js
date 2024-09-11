import React from "react";
import { Logo, IconButton, CheckIcon } from "web-shared-lib";

import styles from "./AuthForm.module.css";

export default function ConfirmationForm({ handleSubmit, fields, handleFieldChange, hasError, isLoading }) {
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Logo height={36} />
      <div className={styles.formGroup}>
        <label htmlFor="confirmationCode">Confirmation Code</label>
        <input
          required
          id="confirmationCode"
          type="number"
          onChange={handleFieldChange}
          value={fields.confirmationCode}
          autoFocus
        />
      </div>
      {!hasError && <div className={styles.formText}>Please check your email for the code</div>}
      {hasError && <div className={styles.formErrorText}>Could not verify code</div>}
      <IconButton
        className={styles.submitButton}
        icon={<CheckIcon />}
        disabled={isLoading}
        type="submit"
        size="large"
        variant="grey"
        label={"Verify account"}
        title="Verify account"
        full
      />
    </form>
  );
}

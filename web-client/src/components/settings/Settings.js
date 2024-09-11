import React, { useState, useRef, useEffect } from "react";
import cn from "classnames";
import { Link } from "react-router-dom";
import { IconButton } from "web-shared-lib";
import { shallow } from "zustand/shallow";

import { useStore } from "../../store";
import { APP_VERSION, APP_STAGE } from "../../config";
import { events, analyticsService, sources } from "../../libs/analyticsLib";
import { useQuery } from "../../utils/router";
import { ChangeLogWithBadge } from "../common/change-log";
import { useFormFields } from "../../libs/hooksLib";
import PageHeader from "../common/page-header";

import styles from "./Settings.module.css";

const selector = (state) => ({
  userEmail: state.user.email,
  name: state.user.name,
  version: state.update.version,
  doSetAccountName: state.doSetAccountName,
});

function AccountForm({ className, name, email, doSetAccountName, ...rest }) {
  const [fields, handleFieldChange] = useFormFields({ name: name || "", email });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nameChanged, setNameChanged] = useState(false);

  const resetNameChangedTimerId = useRef(null);
  useEffect(() => {
    // Clear timer on un-mount
    return () => {
      if (resetNameChangedTimerId.current) {
        clearTimeout(resetNameChangedTimerId.current);
      }
    };
  }, []);

  function validateForm() {
    return fields.name.length > 0 && fields.name !== name;
  }

  async function onSubmit(event) {
    event.preventDefault();

    setIsLoading(true);

    try {
      await doSetAccountName({ name: fields.name });
      setIsLoading(false);
      setNameChanged(true);

      if (resetNameChangedTimerId.current) {
        clearTimeout(resetNameChangedTimerId.current);
      }
      resetNameChangedTimerId.current = setTimeout(() => {
        setNameChanged(false);
      }, 5000);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }

  return (
    <div className={cn(styles.AccountForm, className)} {...rest}>
      {nameChanged && <div className={styles.success}>Name successfully changed</div>}
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Preferred Name</label>
          <input
            id="name"
            type="text"
            value={fields.name}
            onChange={handleFieldChange}
            autoFocus
            placeholder={"What should we call you?"}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={fields.email} onChange={handleFieldChange} disabled />
        </div>
        {error && <div className={styles.formErrorText}>{error}</div>}
        <IconButton
          className={styles.submitButton}
          disabled={isLoading || !validateForm()}
          type={"submit"}
          size={"large"}
          variant={"grey"}
          label={"Update"}
          title={"Update"}
        />
      </form>
    </div>
  );
}

export default function Settings() {
  const routerQuery = useQuery();
  const passwordChanged = routerQuery.get("passwordChanged");
  const { userEmail, name, version, doSetAccountName } = useStore(selector, shallow);

  return (
    <div className={styles.Settings}>
      <PageHeader title={"Settings"} description={"Manage your account preferences."} />
      <div className={styles.sectionsWrapper}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          {passwordChanged && <div className={styles.success}>Password successfully changed</div>}
          <div className={styles.sectionRow}>
            <AccountForm name={name} email={userEmail} doSetAccountName={doSetAccountName} />
          </div>
          <div className={styles.sectionRow}>
            <Link to={"/settings/password"}>Change password</Link>
          </div>
          <div className={styles.sectionRow}>
            <a href={"/logout"}>Log out</a>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data</h2>
          <div className={styles.sectionRow}>
            <Link
              to="/settings/extension"
              onClick={() => analyticsService.logEvent(events.settingsExtensionInitiated({ source: sources.SETTINGS }))}
            >
              Manage browser extension
            </Link>
          </div>
        </div>
        <div className={styles.section} title={`re:collect v${APP_VERSION} (${APP_STAGE} ${version})`}>
          <ChangeLogWithBadge eventSource={sources.SETTINGS} />
          <div className={styles.sectionRow}>
            <a href="https://www.re-collect.ai/privacy" target="_blank" rel="noreferrer">
              Privacy policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

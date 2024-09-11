import React, { useState, useEffect } from "react";
import { relativeTimeAgo } from "js-shared-lib";
import { useHistory } from "react-router-dom";
import { GoogleDriveIcon, IconButton, ConnectIcon } from "web-shared-lib";

import config, { DEBUG } from "../../config";
import apiLib from "../../libs/apiLib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";
import { useQuery } from "../../utils/router";
import { useSessionStorage } from "../../libs/hooksLib";

import BaseIntegration from "./BaseIntegration";

import IntegrationSummary from "./IntegrationSummary";

import styles from "./GoogleDrive.module.css";

const DESCRIPTION = "Connect to bring your Google Drive documents into your re:collect account";
const REDIRECT_URL = `${config.APP_URL}/integrations/google-drive`;

export default function GoogleDrive({ isExpanded, onExpand }) {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [integration, setIntegration] = useState(null);
  const [shouldDeleteContent, setShouldDeleteContent] = useState(false);

  const [oauthCodeVerifier, setOauthCodeVerifier] = useSessionStorage("google_drive_oauth_code_verifier", "");
  const [oauthStateVerifier, setOauthStateVerifier] = useSessionStorage("google_drive_oauth_state_verifier", "");

  const routerQuery = useQuery();
  const oauthCode = routerQuery.get("code");
  const oauthState = routerQuery.get("state");

  const hasSubscription = !!integration;
  const isEnabled = hasSubscription && integration?.settings?.enabled;

  const setIntegrationState = (response) => {
    if (response) {
      setIntegration(response);
      if (response.status?.last_run_status === "permanent_failure") {
        // TODO
        setError("Could not sync Google Drive data.");
      }
    }
  };

  useEffect(() => {
    // On mount try to load
    setIsLoading(true);
    setError(null);

    apiLib
      .listGoogleDriveIntegrations()
      .then((response) => {
        setIntegrationState(response[0]);
      })
      .catch((error) => setError(error.message))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (oauthCode && oauthState) {
      if (oauthState !== oauthStateVerifier) {
        setError("Failed to connect account: state mismatch");
        return;
      }
      // Create integration
      setIsLoading(true);
      setError(null);
      apiLib
        .pushGoogleDriveIntegration({
          code: oauthCode,
          codeVerifier: oauthCodeVerifier,
          redirectUrl: REDIRECT_URL,
        })
        .then((response) => {
          setIntegrationState(response);
          analyticsService.logEvent(events.googleDriveIntegrationAdded({ source: sources.INTEGRATIONS }));

          // Strip the params from the URL:
          history.replace("/integrations/google-drive");
        })
        .catch((error) => {
          let message = error.message;
          if (error.response?.data?.detail) {
            message = error.response.data.detail;
          }
          setError(message);

          analyticsService.logEvent(
            events.googleDriveIntegrationFailed({
              status: error.response?.status,
              message,
              source: sources.INTEGRATIONS,
            })
          );
        })
        .finally(() => setIsLoading(false));
    }
  }, [history, oauthCode, oauthState, oauthCodeVerifier, oauthStateVerifier]);

  async function doConnect() {
    try {
      const data = await apiLib.getGoogleDriveAuthRedirectURL({ redirectUrl: REDIRECT_URL });
      setOauthCodeVerifier(data.code_verifier);
      setOauthStateVerifier(data.state);
      window.location.href = data.redirect_uri;
    } catch (error) {
      setError("Failed to get authentication URL");
    }
  }

  if (!isExpanded) {
    return (
      <IntegrationSummary
        icon={<GoogleDriveIcon className={styles.googleDriveIcon} />}
        title={"Google Drive"}
        description={DESCRIPTION}
        button={
          <IconButton
            disabled={isLoading}
            icon={hasSubscription ? null : <ConnectIcon />}
            variant={hasSubscription ? "grey" : "violet"}
            title={hasSubscription ? "Manage" : "Connect"}
            label={hasSubscription ? "Manage" : "Connect"}
            onClick={() => onExpand(true)}
          />
        }
      />
    );
  }

  return (
    <BaseIntegration
      className={styles.GoogleDrive}
      title={hasSubscription ? "Google Drive" : "Connect your Google Drive account"}
      icon={<GoogleDriveIcon className={styles.googleDriveIcon} />}
      onCollapse={() => onExpand(false)}
    >
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {!hasSubscription && <div className={styles.description}>{DESCRIPTION}:</div>}
        {hasSubscription && (
          <div className={styles.section}>
            <div className={styles.keyValueRow}>
              <div className={styles.key}>Account</div>
              <div className={styles.value}>{integration?.settings?.email || "unknown"}</div>
            </div>
            <div className={styles.keyValueRow}>
              <div className={styles.key}>Last synced</div>
              <div className={styles.value}>
                {integration?.status?.last_run ? relativeTimeAgo(integration.status.last_run) : "never"}
              </div>
            </div>
            {DEBUG && (
              <div className={styles.keyValueRow}>
                <div className={styles.key}>DEBUG</div>
                <div className={styles.value}>
                  <IconButton
                    disabled={isLoading}
                    title={"Sync now"}
                    label={"Sync now"}
                    onClick={() => {
                      setIsLoading(true);
                      setError(null);
                      apiLib
                        .triggerGoogleDriveRun({ id: integration.id })
                        .then(() => {
                          alert("Sync requested successfully. Reload the page in a minute or so to check sync status.");
                        })
                        .catch((error) => setError(error.message))
                        .finally(() => setIsLoading(false));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!hasSubscription && (
          <IconButton
            disabled={isLoading}
            icon={<ConnectIcon />}
            size={"large"}
            variant={"violet"}
            title={"Connect your Google Drive account"}
            label={"Connect your Google Drive account"}
            onClick={() => doConnect()}
          />
        )}

        {hasSubscription && (
          <div className={styles.section}>
            <IconButton
              disabled={isLoading}
              variant={isEnabled || shouldDeleteContent ? "destructive" : "violet"}
              title={shouldDeleteContent ? "Remove integration" : isEnabled ? "Pause sync" : "Resume sync"}
              label={shouldDeleteContent ? "Remove integration" : isEnabled ? "Pause sync" : "Resume sync"}
              onClick={() => {
                setIsLoading(true);
                setError(null);
                if (shouldDeleteContent) {
                  apiLib
                    .deleteGoogleDriveIntegration({ id: integration.id })
                    .then(() => {
                      setIntegration(null);
                    })
                    .catch((error) => setError(error.message))
                    .finally(() => setIsLoading(false));
                  analyticsService.logEvent(events.googleDriveIntegrationRemoved({ source: sources.INTEGRATIONS }));
                } else {
                  apiLib.updateGoogleDriveIntegration({ id: integration.id, enabled: !isEnabled });
                  analyticsService.logEvent(events.googleDriveIntegrationPaused({ source: sources.INTEGRATIONS }));
                }
              }}
            />
            <label className={styles.deleteContentWrapper}>
              <input
                type="checkbox"
                checked={shouldDeleteContent}
                onChange={(event) => setShouldDeleteContent(event.target.checked)}
              />
              <div>Delete all content originating from Google Drive</div>
            </label>
          </div>
        )}
      </div>
    </BaseIntegration>
  );
}

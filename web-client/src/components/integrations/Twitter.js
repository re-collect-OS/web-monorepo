import React, { useState, useEffect } from "react";
import { relativeTimeAgo } from "js-shared-lib";
import { useHistory } from "react-router-dom";
import { TwitterIcon, IconButton, ConnectIcon } from "web-shared-lib";
import { v4 as uuidv4 } from "uuid";

import apiLib from "../../libs/apiLib";
import { DEBUG } from "../../config";
import { generates256CodeChallenge, generateAuthorizationUrl, REDIRECT_URL } from "../../libs/twitterLib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";
import { useQuery } from "../../utils/router";
import { useSessionStorage } from "../../libs/hooksLib";

import BaseIntegration from "./BaseIntegration";

import IntegrationSummary from "./IntegrationSummary";

import styles from "./Twitter.module.css";

const DESCRIPTION = "Connect to save private tweets and bring your bookmarked tweets into your re:collect account";

export default function Twitter({ isExpanded, onExpand }) {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [integration, setIntegration] = useState(null);
  const [shouldDeleteContent, setShouldDeleteContent] = useState(false);

  const [oauthCodeVerifier] = useSessionStorage("twitter_oauth_code_verifier", uuidv4());
  const [oauthStateVerifier] = useSessionStorage("twitter_oauth_state_verifier", uuidv4());

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
        setError("Could not sync Twitter data.");
      }
    }
  };

  useEffect(() => {
    // On mount try to load
    setIsLoading(true);
    setError(null);

    apiLib
      .listTwitterIntegrations()
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
        .pushTwitterIntegration({ code: oauthCode, codeVerifier: oauthCodeVerifier, redirectUrl: REDIRECT_URL })
        .then((response) => {
          setIntegrationState(response);
          analyticsService.logEvent(events.twitterIntegrationAdded({ source: sources.INTEGRATIONS }));

          // Strip the params from the URL:
          history.replace("/integrations/twitter");
        })
        .catch((error) => {
          let message = error.message;
          if (error.response?.data?.detail) {
            message = error.response.data.detail;
          }
          setError(message);

          analyticsService.logEvent(
            events.twitterIntegrationFailed({
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
    const codeChallenge = await generates256CodeChallenge(oauthCodeVerifier);
    const url = generateAuthorizationUrl({
      state: oauthStateVerifier,
      codeChallenge,
    });
    window.location.href = url;
  }

  if (!isExpanded) {
    return (
      <IntegrationSummary
        icon={<TwitterIcon className={styles.twitterIcon} />}
        title={"Twitter"}
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
      className={styles.Twitter}
      title={hasSubscription ? "Twitter" : "Connect your Twitter account"}
      icon={<TwitterIcon className={styles.twitterIcon} />}
      onCollapse={() => onExpand(false)}
    >
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {!hasSubscription && <div className={styles.description}>{DESCRIPTION}:</div>}
        {hasSubscription && (
          <div className={styles.section}>
            <div className={styles.keyValueRow}>
              <div className={styles.key}>Username</div>
              <div className={styles.value}>
                {integration?.settings?.username || integration?.settings?.user_id || "unknown"}
              </div>
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
                        .triggerTwitterRun({ id: integration.id })
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
            title={"Connect your Twitter account"}
            label={"Connect your Twitter account"}
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
                    .deleteTwitterIntegration({ id: integration.id })
                    .then(() => {
                      setIntegration(null);
                    })
                    .catch((error) => setError(error.message))
                    .finally(() => setIsLoading(false));
                  analyticsService.logEvent(events.twitterIntegrationRemoved({ source: sources.INTEGRATIONS }));
                } else {
                  apiLib.updateTwitterIntegration({ id: integration.id, enabled: !isEnabled });
                  analyticsService.logEvent(events.twitterIntegrationPaused({ source: sources.INTEGRATIONS }));
                }
              }}
            />
            <label className={styles.deleteContentWrapper}>
              <input
                type="checkbox"
                checked={shouldDeleteContent}
                onChange={(event) => setShouldDeleteContent(event.target.checked)}
              />
              <div>Delete all content originating from Twitter</div>
            </label>
          </div>
        )}
      </div>
    </BaseIntegration>
  );
}

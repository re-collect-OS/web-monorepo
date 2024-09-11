import React, { useState, useEffect } from "react";
import { relativeTimeAgo } from "js-shared-lib";
import { IconButton, ConnectIcon } from "web-shared-lib";

import apiLib from "../../libs/apiLib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";
import { MAC_DOWNLOAD_URL } from "../../config";

import BaseIntegration from "./BaseIntegration";

import IntegrationSummary from "./IntegrationSummary";

import appleNotesIconSrc from "./images/apple_notes.svg";

import styles from "./AppleNotes.module.css";

const DESCRIPTION = "Set up to bring your Apple Notes into your re:collect account";

export default function AppleNotes({ isExpanded, onExpand }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [integration, setIntegration] = useState(null);
  const [shouldDeleteContent, setShouldDeleteContent] = useState(false);

  const hasSubscription = !!integration;
  const isEnabled = hasSubscription && integration?.settings?.enabled;

  const setIntegrationState = (response) => {
    if (response) {
      setIntegration(response);
    }
  };

  useEffect(() => {
    // On mount try to load
    setIsLoading(true);
    setError(null);

    apiLib
      .listAppleNotesIntegrations()
      .then((response) => {
        setIntegrationState(response[0]);
      })
      .catch((error) => setError(error.message))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (!isExpanded) {
    return (
      <IntegrationSummary
        icon={<img src={appleNotesIconSrc} alt="Apple Notes icon" />}
        title={"Apple Notes"}
        description={DESCRIPTION}
        button={
          <IconButton
            disabled={isLoading}
            icon={hasSubscription ? null : <ConnectIcon />}
            variant={hasSubscription ? "grey" : "violet"}
            title={hasSubscription ? "Manage" : "Set up"}
            label={hasSubscription ? "Manage" : "Set up"}
            onClick={() => onExpand(true)}
          />
        }
      />
    );
  }

  const doConnect = () => {
    const url = "re-collect-ai://";

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.status == 200) {
        window.location.href = url;
        analyticsService.logEvent(events.appleNotesIntegrationMacAppLaunched({ source: sources.INTEGRATIONS }));
      } else {
        window.open(MAC_DOWNLOAD_URL);
        analyticsService.logEvent(events.appleNotesIntegrationMacAppDownloaded({ source: sources.INTEGRATIONS }));
      }
    };
    xhr.open("head", url);
    xhr.send(null);
  };

  return (
    <BaseIntegration
      className={styles.Twitter}
      title={hasSubscription ? "Apple Notes" : "Sync your Apple Notes"}
      icon={<img src={appleNotesIconSrc} alt="Apple Notes icon" />}
      onCollapse={() => onExpand(false)}
    >
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {!hasSubscription && (
          <div className={styles.description}>
            To set up,{" "}
            <a
              href={MAC_DOWNLOAD_URL}
              onClick={() =>
                analyticsService.logEvent(events.appleNotesIntegrationMacAppDownloaded({ source: sources.SETTINGS }))
              }
            >
              download
            </a>{" "}
            or launch the re:collect Mac Sidecar companion app and open Apple Notes:
          </div>
        )}
        {hasSubscription && (
          <div className={styles.section}>
            <div className={styles.keyValueRow}>
              <div className={styles.key}>Last synced</div>
              <div className={styles.value}>
                {integration?.status?.last_run ? relativeTimeAgo(integration.status.last_run) : "never"}
              </div>
            </div>
          </div>
        )}

        {!hasSubscription && (
          <IconButton
            disabled={isLoading}
            icon={<ConnectIcon />}
            size={"large"}
            variant={"violet"}
            title={"Download or launch Mac app"}
            label={"Download or launch Mac app"}
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
                    .deleteAppleNotesIntegration({ id: integration.id })
                    .then(() => {
                      setIntegration(null);
                    })
                    .catch((error) => setError(error.message))
                    .finally(() => setIsLoading(false));
                  analyticsService.logEvent(events.appleNotesIntegrationRemoved({ source: sources.INTEGRATIONS }));
                } else {
                  apiLib.updateAppleNotesIntegration({ id: integration.id, enabled: !isEnabled });
                  analyticsService.logEvent(events.appleNotesIntegrationPaused({ source: sources.INTEGRATIONS }));
                }
              }}
            />
            <label className={styles.deleteContentWrapper}>
              <input
                type="checkbox"
                checked={shouldDeleteContent}
                onChange={(event) => setShouldDeleteContent(event.target.checked)}
              />
              <div>Delete all content originating from Apple Notes</div>
            </label>
          </div>
        )}
      </div>
    </BaseIntegration>
  );
}

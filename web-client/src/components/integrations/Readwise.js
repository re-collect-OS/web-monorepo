import React, { useEffect, useState } from "react";
import { relativeTimeAgo } from "js-shared-lib";
import { ReadwiseIcon, IconButton, ConnectIcon, Switch } from "web-shared-lib";

import apiLib from "../../libs/apiLib";
import { DEBUG } from "../../config";
import { events, analyticsService, sources } from "../../libs/analyticsLib";

import BaseIntegration from "./BaseIntegration";

import IntegrationSummary from "./IntegrationSummary";

import styles from "./Readwise.module.css";

export default function Readwise({ isExpanded, onExpand }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState("");
  const [syncClassicContent, setSyncClassicContent] = useState(true);
  const [syncReaderContent, setSyncReaderContent] = useState(true);
  const [readerIntegration, setReaderIntegration] = useState(null);
  const [classicIntegration, setClassicIntegration] = useState(null);
  const [shouldDeleteContent, setShouldDeleteContent] = useState(false);

  const setClassicIntegrationState = (response) => {
    if (response) {
      setClassicIntegration(response);
      setSyncClassicContent(response.settings.enabled);
      if (response.status?.last_run_status === "permanent_failure") {
        setError("Could not sync Readwise data. Please check your access token.");
      }
    } else {
      setSyncClassicContent(false);
    }
  };

  const setReaderIntegrationState = (response) => {
    if (response) {
      setReaderIntegration(response);
      setSyncReaderContent(response.settings.enabled);
      if (response.status?.last_run_status === "permanent_failure") {
        setError("Could not sync Readwise data. Please check your access token.");
      }
    } else {
      setSyncReaderContent(false);
    }
  };

  useEffect(() => {
    // On mount try to load
    setIsLoading(true);
    setError(null);

    Promise.all([apiLib.listReadwiseClassicIntegrations(), apiLib.listReadwiseReaderIntegrations()])
      .then((responses) => {
        const classicIntegrationResponse = responses[0];
        const readerIntegrationResponse = responses[1];
        const hasSubscriptions = !!(classicIntegrationResponse.length || readerIntegrationResponse.length);
        if (hasSubscriptions) {
          setClassicIntegrationState(classicIntegrationResponse[0]);
          setReaderIntegrationState(readerIntegrationResponse[0]);
        }
        const token =
          readerIntegrationResponse[0]?.settings.access_token || classicIntegrationResponse[0]?.settings.access_token;
        if (token) {
          setToken(token);
        }
      })
      .catch((error) => setError(error.message))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const doConnect = () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      ...(syncClassicContent ? [apiLib.pushReadwiseClassicIntegration({ accessToken: token })] : []),
      ...(syncReaderContent ? [apiLib.pushReadwiseReaderIntegration({ accessToken: token })] : []),
    ])
      .then((responses) => {
        if (syncClassicContent && syncReaderContent) {
          setClassicIntegrationState(responses[0]);
          setReaderIntegrationState(responses[1]);
        } else if (syncClassicContent) {
          setClassicIntegrationState(responses[0]);
        } else if (syncReaderContent) {
          setReaderIntegrationState(responses[0]);
        }

        analyticsService.logEvent(
          events.readwiseIntegrationAdded({
            hasReaderIntegration: syncReaderContent,
            hasClassicIntegration: syncClassicContent,
            source: sources.INTEGRATIONS,
          })
        );
      })
      .catch((error) => {
        let message = error.message;
        if (error.response?.data?.detail) {
          message = error.response.data.detail;
        }
        setError(message);

        analyticsService.logEvent(
          events.readwiseIntegrationFailed({
            status: error.response?.status,
            message,
            source: sources.INTEGRATIONS,
          })
        );
      })
      .finally(() => setIsLoading(false));
  };

  const hasSubscriptions = !!(readerIntegration || classicIntegration);
  const isEnabled = (hasSubscriptions && readerIntegration?.settings?.enabled) || classicIntegration?.settings?.enabled;

  if (!isExpanded) {
    return (
      <IntegrationSummary
        icon={<ReadwiseIcon />}
        title={"Readwise"}
        description={"Connect and import articles and highlights from Readwise into your re:collect account"}
        button={
          <IconButton
            disabled={isLoading}
            icon={hasSubscriptions ? null : <ConnectIcon />}
            variant={hasSubscriptions ? "grey" : "violet"}
            title={hasSubscriptions ? "Manage" : "Connect"}
            label={hasSubscriptions ? "Manage" : "Connect"}
            onClick={() => onExpand(true)}
          />
        }
      />
    );
  }

  return (
    <BaseIntegration
      className={styles.Readwise}
      title={hasSubscriptions ? "Readwise" : "Connect your Readwise account"}
      icon={<ReadwiseIcon />}
      onCollapse={() => onExpand(false)}
    >
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {!hasSubscriptions && (
          <div className={styles.description}>
            To connect re:collect to your Readwise account generate an access token by visiting:{" "}
            <a href={"https://readwise.io/access_token"} target={"_blank"} rel={"noreferrer"}>
              readwise.io/access_token
            </a>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.title}>Access Token</div>
          <input
            type={"text"}
            className={styles.tokenInput}
            placeholder={"Paste your access token here"}
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          {hasSubscriptions && (
            <IconButton
              disabled={isLoading || !token}
              title={"Update access token"}
              label={"Update access token"}
              onClick={() => {
                setIsLoading(true);
                setError(null);

                Promise.all([
                  ...(classicIntegration
                    ? [apiLib.updateReadwiseClassicIntegration({ id: classicIntegration.id, accessToken: token })]
                    : []),
                  ...(readerIntegration
                    ? [apiLib.updateReadwiseReaderIntegration({ id: readerIntegration.id, accessToken: token })]
                    : []),
                ])
                  .then((responses) => {
                    setClassicIntegrationState(responses[0]);
                    setReaderIntegrationState(responses[1]);
                  })
                  .catch((error) => setError(error.message))
                  .finally(() => setIsLoading(false));

                analyticsService.logEvent(
                  events.readwiseIntegrationUpdatedAccessToken({ source: sources.INTEGRATIONS })
                );
              }}
            />
          )}
        </div>
        <div className={styles.section}>
          <div className={styles.title}>Pick content types to sync</div>
          <div className={styles.keyValueRow}>
            <div className={styles.key}>Book highlights</div>
            <div className={styles.value}>
              <Switch
                checked={syncClassicContent}
                onCheckedChange={(checked) => {
                  if (!hasSubscriptions) {
                    setSyncClassicContent((prev) => !prev);
                    return;
                  }
                  if (!classicIntegration) {
                    setSyncClassicContent(true);
                    setIsLoading(true);
                    apiLib
                      .pushReadwiseClassicIntegration({ accessToken: token })
                      .then((response) => {
                        setClassicIntegrationState(response);
                      })
                      .finally(() => setIsLoading(false));
                  } else {
                    const value = !syncClassicContent;
                    setSyncClassicContent(value);
                    setIsLoading(true);
                    apiLib
                      .updateReadwiseClassicIntegration({ id: classicIntegration.id, enabled: value })
                      .then((response) => {
                        setClassicIntegrationState(response);
                      })
                      .finally(() => setIsLoading(false));
                  }
                  analyticsService.logEvent(
                    events.readwiseIntegrationToggledClassic({ checked, source: sources.INTEGRATIONS })
                  );
                }}
              />
            </div>
          </div>

          <div className={styles.keyValueRow}>
            <div className={styles.key}>Reader articles, PDFs and YouTube videos</div>
            <div className={styles.value}>
              <Switch
                checked={syncReaderContent}
                onCheckedChange={(checked) => {
                  if (!hasSubscriptions) {
                    setSyncReaderContent((prev) => !prev);
                    return;
                  }
                  if (!readerIntegration) {
                    setSyncReaderContent(true);
                    setIsLoading(true);
                    apiLib
                      .pushReadwiseReaderIntegration({ accessToken: token })
                      .then((response) => {
                        setClassicIntegrationState(response);
                      })
                      .finally(() => setIsLoading(false));
                  } else {
                    const value = !syncReaderContent;
                    setSyncClassicContent(value);
                    setIsLoading(true);
                    apiLib
                      .updateReadwiseReaderIntegration({ id: readerIntegration.id, enabled: value })
                      .then((response) => {
                        setReaderIntegrationState(response);
                      })
                      .finally(() => setIsLoading(false));
                  }
                  analyticsService.logEvent(
                    events.readwiseIntegrationToggledReader({ checked, source: sources.INTEGRATIONS })
                  );
                }}
              />
            </div>
          </div>
          {hasSubscriptions && (
            <>
              <div className={styles.separator} />
              <div className={styles.keyValueRow}>
                <div className={styles.key}>Last synced book highlights</div>
                <div className={styles.value}>
                  {classicIntegration?.status?.last_run
                    ? relativeTimeAgo(classicIntegration?.status?.last_run)
                    : "never"}
                </div>
              </div>
              <div className={styles.keyValueRow}>
                <div className={styles.key}>Last synced Reader</div>
                <div className={styles.value}>
                  {readerIntegration?.status?.last_run ? relativeTimeAgo(readerIntegration?.status?.last_run) : "never"}
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
                        Promise.all([
                          ...(classicIntegration
                            ? [apiLib.triggerReadwiseReaderRun({ id: classicIntegration.id })]
                            : []),
                          ...(readerIntegration
                            ? [apiLib.triggerReadwiseClassicRun({ id: readerIntegration.id })]
                            : []),
                        ])
                          .then(() => {
                            alert(
                              "Sync requested successfully. Reload the page in a minute or so to check sync status."
                            );
                          })
                          .catch((error) => setError(error.message))
                          .finally(() => setIsLoading(false));
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!hasSubscriptions && (
          <IconButton
            disabled={isLoading || !token || !(syncReaderContent || syncClassicContent)}
            icon={<ConnectIcon />}
            size={"large"}
            variant={"violet"}
            title={"Connect & sync"}
            label={"Connect & sync"}
            onClick={() => doConnect()}
          />
        )}
        {hasSubscriptions && (
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
                  Promise.all([
                    ...(classicIntegration
                      ? [apiLib.deleteReadwiseReaderIntegration({ id: classicIntegration.id })]
                      : []),
                    ...(readerIntegration
                      ? [apiLib.deleteReadwiseReaderIntegration({ id: readerIntegration.id })]
                      : []),
                  ])
                    .then(() => {
                      setReaderIntegration(null);
                      setClassicIntegration(null);
                      setToken("");
                    })
                    .catch((error) => setError(error.message))
                    .finally(() => setIsLoading(false));

                  analyticsService.logEvent(events.readwiseIntegrationRemoved({ source: sources.INTEGRATIONS }));
                } else {
                  Promise.all([
                    ...(classicIntegration
                      ? [apiLib.updateReadwiseClassicIntegration({ id: classicIntegration.id, enabled: !isEnabled })]
                      : []),
                    ...(readerIntegration
                      ? [apiLib.updateReadwiseReaderIntegration({ id: readerIntegration.id, enabled: !isEnabled })]
                      : []),
                  ])
                    .then((responses) => {
                      setClassicIntegrationState(responses[0]);
                      setReaderIntegrationState(responses[1]);
                    })
                    .catch((error) => setError(error.message))
                    .finally(() => setIsLoading(false));

                  analyticsService.logEvent(events.readwiseIntegrationPaused({ source: sources.INTEGRATIONS }));
                }
              }}
            />
            <label className={styles.deleteContentWrapper}>
              <input
                type="checkbox"
                checked={shouldDeleteContent}
                onChange={(event) => setShouldDeleteContent(event.target.checked)}
              />
              <div>Delete all content originating from Readwise</div>
            </label>
          </div>
        )}
      </div>
    </BaseIntegration>
  );
}

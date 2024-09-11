import React, { useState } from "react";
import cn from "classnames";
import { relativeTimeAgo, extractHostname } from "js-shared-lib";
import { IconButton, LoadingIndicator, SmallCrossIcon, Switch, WavesIcon } from "web-shared-lib";

import apiLib from "../../libs/apiLib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";

import styles from "./Feed.module.css";

function Feed({
  created,
  doSubscriptionResync,
  icon,
  isExpanded,
  lastSynced,
  onCollapse,
  onExpand,
  onManageContent,
  onUnsubscribe,
  shouldProcessLinksInitial,
  syncPaused,
  title,
  url,
}) {
  const [shouldDeleteContent, setShouldDeleteContent] = useState(false);
  const [shouldProcessLinks, setShouldProcessLinks] = useState(shouldProcessLinksInitial);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  let iconComponent = <WavesIcon />;
  if (icon) {
    iconComponent = <img src={icon} />;
  } else if (!lastSynced) {
    iconComponent = <LoadingIndicator inline className={styles.loadingIcon} />;
  }

  return (
    <div
      className={cn(styles.Feed, {
        [styles.isExpanded]: isExpanded,
        [styles.isPaused]: syncPaused,
      })}
    >
      <div className={styles.header}>
        <div className={styles.icon}>{iconComponent}</div>
        <div className={styles.titleWrapper}>
          <div className={styles.title}>{title || url}</div>
          <div className={styles.description}>
            {lastSynced
              ? `${extractHostname(url)}${syncPaused ? " (paused)" : ""}`
              : "(initial sync may take some time)"}
          </div>
        </div>
        {isExpanded && <IconButton icon={<SmallCrossIcon />} title={"Dismiss"} onClick={onCollapse} />}
      </div>
      {!isExpanded && (
        <div className={styles.nav}>
          <IconButton
            title={"Manage subscription content"}
            label={"Manage content"}
            variant={syncPaused ? "grey" : "violet"}
            onClick={onManageContent}
            style={{ visibility: "hidden" }}
          />

          <IconButton
            title={"Manage subscription"}
            label={"Edit"}
            variant={syncPaused ? "grey" : "violet"}
            onClick={onExpand}
          />
        </div>
      )}
      {isExpanded && (
        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.keyValueRow}>
            <div className={styles.key}>URL</div>
            <div className={styles.value}>{url}</div>
          </div>
          {!syncPaused && (
            <>
              <div className={styles.keyValueRow}>
                <div className={styles.key}>Subscribed</div>
                <div className={styles.value}>{relativeTimeAgo(created)}</div>
              </div>
              <div className={styles.keyValueRow}>
                <div className={styles.key}>Last synced</div>
                <div className={styles.value}>{lastSynced ? relativeTimeAgo(lastSynced) : "never"}</div>
              </div>
              <div className={cn(styles.keyValueRow, styles.isFlipped)}>
                <div className={styles.key}>Collect links mentioned in the newsletter</div>
                <div className={styles.value}>
                  <Switch
                    className={styles.shouldProcessLinksSwitch}
                    checked={shouldProcessLinks}
                    disabled={isLoading}
                    onCheckedChange={(checked) => {
                      const prevValue = shouldProcessLinks;
                      // Optimistically update state
                      setShouldProcessLinks(checked);
                      setIsLoading(true);
                      setError(null);

                      apiLib
                        .pushRssSubscription({ feedUrl: url, shouldProcessLinks: checked })
                        .then(() => {
                          doSubscriptionResync();
                        })
                        .catch((error) => {
                          setError(error.message);
                          // Revert
                          setShouldProcessLinks(prevValue);
                        })
                        .finally(() => {
                          setIsLoading(false);
                        });
                      analyticsService.logEvent(
                        events.rssFeedToggledCollectLinks({
                          checked: shouldProcessLinks,
                          source: sources.RSS_SUBSCRIPTIONS,
                        })
                      );
                    }}
                  />
                </div>
              </div>
            </>
          )}
          <div className={styles.actionsWrapper}>
            <div>
              {syncPaused && !shouldDeleteContent ? (
                <IconButton
                  className={styles.unsubscribeButton}
                  title={"Resume subscription"}
                  label={"Resume subscription"}
                  disabled={isLoading}
                  onClick={() => {
                    setIsLoading(true);
                    setError(null);
                    apiLib
                      .pushRssSubscription({ feedUrl: url, syncPaused: false })
                      .then(() => {
                        doSubscriptionResync();
                        onCollapse();
                      })
                      .catch((error) => {
                        setError(error.message);
                      })
                      .finally(() => {
                        setIsLoading(false);
                      });
                  }}
                />
              ) : (
                <IconButton
                  className={styles.unsubscribeButton}
                  title={shouldDeleteContent ? "Remove subscription" : "Pause subscription"}
                  label={shouldDeleteContent ? "Remove subscription" : "Pause subscription"}
                  variant={"destructive"}
                  disabled={isLoading}
                  onClick={() => {
                    setIsLoading(true);
                    setError(null);
                    if (shouldDeleteContent) {
                      // Delete feed and content
                      apiLib
                        .deleteRssSubscription({ feedUrl: url, deleteFeedArticles: true })
                        .then(() => {
                          doSubscriptionResync();
                          onUnsubscribe();
                        })
                        .catch((error) => {
                          setError(error.message);
                        })
                        .finally(() => {
                          setIsLoading(false);
                        });
                      analyticsService.logEvent(
                        events.rssFeedRemoved({
                          hostname: extractHostname(url),
                          source: sources.RSS_SUBSCRIPTIONS,
                        })
                      );
                    } else {
                      // Update feed and pause sync
                      apiLib
                        .pushRssSubscription({ feedUrl: url, syncPaused: true })
                        .then(() => {
                          doSubscriptionResync();
                          onUnsubscribe();
                        })
                        .catch((error) => {
                          setError(error.message);
                        })
                        .finally(() => {
                          setIsLoading(false);
                        });
                      analyticsService.logEvent(
                        events.rssFeedPaused({
                          hostname: extractHostname(url),
                          source: sources.RSS_SUBSCRIPTIONS,
                        })
                      );
                    }
                  }}
                />
              )}
            </div>
            <label className={styles.deleteContentWrapper}>
              <input
                type="checkbox"
                checked={shouldDeleteContent}
                onChange={(event) => setShouldDeleteContent(event.target.checked)}
              />
              <div>Delete all content originating from this feed</div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;

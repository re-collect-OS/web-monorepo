import React, { useState } from "react";
import cn from "classnames";
import { IconButton, SmallCrossIcon, Switch, WavesIcon } from "web-shared-lib";
import { extractHostname } from "js-shared-lib";

import apiLib from "../../libs/apiLib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";

import styles from "./Feed.module.css";

function isValidUrl(string) {
  const urlStr = string.startsWith("http") ? string : `https://${string}`;
  try {
    new URL(urlStr);
    return true;
  } catch (err) {
    return false;
  }
}

function AddSubscriptionForm({ doSubscriptionResync, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [shouldProcessLinks, setShouldProcessLinks] = useState(false);
  const [error, setError] = useState(null);

  const isValidFeedUrl = !!feedUrl && isValidUrl(feedUrl);

  return (
    <div className={cn(styles.Feed, styles.isExpanded)}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <div className={styles.title}>Add a subscription</div>
        </div>
        <IconButton icon={<SmallCrossIcon />} title={"Dismiss"} onClick={onClose} />
      </div>
      <div className={styles.body}>
        {error && <div className={styles.error}>{error}</div>}
        <form
          className={styles.SubscribeForm}
          onSubmit={(event) => {
            event.preventDefault();

            if (!isValidFeedUrl) {
              return;
            }

            setIsLoading(true);
            setError(null);
            const validFeedUrl = feedUrl.startsWith("http") ? feedUrl : `https://${feedUrl}`;
            apiLib
              .pushRssSubscription({ feedUrl: validFeedUrl, shouldProcessLinks })
              .then(() => {
                // record
                // setSubscriptions((prev) => [record, ...prev]);
                doSubscriptionResync();
                setFeedUrl("");
                onClose();
                analyticsService.logEvent(
                  events.rssFeedAdded({
                    hostname: extractHostname(validFeedUrl),
                    source: sources.RSS_SUBSCRIPTIONS,
                  })
                );
              })
              .catch((error) => {
                const data = error.response?.data;
                // TODO hacky
                if (error.response?.status === 400 && data?.detail) {
                  if (data.detail.includes("Malformed=True")) {
                    setError("Failed to subscribe: URL is not a valid RSS/Atom feed");
                  } else if (data.detail.includes("Could not find an RSS/Atom feed")) {
                    setError("Failed to subscribe: could not find a RSS/Atom feed for domain");
                  } else {
                    setError("Failed to load feed");
                  }
                } else {
                  setError(error.message || `Unexpected response: ${error.response?.status}`);
                }
                console.log(error);
                analyticsService.logEvent(
                  events.rssAddFeedFailed({
                    hostname: extractHostname(validFeedUrl),
                    source: sources.RSS_SUBSCRIPTIONS,
                    status: error.response?.status,
                  })
                );
              })
              .finally(() => {
                setIsLoading(false);
              });
          }}
        >
          <div className={styles.inputFormGroup}>
            <input
              type="text"
              placeholder="Newsletter or RSS feed link"
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value.trim())}
              autoFocus
            />
            <label className={styles.processLinksOptInFormGroup}>
              <div className={styles.label}>Collect links mentioned in the newsletter</div>
              <Switch
                className={styles.shouldProcessLinksSwitch}
                checked={shouldProcessLinks}
                onCheckedChange={(checked) => setShouldProcessLinks(checked)}
                disabled={isLoading}
              />
            </label>
          </div>
          <div className={styles.subscribeButtonWrapper}>
            <IconButton
              icon={<WavesIcon />}
              title={"Subscribe to feed"}
              label={"Subscribe to feed"}
              size="large"
              variant="violet"
              disabled={!isValidFeedUrl || isLoading}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSubscriptionForm;

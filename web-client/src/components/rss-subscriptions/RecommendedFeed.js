import React, { useState } from "react";
import { extractHostname } from "js-shared-lib";
import { IconButton, WavesIcon, CheckIcon } from "web-shared-lib";

import apiLib from "../../libs/apiLib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";

import styles from "./RecommendedFeed.module.css";

function RecommendedFeed({ icon, title, url, feedUrl, onSubscribed, isSubscribed }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className={styles.RecommendedFeed}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <img src={icon} alt={title} />
        </div>
        <div className={styles.titleWrapper}>
          <div className={styles.title}>{title}</div>
          <div className={styles.description}>{extractHostname(url)}</div>
        </div>
      </div>
      <div className={styles.nav}>
        <IconButton
          as={"a"}
          href={url}
          label={"Learn more"}
          title={"Learn more"}
          target={"_blank"}
          rel={"noreferrer"}
        />
        <IconButton
          icon={isSubscribed ? <CheckIcon /> : <WavesIcon />}
          label={isLoading ? "Subscribing..." : isSubscribed ? "Subscribed" : "Subscribe to feed"}
          title={isLoading ? "Subscribing..." : isSubscribed ? "Subscribed" : "Subscribe to feed"}
          disabled={isLoading || isSubscribed}
          onClick={() => {
            setIsLoading(true);
            apiLib
              .pushRssSubscription({ feedUrl, shouldProcessLinks: false })
              .then(() => {
                onSubscribed(feedUrl);
                analyticsService.logEvent(
                  events.rssFeedAdded({
                    hostname: extractHostname(feedUrl),
                    source: sources.RSS_SUBSCRIPTIONS_RECOMMENDATION,
                  })
                );
              })
              .catch(() => {
                // noop
              })
              .finally(() => {
                setIsLoading(false);
              });
          }}
        />
      </div>
    </div>
  );
}

export default RecommendedFeed;

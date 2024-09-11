import React, { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import { shallow } from "zustand/shallow";
import { AddIcon, IconButton, LoadingIndicator } from "web-shared-lib";

import { useHash } from "../../utils/router";
import { useStore } from "../../store";
import { onError } from "../../libs/errorLib";
import { sources } from "../../libs/analyticsLib";
import FeedbackButton from "../common/feedback-button";
import PageHeader from "../common/page-header";

import Feed from "./Feed";
import AddSubscriptionForm from "./AddSubscriptionForm";
import RecommendedFeed from "./RecommendedFeed";

import superorganizersSrc from "./images/superorganizers.png";
import bensBitesSrc from "./images/bensbites.png";
import notBoringSrc from "./images/notboring.png";

import styles from "./RssSubscriptions.module.css";

const AUTO_SYNC_TIMEOUT = 30 * 1000;
let lastSyncTimer = null;

function schedule(sync) {
  if (lastSyncTimer) {
    clearTimeout(lastSyncTimer);
  }
  lastSyncTimer = setTimeout(function () {
    sync()
      .catch((error) => onError(error))
      .finally(() => {
        lastSyncTimer = null;
      });
  }, AUTO_SYNC_TIMEOUT);
}

const selector = (state) => ({
  subscriptions: state.subscriptions.records,
  isLoading: state.subscriptions.status === "loading",
  error: state.subscriptions.status === "error",
  doSubscriptionsLoad: state.doSubscriptionsLoad,
});

export default function RssSubscriptions() {
  const { subscriptions, isLoading, error, doSubscriptionsLoad } = useStore(selector, shallow);
  const routerHash = useHash();
  const shouldAddSubscriptionOnMount = !!routerHash.get("add_subscription");

  const [expandedFeedUrl, setExpandedFeedUrl] = useState(null);
  const [showAddForm, setShowAddForm] = useState(shouldAddSubscriptionOnMount);
  const [showHelpMessage, setShowHelpMessage] = useState(
    shouldAddSubscriptionOnMount ? !shouldAddSubscriptionOnMount : null
  );
  const contentWrapperRef = useRef(null);

  const history = useHistory();

  useEffect(() => {
    // Schedule re-sync if we have any results that have never fully syncd
    const hasLoading = !!subscriptions.find((s) => !s.last_synced);
    if (hasLoading) {
      schedule(doSubscriptionsLoad);
    }
  }, [subscriptions, doSubscriptionsLoad]);

  const isFeedEmpty = !subscriptions.length && !isLoading;

  const onSubscribed = () => {
    doSubscriptionsLoad();
    contentWrapperRef.current?.scrollTo(0, 0);
  };

  return (
    <div className={styles.RssSubscriptions}>
      <div className={styles.contentWrapper} ref={contentWrapperRef}>
        <div className={styles.header}>
          <PageHeader title={"Newsletter Subscriptions"}>
            {((!showHelpMessage && !isFeedEmpty) || showHelpMessage === false) && (
              <div className={styles.description}>
                <p>
                  Add newsletters to your account with subscriptions and resurface insights from them via Recall.{" "}
                  <a href="#" onClick={() => setShowHelpMessage(true)}>
                    Learn more
                  </a>
                </p>
              </div>
            )}
            {(showHelpMessage || (isFeedEmpty && showHelpMessage === null)) && (
              <div className={styles.description}>
                <p>
                  <strong>
                    Add newsletters to your account with subscriptions and resurface insights from them via Recall.
                  </strong>
                </p>
                <div className={styles.descriptionNav}>
                  {isFeedEmpty && (
                    <IconButton
                      icon={<AddIcon />}
                      title={"Add newsletter subscription"}
                      label={"Add subscription"}
                      size={"large"}
                      variant={"violet"}
                      onClick={() => {
                        setShowAddForm(true);
                        setShowHelpMessage(false);
                      }}
                    />
                  )}
                  <FeedbackButton
                    label={"Thoughts? Share feedback"}
                    eventSource={sources.RSS_SUBSCRIPTIONS}
                    size={"large"}
                    variant={isFeedEmpty ? "grey" : "violet"}
                  />
                  {!isFeedEmpty && (
                    <IconButton
                      label={"Dismiss"}
                      title={"Dismiss help message"}
                      size={"large"}
                      onClick={() => setShowHelpMessage(false)}
                    />
                  )}
                </div>
              </div>
            )}
          </PageHeader>
          {!isFeedEmpty && !showHelpMessage && (
            <div className={styles.addSubscriptionBtn}>
              <IconButton
                icon={<AddIcon />}
                title={"Add newsletter subscription"}
                label={"Add subscription"}
                size={"large"}
                onClick={() => {
                  setShowAddForm(true);
                  setShowHelpMessage(false);
                }}
              />
            </div>
          )}
        </div>
        {error && <div className={styles.error}>Failed to load Subscriptions</div>}
        <div className={styles.feedList}>
          {showAddForm && (
            <AddSubscriptionForm
              onClose={() => setShowAddForm(false)}
              doSubscriptionResync={() => doSubscriptionsLoad()}
            />
          )}
          {isLoading && <LoadingIndicator />}
          {!isLoading &&
            subscriptions.map(
              ({ feed_icon, feed_url, feed_title, created, last_synced, process_content_links, sync_paused }) => (
                <Feed
                  key={`${feed_url}-${process_content_links ? "links" : "no-links"}`} // re-mount component when draft state changes
                  url={feed_url}
                  icon={feed_icon}
                  title={feed_title}
                  created={created}
                  lastSynced={last_synced}
                  shouldProcessLinksInitial={process_content_links}
                  syncPaused={sync_paused}
                  isExpanded={expandedFeedUrl === feed_url}
                  onExpand={() => setExpandedFeedUrl(feed_url)}
                  onManageContent={() => history.push("/library")}
                  onCollapse={() => setExpandedFeedUrl(null)}
                  onUnsubscribe={() => {
                    setExpandedFeedUrl(null);
                  }}
                  doSubscriptionResync={() => doSubscriptionsLoad()}
                />
              )
            )}
        </div>
        {!isLoading && (
          <>
            <div className={styles.header}>
              <PageHeader
                title={"Need some inspiration?"}
                description={"Here are some popular newsletters we think you’ll enjoy:"}
                size={"small"}
              />
            </div>
            <div className={styles.feedList}>
              <RecommendedFeed
                icon={superorganizersSrc}
                title={"Superorganizers"}
                url={"https://every.to/superorganizers"}
                feedUrl={"https://every.to/superorganizers/feed.xml"}
                isSubscribed={
                  !!subscriptions.find(({ feed_url }) => feed_url === "https://every.to/superorganizers/feed.xml")
                }
                onSubscribed={onSubscribed}
              />
              <RecommendedFeed
                icon={bensBitesSrc}
                title={"Ben's Bites"}
                url={"https://bensbites.co"}
                feedUrl={"https://rss.beehiiv.com/feeds/moS8GVKETl.xml"}
                isSubscribed={
                  !!subscriptions.find(({ feed_url }) => feed_url === "https://rss.beehiiv.com/feeds/moS8GVKETl.xml")
                }
                onSubscribed={onSubscribed}
              />
              <RecommendedFeed
                icon={notBoringSrc}
                title={"Not Boring by Packy McCormick"}
                url={"https://www.notboring.co"}
                feedUrl={"https://www.notboring.co/feed"}
                isSubscribed={!!subscriptions.find(({ feed_url }) => feed_url === "https://www.notboring.co/feed")}
                onSubscribed={onSubscribed}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

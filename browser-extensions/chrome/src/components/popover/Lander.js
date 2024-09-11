import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import { IconButton, NoConnectionIcon, CompactSwitch, WavesIcon } from "web-shared-lib";
import { extractHostname } from "js-shared-lib";

import styles from "./Lander.module.css";

import { events, analyticsService } from "../../libs/analyticsLib";

function AutoCollectButton({ isDisabled, isChecked, onCheckedChange, canAutoCollect, isTweet, isYouTube, hostname }) {
  let title;
  if (canAutoCollect) {
    if (isTweet) {
      title = "Automatically collect tweets";
    } else if (isYouTube) {
      title = "Automatically collect video transcripts";
    } else {
      title = `Automatically collect articles and PDFs from ${hostname}`;
    }
  } else {
    if (isTweet) {
      title = "We can't automatically collect tweets but you can manually save them.";
    } else if (isYouTube) {
      title = "We can't automatically collect video transcripts but you can manually save them.";
    } else {
      title = `We can't automatically collect articles and PDFs from ${hostname}`;
    }
  }
  return (
    <label className={cn(styles.AutoCollectButton, { [styles.cannotAutoCollect]: !canAutoCollect })} title={title}>
      <span className={styles.label}>Auto-collect</span>
      <CompactSwitch
        className={styles.switch}
        checked={isChecked}
        disabled={isDisabled || !canAutoCollect}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}

AutoCollectButton.propTypes = {
  canAutoCollect: PropTypes.bool,
  hostname: PropTypes.string.isRequired,
  isChecked: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool,
  isTweet: PropTypes.bool,
  isYouTube: PropTypes.bool,
  onCheckedChange: PropTypes.func.isRequired,
};

function OnlineLander({
  canAutoCollect,
  canCollect,
  error,
  isAutoCollecting,
  isRemembered,
  isSubscribed,
  onForgetVisit,
  onOptIn,
  onOptOut,
  onSubmitVisit,
  onSubscribe,
  rememberedTimeAgo,
  status,
  tabInfo,
}) {
  const { hostname, isTweet, isProbablyArticle, isYouTube } = tabInfo || {};
  let rememberButtonLabel = isRemembered ? "Forget" : "Save link";
  if (isProbablyArticle) {
    rememberButtonLabel = isRemembered ? "Forget" : "Remember";
  } else if (isTweet) {
    rememberButtonLabel = isRemembered ? "Forget" : "Save tweet";
  } else if (isYouTube) {
    rememberButtonLabel = isRemembered ? "Forget" : "Save transcript";
  }

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [subscribeError, setSubscribeError] = useState(null);

  let sorryTitle = "Sorry, we can’t collect this website";
  if (hostname === "twitter.com") {
    sorryTitle = "Please open a specific tweet to collect it";
  } else if (hostname === "youtube.com") {
    sorryTitle = "Please open a specific YouTube video to collect it";
  }

  return (
    <div className={styles.Lander}>
      <div className={styles.tabWrapper}>
        {canCollect && (
          <>
            <div className={styles.tabInfo}>
              <div className={styles.title}>{tabInfo.title}</div>
              <div
                className={cn(styles.hostnameWrapper, {
                  [styles.isSubscribed]: isSubscribed,
                  [styles.isNew]: isNew,
                })}
              >
                {isSubscribed && <WavesIcon className={styles.icon} />}
                <div className={styles.hostname}>{hostname}</div>
              </div>
            </div>
            <div className={styles.tabActions}>
              <IconButton
                type={"button"}
                disabled={status === "submitting-visit"}
                className={cn({ [styles.forgetBtn]: isRemembered })}
                variant={isRemembered ? "rose" : "violet"}
                label={rememberButtonLabel}
                title={isRemembered ? `Remembered ${rememberedTimeAgo}` : `Collect ${tabInfo.url}`}
                onClick={() => {
                  isRemembered ? onForgetVisit() : onSubmitVisit();
                }}
              />
              <AutoCollectButton
                canAutoCollect={canAutoCollect}
                isDisabled={status === "submitting-hostname"}
                isTweet={isTweet}
                isYouTube={isYouTube}
                hostname={hostname}
                isChecked={isAutoCollecting}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onOptIn();
                  } else {
                    onOptOut();
                  }
                }}
              />
            </div>
            {tabInfo.feedUrl && !isSubscribed && (
              <div className={styles.subscribeWrapper}>
                <div className={styles.leftCol}>
                  <WavesIcon className={styles.icon} />
                  <div>
                    Newsletter detected.{" "}
                    <a
                      href={
                        "https://www.notion.so/re-collect/re-collect-Help-and-Support-Guide-acb140d8b0fa42ddbbe21d96fa3bfa75?pvs=4#293c7ac9c1f84e74988c75667d66d770"
                      }
                      target={"_blank"}
                      rel={"noreferrer"}
                    >
                      Learn more
                    </a>
                  </div>
                </div>
                <div className={styles.rightCol}>
                  <IconButton
                    disabled={isSubscribing}
                    type={"button"}
                    label={isSubscribing ? "Subscribing..." : "Subscribe"}
                    title={"Subscribe to RSS feed"}
                    onClick={() => {
                      setSubscribeError(null);
                      setIsSubscribing(true);
                      onSubscribe()
                        .then(() => {
                          setIsNew(true);
                          setTimeout(() => {
                            setIsNew(false);
                          }, 2000); // matches css transition length (probably overkill?)
                        })
                        .catch((error) => {
                          setSubscribeError(error.message);
                          events.popupRssAddFeedFailed({
                            hostname: extractHostname(tabInfo.feedUrl),
                            status: error.response?.status,
                          });
                        })
                        .finally(() => {
                          setIsSubscribing(false);
                        });
                      analyticsService.logEvent(
                        events.popupRssFeedAdded({ hostname: extractHostname(tabInfo.feedUrl) })
                      );
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!canCollect && (
          <div className={cn(styles.tabInfo, styles.cannotCollect)}>
            <div className={styles.title}>{sorryTitle}</div>
            <div className={styles.notArticleCopy}>
              Think this is a mistake?{" "}
              <a
                href={"#"}
                onClick={(event) => {
                  event.preventDefault();

                  chrome.runtime.sendMessage({ action: "send-feedback-email" });
                  analyticsService.logEvent(events.popupFeedbackInitiated());
                }}
              >
                Contact us
              </a>
            </div>
          </div>
        )}

        {!!error && <div className={styles.error}>{error}</div>}
        {!!subscribeError && <div className={styles.error}>{subscribeError}</div>}
      </div>
    </div>
  );
}

OnlineLander.propTypes = {
  canAutoCollect: PropTypes.bool,
  canCollect: PropTypes.bool,
  error: PropTypes.string,
  isAutoCollecting: PropTypes.bool,
  isRemembered: PropTypes.bool,
  isSubscribed: PropTypes.bool,
  onForgetVisit: PropTypes.func.isRequired,
  onOptIn: PropTypes.func.isRequired,
  onOptOut: PropTypes.func.isRequired,
  onSubmitVisit: PropTypes.func.isRequired,
  onSubscribe: PropTypes.func.isRequired,
  rememberedTimeAgo: PropTypes.string,
  status: PropTypes.oneOf(["loading", "loaded", "submitting-visit", "submitting-hostname"]),
  tabInfo: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    url: PropTypes.string,
    hostname: PropTypes.string,
    isPDF: PropTypes.bool,
    isProbablyArticle: PropTypes.bool,
    isTweet: PropTypes.bool,
    isYouTube: PropTypes.bool,
  }),
};

function OfflineLander() {
  return (
    <div className={cn(styles.Lander, styles.isOfflineNote)}>
      <NoConnectionIcon />
      <p>You're offline. Please check your internet connection.</p>
    </div>
  );
}

function Lander({ ...rest }) {
  const [isOnLine, setIsOnline] = useState(window.navigator.onLine);

  useEffect(() => {
    const setOnlineStatus = () => setIsOnline(window.navigator.onLine);
    window.addEventListener("online", setOnlineStatus);
    window.addEventListener("offline", setOnlineStatus);
    return () => {
      window.removeEventListener("online", setOnlineStatus);
      window.removeEventListener("offline", setOnlineStatus);
    };
  }, []);

  if (!isOnLine) {
    return <OfflineLander />;
  }

  return <OnlineLander {...rest} />;
}

Lander.propTypes = {};

export default Lander;

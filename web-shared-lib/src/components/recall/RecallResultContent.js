import React from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import { PlaygroundIcon, WriteIcon, YouTubeIcon, TwitterIcon, AppleNotesIcon } from "../icons";
import FallbackAvatar from "../fallback-avatar";
import {
  extractHostname,
  findMatchedText,
  generateTextFragment,
  extractNoteCardIdAndUrlFromUrl,
  relativeDayOfWeek,
} from "../../../../js-shared-lib";

import ParagraphMatch, { QuotedTweetParagraphMatch } from "./ParagraphMatch";

import styles from "./RecallResultContent.module.css";

export function generateRecallResultExternalLink({ model }) {
  if (model.artifactType === "recollect-note") {
    const isAnnotationNoteCard = isAnnotationNoteCardUrl(model.url);
    // HACK - given we can't handle the annotation URL in web-client yet,
    // just open the page the annotation was added to:
    if (isAnnotationNoteCard) {
      const { url } = extractNoteCardIdAndUrlFromUrl(model.url);
      return url;
    }

    return model.url;
  }

  if (model.artifactType === "pdf") {
    return `${model.url}#page=${model.page + 1}`;
  }

  if (model.artifactType === "youtube-video-transcript") {
    const matchSentence = model.matchSentence || (model.matchSentences && model.matchSentences[0]);
    if (matchSentence) {
      const ts = model.sentences.find((s) => s.sentenceNumber === matchSentence)?.secondsFromStart;
      if (ts) {
        return `${model.url}&t=${ts}`;
      } else {
        return model.url;
      }
    }
  }

  return generateTextFragment({
    href: model.url,
    textFragment:
      model.artifactType !== "recollect-note"
        ? findMatchedText({ models: [model], sentenceId: model.matchSentence })
        : undefined,
  });
}

export function RecallResultText({ model, isMatchClassName }) {
  return (
    <>
      <ParagraphMatch
        sentences={
          model.artifactType === "tweet-thread" ? model.tweets[model.matchTweetIndex].sentences : model.sentences
        }
        matchSentence={model.matchSentence}
        isMatchClassName={isMatchClassName}
      />
      {model.artifactType === "tweet-thread" && !!model.tweets[model.matchTweetIndex].quotesTweet && (
        <QuotedTweetParagraphMatch
          sentences={model.tweets[model.matchTweetIndex].quotesTweet.sentences}
          userName={model.tweets[model.matchTweetIndex].quotesTweet.userName}
          matchSentence={model.matchSentence}
        />
      )}
    </>
  );
}

RecallResultText.propTypes = {
  model: PropTypes.shape({
    artifactType: PropTypes.string.isRequired,
    matchSentence: PropTypes.number.isRequired,
  }).isRequired,
  isMatchClassName: PropTypes.string,
};

export function RecallResultHeader({ model, renderArtifactNav, ...rest }) {
  const isTweet = model.artifactType === "tweet-thread";
  const isIdeaNote = model.artifactType === "recollect-note";
  const isPDF = model.artifactType === "pdf";
  const isYouTube = model.artifactType === "youtube-video-transcript";
  const isAppleNote = model.artifactType === "apple-note";

  const nav = (
    <div
      className={styles.nav}
      onClick={(event) => {
        event.preventDefault();
      }}
    >
      {renderArtifactNav && renderArtifactNav({ model })}
    </div>
  );

  const artifact = {
    artifactType: model.artifactType,
    artifactId: model.artifactId,
    url: generateRecallResultExternalLink({ model }),
    title: model.title,
    byline: model.byline,
  };

  if (model.artifactType === "tweet-thread") {
    const tweet = model.tweets[model.matchTweetIndex];
    artifact.userName = tweet.userName;
    artifact.displayName = tweet.displayName;
    artifact.avatarUrl = tweet.avatarUrls.bigger;
  } else if (artifact.artifactType === "pdf") {
    artifact.title = model.title || model.filename;
  }

  if (isIdeaNote) {
    return <IdeaNoteHeader href={artifact.url} title={artifact.title} navNode={nav} {...rest} />;
  } else if (isTweet) {
    return (
      <TwitterHeader
        href={artifact.url}
        displayName={artifact.displayName}
        userName={artifact.userName}
        avatarUrl={artifact.avatarUrl}
        navNode={nav}
        {...rest}
      />
    );
  } else if (isPDF) {
    return <PDFHeader href={artifact.url} title={artifact.title} byline={artifact.byline} navNode={nav} {...rest} />;
  } else if (isYouTube) {
    return <YouTubeHeader href={artifact.url} title={artifact.title} navNode={nav} {...rest} />;
  } else if (isAppleNote) {
    return <AppleNoteHeader href={artifact.url} title={artifact.title} navNode={nav} {...rest} />;
  } else {
    return (
      <AttributionHeader href={artifact.url} title={artifact.title} navNode={nav} byline={artifact.byline} {...rest} />
    );
  }
}

RecallResultHeader.propTypes = {
  model: PropTypes.shape({
    artifactType: PropTypes.string.isRequired,
    artifactId: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    title: PropTypes.string,
  }).isRequired,
  renderArtifactNav: PropTypes.func,
};

function ExternalLink({ href, className, children, onClick }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  );
}

ExternalLink.propTypes = {
  href: PropTypes.string.isRequired,
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  onClick: PropTypes.func.isRequired,
};

function AttributionHeader({ className, href, navNode, onReadMore, title, byline }) {
  const wrapperClassName = cn(styles.AttributionHeader, className);
  const titleNode = title ? <div className={styles.title}>{title}</div> : null;
  const sourceNode = href ? <div className={styles.domain}>{byline || extractHostname(href)}</div> : null;

  return (
    <div className={wrapperClassName}>
      {titleNode}
      <ExternalLink href={href} className={styles.linkWrapper} onClick={onReadMore}>
        {sourceNode}
      </ExternalLink>
      {navNode}
    </div>
  );
}

AttributionHeader.propTypes = {
  className: PropTypes.string,
  href: PropTypes.string.isRequired,
  navNode: PropTypes.element.isRequired,
  onReadMore: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export function PDFHeader({ className, title, byline, href, onReadMore, navNode }) {
  const hostname = extractHostname(href);

  const wrapperClassName = cn(styles.AttributionHeader, className);
  const titleNode = title ? <div className={styles.title}>{title}</div> : null;
  const sourceNode = href ? (
    <div className={styles.domain}>PDF Document - {byline ? `${byline} (${hostname})` : hostname}</div>
  ) : null;

  return (
    <div className={wrapperClassName}>
      {titleNode}
      <ExternalLink href={href} className={styles.linkWrapper} onClick={onReadMore}>
        {sourceNode}
      </ExternalLink>
      {navNode}
    </div>
  );
}

PDFHeader.propTypes = {
  byline: PropTypes.string,
  className: PropTypes.string,
  href: PropTypes.string.isRequired,
  navNode: PropTypes.element.isRequired,
  onReadMore: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export const IDEA_NOTE_CARD_URL_PATTERN = /^https:\/\/app\.re-collect\.ai\/idea\/[^\/?#]+#card=.+/;
export const ANNOTATION_NOTE_CARD_URL_PATTERN = /^https:\/\/app\.re-collect\.ai\/artifact\?url=.+#card=.+/;
export const DAILY_NOTE_CARD_URL_PATTERN = /^https:\/\/app\.re-collect\.ai\/daily-log\?day=.+#card=.+/;

const isIdeaNoteCardRegExp = new RegExp(IDEA_NOTE_CARD_URL_PATTERN);
const isAnnotationNoteCardRegExp = new RegExp(ANNOTATION_NOTE_CARD_URL_PATTERN);
const isDailyLogNoteCardRegExp = new RegExp(DAILY_NOTE_CARD_URL_PATTERN);

export const isIdeaNoteCardUrl = (url) => !!url && isIdeaNoteCardRegExp.test(url);
export const isAnnotationNoteCardUrl = (url) => !!url && isAnnotationNoteCardRegExp.test(url);
export const isDailyNoteCardUrl = (url) => !!url && isDailyLogNoteCardRegExp.test(url);

export function IdeaNoteHeader({ className, title, href, onReadMore, navNode }) {
  const isIdeaNoteCard = isIdeaNoteCardUrl(href);
  const isDailyNoteCard = isDailyNoteCardUrl(href);

  if (isDailyNoteCard && title) {
    const day = title.split("Daily note: ")[1];
    if (day) {
      title = relativeDayOfWeek(day);
    }
  }

  const wrapperClassName = cn(styles.AttributionHeader, className);
  const titleNode = (
    <div className={styles.iconTitleWrapper}>
      <div className={styles.icon}>{isIdeaNoteCard ? <PlaygroundIcon /> : <WriteIcon />}</div>
      <div className={styles.title}>{title || "Untitled"}</div>
    </div>
  );

  let sourceNode = null;
  if (href) {
    if (isIdeaNoteCard) {
      sourceNode = <div className={styles.domain}>re:collect idea</div>;
    } else if (isDailyNoteCard) {
      sourceNode = <div className={styles.domain}>re:collect daily note</div>;
    } else {
      sourceNode = <div className={styles.domain}>re:collect annotation</div>;
    }
  }

  return (
    <div className={wrapperClassName}>
      {titleNode}
      <ExternalLink href={href} className={styles.linkWrapper} onClick={onReadMore}>
        {sourceNode}
      </ExternalLink>
      {navNode}
    </div>
  );
}

IdeaNoteHeader.propTypes = {
  className: PropTypes.string,
  href: PropTypes.string.isRequired,
  navNode: PropTypes.element.isRequired,
  onReadMore: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export function AppleNoteHeader({ className, title, href, onReadMore, navNode }) {
  const wrapperClassName = cn(styles.AttributionHeader, className);
  const titleNode = (
    <div className={styles.iconTitleWrapper}>
      <div className={styles.icon}>
        <AppleNotesIcon />
      </div>
      <div className={styles.title}>{title || "Untitled"}</div>
    </div>
  );

  let sourceNode = <div className={styles.domain}>Apple Notes</div>;

  return (
    <div className={wrapperClassName}>
      {titleNode}
      <ExternalLink href={href} className={styles.linkWrapper} onClick={onReadMore}>
        {sourceNode}
      </ExternalLink>
      {navNode}
    </div>
  );
}

AppleNoteHeader.propTypes = {
  className: PropTypes.string,
  href: PropTypes.string.isRequired,
  navNode: PropTypes.element.isRequired,
  onReadMore: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export function YouTubeHeader({ className, title, href, onReadMore, navNode }) {
  const wrapperClassName = cn(styles.AttributionHeader, className);
  const titleNode = (
    <div className={styles.iconTitleWrapper}>
      <div className={styles.icon}>
        <YouTubeIcon />
      </div>
      <div className={styles.title}>{title || "Untitled"}</div>
    </div>
  );

  let sourceNode = <div className={styles.domain}>youtube.com</div>;

  return (
    <div className={wrapperClassName}>
      {titleNode}
      <ExternalLink href={href} className={styles.linkWrapper} onClick={onReadMore}>
        {sourceNode}
      </ExternalLink>
      {navNode}
    </div>
  );
}

YouTubeHeader.propTypes = {
  className: PropTypes.string,
  href: PropTypes.string.isRequired,
  navNode: PropTypes.element.isRequired,
  onReadMore: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export function TwitterHeader({ className, avatarUrl, displayName, userName, href, onReadMore, navNode }) {
  const wrapperClassName = cn(styles.AttributionHeader, styles.isTwitter, className);
  const sourceNode = href ? (
    <>
      <div>
        <TwitterIcon />
      </div>
      <div className={styles.domain}>twitter.com</div>
    </>
  ) : null;

  const bodyNode = userName ? (
    <>
      <div className={styles.leftCol}>
        <div className={styles.avatar}>
          <FallbackAvatar src={avatarUrl} alt={`${displayName}'s Twitter profile photo`} />
        </div>
      </div>
      <div className={styles.rightCol}>
        <div className={styles.header}>
          <div className={styles.displayName}>{displayName}</div>
          <div className={styles.userName}>{`@${userName}`}</div>
        </div>

        <ExternalLink href={href} className={styles.linkWrapper} onClick={onReadMore}>
          {sourceNode}
        </ExternalLink>
      </div>
    </>
  ) : null;

  return (
    <div className={wrapperClassName}>
      {bodyNode}
      {navNode}
    </div>
  );
}

TwitterHeader.propTypes = {
  avatarUrl: PropTypes.string,
  className: PropTypes.string,
  displayName: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired,
  navNode: PropTypes.element.isRequired,
  onReadMore: PropTypes.func.isRequired,
  userName: PropTypes.string.isRequired,
};

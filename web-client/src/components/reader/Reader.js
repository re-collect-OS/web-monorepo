import React, { useEffect, useCallback, useRef, forwardRef, useState } from "react";
import cn from "classnames";
import PropTypes from "prop-types";
import { shallow } from "zustand/shallow";
import {
  HamburgerIcon,
  PlaygroundIcon,
  ArrowRightIcon,
  isIdeaNoteCardUrl,
  isDailyNoteCardUrl,
  Thumbnail,
} from "web-shared-lib";
import {
  extractHostname,
  ZERO_CAMERA,
  extractNoteCardAndDocumentIdsFromUrl,
  onlyUnique,
  relativeDayOfWeek,
} from "js-shared-lib";

import { useStore } from "../../store";
import { usePrevious } from "../../libs/hooksLib";
import { DEBUG, CANVAS_GRID_SIZE } from "../../config";
import apiLib from "../../libs/apiLib";
import SpatialIndex from "../../utils/spatialIndex";

import Canvas from "../editor/Canvas";
import { KeptCardForModel, NoteCardForModel } from "../editor/Editor";

import TextSelectionMenu from "./TextSelectionMenu";

import styles from "./Reader.module.css";

const Highlight = forwardRef(({ text, isStackHighlight, onClick, ...rest }, ref) => {
  const span = (
    <span
      title={isStackHighlight ? `Keep higlight: ${text}` : `Go to highlight: ${text}`}
      className={cn(styles.sentence, styles.isHighlight, {
        [styles.isStackCard]: isStackHighlight,
      })}
      tabIndex={0}
      ref={ref}
      onClick={onClick}
      {...rest}
    >
      {text}
    </span>
  );

  return span;
});

function LoadingPrompt() {
  return (
    <div className={styles.LoadingPrompt}>
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </div>
  );
}

const selector = (state) => ({
  doArtifactLoad: state.doArtifactLoad,
});

function normalizeText(text) {
  return text.replace(/\s+/g, "").toLowerCase();
}

// Because re-indexing might result in new sentence identifiers we can't rely on them
// when mapping highlights from kept cards. We therefore need to build an index over the
// article set of sentences that allows us to search for highlight text and map it back
// to the current sentence numbers.
// We don't preserve white space between sentences so we must strip all white text in the
// article and highlight as a result before doing the search:
function buildArticleIndex({ article }) {
  const normalizedSentences = article?.sentences?.map((sentence) => normalizeText(sentence.text)) || [];
  const cumulativeSentenceLengths = normalizedSentences.reduce((lengths, text, index) => {
    lengths[index] = text.length + (lengths[index - 1] || 0);
    return lengths;
  }, []);

  return {
    cumulativeSentenceLengths,
    text: normalizedSentences.join(""),
    normalizedSentences,
    sentenceNumbers: article?.sentences?.map((sentence) => sentence.sentenceNumber) || [],
  };
}
// We rely on the native substring match functions for the search:
function searchArticleIndex({ articleIndex, normalizedText }) {
  const startOffset = articleIndex.text.indexOf(normalizedText);
  if (startOffset < 0) {
    return undefined;
  }

  const getIndexForOffset = (offset) => {
    return articleIndex.cumulativeSentenceLengths.findIndex((length) => offset <= length);
  };

  return {
    startIndex: getIndexForOffset(startOffset + 1),
    endIndex: getIndexForOffset(startOffset + normalizedText.length),
  };
}

// We iterate through kept cards, search the index and create a sentenceNumber -> card identifiers lookup table
function buildCardMatchMap({ keptCards, articleIndex }) {
  const matchMap = {};
  // TODO extract, duplicated in Editor
  const keptSentences = keptCards
    .map((card) => {
      let sentences;
      const findSentences = (sentences) => sentences.filter((s) => card.matchSentences.includes(s.sentenceNumber));

      if (card.artifactType === "tweet-thread") {
        const tweet = card.tweets[card.matchTweetIndex];
        sentences = findSentences(tweet.sentences);
        if (!sentences?.length && tweet.quotesTweet) {
          sentences = findSentences(tweet.quotesTweet.sentences);
        }
      } else {
        sentences = findSentences(card.sentences);
      }

      if (sentences?.length) {
        return sentences.map((s) => ({ ...s, cardId: card.id }));
      }
    })
    .filter(Boolean)
    .flat();

  keptSentences.forEach((sentence) => {
    const matchRange = searchArticleIndex({ articleIndex, normalizedText: normalizeText(sentence.text) });
    if (matchRange) {
      for (let i = 0; i <= matchRange.endIndex - matchRange.startIndex; i++) {
        const sentenceNumber = articleIndex.sentenceNumbers[matchRange.startIndex + i];
        matchMap[sentenceNumber] = [...(matchMap[sentenceNumber] || []), sentence.cardId];
      }
    }
  });

  return matchMap;
}

const IGNORED_BLOCK_TYPES = ["list"];
const KNOWN_BLOCK_TYPES = ["p", "head", "item", "quote", "code"];
// We attempt to wrap all sequential "item" paragraphs in a list tag
const GROUP_BLOCK_TYPES = ["item"];

function componentForBlockType(type) {
  switch (type) {
    case "p":
      return "p";
    case "head":
      return "h2";
    case "item":
      return "li";
    case "quote":
      return "blockquote";
    case "code":
      return "code";
  }
  throw new Error(`componentForBlockType: unknown type ${type}`);
}

function wrapperComponentForBlockType(type) {
  switch (type) {
    case "item":
      return "ul";
  }
  throw new Error(`wrapperComponentForBlockType: unknown type ${type}`);
}

// https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
function formatTimestamp(duration) {
  // Hours, minutes and seconds
  const hrs = ~~(duration / 3600);
  const mins = ~~((duration % 3600) / 60);
  const secs = ~~duration % 60;
  // Output like "1:01" or "4:03:59" or "123:03:59"
  let ret = "";
  if (hrs > 0) {
    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }
  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}

function renderParagraph({
  cardMatchMap,
  Component,
  doSelectCard,
  keptCards,
  matchedSpanRef,
  matchSentenceIds,
  paragraph,
  pIndex,
  scrollToText,
  url,
  isSparse,
}) {
  // Does this paragraph contain a sentence that matches one of the cards
  const hasStackHighlight = !!paragraph.find((sentence) => matchSentenceIds.includes(sentence.sentenceNumber));
  return (
    <Component
      key={pIndex}
      className={cn(styles.block, {
        [styles.hasStackHighlight]: hasStackHighlight,
        [styles.isSparseBlock]: isSparse,
      })}
    >
      {paragraph.map((sentence) => {
        const cardMatches = cardMatchMap[sentence.sentenceNumber];
        // It's ok to rely on sentenceId for stack highlights because it's fresh data
        const isMatch = matchSentenceIds.includes(sentence.sentenceNumber) || !!cardMatches;
        const keptCard = cardMatches ? keptCards.find((card) => cardMatches.includes(card.id)) : undefined;

        const isKeptHighlight = !!keptCard;
        const isStackHighlight = !isKeptHighlight && isMatch;
        const shouldScrollTo = scrollToText === sentence.text;
        const sentenceDataProps = {
          ["data-sentence"]: sentence.sentenceNumber,
          ...(sentence.page !== undefined ? { ["data-page"]: sentence.page } : {}),
        };

        const ts = sentence.secondsFromStart !== undefined ? sentence.secondsFromStart : null;

        return (
          <React.Fragment key={sentence.sentenceNumber}>
            {ts !== null && (
              <a className={styles.timestamp} href={`${url}&t=${ts}`} target="_blank" rel="noopener noreferrer">
                {formatTimestamp(ts)}
              </a>
            )}
            {keptCard && keptCard.parentId && (
              <button
                className={styles.noteIndicator}
                onClick={() => doSelectCard(keptCard.parentId)}
                tabIndex={0}
                title={"Go to note card"}
              >
                <span className={styles.noteIconWrapper}>
                  <HamburgerIcon />
                </span>
              </button>
            )}
            {(shouldScrollTo || isKeptHighlight || isStackHighlight) && (
              <Highlight
                ref={shouldScrollTo ? matchedSpanRef : undefined}
                text={sentence.text}
                isStackHighlight={isStackHighlight}
                {...sentenceDataProps}
                onClick={
                  isKeptHighlight
                    ? () => doSelectCard(keptCard.id)
                    : () => {
                        // Find sentence wrapper span and get the text child element:
                        const textEl = document.querySelector(
                          `[data-sentence="${sentence.sentenceNumber}"]`
                        )?.firstChild;
                        if (textEl) {
                          const range = document.createRange();
                          // Select text content:
                          range.selectNodeContents(textEl);
                          window.getSelection().removeAllRanges();
                          window.getSelection().addRange(range);
                        }
                      }
                }
              />
            )}
            {!isKeptHighlight && !isStackHighlight && (
              <span
                key={sentence.sentenceNumber}
                className={cn(styles.sentence)}
                title={DEBUG ? `Type: ${sentence.type}` : undefined}
                {...sentenceDataProps}
              >
                {sentence.text}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </Component>
  );
}

function renderParagraphs({
  cardMatchMap,
  doSelectCard,
  keptCards,
  matchedSpanRef,
  matchSentenceIds,
  paragraphs,
  scrollToText,
  url,
  isSparse,
}) {
  let output = [];
  for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
    const paragraph = paragraphs[pIndex];
    if (!paragraph) {
      continue;
    }
    // We assume all sentences in a paragraph have the same type
    let pType = paragraph[0]?.type;
    // Skip tags that should not be making it to us from backend:
    if (IGNORED_BLOCK_TYPES.includes(pType)) {
      continue;
    }
    // Default to paragraph if we don't handle or get a missing type:
    if (!KNOWN_BLOCK_TYPES.includes(pType)) {
      if (DEBUG && !!pType) {
        console.warn("Unhandled paragraph type", pType);
      } else if (DEBUG) {
        console.warn("Missing paragraph type", paragraph);
      }
      pType = "p";
    }
    // Bind common render parameters since we're about to branch
    const _renderP = ({ Component, paragraph, pIndex }) =>
      renderParagraph({
        cardMatchMap,
        Component,
        doSelectCard,
        keptCards,
        matchedSpanRef,
        matchSentenceIds,
        paragraph,
        pIndex,
        scrollToText,
        url,
        isSparse,
      });

    // Special case: we hit a block type that needs to be grouped (ex: list item)
    if (GROUP_BLOCK_TYPES.includes(pType)) {
      const groupedParagraphs = [];
      // We advance the main loop (the paragraph structure we have is flat) until we hit a block of a different type:
      for (let _pIndex = pIndex; _pIndex < paragraphs.length; _pIndex++) {
        // Once we hit a block of a different type, break out of the loop:
        if (!paragraphs[_pIndex] || paragraphs[_pIndex][0].type !== pType) {
          break;
        }
        // Do the usual render
        groupedParagraphs.push(
          _renderP({
            Component: componentForBlockType(pType),
            paragraph: paragraphs[_pIndex],
            pIndex: _pIndex,
          })
        );
        // Advance the main loop by however much we fast forwarded:
        pIndex = _pIndex;
      }
      // Wrap the paragraphs:
      const WrapperComponent = wrapperComponentForBlockType(pType);
      output.push(<WrapperComponent key={pIndex}>{groupedParagraphs}</WrapperComponent>);
    } else {
      output.push(
        _renderP({
          Component: componentForBlockType(pType),
          paragraph,
          pIndex,
        })
      );
    }

    // Append location indicators for sparse documents:
    if (isSparse) {
      const pLocation = paragraph[0].location;
      const pLocationType = paragraph[0].locationType;
      if (pLocation && pLocationType !== "order") {
        output.push(
          <div className={styles.sparseLocation}>
            {pLocationType}: {pLocation}
          </div>
        );
      }
      output.push(<div className={styles.sparseLocationSeparator} />);
    }
  }

  return output;
}

function mapSentenceRangeToSentenceNumbers({ sentences, start, end }) {
  if (!start && !end) return;

  if (!end) {
    // Select everything after start with the same paragraph ID if we don't have an ending range
    // (this happens because selection moved into the next paragraph)
    const startSentence = sentences.find((s) => s.sentenceNumber === start);
    const startSentenceIndex = sentences.indexOf(startSentence);
    return sentences
      .filter((s, index) => index >= startSentenceIndex && s.paragraphNumber === startSentence.paragraphNumber)
      .map((s) => s.sentenceNumber);
  }
  return sentences.filter((s) => s.sentenceNumber >= start && s.sentenceNumber <= end).map((s) => s.sentenceNumber);
}

function Tweet({
  displayName,
  userName,
  avatarUrl,
  url,
  children,
  onReadMore,
  doKeep,
  model,
  matchSentenceIds,
  quotesTweet,
  contextLabel,
}) {
  const textRef = useRef(null);
  const _mapRangeToSentenceNumbers = ({ start, end }) =>
    mapSentenceRangeToSentenceNumbers({ sentences: model.sentences, start, end });

  return (
    <div className={styles.tweet}>
      <div className={styles.leftCol}>
        <div className={styles.avatar}>
          <img src={avatarUrl} alt={`${displayName}'s Twitter profile photo`} />
        </div>
      </div>
      <div className={styles.rightCol}>
        <div className={styles.header}>
          <div className={styles.displayName}>{displayName}</div>
          <div className={styles.userName}>{`@${userName}`}</div>
        </div>
        <div className={styles.tweetBody}>
          <div ref={textRef}>{children}</div>
          {quotesTweet}
        </div>
        <a href={url} target={"_blank"} rel="noreferrer" className={styles.url} onClick={onReadMore}>
          twitter.com
        </a>
      </div>
      {doKeep && (
        <TextSelectionMenu
          targetRef={textRef}
          contextLabel={contextLabel}
          onKeep={({ start, end }) => {
            const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
            const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
            if (sentenceIds.length) {
              doKeep({ sentenceIds, isHighlight });
            }
          }}
          // onAddNote={({ start, end }) => {
          //   const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
          //   const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
          //   if (sentenceIds.length) {
          //     doKeep({ sentenceIds, withNoteCard: true, isHighlight });
          //   }
          // }}
        />
      )}
    </div>
  );
}

export function TweetReaderModal({
  doKeep,
  doSelectCard,
  hasLoaded,
  keptCards,
  onReadMore,
  sentence,
  stack,
  tweetThread,
  tweetThreadId,
  contextLabel,
}) {
  const matchedSpanRef = useRef(null);
  const prevTweetThreadId = usePrevious(tweetThreadId);
  const prevSentence = usePrevious(sentence);
  const prevHasLoaded = usePrevious(hasLoaded);

  // Scroll matched sentence into view on load:
  useEffect(() => {
    if ((hasLoaded && !prevHasLoaded) || tweetThreadId !== prevTweetThreadId || sentence !== prevSentence) {
      matchedSpanRef.current?.scrollIntoView({ block: "center" });
    }
  }, [prevHasLoaded, hasLoaded, tweetThreadId, prevTweetThreadId, sentence, prevSentence]);

  const matchSentenceIds = stack?.results.map((result) => result.matchSentence) || [];

  const renderTweetMedia = (tweet) => {
    const count = tweet.media?.length || 0;

    if (!count) return null;

    const images = tweet.media.map((media, index) => {
      return (
        <a
          key={index}
          href={tweet.url}
          target={"_blank"}
          rel={"noreferrer"}
          className={cn(styles.tweetPreviewImg, {
            [styles.one]: count === 1,
            [styles.two]: count === 2,
            [styles.three]: count === 3,
            [styles.four]: count > 3,
          })}
        >
          <img src={media.fullUrl || media.thumbnailUrl} />
        </a>
      );
    });

    return <div className={styles.tweetMediaWrapper}>{images}</div>;
  };
  const renderTweetParagraphs = (tweet) => {
    const first = tweet.sentences[0].paragraphNumber;
    const paragraphs = tweet.sentences.reduce((all, one) => {
      const pid = one.paragraphNumber - first;
      all[pid] = [].concat(all[pid] || [], one);
      return all;
    }, []);
    const tweetIndex = buildArticleIndex({ article: tweet });
    const cardMatchMap = buildCardMatchMap({ keptCards, articleIndex: tweetIndex });
    return renderParagraphs({
      cardMatchMap,
      doSelectCard,
      keptCards,
      matchedSpanRef,
      matchSentenceIds,
      paragraphs,
      scrollToText: sentence,
    });
  };

  const renderedTweets = tweetThread.tweets.map((tweet, index) => {
    return (
      <Tweet
        key={`tweet-${index}`}
        displayName={tweet.displayName}
        userName={tweet.userName}
        avatarUrl={tweet.avatarUrls.bigger}
        onReadMore={onReadMore}
        url={tweet.url}
        doKeep={doKeep}
        model={tweet}
        matchSentenceIds={matchSentenceIds}
        contextLabel={contextLabel}
        quotesTweet={
          tweet.quotesTweet ? (
            <Tweet
              key={`tweet-${index}`}
              displayName={tweet.quotesTweet.displayName}
              userName={tweet.quotesTweet.userName}
              avatarUrl={tweet.quotesTweet.avatarUrls.bigger}
              onReadMore={onReadMore}
              url={tweet.quotesTweet.url}
              doKeep={doKeep}
              model={tweet.quotesTweet}
              matchSentenceIds={matchSentenceIds}
              contextLabel={contextLabel}
            >
              {renderTweetParagraphs(tweet.quotesTweet)}
              {renderTweetMedia(tweet.quotesTweet)}
            </Tweet>
          ) : null
        }
      >
        {renderTweetParagraphs(tweet)}
        {renderTweetMedia(tweet)}
      </Tweet>
    );
  });

  return (
    <div className={styles.tweetThread} onClick={(e) => e.stopPropagation()}>
      {!hasLoaded && <LoadingPrompt />}
      {renderedTweets}
      {!hasLoaded && <LoadingPrompt />}
    </div>
  );
}

TweetReaderModal.propTypes = {
  doKeep: PropTypes.func,
  doSelectCard: PropTypes.func.isRequired,
  hasLoaded: PropTypes.bool.isRequired,
  keptCards: PropTypes.array.isRequired,
  onReadMore: PropTypes.func.isRequired,
  sentence: PropTypes.string,
  stack: PropTypes.object,
  tweetThread: PropTypes.object.isRequired,
  tweetThreadId: PropTypes.string.isRequired,
};

export function ArticleReaderModal({
  article,
  articleId,
  doKeep,
  doSelectCard,
  hasLoaded,
  keptCards,
  onReadMore,
  sentence,
  stack,
  contextLabel,
}) {
  const matchedSpanRef = useRef(null);
  const prevArticleId = usePrevious(articleId);
  const prevSentence = usePrevious(sentence);
  const prevHasLoaded = usePrevious(hasLoaded);
  const isAppleNote = article.artifactType === "apple-note";

  // Scroll matched sentence into view on load:
  useEffect(() => {
    if ((hasLoaded && !prevHasLoaded) || articleId !== prevArticleId || sentence !== prevSentence) {
      matchedSpanRef.current?.scrollIntoView({ block: "center" });
    }
  }, [prevHasLoaded, hasLoaded, articleId, prevArticleId, sentence, prevSentence]);

  let paragraphs = [];
  const first = article.sentences[0].paragraphNumber;
  paragraphs = article.sentences.reduce((all, one) => {
    const pid = one.paragraphNumber - first;
    all[pid] = [].concat(all[pid] || [], one);
    return all;
  }, []);

  const articleIndex = buildArticleIndex({ article });
  const cardMatchMap = buildCardMatchMap({ keptCards, articleIndex });
  const matchSentenceIds = stack?.results.map((result) => result.matchSentence) || [];
  const renderedParagraphs = renderParagraphs({
    cardMatchMap,
    doSelectCard,
    keptCards,
    matchedSpanRef,
    matchSentenceIds,
    paragraphs,
    scrollToText: sentence,
    isSparse: article.artifactType === "recollect-sparse-document",
  });

  const textRef = useRef(null);
  const _mapRangeToSentenceNumbers = ({ start, end }) =>
    mapSentenceRangeToSentenceNumbers({ sentences: article.sentences, start, end });

  let title = article.title;
  if (isDailyNoteCardUrl(article.url)) {
    const day = title.split("Daily note: ")[1];
    if (day) {
      title = relativeDayOfWeek(day);
    }
  }

  let bylineStr;
  if (isAppleNote) {
    const modified = article.metadata?.modified_date;
    if (modified) {
      bylineStr = `Edited: ${new Date(modified).toLocaleString()}`;
    } else {
      bylineStr = "Apple Notes";
    }
  } else {
    bylineStr = article.byline ? article.byline : extractHostname(article.url);
  }

  return (
    <div className={styles.article} onClick={(e) => e.stopPropagation()}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title || "Untitled"}</h1>
        <a href={article.url} target={"_blank"} rel={"noreferrer"} className={styles.url} onClick={onReadMore}>
          {bylineStr}
        </a>
        {!hasLoaded && <LoadingPrompt />}
        <div ref={textRef}>{renderedParagraphs}</div>
        {!hasLoaded && <LoadingPrompt />}
        <TextSelectionMenu
          targetRef={textRef}
          contextLabel={contextLabel}
          onKeep={({ start, end, startPage, endPage }) => {
            const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
            const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
            if (sentenceIds.length) {
              let page;
              if (startPage !== undefined) {
                page = startPage;
                if (startPage !== endPage) {
                  console.warn("Reader: unexpected keep selection across page bondaries:", { startPage, endPage });
                }
              }
              doKeep({ sentenceIds, isHighlight, page });
            }
          }}
          // onAddNote={({ start, end, startPage, endPage }) => {
          //   const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
          //   const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
          //   if (sentenceIds.length) {
          //     let page;
          //     if (startPage !== undefined) {
          //       page = startPage;
          //       if (startPage !== endPage) {
          //         console.warn("Reader: unexpected keep selection across page bondaries:", { startPage, endPage });
          //       }
          //     }
          //     doKeep({ sentenceIds, withNoteCard: true, isHighlight, page });
          //   }
          // }}
        />
      </div>
    </div>
  );
}

ArticleReaderModal.propTypes = {
  article: PropTypes.object.isRequired,
  articleId: PropTypes.string.isRequired,
  doKeep: PropTypes.func,
  doSelectCard: PropTypes.func.isRequired,
  hasLoaded: PropTypes.bool.isRequired,
  keptCards: PropTypes.array.isRequired,
  onReadMore: PropTypes.func.isRequired,
  sentence: PropTypes.string,
  stack: PropTypes.object,
};

export function GoogleScreenshotReaderModal({ article, onReadMore }) {
  const title = article.title;
  const bylineStr = `${extractHostname(article.url)}`;

  let paragraphs = [];
  const first = article.sentences[0].paragraphNumber;
  paragraphs = article.sentences.reduce((all, one) => {
    const pid = one.paragraphNumber - first;
    all[pid] = [].concat(all[pid] || [], one);
    return all;
  }, []);

  return (
    <div className={styles.article} onClick={(e) => e.stopPropagation()}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title || "Untitled"}</h1>
        <a href={article.url} target={"_blank"} rel={"noreferrer"} className={styles.url} onClick={onReadMore}>
          {bylineStr}
        </a>
        <Thumbnail s3Path={article.s3Path} doLoad={apiLib.loadThumbnailFromS3Path} />
        {DEBUG && (
          <details>
            <summary>DEBUG</summary>
            {paragraphs.map((sentences, index) => (
              <p key={index}>{sentences.map((s) => s.text).join(" ")}</p>
            ))}
          </details>
        )}
      </div>
    </div>
  );
}

GoogleScreenshotReaderModal.propTypes = {
  article: PropTypes.object.isRequired,
  onReadMore: PropTypes.func.isRequired,
};

// Temp PDF article reader, plan to switch to pdf.js

function PDFPage({ children, doKeep, page, sentences, matchSentenceIds, contextLabel }) {
  const textRef = useRef(null);
  const _mapRangeToSentenceNumbers = ({ start, end }) => mapSentenceRangeToSentenceNumbers({ sentences, start, end });

  return (
    <div className={styles.PDFPage} title={`PDF page: ${page + 1}`}>
      <div ref={textRef}>{children}</div>
      {doKeep && (
        <TextSelectionMenu
          targetRef={textRef}
          contextLabel={contextLabel}
          onKeep={({ start, end, startPage, endPage }) => {
            const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
            const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
            if (sentenceIds.length) {
              let page;
              if (startPage !== undefined) {
                page = startPage;
                if (startPage !== endPage) {
                  console.warn("Reader: unexpected keep selection across page bondaries:", { startPage, endPage });
                }
              }
              doKeep({ sentenceIds, isHighlight, page: parseInt(page) });
            }
          }}
          // onAddNote={({ start, end, startPage, endPage }) => {
          //   const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
          //   const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
          //   if (sentenceIds.length) {
          //     let page;
          //     if (startPage !== undefined) {
          //       page = startPage;
          //       if (startPage !== endPage) {
          //         console.warn("Reader: unexpected keep selection across page bondaries:", { startPage, endPage });
          //       }
          //     }
          //     doKeep({ sentenceIds, withNoteCard: true, isHighlight, page });
          //   }
          // }}
        />
      )}
    </div>
  );
}

export function PDFReaderModal({
  article,
  articleId,
  doKeep,
  doSelectCard,
  hasLoaded,
  keptCards,
  onReadMore,
  page,
  sentence,
  stack,
}) {
  const matchedSpanRef = useRef(null);
  const prevArticleId = usePrevious(articleId);
  const prevSentence = usePrevious(sentence);
  const prevHasLoaded = usePrevious(hasLoaded);

  // Scroll matched sentence into view on load:
  useEffect(() => {
    if ((hasLoaded && !prevHasLoaded) || articleId !== prevArticleId || sentence !== prevSentence) {
      matchedSpanRef.current?.scrollIntoView({ block: "center" });
    }
  }, [prevHasLoaded, hasLoaded, articleId, prevArticleId, sentence, prevSentence]);

  const matchSentenceIds = stack?.results.map((result) => result.matchSentence) || [];

  const renderPDFPageParagraphs = (sentences, index) => {
    const first = sentences[0].paragraphNumber;
    const paragraphs = sentences.reduce((all, one) => {
      const pid = one.paragraphNumber - first;
      all[pid] = [].concat(all[pid] || [], one);
      return all;
    }, []);
    const pageIndex = buildArticleIndex({ article: { sentences } });
    const cardMatchMap = buildCardMatchMap({ keptCards, articleIndex: pageIndex });

    let _sentence = sentence;
    // Only consider the pdf page text was clipped from
    if (page !== undefined && index !== page) {
      _sentence = null;
    }

    return renderParagraphs({
      cardMatchMap,
      doSelectCard,
      keptCards,
      matchedSpanRef,
      matchSentenceIds,
      paragraphs,
      scrollToText: _sentence,
    });
  };

  const pages = article.sentences.reduce((all, one) => {
    const page = one.page || 0;
    all[page] = [].concat(all[page] || [], one);
    return all;
  }, []);

  const renderedPages = pages
    .map((sentences, index) => {
      if (!sentences?.length) {
        return null;
      }

      return (
        <PDFPage
          key={`pdf-page-${index}`}
          page={index}
          doKeep={doKeep}
          sentences={sentences}
          matchSentenceIds={matchSentenceIds}
        >
          {renderPDFPageParagraphs(sentences, index)}
        </PDFPage>
      );
    })
    .filter(Boolean);

  const filenameStr = `${article.filename} - ${extractHostname(article.url)}`;
  const bylineStr = article.byline ? `${article.byline} (${filenameStr})` : filenameStr;

  return (
    <div className={styles.article} onClick={(e) => e.stopPropagation()}>
      <div className={styles.content}>
        <h1 className={styles.title}>{article.title || "Untitled"}</h1>
        <a href={article.url} target={"_blank"} rel={"noreferrer"} className={styles.url} onClick={onReadMore}>
          {bylineStr}
        </a>
        {!hasLoaded && <LoadingPrompt />}
        {renderedPages}
        {!hasLoaded && <LoadingPrompt />}
      </div>
    </div>
  );
}

PDFReaderModal.propTypes = {
  article: PropTypes.object.isRequired,
  articleId: PropTypes.string.isRequired,
  doKeep: PropTypes.func,
  doSelectCard: PropTypes.func.isRequired,
  hasLoaded: PropTypes.bool.isRequired,
  keptCards: PropTypes.array.isRequired,
  onReadMore: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  sentence: PropTypes.string,
  stack: PropTypes.object,
};

export function TranscriptReaderModal({
  article,
  articleId,
  doKeep,
  doSelectCard,
  hasLoaded,
  keptCards,
  onReadMore,
  sentence,
  stack,
  contextLabel,
}) {
  const matchedSpanRef = useRef(null);
  const prevArticleId = usePrevious(articleId);
  const prevSentence = usePrevious(sentence);
  const prevHasLoaded = usePrevious(hasLoaded);

  // Scroll matched sentence into view on load:
  useEffect(() => {
    if ((hasLoaded && !prevHasLoaded) || articleId !== prevArticleId || sentence !== prevSentence) {
      matchedSpanRef.current?.scrollIntoView({ block: "center" });
    }
  }, [prevHasLoaded, hasLoaded, articleId, prevArticleId, sentence, prevSentence]);

  let paragraphs = [];
  const first = article.sentences[0].paragraphNumber;
  paragraphs = article.sentences.reduce((all, one) => {
    const pid = one.paragraphNumber - first;
    all[pid] = [].concat(all[pid] || [], one);
    return all;
  }, []);

  const articleIndex = buildArticleIndex({ article });
  const cardMatchMap = buildCardMatchMap({ keptCards, articleIndex });
  const matchSentenceIds = stack?.results.map((result) => result.matchSentence) || [];
  const renderedParagraphs = renderParagraphs({
    cardMatchMap,
    doSelectCard,
    keptCards,
    matchedSpanRef,
    matchSentenceIds,
    paragraphs,
    scrollToText: sentence,
    url: article.url,
  });

  const textRef = useRef(null);
  const _mapRangeToSentenceNumbers = ({ start, end }) =>
    mapSentenceRangeToSentenceNumbers({ sentences: article.sentences, start, end });

  let title = article.title;

  return (
    <div className={styles.article} onClick={(e) => e.stopPropagation()}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title || "Untitled"}</h1>
        <a href={article.url} target={"_blank"} rel={"noreferrer"} className={styles.url} onClick={onReadMore}>
          {extractHostname(article.url)}
        </a>
        {!hasLoaded && <LoadingPrompt />}
        <div ref={textRef}>{renderedParagraphs}</div>
        {!hasLoaded && <LoadingPrompt />}
        <TextSelectionMenu
          targetRef={textRef}
          contextLabel={contextLabel}
          onKeep={({ start, end, startPage, endPage }) => {
            const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
            const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
            if (sentenceIds.length) {
              let page;
              if (startPage !== undefined) {
                page = startPage;
                if (startPage !== endPage) {
                  console.warn("Reader: unexpected keep selection across page bondaries:", { startPage, endPage });
                }
              }
              doKeep({ sentenceIds, isHighlight, page });
            }
          }}
          // onAddNote={({ start, end, startPage, endPage }) => {
          //   const sentenceIds = _mapRangeToSentenceNumbers({ start, end });
          //   const isHighlight = sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
          //   if (sentenceIds.length) {
          //     let page;
          //     if (startPage !== undefined) {
          //       page = startPage;
          //       if (startPage !== endPage) {
          //         console.warn("Reader: unexpected keep selection across page bondaries:", { startPage, endPage });
          //       }
          //     }
          //     doKeep({ sentenceIds, withNoteCard: true, isHighlight, page });
          //   }
          // }}
        />
      </div>
    </div>
  );
}

TranscriptReaderModal.propTypes = {
  article: PropTypes.object.isRequired,
  articleId: PropTypes.string.isRequired,
  doKeep: PropTypes.func,
  doSelectCard: PropTypes.func.isRequired,
  hasLoaded: PropTypes.bool.isRequired,
  keptCards: PropTypes.array.isRequired,
  onReadMore: PropTypes.func.isRequired,
  sentence: PropTypes.string,
  stack: PropTypes.object,
};

function GoToIdeaButton({ url, title, onClick, hasStack }) {
  return (
    <a
      href={url}
      target={"_blank"}
      rel={"noreferrer"}
      className={cn(styles.GoToIdeaButton, { [styles.hasStack]: hasStack })}
      onClick={onClick}
    >
      <div className={styles.leftCol}>
        <div className={styles.titleIconRow}>
          <div className={styles.icon}>
            <PlaygroundIcon />
          </div>
          <div className={styles.title}>{title}</div>
        </div>
        <div className={styles.instructionsRow}>Open re:collect idea in a new tab</div>
      </div>
      <div className={styles.rightCol}>
        <ArrowRightIcon />
      </div>
    </a>
  );
}

function renderCard({
  childCards,
  documentId,
  isEmbedded,
  isSelected,
  model,
  ref,
  zIndex,
  highlights,
  onHighlightClick,
  spatialIndex,
}) {
  switch (model.type) {
    case "kept": {
      return (
        <KeptCardForModel
          ref={ref}
          key={model.id}
          documentId={documentId}
          isEmbedded={isEmbedded}
          isOnCanvas={!isEmbedded}
          isSelected={isSelected}
          model={model}
          zIndex={zIndex}
          preventTextSelection={false}
          spatialIndex={spatialIndex}
        />
      );
    }
    case "note": {
      return (
        <NoteCardForModel
          ref={ref}
          key={model.id}
          isOnCanvas={true}
          isSelected={isSelected}
          model={model}
          zIndex={zIndex}
          preventTextSelection={false}
          highlights={highlights}
          onHighlightClick={onHighlightClick}
          spatialIndex={spatialIndex}
        >
          {childCards}
        </NoteCardForModel>
      );
    }
    default:
      return null;
  }
}

export function IdeaNoteModal({
  noteCard, // artifact
  doKeep,
  doSelectCard,
  hasLoaded,
  keptCards,
  onReadMore,
  stack,
  contextLabel,
}) {
  const { documentId, cardId } = extractNoteCardAndDocumentIdsFromUrl(noteCard.url);
  const matchSentenceIds = stack?.results.map((result) => result.matchSentence) || [];
  const matchCardIds =
    stack?.results
      .map((result) => {
        // TODO currently we can only deal with one artifact at a time
        // if (result.artifactType === "recollect-note") {
        if (result.artifactId === noteCard.artifactId) {
          const { cardId } = extractNoteCardAndDocumentIdsFromUrl(result.url);
          return cardId;
        }
      })
      .filter(Boolean)
      .filter(onlyUnique) || [];
  const noteCardIndex = buildArticleIndex({ article: noteCard });
  // keptCards is the kept cards from this artifactId!
  const cardMatchMap = buildCardMatchMap({ keptCards, articleIndex: noteCardIndex });

  const canvasRef = useRef(null);
  const cardRefs = useRef({});
  const document = useStore(
    useCallback((state) => state.documents.index.find((doc) => doc.documentId === documentId), [documentId])
  );
  const prevDocumentId = usePrevious(documentId);
  const prevCardId = usePrevious(cardId);
  const prevHasLoaded = usePrevious(hasLoaded);

  // Smell: counting on this to re-render on mount so the editor refs resolve ( for text selection menu since we can't get a ref ) :(
  // Instead we could render another component that captures the mounted ref on mount?
  const [, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const spatialIndexRef = useRef(new SpatialIndex({ gridSize: CANVAS_GRID_SIZE }));
  const baseCardRenderProps = { documentId, spatialIndex: spatialIndexRef.current };
  const topLevelCards = document?.cards.filter((card) => !card.parentId) || [];
  const cards = topLevelCards.map((card) => {
    const parentIndex = document.cards.findIndex((c) => c.id === card.id);
    const parentIsSelected = cardId === card.id;
    let highlights = [];
    if (card.type === "note") {
      noteCard.sentences.forEach((sentence) => {
        const keptCardIds = cardMatchMap[sentence.sentenceNumber];
        if (keptCardIds?.length) {
          highlights.push({
            cardId: keptCardIds[0], // If we have multiple overlapping highlights, jump to the first one.
            text: sentence.text,
          });
        }
      });
    }

    return renderCard({
      ref: (element) => (cardRefs.current[card.id] = element),
      model: card,
      highlights,
      // Keep selected cards above all other cards
      zIndex: parentIsSelected ? document.cards.length + 1 : parentIndex,
      isSelected: parentIsSelected,
      onHighlightClick: (cardId) => doSelectCard(cardId),
      ...baseCardRenderProps,
      childCards: document.cards
        .filter((childCard) => childCard.parentId === card.id)
        .map((childCard) =>
          renderCard({
            ref: (element) => (cardRefs.current[childCard.id] = element),
            model: childCard,
            isEmbedded: true,
            isSelected: matchCardIds.includes(childCard.id),
            ...baseCardRenderProps,
          })
        ),
    });
  });

  const mapTextToSentenceIds = (text) => {
    const matchRange = searchArticleIndex({
      articleIndex: noteCardIndex,
      normalizedText: normalizeText(text),
    });

    if (matchRange) {
      const sentenceIds = [];
      for (let i = 0; i <= matchRange.endIndex - matchRange.startIndex; i++) {
        const sentenceNumber = noteCardIndex.sentenceNumbers[matchRange.startIndex + i];
        sentenceIds.push(sentenceNumber);
      }

      return sentenceIds;
    }

    return [];
  };

  const textSelectionToolbars = document?.cards.length
    ? document.cards
        .map((card) => {
          if (card.type === "note" && cardId === card.id) {
            return (
              <TextSelectionMenu
                key={`toolbar-${card.id}`}
                target={cardRefs.current[card.id]?.editorRef.current.el}
                contextLabel={contextLabel}
                onKeep={(_, text) => {
                  if (text.trim().length <= 5) return;

                  const sentenceIds = mapTextToSentenceIds(text);
                  if (sentenceIds.length) {
                    const isHighlight =
                      sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
                    doKeep({ sentenceIds, isHighlight });
                  }
                }}
                // onAddNote={(_, text) => {
                //   if (text.trim().length <= 5) return;
                //   const sentenceIds = mapTextToSentenceIds(text);
                //   if (sentenceIds.length) {
                //     const isHighlight =
                //       sentenceIds.length > 1 || !sentenceIds.some((sid) => matchSentenceIds.includes(sid));
                //     doKeep({ sentenceIds, withNoteCard: true, isHighlight });
                //   }
                // }}
              />
            );
          }
        })
        .filter(Boolean)
    : [];

  useEffect(() => {
    if ((hasLoaded && !prevHasLoaded) || documentId !== prevDocumentId || cardId !== prevCardId) {
      // Scroll matched card into view on load:
      const card = document?.cards.find((c) => c.id === cardId);
      if (!card) return;

      const el = cardRefs.current[cardId]?.el;
      if (!el) return;

      const position = card.position;
      if (position) {
        canvasRef.current.zoomToFit(
          {
            ...position,
            width: el.offsetWidth,
            height: el.offsetHeight,
          },
          false
        );
      }
    }
  }, [prevHasLoaded, hasLoaded, documentId, prevDocumentId, cardId, prevCardId, document]);

  const [camera, setCamera] = useState(ZERO_CAMERA);

  return (
    <>
      <div className={styles.canvas} onClick={(e) => e.stopPropagation()}>
        {!hasLoaded && <LoadingPrompt />}
        {hasLoaded && (
          <Canvas
            ref={canvasRef}
            horizontalOffset={0}
            camera={camera}
            doUpdateCamera={setCamera}
            onClick={null}
            onDoubleClick={null}
            onRangeSelect={null}
            spatialIndex={spatialIndexRef.current}
          >
            {cards}
            {textSelectionToolbars}
          </Canvas>
        )}
      </div>
      <GoToIdeaButton
        url={noteCard.url || "https://app.re-collect.ai"}
        title={noteCard.title || "Untitled"}
        onClick={onReadMore}
        hasStack={!!stack}
      />
    </>
  );
}

IdeaNoteModal.propTypes = {
  doKeep: PropTypes.func,
  doSelectCard: PropTypes.func.isRequired,
  hasLoaded: PropTypes.bool.isRequired,
  keptCards: PropTypes.array.isRequired,
  noteCard: PropTypes.object.isRequired,
  onReadMore: PropTypes.func.isRequired,
  stack: PropTypes.object,
};

export default function ReaderModal({ artifactId, page, ...props }) {
  const { doArtifactLoad } = useStore(selector, shallow);
  const artifact = useStore(useCallback((state) => state.artifacts.get(artifactId), [artifactId]));
  const hasLoaded = !!(artifact?.status === "success");
  const hasError = !!(artifact?.status === "error");

  const isIdeaNote = artifact?.artifactType === "recollect-note" && isIdeaNoteCardUrl(artifact?.url);
  const isAnnotationNode = artifact?.artifactType === "recollect-note" && !isIdeaNote;
  const isTweetThread = artifact?.artifactType === "tweet-thread";
  const isPDF = artifact?.artifactType === "pdf";
  const isYouTube = artifact?.artifactType === "youtube-video-transcript";
  const isAppleNote = artifact?.artifactType === "apple-note";
  const isGoogleScreenshot = artifact?.artifactType === "google-drive-screenshot";

  const hasContent =
    artifact?.artifactType === "tweet-thread" ? !!artifact?.tweets?.length : !!artifact?.sentences?.length;

  useEffect(() => {
    if (!artifact) {
      doArtifactLoad({ id: artifactId });
    }
  }, [artifact, doArtifactLoad, artifactId]);

  let artifactLabel = "article";
  if (isTweetThread) {
    artifactLabel = "tweet thread";
  } else if (isIdeaNote) {
    artifactLabel = "re:collect idea";
  } else if (isAnnotationNode) {
    artifactLabel = "re:collect annotation";
  } else if (isPDF) {
    artifactLabel = "PDF document";
  } else if (isYouTube) {
    artifactLabel = "YouTube video transcript";
  } else if (isAppleNote) {
    artifactLabel = "Apple Notes";
  } else if (isGoogleScreenshot) {
    artifactLabel = "Google Drive screenshot";
  }

  let modal = null;
  if (hasContent) {
    if (isIdeaNote) {
      modal = <IdeaNoteModal {...props} noteCard={artifact} noteCardId={artifactId} hasLoaded={hasLoaded} />;
    } else if (isTweetThread) {
      modal = <TweetReaderModal {...props} hasLoaded={hasLoaded} tweetThread={artifact} tweetThreadId={artifactId} />;
    } else if (isPDF) {
      modal = <PDFReaderModal {...props} hasLoaded={hasLoaded} article={artifact} articleId={artifactId} page={page} />;
    } else if (isYouTube) {
      modal = <TranscriptReaderModal {...props} hasLoaded={hasLoaded} article={artifact} articleId={artifactId} />;
    } else if (isGoogleScreenshot) {
      modal = (
        <GoogleScreenshotReaderModal {...props} hasLoaded={hasLoaded} article={artifact} articleId={artifactId} />
      );
    } else {
      modal = <ArticleReaderModal {...props} hasLoaded={hasLoaded} article={artifact} articleId={artifactId} />;
    }
  }

  return (
    <div className={styles.ReaderModal}>
      {!hasContent && !hasLoaded && !hasError && (
        <div className={styles.centerPrompt}>
          <LoadingPrompt />
        </div>
      )}
      {hasError && (
        <div className={styles.centerPrompt}>
          <p>{`Sorry, could not load ${artifactLabel}...`}</p>
        </div>
      )}
      {!hasError && modal}
    </div>
  );
}

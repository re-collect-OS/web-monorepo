import React, { useEffect } from "react";
import PropTypes from "prop-types";
import cn from "classnames";

import { extractNoteCardAndDocumentIdsFromUrl, extractNoteCardIdAndUrlFromUrl } from "../../../../js-shared-lib";
import { ClipboardIcon, KeepIcon } from "../icons";
import LoadingIndicator from "../loading-indicator";
import IconButton from "../icon-button";
import Thumbnail from "../thumbnail";

import Result from "./Result";
import { RecallResultText, generateRecallResultExternalLink, isIdeaNoteCardUrl } from "./RecallResultContent";

import styles from "./RecallResults.module.css";

export const recallResultsSortFn = (a, b) => {
  // We assume we can't have mixed artifact types with the same artifactId
  if (a.artifactType === "tweet-thread") {
    // This will still work assuming sentenceNumber is incremental in the tweet thread
    return (
      parseInt(a.tweets[a.matchTweetIndex].sentences[0]?.sentenceNumber || 0) -
      parseInt(b.tweets[b.matchTweetIndex].sentences[0]?.sentenceNumber || 0)
    );
  }

  // Sort by score
  return b.score - a.score;
  //return parseInt(a.sentences[0]?.sentenceNumber || 0) - parseInt(b.sentences[0]?.sentenceNumber || 0);
};

function RecallResults({
  hasError,
  isLoading,
  markedGoodResultIds,
  onArtifactClick,
  query,
  renderArtifactNav,
  renderMatchNav,
  results,
  loadThumbnailFromS3Path,
}) {
  const resultsByArticle = results.reduce((artifacts, model, index) => {
    let url;
    // Special case note cards which have to be grouped by the documentId (extracted from the url)
    if (model.artifactType === "recollect-note") {
      if (isIdeaNoteCardUrl(model.url)) {
        const { documentId } = extractNoteCardAndDocumentIdsFromUrl(model.url);
        url = `https://app.recollect.ai/idea/${documentId}`;
      } else {
        const { url: pageUrl } = extractNoteCardIdAndUrlFromUrl(model.url);
        url = pageUrl;
      }
    } else {
      url = model.url;
    }
    return { ...artifacts, [url]: [...(artifacts[url] || []), { ...model, index }] };
  }, {});

  let cards = Object.keys(resultsByArticle).map((key) => {
    const models = resultsByArticle[key].sort(recallResultsSortFn);
    return (
      <Result
        key={models[0].artifactId}
        model={models[0]}
        onReadMore={(event) => onArtifactClick({ event, model: models[0] })}
      >
        {models.map((model) => (
          <div
            key={model.index}
            className={cn(styles.paragraphSection, {
              [styles.isMarkedGood]: markedGoodResultIds.includes(model.matchSentence),
            })}
          >
            {model.artifactType === "google-drive-screenshot" ? (
              <Thumbnail s3Path={model.thumbnailS3Path} doLoad={loadThumbnailFromS3Path} shouldCache />
            ) : (
              <RecallResultText model={model} isMatchClassName={styles.isMatch} />
            )}
            <div
              className={styles.nav}
              onClick={(event) => {
                event.preventDefault();
              }}
            >
              {renderMatchNav({ model })}
            </div>
          </div>
        ))}
      </Result>
    );
  });

  if (isLoading) {
    if (!cards.length) {
      cards = (
        <div className={styles.loadingPrompt}>
          <LoadingIndicator />
        </div>
      );
    }
  } else {
    if (hasError) {
      cards = <div className={styles.loadingPrompt}>Sorry, failed to recall. Please try again later.</div>;
    } else if (!cards.length && query?.length) {
      // If we have a query and are not loading, but no results:
      cards = <div className={styles.loadingPrompt}>Sorry, no results...</div>;
    } else {
      // noop - we already have what we need
    }
  }

  return (
    <div className={styles.RecallResults}>
      <div className={styles.container}>{cards}</div>
    </div>
  );
}

RecallResults.propTypes = {
  hasError: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  markedGoodResultIds: PropTypes.array.isRequired,
  onArtifactClick: PropTypes.func.isRequired,
  query: PropTypes.string,
  renderArtifactNav: PropTypes.func,
  renderMatchNav: PropTypes.func.isRequired,
  results: PropTypes.array.isRequired,
};

export default RecallResults;

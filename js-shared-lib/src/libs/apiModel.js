import { v4 as uuidv4 } from "uuid";
import { currentTimestamp } from "../utils/date";

export function extractNoteCardAndDocumentIdsFromUrl(urlStr) {
  // ex https://app.re-collect.ai/idea/[documentId]#card=[cardId]

  let url;
  try {
    url = new URL(urlStr);
  } catch (error) {
    console.log("[DEBUG] Failed to extract note card and document IDs from URL", urlStr, error);
    return {
      documentId: undefined,
      cardId: undefined,
    };
  }

  const [documentId] = url.pathname.split("/").slice(-1);

  const parsedHash = new URLSearchParams(
    url.hash.substring(1) // skip the first char (#)
  );
  const cardId = parsedHash.get("card");

  return {
    documentId,
    cardId,
  };
}

export function extractNoteCardIdAndUrlFromUrl(urlStr) {
  // ex https://app.re-collect.ai/artifact?url=[url]#card=[cardId]

  let url;
  try {
    url = new URL(urlStr);
  } catch (error) {
    console.log("[DEBUG] Failed to extract note card id and URL from URL", urlStr, error);
    return {
      url: undefined,
      cardId: undefined,
    };
  }

  const pageUrl = url.searchParams.get("url");
  const parsedHash = new URLSearchParams(
    url.hash.substring(1) // skip the first char (#)
  );
  const cardId = parsedHash.get("card");

  return {
    url: pageUrl,
    cardId,
  };
}

export const makeQueryStack = ({
  id = uuidv4(),
  documentId,
  query,
  index = 0,
  results = [],
  keptResults = [],
  removedResults = [],
  markedGoodResults = [],
  createdAt = currentTimestamp(),
  errorMsg,
  options,
} = {}) => ({
  id,
  documentId,
  query,
  index,
  results,
  keptResults,
  removedResults,
  markedGoodResults,
  createdAt,
  errorMsg,
  ...(options !== undefined ? { options } : {}),
});

// Artifacts

export const makeArticle = ({ artifactId, title, byline, url, sentences, metadata }) => ({
  artifactType: "web-article",
  artifactId,
  sentences,
  title,
  ...(byline ? { byline } : {}),
  ...(metadata ? { metadata } : {}),
  url,
});

export const makeSparseDocument = ({ artifactId, title, byline, url, sentences, metadata }) => ({
  artifactType: "recollect-sparse-document",
  artifactId,
  sentences,
  title,
  url,
  byline,
  ...(metadata ? { metadata } : {}),
});

export const makeAppleNote = ({ artifactId, title, byline, url, sentences, metadata }) => ({
  artifactType: "apple-note",
  artifactId,
  sentences,
  title,
  ...(byline ? { byline } : {}),
  ...(metadata ? { metadata } : {}),
  url,
});

export const makeGoogleScreenshot = ({ artifactId, title, thumbnailS3Path, s3Path, url, sentences, metadata }) => ({
  artifactType: "google-drive-screenshot",
  artifactId,
  sentences,
  title,
  thumbnailS3Path,
  s3Path,
  ...(metadata ? { metadata } : {}),
  url,
});

export const makeGoogleDoc = ({ artifactId, title, byline, url, sentences, metadata }) => ({
  artifactType: "google-drive-doc",
  artifactId,
  sentences,
  title,
  ...(byline ? { byline } : {}),
  ...(metadata ? { metadata } : {}),
  url,
});

export const makePDF = ({ artifactId, title, byline, filename, page, url, sentences, metadata }) => ({
  artifactType: "pdf",
  artifactId,
  sentences,
  title: title || filename,
  filename,
  page,
  url,
  ...(byline ? { byline } : {}),
  ...(metadata ? { metadata } : {}),
});

export const makeIdeaNote = ({ artifactId, title, byline, url, sentences, metadata }) => ({
  artifactType: "recollect-note",
  artifactId,
  sentences,
  title,
  ...(byline ? { byline } : {}),
  ...(metadata ? { metadata } : {}),
  url,
});

export const makeTweet = ({
  url,
  userName,
  displayName,
  avatarUrls,
  sentences,
  quotesTweet,
  retweetsTweet,
  media,
  metadata,
}) => ({
  url,
  userName,
  displayName,
  avatarUrls,
  sentences,
  ...(quotesTweet ? { quotesTweet } : {}),
  ...(retweetsTweet ? { retweetsTweet } : {}),
  ...(media ? { media } : {}),
  ...(metadata ? { metadata } : {}),
});

export const makeTweetThread = ({ artifactId, tweets, title, url, metadata }) => ({
  artifactType: "tweet-thread",
  artifactId,
  tweets,
  ...(title ? { title } : {}),
  url,
  ...(metadata ? { metadata } : {}),
});

export const makeYouTubeVideo = ({ artifactId, title, byline, url, sentences, metadata }) => ({
  artifactType: "youtube-video-transcript",
  artifactId,
  sentences,
  title,
  ...(byline ? { byline } : {}),
  url,
  ...(metadata ? { metadata } : {}),
});

// Query Results - these extend the artifact types with result specific keys

export const makeSparseArticleQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makeSparseDocument(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeAppleNoteQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makeAppleNote(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeGoogleScreenshotQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makeGoogleScreenshot(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeGoogleDocQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makeGoogleDoc(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeArticleQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makeArticle(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makePDFQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makePDF(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeIdeaNoteQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makeIdeaNote(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeYouTubeVideoQueryResult = ({ matchSentence, score, isGraphResult, ...rest }) => ({
  ...makeYouTubeVideo(rest),
  matchSentence,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeTweetThreadQueryResult = ({ matchSentence, matchTweetIndex, score, isGraphResult, ...rest }) => ({
  ...makeTweetThread(rest),
  matchSentence,
  matchTweetIndex,
  score,
  ...(isGraphResult ? { isGraphResult } : {}),
});

// Map quoted sentences

const mapSentenceResponseToModel = (sentence) => ({
  paragraphNumber: sentence.paragraph_number,
  sentenceNumber: sentence.sentence_number,
  text: sentence.text,
  type: sentence.text_type,
  ...(sentence.page !== undefined ? { page: sentence.page } : {}),
  ...(sentence.seconds_from_start !== undefined ? { secondsFromStart: sentence.seconds_from_start } : {}),
  ...(sentence.location !== undefined ? { location: sentence.location } : {}),
  ...(sentence.locationType !== undefined ? { locationType: sentence.locationType } : {}),
});

// Map quoted tweets

const mapTweetResponseToModel = (res) => {
  return makeTweet({
    url: res.url,
    userName: res.user_name,
    displayName: res.display_name,
    avatarUrls: res.avatar_urls || {}, // passthrough: normal, bigger, mini, original
    sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
    quotesTweet: res.quotes_tweet ? mapTweetResponseToModel(res.quotes_tweet) : undefined,
    retweetsTweet: res.retweets_tweet ? mapTweetResponseToModel(res.retweets_tweet) : undefined,
    media: res.media, // passthrough
    metadata: res._metadata, // passthrough
    isGraphResult: res.is_graph_result,
  });
};

// Map Recall (connections) server responses to internal representation

export const mapConnectionResultToModel = (res) => {
  if (res.doc_type === "google_drive" && res.doc_subtype === "screenshot") {
    return makeGoogleScreenshotQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      score: res.score,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      byline: res.byline,
      url: res.url,
      metadata: res._metadata,
      thumbnailS3Path: res.thumbnail_s3_path,
      s3Path: res.s3_path,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "google_drive" && res.doc_subtype === "google_doc") {
    return makeGoogleDocQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      score: res.score,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      byline: res.byline,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "recollect" && res.doc_subtype === "note_card") {
    return makeIdeaNoteQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      score: res.score,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      byline: res.byline,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "video_transcription" && res.doc_subtype === "youtube") {
    return makeYouTubeVideoQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      score: res.score,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      byline: res.byline,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "twitter" && res.doc_subtype === "tweet_thread") {
    return makeTweetThreadQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      matchTweetIndex: res.match_tweet_index,
      score: res.score,
      tweets: res.tweets.map((tweet) => mapTweetResponseToModel(tweet)),
      title: res.title,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "pdf") {
    return makePDFQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      score: res.score,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      filename: res.filename,
      title: res.title,
      byline: res.byline,
      page: res.page,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "recollect" && res.doc_subtype === "sparse_document") {
    return makeSparseArticleQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      score: res.score,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      byline: res.byline,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "native" && res.doc_subtype === "apple_note") {
    return makeAppleNoteQueryResult({
      artifactId: res.doc_id,
      matchSentence: res.match_sentence,
      score: res.score,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      byline: res.byline,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  // Fall back to article:
  return makeArticleQueryResult({
    artifactId: res.doc_id,
    matchSentence: res.match_sentence,
    score: res.score,
    sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
    title: res.title,
    byline: res.byline,
    url: res.url,
    metadata: res._metadata,
    isGraphResult: res.is_graph_result,
  });
};

// Used by makeUserData

export const mapUserDataResultToModel = (res) => {
  if (res.doc_type === "recollect" && res.doc_subtype === "note_card") {
    return makeIdeaNote({
      artifactId: res.doc_id,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      url: res.url,
      byline: res.byline,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "twitter" && res.doc_subtype === "tweet_thread") {
    return makeTweetThread({
      artifactId: res.doc_id,
      tweets: res.tweets ? res.tweets.map((tweet) => mapTweetResponseToModel(tweet)) : [],
      title: res.title,
      url: res.url,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "pdf") {
    return makePDF({
      artifactId: res.doc_id,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      byline: res.byline,
      filename: res.filename,
      url: res.url,
      page: res.page,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "video_transcription" && res.doc_subtype === "youtube") {
    return makeYouTubeVideo({
      artifactId: res.doc_id,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      url: res.url,
      byline: res.byline,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "recollect" && res.doc_subtype === "sparse_document") {
    return makeSparseDocument({
      artifactId: res.doc_id,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      url: res.url,
      byline: res.byline,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "native" && res.doc_subtype === "apple_note") {
    return makeAppleNote({
      artifactId: res.doc_id,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      url: res.url,
      byline: res.byline,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "google_drive" && res.doc_subtype === "screenshot") {
    return makeGoogleScreenshot({
      artifactId: res.doc_id,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      url: res.url,
      thumbnailS3Path: res.thumbnail_s3_path,
      s3Path: res.s3_path,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  if (res.doc_type === "google_drive" && res.doc_subtype === "google_doc") {
    return makeGoogleDoc({
      artifactId: res.doc_id,
      sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
      title: res.title,
      url: res.url,
      byline: res.byline,
      metadata: res._metadata,
      isGraphResult: res.is_graph_result,
    });
  }

  // Fall back to article for now:
  return makeArticle({
    artifactId: res.doc_id,
    sentences: res.sentences ? res.sentences.map((sen) => mapSentenceResponseToModel(sen)) : [],
    title: res.title,
    url: res.url,
    byline: res.byline,
    metadata: res._metadata,
    isGraphResult: res.is_graph_result,
  });
};

// When we render a kept card we have a partial version of the artifact in the quoted segment as well as the metadata.
// To make it seem like the load time for the full artifact is shorter we create a draft version of the artifact
// that has the parts we have and can render it immediately with some spinners around to indicate the full content
// is loading.
// This is also used to map the artifact server reponse to our internal representation once we do have the full contents.
// (to be rendered by the Reader)
export const makeUserData = ({ status = "idle", ...res }) => ({
  status,
  ...(Object.keys(res).length ? mapUserDataResultToModel(res) : {}),
});

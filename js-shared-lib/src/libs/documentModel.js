import { ZERO_CAMERA } from "./canvasModel";
import { currentTimestamp } from "../utils/date";

export const makeDocument = ({
  documentId,
  body,
  createdAt,
  modifiedAt,
  archivedAt,
  pinnedAt,
  trashedAt,
  cards = [],
  camera = ZERO_CAMERA,
  layout,
  splitLayoutWidth,
  // using in order to know if a card or stack is an add or an update at the sync api layer
  lastSyncedAt = currentTimestamp(),
  dirtyKeys = new Set(),
  syncStatus = "idle",
}) => ({
  documentId,
  body,
  cards,
  dirtyKeys,
  syncStatus,
  createdAt, // ISO date
  modifiedAt, // ISO date
  lastSyncedAt, // TS
  camera,
  ...(layout ? { layout } : {}),
  ...(splitLayoutWidth ? { splitLayoutWidth } : {}),
  ...(archivedAt ? { archivedAt } : {}), // TS
  ...(pinnedAt ? { pinnedAt } : {}), // TS
  ...(trashedAt ? { trashedAt } : {}), // TS
});

export const makeIdeaNoteKeptCard = ({ sentences = [], title, ...rest }) =>
  makeKeptCard({
    artifactType: "recollect-note",
    sentences,
    title,
    ...rest,
  });

export const makeGoogleScreenshotKeptCard = ({ sentences = [], title, ...rest }) =>
  makeKeptCard({
    artifactType: "google-drive-screenshot",
    sentences,
    title,
    ...rest,
  });

export const makeGoogleDocKeptCard = ({ sentences = [], title, ...rest }) =>
  makeKeptCard({
    artifactType: "google-drive-doc",
    sentences,
    title,
    ...rest,
  });

export const makeAppleNotesKeptCard = ({ sentences = [], title, ...rest }) =>
  makeKeptCard({
    artifactType: "apple-note",
    sentences,
    title,
    ...rest,
  });

export const makeArticleKeptCard = ({ sentences = [], title, ...rest }) =>
  makeKeptCard({
    artifactType: "web-article",
    sentences,
    title,
    ...rest,
  });

export const makePDFKeptCard = ({ sentences = [], filename, page, ...rest }) =>
  makeKeptCard({
    artifactType: "pdf",
    sentences,
    filename,
    title: filename,
    page,
    ...rest,
  });

export const makeYouTubeKeptCard = ({ sentences = [], title, ...rest }) =>
  makeKeptCard({
    artifactType: "youtube-video-transcript",
    sentences,
    title,
    ...rest,
  });

export const makeTweetKeptCard = ({ tweets = [], matchTweetIndex = 0, ...rest }) =>
  makeKeptCard({
    artifactType: "tweet-thread",
    tweets,
    matchTweetIndex,
    ...rest,
  });

// Note that this mostly extends the apiModel internal query result types and must stay in sync.
// We have highlight subtype kept cards though which have a `matchSentences` (plural)
// We can't reuse the mapping function from apiModel directly as that expects the server response data as input
// There should be some saner way than repeating all the keys here though...
export const makeKeptCard = ({
  artifactId,
  artifactType,
  createdAt = currentTimestamp(),
  filename,
  id,
  matchSentence,
  matchSentences,
  matchTweetIndex,
  page,
  parentId,
  position,
  query,
  reason,
  score,
  sentences,
  title,
  tweets,
  updatedAt,
  url,
  byline,
  thumbnailS3Path,
  isGraphResult,
  zIndex = 0,
}) => ({
  id,
  artifactId,
  artifactType,
  parentId,
  query,
  score,
  type: "kept",
  subType: query ? "query" : "highlight",
  url,
  reason,
  position: position ? position : { x: 0, y: 0 },
  zIndex,
  createdAt,
  updatedAt: updatedAt || createdAt,
  // match
  ...(matchSentences !== undefined ? { matchSentences } : {}), // removing once we migrate existing data over
  ...(matchSentence !== undefined ? { matchSentence } : {}),
  // article
  ...(sentences ? { sentences } : {}),
  ...(title ? { title } : {}),
  ...(byline ? { byline } : {}),
  // tweet
  ...(tweets ? { tweets } : {}),
  ...(matchTweetIndex !== undefined ? { matchTweetIndex } : {}),
  // pdf
  ...(page ? { page } : {}),
  ...(filename ? { filename } : {}),
  // google screenshot
  ...(thumbnailS3Path ? { thumbnailS3Path } : {}),
  // graph
  ...(isGraphResult ? { isGraphResult } : {}),
});

export const makeNoteCard = ({ id, body, position, createdAt = currentTimestamp(), updatedAt, zIndex = 0 }) => ({
  id,
  type: "note",
  body,
  position: position ? position : { x: 0, y: 0 },
  zIndex,
  createdAt,
  updatedAt: updatedAt || createdAt,
});

export const makeHighlightCard = ({
  id,
  url,
  before = "",
  after = "",
  text,
  parentId,
  visuallyAfterId,
  createdAt = currentTimestamp(),
  updatedAt,
  position,
  zIndex = 0,
}) => ({
  id,
  type: "highlight",
  before,
  after,
  text,
  parentId,
  visuallyAfterId,
  createdAt,
  updatedAt: updatedAt || createdAt,
  position: position ? position : { x: 0, y: 0 },
  zIndex,
});

export function getMatchSentenceFromModel({ model }) {
  let sentence;

  const findSentence = (sentences) =>
    sentences.find(
      (s) => s.sentenceNumber === (model.matchSentence || (model.matchSentences && model.matchSentences[0]))
    )?.text;

  if (model.artifactType === "tweet-thread") {
    const tweet = model.tweets[model.matchTweetIndex];
    sentence = findSentence(tweet.sentences);
    if (!sentence && tweet.quotesTweet) {
      sentence = findSentence(tweet.quotesTweet.sentences);
    }
  } else {
    sentence = findSentence(model.sentences);
  }

  return sentence;
}

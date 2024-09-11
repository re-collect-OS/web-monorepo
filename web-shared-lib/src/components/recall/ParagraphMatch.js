import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";

import { truncateStr } from "../../../../js-shared-lib";

import styles from "./ParagraphMatch.module.css";

export function extractParagraphMatch({ sentences, matchSentences }) {
  const before = [];
  const match = [];
  const after = [];

  sentences.forEach((s) => {
    if (matchSentences.includes(s.sentenceNumber)) {
      match.push(s.text);
    } else if (!match.length) {
      before.push(s.text);
    } else {
      after.push(s.text);
    }
  });

  if (!match.length) {
    return {
      beforeStr: "",
      matchStr: before.join(" "),
      afterStr: "",
    };
  }

  const beforeStr = truncateStr({ str: before.join(" "), maxLen: 200, direction: "before" });
  const matchStr = match.join(" ");
  const afterStr = truncateStr({ str: after.join(" "), maxLen: 200 });

  return {
    beforeStr,
    matchStr,
    afterStr,
  };
}

export default function ParagraphMatch({ sentences, matchSentence, matchSentences, isMatchClassName }) {
  if (matchSentence !== undefined) {
    matchSentences = [matchSentence];
  }

  const { beforeStr, matchStr, afterStr } = extractParagraphMatch({ sentences, matchSentences });

  // If everything matches nothing matches
  const hasBeforeOrAfter = !!beforeStr || !!afterStr;

  return (
    <>
      {beforeStr && <span className={styles.sentence}>{beforeStr}</span>}
      <span
        className={cn(
          styles.sentence,
          { [styles.isMatch]: hasBeforeOrAfter },
          { [isMatchClassName]: hasBeforeOrAfter }
        )}
      >
        {matchStr}
      </span>
      {afterStr && <span className={styles.sentence}>{afterStr}</span>}
    </>
  );
}

ParagraphMatch.propTypes = {
  sentences: PropTypes.array.isRequired,
  matchSentence: PropTypes.number,
  matchSentences: PropTypes.arrayOf(PropTypes.number),
  isMatchClassName: PropTypes.string,
};

export function QuotedTweetParagraphMatch({ sentences, userName, matchSentence, matchSentences }) {
  return (
    <div className={styles.quotedTweetWrapper}>
      <span className={styles.quotedTweetUsername}>{`@${userName}`}</span>
      <ParagraphMatch sentences={sentences} matchSentence={matchSentence} matchSentences={matchSentences} />
    </div>
  );
}

QuotedTweetParagraphMatch.propTypes = {
  matchSentence: PropTypes.number,
  matchSentences: PropTypes.arrayOf(PropTypes.number),
  sentences: PropTypes.array.isRequired,
  userName: PropTypes.string.isRequired,
};

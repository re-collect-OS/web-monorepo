export function findMatchedText({ models, sentenceId }) {
  for (let m of models) {
    const findTextInSentence = (s) => s.sentenceNumber === sentenceId && s.sentenceNumber === m.matchSentence;

    if (m.artifactType === "tweet-thread") {
      // TODO look for quote tweet
      m.tweets.forEach((tweet) => {
        const sentence = tweet.sentences.find(findTextInSentence);
        if (sentence) {
          return sentence.text;
        }
      });
    } else {
      const sentence = m.sentences.find(findTextInSentence);
      if (sentence) {
        return sentence.text;
      }
    }
  }
}

export function generateTextFragment({ href, textFragment }) {
  // https://wicg.github.io/scroll-to-text-fragment/
  // https://web.dev/text-fragments/
  // https://caniuse.com/url-scroll-to-text-fragment
  const encodedTextFragment = textFragment ? encodeURIComponent(textFragment) : undefined;
  return encodedTextFragment ? `${href}#:~:text=${encodedTextFragment}` : href;
}

export function truncateStr({ str, maxLen, direction = "after" }) {
  if (str.length > maxLen) {
    const croppedStr = direction === "after" ? str.substring(0, maxLen) : str.substring(str.length - maxLen);
    return direction === "after" ? `${croppedStr}...` : `...${croppedStr}`;
  }
  return str;
}

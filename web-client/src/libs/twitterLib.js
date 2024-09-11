import { urlencodeParams } from "js-shared-lib";
import { encode as base64encode } from "base64-arraybuffer";

import config from "../config";

export const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
export const RESPONSE_TYPE = "code";
export const CLIENT_ID = config.TWITTER_CLIENT_ID;
export const REDIRECT_URL = `${config.APP_URL}/integrations/twitter`;
export const SCOPES = [
  "tweet.read",
  "users.read",
  "bookmark.read", // bookmarks are private
  "offline.access", // required for refresh token, so we can extend access
];

export function generateAuthorizationUrl({ state, codeChallenge, codeChallengeMethod = "S256" }) {
  if (!["plain", "S256"].includes(codeChallengeMethod)) {
    throw new Error(`twitterLib: unexpected code challenge method ${codeChallengeMethod}`);
  }

  const params = {
    client_id: CLIENT_ID,
    state: state,
    response_type: RESPONSE_TYPE,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope: SCOPES.join(" "),
    redirect_uri: REDIRECT_URL,
  };
  return `${AUTHORIZE_URL}?${urlencodeParams(params)}`;
}

function escapeBase64ToBase64Url(base64Digest) {
  return base64Digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function generates256CodeChallenge(codeVerifier) {
  // https://tools.ietf.org/html/rfc7636#section-4.2
  // https://www.valentinog.com/blog/challenge/
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const base64Digest = base64encode(digest);
  return escapeBase64ToBase64Url(base64Digest);
}

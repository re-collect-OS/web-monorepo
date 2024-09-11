const commonExtensions = [
  "avi",
  "bmp",
  "css",
  "csv",
  "dmg",
  "doc",
  "docx",
  "exe",
  "gif",
  "gz",
  "ico",
  "iso",
  "jpeg",
  "jpg",
  "js",
  "json",
  "key",
  "mov",
  "mp3",
  "mpeg",
  "mpg",
  "odt",
  "ogg",
  "otf",
  "pkg",
  "png",
  "ppt",
  "pptx",
  "psd",
  "rss",
  "sql",
  "svg",
  "tar",
  "tif",
  "tiff",
  "ttf",
  "wav",
  "webm",
  "xml",
  "zip",
];

export function testVisitAgainstGoList(list, { url }) {
  return list.some((host) => new RegExp(`^https?://[^/]*${host}/`).test(url));
}

export function filterVisitsWithGoList({ goList, visits }) {
  const fn = testVisitAgainstGoList.bind(null, goList);
  return visits.filter(fn);
}

export function cleanUrl(url) {
  return url.replace(/(\?.*)|(#.*)/g, "");
}

export function testVisitAgainstNoGoList(noGoList, { url }) {
  const curl = cleanUrl(url);
  return (
    curl.startsWith("http") &&
    !commonExtensions.includes(curl.split(".").pop()) &&
    !noGoList.some((rule) => new RegExp(`^https?://[^/]*${rule}`).test(curl))
  );
}

export function filterVisitsAgainstNoGoList({ noGoList, visits }) {
  const fn = testVisitAgainstNoGoList.bind(null, noGoList);
  return visits.filter(fn);
}

// Originally from https://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address
// Made the domain required (* > +)
export const hostnamePattern = new RegExp(
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)+([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/,
  "i"
);

// Based on https://stackoverflow.com/questions/4138483/twitter-status-url-regex
export const tweetPattern = new RegExp(/^https?:\/\/(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/, "i");

// Based on https://webapps.stackexchange.com/questions/54443/format-for-id-of-youtube-video
// (needs to stay in sync with k8s-backend YOUTUBE_URL_PATTERN)
export const youtubePattern = new RegExp(
  /^https?:\/\/w{0,3}\.?(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([\d\w\-_]{11})/,
  "i"
);
export const stripWWW = (str) => (str?.startsWith("www.") ? str.substring(4) : str);

export function isUrl(str) {
  let url;

  try {
    url = new URL(str);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

export function isPDFUrl(str) {
  const curl = cleanUrl(str);
  return isUrl(curl) && ["pdf"].includes(curl.split(".").pop());
}

export function isTweetUrl(str) {
  return !!str.match(tweetPattern);
}

export function isYouTubeUrl(str) {
  return !!str.match(youtubePattern);
}

export function extractHostname(str) {
  if (str.match(hostnamePattern)) {
    return stripWWW(str);
  }

  try {
    const url = new URL(str);
    if (url.hostname.match(hostnamePattern)) {
      return stripWWW(url.hostname);
    }
  } catch (error) {} // eslint-disable-line no-empty

  return null;
}

export function sortHostnamesAlphabetically(hostnames) {
  const data = hostnames.map((hostname) => hostname.split(".").reverse()).sort();
  return data.map((arr) => arr.reverse().join("."));
}

export function urlencodeParams(p) {
  return Object.entries(p)
    .map((kv) => kv.map(encodeURIComponent).join("="))
    .join("&");
}

// Strip out hash parameters
export function extractCleanUrl(str) {
  if (!str) {
    return;
  }
  const url = new URL(str);
  return url.origin + url.pathname + url.search;
}

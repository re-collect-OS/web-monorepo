// Trim specific characters from string end(s)
// https:// stackoverflow.com/a/55292366

export function trimAny(str, chars, edge = null) {
  let start = 0;
  let end = str.length;

  if (!edge || edge === "start") {
    while (start < end && chars.indexOf(str[start]) >= 0) ++start;
  }

  if (!edge || edge === "end") {
    while (end > start && chars.indexOf(str[end - 1]) >= 0) --end;
  }

  return start > 0 || end < str.length ? str.substring(start, end) : str;
}

export function trimStart(str, chars) {
  return trimAny(str, chars, "start");
}

export function trimEnd(str, chars) {
  return trimAny(str, chars, "end");
}

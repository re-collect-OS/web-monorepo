export function currentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function parseTimestap(ts) {
  return new Date(parseInt(ts) * 1000);
}

export function getISOTimestamp(date) {
  return date ? new Date(date).toISOString() : new Date().toISOString();
}

export function isValidIsoDate(str) {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
  const d = new Date(str);
  return d instanceof Date && !isNaN(d.getTime()) && d.toISOString() === str;
}

// https://stackoverflow.com/a/6109105
export function timeDifference(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
    let val = Math.round(elapsed / 1000);
    if (val === 0) {
      return "just now";
    }
    return `${val} ${val === 1 ? "second ago" : "seconds ago"}`;
  } else if (elapsed < msPerHour) {
    let val = Math.round(elapsed / msPerMinute);
    return `${val} ${val === 1 ? "minute ago" : "minutes ago"}`;
  } else if (elapsed < msPerDay) {
    let val = Math.round(elapsed / msPerHour);
    return `${val} ${val === 1 ? "hour ago" : "hours ago"}`;
  } else if (elapsed < msPerMonth) {
    let val = Math.round(elapsed / msPerDay);
    return `${val} ${val === 1 ? "day ago" : "days ago"}`;
  } else if (elapsed < msPerYear) {
    let val = Math.round(elapsed / msPerMonth);
    return `${val} ${val === 1 ? "month ago" : "months ago"}`;
  } else {
    let val = Math.round(elapsed / msPerYear);
    return `${val} ${val === 1 ? "year ago" : "years ago"}`;
  }
}

export function relativeTimeAgo(date) {
  if (typeof date === "string") {
    date = Date.parse(date);
  }
  return timeDifference(new Date(), date);
}

export function isDateYesterday(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (yesterday.toDateString() === date.toDateString()) {
    return true;
  }

  return false;
}

export function isDateThisWeek(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }

  const now = new Date();
  const todayDate = now.getDate();
  const todayDay = now.getDay();
  const firstDayOfWeek = new Date(now.setDate(todayDate - todayDay));
  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);

  return date >= firstDayOfWeek && date <= lastDayOfWeek;
}

export function relativeDayOfWeek(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }

  const now = new Date();

  if (now.toLocaleString([], { dateStyle: "short" }) === date.toLocaleString([], { dateStyle: "short" })) {
    return "Today";
  }

  if (isDateYesterday(date)) {
    return "Yesterday";
  }

  if (isDateThisWeek(date)) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  return date.toLocaleString([], { dateStyle: "short" });
}

// Convert GMT iso date string to yyyy-mm-dd in local time string
export function isoDateStrToLocalDateStr(isoDateString) {
  const date = new Date(isoDateString);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  // Reset time since it won't make sense
  localDate.setHours(0, 0, 0, 0);
  return localDate.toISOString();
}

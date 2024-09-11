import { asyncFlatMap } from "./asyncFlatMap";
import { filterVisitsWithGoList, filterVisitsAgainstNoGoList, getISOTimestamp } from "js-shared-lib";

function getVisits(historyItems) {
  return asyncFlatMap(historyItems, (historyItem) => {
    return new Promise((resolve, reject) => {
      try {
        chrome.history.getVisits({ url: historyItem.url }, (visitItems) => {
          resolve(
            visitItems.map((visitItem) => ({
              url: historyItem.url,
              transitionType: visitItem.transition,
              visitTime: getISOTimestamp(visitItem.visitTime),
            }))
          );
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function extractHostnameStats(visits) {
  let _hosts = {};
  visits.forEach((visit) => {
    const hostname = new URL(visit.url)?.hostname;
    if (hostname) {
      if (_hosts[hostname]) {
        _hosts[hostname] = _hosts[hostname] + 1;
      } else {
        _hosts[hostname] = 1;
      }
    }
  });

  let sortable = [];
  for (var hostname in _hosts) {
    sortable.push([hostname, _hosts[hostname]]);
  }

  return sortable.sort((a, b) => b[1] - a[1]);
}

export function getHistory({ goList = [], noGoList = [] }) {
  const isOptOut = noGoList.length > 0;

  const _90daysago = new Date().getTime() - 1000 * 60 * 60 * 24 * 90;
  const maxResults = 100000;

  return new Promise((resolve, reject) => {
    try {
      chrome.history.search({ text: "", startTime: _90daysago, maxResults }, function (data) {
        let cleanData;
        if (isOptOut) {
          cleanData = filterVisitsAgainstNoGoList({ visits: data || [], noGoList });
        } else {
          cleanData = filterVisitsWithGoList({ visits: data || [], goList });
        }
        getVisits(cleanData).then((visits) => {
          resolve({
            visits: visits.sort((a, b) => new Date(a.visitTime) - new Date(b.visitTime)),
            stats: extractHostnameStats(visits),
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

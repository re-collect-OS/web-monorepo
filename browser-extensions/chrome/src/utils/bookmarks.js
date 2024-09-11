import { getISOTimestamp } from "js-shared-lib";

// https://gist.github.com/rafaelvcoelho/3299443
function flattenBookmarks(tree) {
  const result = [];
  const path = [];

  const arrayForEach = function (nodes) {
    nodes.forEach(function (node) {
      if (node.title && node.children) {
        path.push(node.title);
      }

      if (node.title && node.url) {
        node.path = path;
        result.push({
          url: node.url,
          title: node.title,
          visitTime: getISOTimestamp(node.dateAdded),
          path: [...path],
        });
      }

      if (node.children) {
        arrayForEach(node.children);
        path.pop();
      }
    });
  };

  if (Array.isArray(tree)) {
    arrayForEach(tree);
  }

  return result;
}

export function getBookmarks() {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree(function (tree) {
        resolve(flattenBookmarks(tree));
      });
    } catch (error) {
      reject(error);
    }
  });
}

import DOMPurify from "dompurify";
import { getISOTimestamp, parseTimestap } from "js-shared-lib";

export function parseInstapaperHTMLFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) reject(new Error("Missing file input"));

    const reader = new FileReader();
    const visitTimeNow = getISOTimestamp();

    reader.addEventListener("load", (event) => {
      const data = event.target.result;
      const el = document.createElement("html");
      const sanitizedData = DOMPurify.sanitize(data, { ALLOWED_TAGS: ["a"] });
      el.innerHTML = sanitizedData;
      const matches = [...el.getElementsByTagName("a")].map((link) => ({
        url: link.href,
        hostname: link.hostname,
        visitTime: visitTimeNow, // not part of the data so we use current time
      }));
      resolve(matches);
    });

    reader.addEventListener("error", () => {
      reject(new Error("parseInstapaperHTMLFromFile: could not load file"));
    });

    reader.readAsText(file);
  });
}

export function parseInstapaperCSVFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) reject(new Error("Missing file input"));
    const reader = new FileReader();

    reader.addEventListener("load", (event) => {
      const data = event.target.result;

      // Lazy load PapaParse as we don't use this anywhere else in the app:
      import("papaparse")
        .then((Papa) => {
          const rows = Papa.parse(data, { header: true, skipEmptyLines: true });
          const matches = rows.data
            .map((row) => {
              try {
                const link = new URL(row.URL);
                return {
                  url: link.href,
                  hostname: link.hostname,
                  visitTime: getISOTimestamp(parseTimestap(row.Timestamp)),
                };
              } catch (error) {
                console.warn("parseInstapaperCSVFromFile:", error.message);
              }
            })
            .filter(Boolean);
          resolve(matches);
        })
        .catch((error) => {
          reject(new Error("parseInstapaperCSVFromFile: could not load CSV parser", { cause: error.message }));
          console.error(error);
        });
    });

    reader.addEventListener("error", () => {
      reject(new Error("parseInstapaperCSVFromFile: could not load file"));
    });

    reader.readAsText(file);
  });
}

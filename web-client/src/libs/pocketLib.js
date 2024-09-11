import DOMPurify from "dompurify";
import { getISOTimestamp, parseTimestap } from "js-shared-lib";

export function parsePocketListFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) reject(new Error("Missing file input"));

    const reader = new FileReader();

    reader.addEventListener("load", (event) => {
      const data = event.target.result;
      const el = document.createElement("html");
      // Clown alert: make custom tags valid HTML so they don't get stripped out by DOMPurify:
      const sanitizedData = DOMPurify.sanitize(data.replaceAll("time_added", "data-visit-time"), {
        ALLOWED_TAGS: ["a"],
      });
      el.innerHTML = sanitizedData;
      try {
        const matches = [...el.getElementsByTagName("a")].map((link) => ({
          url: link.href,
          hostname: link.hostname,
          visitTime: getISOTimestamp(parseTimestap(link.dataset.visitTime)),
        }));
        resolve(matches);
      } catch (error) {
        reject(new Error("parsePocketListFromFile: failed to parse file"));
      }
    });

    reader.addEventListener("error", () => {
      reject(new Error("parsePocketListFromFile: could not load file"));
    });

    reader.readAsText(file);
  });
}

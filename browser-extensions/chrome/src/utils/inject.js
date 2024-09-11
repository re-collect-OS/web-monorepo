import { APP_IS_DEV_EXTENSION, APP_STYLES_CONTAINER_ID } from "../config";

function getDocumentStylesNode(containerId) {
  return document.getElementById(containerId);
}

export function getSerializedDocumentStyles(containerId = APP_STYLES_CONTAINER_ID) {
  const stylesNode = getDocumentStylesNode(containerId);
  if (stylesNode) {
    const serializedStyles = [...stylesNode.children].map((child) => child.innerHTML).join("\n\n");
    stylesNode.remove();
    return serializedStyles;
  }
}

export function injectSerializedGlobalStyles({
  target,
  globalStyles,
  containerId = `${APP_STYLES_CONTAINER_ID}_global`,
}) {
  // Clean up previously injected styles
  const existingStyles = document.getElementById(containerId);
  if (existingStyles) {
    existingStyles.remove();
  }
  const styleNode = document.createElement("style");
  styleNode.setAttribute("id", containerId);
  styleNode.setAttribute("type", "text/css");
  styleNode.innerHTML = globalStyles;
  target.appendChild(styleNode);
}

export function rewriteFontPaths(globalStyles) {
  const interRomanFontPath = "fonts/Inter-roman.var.woff2";
  const interItalicFontPath = "fonts/Inter-italic.var.woff2";
  return globalStyles
    .replace(interRomanFontPath, chrome.runtime.getURL(interRomanFontPath))
    .replace(interItalicFontPath, chrome.runtime.getURL(interItalicFontPath));
}

// Because we want to be able to run both prod and dev extensions at once,
// we have to make the global identifiers different.
// We assume global strings are prefixed with _recollect
export function rewriteGlobalPrefixedString(globalStr) {
  if (!globalStr.includes("_recollect")) {
    throw new Error(`Global prefixed string does not include _recollect: "${globalStr}"`);
  }

  if (APP_IS_DEV_EXTENSION) {
    return globalStr.replaceAll("_recollect", `_recollect_dev`);
  }

  return globalStr;
}

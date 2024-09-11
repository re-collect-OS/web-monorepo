import { errorToString } from "js-shared-lib";
import * as Sentry from "@sentry/browser";

export function onError(error, errorContext) {
  const message = errorToString(error.response ? error.response : error);

  let logMessage = message;
  if (errorContext) {
    logMessage = `${errorContext}: ${message}`;
  }
  console.warn("%c  @ERROR  ", "background: red; color: white", logMessage);

  // Ignore logging 403 errors
  if (error.response?.status === 403) {
    return;
  }

  // Ignore common handled exceptions
  if (
    ["CodeMismatchException", "UsernameExistsException", "NotAuthorizedException", "UserNotFoundException"].includes(
      error.name
    ) ||
    ["No current user"].includes(message)
  ) {
    return;
  }

  Sentry.withScope((scope) => {
    if (errorContext) {
      scope.setExtra("error-context", errorContext);
    }

    // Handle wrapped axios network errors
    if (error.response) {
      scope.setExtra("error-data", error.response.data);
      scope.setExtra("error-status", error.response.status);
      scope.setExtra("error-headers", error.response.headers);
    }
    Sentry.captureException(error);
  });

  return message;
}

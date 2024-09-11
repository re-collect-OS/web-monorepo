import { FeedbackEventsService } from "js-shared-lib";

import apiLib from "./apiLib";

import { APP_VERSION } from "../config";

const FeedbackEventsManager = new FeedbackEventsService({
  source: `web-client-v${APP_VERSION}`,
  doSubmit: (events) => {
    return apiLib.submitFeedbackEvents({ events });
  },
});

export default FeedbackEventsManager;

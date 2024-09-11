import { chunk } from "../utils/array";

const apiName = "public";

export function loadDocuments(API) {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/document", { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function loadDocument(API, { id }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/document/${id}`, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function checkDocumentNeedsSync(API, { id, modifiedAt }) {
  return new Promise((resolve, reject) => {
    API.head(apiName, `/document/${id}?modifiedAt=${encodeURIComponent(modifiedAt)}`, { response: true })
      .then(() => {
        resolve(true);
      })
      .catch((error) => {
        const response = error.response;
        if (response) {
          if (response.status === 304) {
            resolve(false);
          } else if (response.status === 400) {
            reject(new Error("Bad format for modifiedAt value (expecting ISO-8601 string)", { cause: error }));
          } else if (response.status === 404) {
            reject(new Error("Document with that id not found", { cause: error }));
          }
        }
        reject(error);
      });
  });
}

export function createDocument(API, { content } = {}) {
  return API.post(apiName, "/document", { body: { content } }, { response: true });
}

const DOCUMENT_LIST_KEYS = ["cards"];
const VALID_LIST_OPERATIONS = ["add", "remove", "update"];

export function saveDocument(API, { id, changes, ifNotModifiedSince }) {
  const path = `/document/${id}`;

  // Surgical replace document keys with changesets of shape:
  // {
  //     "key": required string, # document property to mutate
  //     "value": required value, # for lists must contain a string identifier in the key `id`
  //     "operation": optional string # defaults to `replace`, for lists use `add`, `remove`, `update`
  // },
  return new Promise((resolve, reject) => {
    // ifNotModifiedSince indicates the last time the document was modified as far as the client is aware.
    if (!ifNotModifiedSince) {
      reject(new Error("Missing required ifNotModifiedSince (expecting ISO-8601 string)"));
    }

    if (!changes.length) {
      reject(new Error("At least one item must be provided in changes"));
    }

    for (const change of changes) {
      if (!change.key || !("value" in change)) {
        reject(new Error("Malformed change set. Expecting shape { key, value, operation? }"));
      }

      if (DOCUMENT_LIST_KEYS.includes(change.key)) {
        if (!VALID_LIST_OPERATIONS.includes(change.operation)) {
          reject(
            new Error(
              `Unexpected operation ${change.operation} for list key ${
                change.key
              }. Expecting one of: ${VALID_LIST_OPERATIONS.join(", ")}`
            )
          );
        }
      } else if (change.operation && change.operation !== "replace") {
        reject(
          new Error(
            `Unexpected operation ${change.operation} for non-list key ${change.key}. Omit operation or pass in "replace"`
          )
        );
      }
    }

    API.put(apiName, path, { body: { changes, ifNotModifiedSince } }, { response: true })
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        const response = error.response;
        if (response?.status === 409) {
          resolve(false);
        }
        reject(error);
      });
  });
}

export function deleteDocument(API, { id }) {
  return API.del(apiName, `/document/${id}`, { response: true });
}

const DEFAULT_EXACT_HYBRID_SEARCH_FACTOR = 0.25;
const DEFAULT_RELATED_HYBRID_SEARCH_FACTOR = 1.0;

export function nobindMapOptionsToConnectionOptions({ options, prefs }) {
  let connectionsOptions = {};
  if (!options) {
    return connectionsOptions;
  }

  const hasTypeFilter = options.typeFilter && options.typeFilter !== "any";
  const hasTimeFilter = options.timeFilter && options.timeFilter !== "any";
  const hasDomainFilter = options.domainFilter && options.domainFilter !== "any";
  if (hasTypeFilter || hasTimeFilter || hasDomainFilter) {
    connectionsOptions.filters = {};

    if (hasTypeFilter) {
      let docType;
      const typeFilter = options.typeFilter;
      if (typeFilter === "article") {
        docType = "web";
      } else if (typeFilter === "pdf") {
        docType = "pdf";
      } else if (typeFilter === "youtube") {
        docType = "video_transcription";
      } else if (typeFilter === "tweet") {
        docType = "twitter";
      } else if (typeFilter === "note") {
        docType = "recollect";
      } else if (typeFilter === "apple-notes") {
        docType = "native";
      }
      connectionsOptions.filters.doc_type = docType;
    }

    if (hasTimeFilter) {
      let startTime;
      let endTime;

      let now = new Date();
      now.setHours(23, 59, 59, 999);

      let threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);

      let oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);

      if (options.timeFilter === "now") {
        // Less than a week ago
        startTime = oneWeekAgo;
      } else if (options.timeFilter === "recent") {
        // Less than 3 months ago
        startTime = threeMonthsAgo;
      } else {
        // More than 3 months ago
        endTime = threeMonthsAgo;
      }

      if (startTime) {
        connectionsOptions.filters.start_time = startTime.toISOString();
      }
      if (endTime) {
        connectionsOptions.filters.end_time = endTime.toISOString();
      }
    }

    if (hasDomainFilter) {
      connectionsOptions.filters.domain = options.domainFilter;
    }
  }

  if (options.searchType === "exact") {
    if (prefs) {
      const bm25HybridSearchFactor = prefs["bm25HybridSearchFactor"];
      if (typeof bm25HybridSearchFactor === "number") {
        connectionsOptions.hybridSearchFactor = bm25HybridSearchFactor;
      }
    } else {
      connectionsOptions.hybridSearchFactor = DEFAULT_EXACT_HYBRID_SEARCH_FACTOR;
    }
  }

  return connectionsOptions;
}

export function loadConnections(
  API,
  {
    query,
    engine,
    minScore = 0.5,
    numConnections = 40,
    contextUrls,
    isDemo,
    filters,
    hybridSearchFactor = DEFAULT_RELATED_HYBRID_SEARCH_FACTOR,
    graphEnabled = false,
    source,
  }
) {
  return API.post(
    apiName,
    "/connections",
    {
      body: {
        query,
        num_connections: numConnections,
        min_score: minScore,
        hybrid_search_factor: hybridSearchFactor,
        ...(contextUrls && contextUrls.length > 0 ? { context_urls: contextUrls } : {}),
        ...(isDemo ? { demo: true } : {}),
        ...(engine ? { engine } : {}),
        ...(filters ? { filter_by: filters } : {}),
        ...(graphEnabled ? { graph_enabled: true } : {}),
        source,
      },
    },
    { response: true }
  );
}

export function loadUserData(API, { doc_id, url }) {
  return new Promise((resolve, reject) => {
    if (!doc_id && !url) {
      reject("Needs either doc_id or url");
    }

    const basePath = "/user-data";
    let path = doc_id ? `${basePath}?doc_id=${doc_id}` : `${basePath}?url=${url}`;
    API.get(apiName, path, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export const USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING = "has_completed_product_onboarding";
export const USER_SETTING_IS_OPT_OUT = "is_opt_out";
export const USER_SETTING_HAS_DISMISSED_ONBOARDING_PROGRESS = "has_dismissed_onboarding_progress";
export const USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS = "has_dismissed_draft_playground_prompts";
export const USER_SETTING_WANTS_ATTENTION_TRACKING = "wants_attention_tracking";

const userSettings = [
  USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING,
  USER_SETTING_IS_OPT_OUT,
  USER_SETTING_HAS_DISMISSED_ONBOARDING_PROGRESS,
  USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS,
  USER_SETTING_WANTS_ATTENTION_TRACKING,
];

export function setUserSetting(API, { key, value }) {
  return new Promise((resolve, reject) => {
    if (!userSettings.includes(key)) {
      reject(new Error("Unknown user settings key", key));
    }

    API.post(
      apiName,
      "/user-info",
      {
        body: { client_settings: { [key]: value } },
      },
      { response: true }
    )
      .then((resp) => {
        resolve(resp);
      })
      .catch((error) => reject(error));
  });
}

export const ACCOUNT_STATUS_UNKNOWN = "unknown";
export const ACCOUNT_STATUS_CREATED = "created";
export const ACCOUNT_STATUS_ONBOARDED = "onboarded"; // have submitted an initial batch of data
export const ACCOUNT_STATUS_WAITING_FOR_CALL = "waiting_for_call"; // when they have enough indexed data, waiting for manual activation
export const ACCOUNT_STATUS_WAITING_FOR_DATA = "waiting_for_data"; // call completed manually, waiting for enough data
export const ACCOUNT_STATUS_READY = "ready";

export function setUserInfo(API, { status, goList, noGoList }) {
  if (status) {
    const values = [
      ACCOUNT_STATUS_CREATED,
      ACCOUNT_STATUS_ONBOARDED, // deprecated
      ACCOUNT_STATUS_READY,
      ACCOUNT_STATUS_WAITING_FOR_CALL, // deprecated
      ACCOUNT_STATUS_WAITING_FOR_DATA, // deprecated
    ];
    if (!values.includes(status)) {
      return new Promise((resolve, reject) => {
        reject(new Error(`setUserStatus: expected status of value: ${values.join(", ")} got ${status}`));
      });
    }
  }

  return API.post(
    apiName,
    "/user-info",
    {
      body: { status: { value: status }, go_list: { list: goList }, no_go_list: { list: noGoList } },
    },
    { response: true }
  );
}

export function setUserInfoKey(API, { key, value }) {
  // value for go-lists could be { removals: [{ rule, source}], additions: [{ rule, source}], list: [{ rule, source}]}
  return API.post(apiName, "/user-info", { body: { [key]: value } }, { response: true });
}

export const DEFAULT_USER_INFO_KEYS = ["name", "status", "settings", "go_list", "no_go_list"];
export function loadUserInfo(API, { keys = DEFAULT_USER_INFO_KEYS } = {}) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/user-info?keys=${keys.join(",")}`, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function pushVisitContent(API, { url, title, transitionType, visitTime, content, clipperVersion, source }) {
  return API.post(
    apiName,
    "/user-data",
    {
      body: {
        timestamp: visitTime,
        url,
        transition_type: transitionType,
        ...(content
          ? {
              data: {
                clipper_version: clipperVersion,
                content,
              },
            }
          : {}),
        ...(title ? { title } : {}),
        ...(source ? { source } : {}),
      },
    },
    { response: true }
  );
}

export function deleteVisits(API, { urls, normalize = false }) {
  const body = { urls };
  if (normalize) {
    body.normalize = true;
  }
  return API.del(apiName, "/article", { body }, { response: true });
}

export function pushHistoryPage(API, { visits, source }) {
  return API.post(
    apiName,
    "/user-data",
    {
      body: {
        url_visits: visits.map(({ url, title, visitTime, transitionType }) => ({
          timestamp: visitTime,
          url,
          title,
          transition_type: transitionType,
        })),
        ...(source ? { source } : {}),
      },
    },
    { response: true }
  );
}

export async function pushChunkedHistory(API, { visits }) {
  const _visits = [...visits];
  const chunks = chunk(_visits, 1000);

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[i] Pushing history page ${i + 1} with ${chunks[i].length} visits`);
    try {
      await pushHistoryPage(API, { visits: chunks[i], source: "history_import" });
    } catch (error) {
      console.log("Failed to push history page with error:", error);
      throw error;
    }
  }

  return { pages: chunks.length };
}

function loadUserCollectedArticlesPage(API, { hostname, offset, pageSize }) {
  return API.post(
    apiName,
    "/article",
    {
      body: {
        substring: hostname || "",
        page_size: pageSize,
        page_start: offset,
        ...(hostname ? { host_only: true } : {}),
      },
    },
    { response: true }
  );
}

export function retryFailedUserCollectedArticle(API, { url }) {
  return API.post(
    apiName,
    "/article/retry",
    {
      body: { url },
    },
    { response: true }
  );
}

export async function loadUserCollectedArticles(API, { hostname, pageSize = 1000 } = {}) {
  let urlstates = [];
  let keepGoing = true;
  let offset = 0;

  while (keepGoing) {
    let response = await loadUserCollectedArticlesPage(API, { hostname, offset, pageSize });
    urlstates.push(...response.urlstates);
    if (!response.next_page_start) {
      keepGoing = false;
      return { urlstates, total: response.total };
    } else {
      offset = response.next_page_start;
    }
  }
}

export function loadUserCollectedArticleStatus(API, { url }) {
  return API.post(apiName, "/article", { body: { urls: [url] } }, { response: true });
}

export function loadUserCollectedArticlesByHostnamePage(API, { hostname, offset = 0, pageSize = 1000 }) {
  return API.post(
    apiName,
    "/article",
    {
      body: {
        substring: hostname,
        host_only: true,
        page_size: pageSize,
        page_start: offset,
      },
    },
    { response: true }
  );
}

export function deleteUserCollectedArticles(API, { urls, isSoftDelete }) {
  return API.del(
    apiName,
    "/article",
    {
      body: {
        urls,
        soft_delete: isSoftDelete,
      },
    },
    { response: true }
  );
}

export function loadArtifactsPage(API, { offset = 0, pageSize = 100 } = {}) {
  return API.post(
    apiName,
    "/artifact/enumerate",
    {
      body: {
        page_size: pageSize,
        page_start: offset,
      },
    },
    { response: true }
  );
}

export async function loadAllArtifacts(API, { pageSize = 1000 } = {}) {
  let artifacts = [];
  let keepGoing = true;
  let offset = 0;

  while (keepGoing) {
    let response = await loadArtifactsPage(API, { offset, pageSize });
    artifacts.push(...response.artifacts);
    if (!response.next_page_start) {
      keepGoing = false;
      return { artifacts, total: response.total };
    } else {
      offset = response.next_page_start;
    }
  }
}

export function loadAnnotationsForUrl(API, { url }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/annotation?context_url=${url}`, { response: true })
      .then((response) => {
        // Strip out the wrapper object (see updateAnnotationsForUrl)
        const cards = response.data.results.map((r) => r.content);
        resolve(cards);
      })
      .catch((error) => reject(error));
  });
}

export function updateAnnotationsForUrl(API, { url, cards }) {
  // Wrap card model in a content key (for server side validation purposes)
  const models = cards.map((c) => ({ content: c }));
  return API.put(apiName, "/annotation", { body: { cards: models, context_url: url } }, { response: true });
}

export function loadAnnotationsLog(API, { createdAfter, createdBefore }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/annotation/log?created_after=${createdAfter}&created_before=${createdBefore}`, {
      response: true,
    })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function updateAnnotationsForLog(API, { cards, contextUrl }) {
  // Wrap card model in a content key (for server side validation purposes)
  const models = cards.map((c) => ({ content: c }));
  return API.put(
    apiName,
    "/annotation",
    { body: { cards: models, ...(contextUrl ? { context_url: contextUrl } : {}) } },
    { response: true }
  );
}

export function deleteAnnotations(API, { ids }) {
  return API.del(apiName, "/annotation", { body: { ids } }, { response: true });
}

// Readwise Reader

export function listReadwiseReaderIntegrations(API) {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/v2/recurring-imports/readwise-v3", { response: true })
      .then((response) => {
        resolve(response.data?.items);
      })
      .catch((error) => reject(error));
  });
}

export function loadReadwiseReaderIntegration(API, { id }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/v2/recurring-imports/readwise-v3/${id}`, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function pushReadwiseReaderIntegration(API, { accessToken }) {
  return API.post(
    apiName,
    "/v2/recurring-imports/readwise-v3",
    {
      body: {
        enabled: true,
        account_id: "default",
        access_token: accessToken,
      },
    },
    { response: true }
  );
}

export function updateReadwiseReaderIntegration(API, { id, enabled, accessToken }) {
  return API.patch(
    apiName,
    `/v2/recurring-imports/readwise-v3/${id}`,
    {
      body: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(accessToken !== undefined ? { access_token: accessToken } : {}),
      },
    },
    { response: true }
  );
}

export function deleteReadwiseReaderIntegration(API, { id }) {
  return API.del(apiName, `/v2/recurring-imports/readwise-v3/${id}`, { response: true });
}

export function triggerReadwiseReaderRun(API, { id }) {
  return API.post(apiName, `/v2/recurring-imports/readwise-v3/${id}/run`, { body: {} }, { response: true });
}

// Readwise Classic

export function listReadwiseClassicIntegrations(API) {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/v2/recurring-imports/readwise-v2", { response: true })
      .then((response) => {
        resolve(response.data?.items);
      })
      .catch((error) => reject(error));
  });
}

export function loadReadwiseClassicIntegration(API, { id }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/v2/recurring-imports/readwise-v2/${id}`, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function pushReadwiseClassicIntegration(API, { accessToken }) {
  return API.post(
    apiName,
    "/v2/recurring-imports/readwise-v2",
    {
      body: {
        enabled: true,
        account_id: "default",
        access_token: accessToken,
      },
    },
    { response: true }
  );
}

export function updateReadwiseClassicIntegration(API, { id, enabled, accessToken }) {
  return API.patch(
    apiName,
    `/v2/recurring-imports/readwise-v2/${id}`,
    {
      body: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(accessToken !== undefined ? { access_token: accessToken } : {}),
      },
    },
    { response: true }
  );
}

export function deleteReadwiseClassicIntegration(API, { id }) {
  return API.del(apiName, `/v2/recurring-imports/readwise-v2/${id}`, { response: true });
}

export function triggerReadwiseClassicRun(API, { id }) {
  return API.post(apiName, `/v2/recurring-imports/readwise-v2/${id}/run`, { body: {} }, { response: true });
}

// Twitter

export function listTwitterIntegrations(API) {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/v2/recurring-imports/twitter", { response: true })
      .then((response) => {
        resolve(response.data?.items);
      })
      .catch((error) => reject(error));
  });
}

export function loadTwitterIntegration(API, { id }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/v2/recurring-imports/twitter/${id}`, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function pushTwitterIntegration(API, { code, codeVerifier, redirectUrl }) {
  return API.post(
    apiName,
    "/v2/recurring-imports/twitter",
    {
      body: {
        enabled: true,
        account_id: "default",
        oauth2_params: {
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUrl,
        },
      },
    },
    { response: true }
  );
}

export function updateTwitterIntegration(API, { id, enabled }) {
  return API.patch(
    apiName,
    `/v2/recurring-imports/twitter/${id}`,
    {
      body: {
        ...(enabled !== undefined ? { enabled } : {}),
      },
    },
    { response: true }
  );
}

export function deleteTwitterIntegration(API, { id }) {
  return API.del(apiName, `/v2/recurring-imports/twitter/${id}`, { response: true });
}

export function triggerTwitterRun(API, { id }) {
  return API.post(apiName, `/v2/recurring-imports/twitter/${id}/run`, { body: {} }, { response: true });
}

// Apple Notes

export function listAppleNotesIntegrations(API) {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/v2/recurring-imports/apple-notes", { response: true })
      .then((response) => {
        resolve(response.data?.items);
      })
      .catch((error) => reject(error));
  });
}

export function updateAppleNotesIntegration(API, { id, enabled }) {
  return API.patch(
    apiName,
    `/v2/recurring-imports/apple-notes/${id}`,
    {
      body: {
        ...(enabled !== undefined ? { enabled } : {}),
      },
    },
    { response: true }
  );
}

export function deleteAppleNotesIntegration(API, { id }) {
  return API.del(apiName, `/v2/recurring-imports/apple-notes/${id}`, { response: true });
}

// Google Drive

export function getGoogleDriveAuthRedirectURL(API, { redirectUrl }) {
  return API.post(
    apiName,
    "/v2/recurring-imports/external-auth/google-drive",
    {
      body: {
        redirect_uri: redirectUrl,
      },
    },
    { response: true }
  );
}

export function listGoogleDriveIntegrations(API) {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/v2/recurring-imports/google-drive", { response: true })
      .then((response) => {
        resolve(response.data?.items);
      })
      .catch((error) => reject(error));
  });
}

export function loadGoogleDriveIntegration(API, { id }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/v2/recurring-imports/google-drive/${id}`, { response: true })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => reject(error));
  });
}

export function pushGoogleDriveIntegration(API, { code, codeVerifier, redirectUrl }) {
  return API.post(
    apiName,
    "/v2/recurring-imports/google-drive",
    {
      body: {
        enabled: true,
        account_id: "default",
        oauth2_params: {
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUrl,
        },
      },
    },
    { response: true }
  );
}

export function updateGoogleDriveIntegration(API, { id, enabled }) {
  return API.patch(
    apiName,
    `/v2/recurring-imports/google-drive/${id}`,
    {
      body: {
        ...(enabled !== undefined ? { enabled } : {}),
      },
    },
    { response: true }
  );
}

export function deleteGoogleDriveIntegration(API, { id }) {
  return API.del(apiName, `/v2/recurring-imports/google-drive/${id}`, { response: true });
}

export function triggerGoogleDriveRun(API, { id }) {
  return API.post(apiName, `/v2/recurring-imports/google-drive/${id}/run`, { body: {} }, { response: true });
}

// RSS

export function loadRssSubscriptions(API) {
  return new Promise((resolve, reject) => {
    API.get(apiName, "/rss-subscription", { response: true })
      .then((response) => {
        resolve(response.data.results);
      })
      .catch((error) => reject(error));
  });
}

export function loadRssSubscriptionArticles(API, { feedUrl }) {
  return new Promise((resolve, reject) => {
    API.get(apiName, `/rss-subscription/articles?feed_url=${encodeURIComponent(feedUrl)}`, { response: true })
      .then((response) => {
        resolve(response.data.results);
      })
      .catch((error) => reject(error));
  });
}

export function pushRssSubscription(API, { feedUrl, shouldProcessLinks, syncPaused }) {
  return API.put(
    apiName,
    "/rss-subscription",
    {
      body: {
        feed_url: feedUrl,
        ...(shouldProcessLinks !== undefined ? { process_content_links: shouldProcessLinks } : {}),
        ...(syncPaused !== undefined ? { sync_paused: syncPaused } : {}),
      },
    },
    { response: true }
  );
}

export function deleteRssSubscription(API, { feedUrl, deleteFeedArticles = false }) {
  return API.del(
    apiName,
    "/rss-subscription",
    {
      body: { feed_url: feedUrl, delete_feed_articles: deleteFeedArticles, delete_all: false },
    },
    { response: true }
  );
}

export function deleteAllRssSubscriptions(API) {
  return API.delete(apiName, "/rss-subscription", { body: { delete_all: true } }, { response: true });
}

export function submitFeedbackEvents(API, { events }) {
  return API.post(apiName, "/feedback-event", { body: { events } });
}

// Behavioral Tracking

export function logTrackingSessions(API, { sessions }) {
  return API.post(
    apiName,
    "/v2/tracking-sessions/log",
    {
      body: {
        sessions,
      },
    },
    { response: true }
  );
}

// Thumbnail

export function loadThumbnailFromS3Path(API, s3Path) {
  return API.get(apiName, `/v2/thumbnail/?s3_path=${encodeURIComponent(s3Path)}`, {
    response: true,
    responseType: "blob",
    timeout: 30000,
  });
}



// Download Data. Bye Bye re:collect

export function downloadFile(API) {
  console.log("Initiating download request...");
  return API.get(apiName, "/download", {
    response: true,
    responseType: "blob", // Expecting binary data (e.g., a file)
  })
    .then((response) => {
      console.log("Download successful", response);
      console.log("Content-Type:", response.headers['content-type']);
      console.log("Content-Disposition:", response.headers['content-disposition']);
      return response;
    })
    .catch((error) => {
      console.error("Download failed", error);
      throw error;
    });
}



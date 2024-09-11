import React from "react";
import { shallow } from "zustand/shallow";
import { ArrowRightIcon, ArticleIcon, YouTubeIcon, TwitterIcon, PDFIcon, AddIcon } from "web-shared-lib";
import { useHistory } from "react-router-dom";
import { extractHostname } from "js-shared-lib";

import { useStore } from "../../store";
import { events, sources, analyticsService } from "../../libs/analyticsLib";

import Widget, {
  WidgetHeader,
  WidgetNavButton,
  WidgetSectionHeader,
  WidgetLoadingIndicator,
  WidgetRow,
  WidgetInfoHeader,
  WidgetIconRow,
} from "./Widget";

import styles from "./LibraryWidget.module.css";

const selector = (state) => ({
  isLoading: state.artifactsIndex.status === "loading",
  recentArtifacts: state.artifactsIndex.records.slice(0, 3),
});

export function IconForArtifact({ doc_type, doc_subtype }) {
  if (doc_type === "video_transcription" && doc_subtype === "youtube") {
    return <YouTubeIcon />;
  }
  if (doc_type === "pdf") {
    return <PDFIcon />;
  }
  if (doc_type === "twitter" && doc_subtype === "tweet_thread") {
    return <TwitterIcon />;
  }
  return <ArticleIcon />;
}

export default function LibraryWidget({ forceFreshAccountStatus = false }) {
  const { isLoading, recentArtifacts } = useStore(selector, shallow);
  const history = useHistory();
  const hasArtifacts = forceFreshAccountStatus ? false : !!recentArtifacts.length;

  return (
    <Widget>
      <WidgetHeader title={"Library"}>
        <WidgetNavButton
          icon={<ArrowRightIcon />}
          title={"Go to Library"}
          onClick={() => {
            history.push("/library");
            analyticsService.logEvent(events.libraryOpened({ source: sources.HOME }));
          }}
        />
        <WidgetNavButton
          icon={<AddIcon />}
          title={"Add more data"}
          onClick={() => {
            history.push("/welcome");
            analyticsService.logEvent(events.addMoreDataOpened({ source: sources.HOME }));
          }}
        />
      </WidgetHeader>
      {isLoading && <WidgetLoadingIndicator />}
      {!isLoading && !hasArtifacts && (
        <>
          <WidgetInfoHeader title={"What you recently collected"}>
            <p>
              As you browse the internet, we automatically connect the information you consume to other articles,
              newsletters, and PDFs in your account.
            </p>
          </WidgetInfoHeader>
          <WidgetIconRow
            label={"Manually import data"}
            icon={<AddIcon />}
            onClick={() => {
              history.push("/welcome");
              analyticsService.logEvent(events.addMoreDataOpened({ source: sources.HOME }));
            }}
          />
        </>
      )}
      {!isLoading && hasArtifacts && (
        <>
          <WidgetSectionHeader label={"Recently collected"} />
          {recentArtifacts.map((a) => {
            return (
              <WidgetRow
                className={styles.row}
                key={a.doc_id}
                onClick={() => {
                  history.push(`/?artifact=${a.doc_id}`);
                }}
              >
                <div className={styles.title}>
                  <div className={styles.icon}>
                    <IconForArtifact {...a} />
                  </div>
                  <div className={styles.label}>{a.title}</div>
                </div>
                <div className={styles.stats}>{a.byline || extractHostname(a.url)}</div>
              </WidgetRow>
            );
          })}
        </>
      )}
    </Widget>
  );
}

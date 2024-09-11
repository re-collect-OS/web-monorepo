import React, { useState, useRef } from "react";
import { InstapaperIcon, IconButton, ImportIcon } from "web-shared-lib";
import { Link } from "react-router-dom";

import { DEBUG } from "../../config";
import apiLib from "../../libs/apiLib";
import { parseInstapaperCSVFromFile, parseInstapaperHTMLFromFile } from "../../libs/instapaperLib";
import { events, analyticsService } from "../../libs/analyticsLib";

import BaseIntegration from "./BaseIntegration";
import IntegrationSummary from "./IntegrationSummary";

import styles from "./Instapaper.module.css";

export default function Instapaper({ isExpanded, onExpand }) {
  const [error, setError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const [visits, setVisits] = useState(null);
  const fileInputRef = useRef(null);

  if (!isExpanded) {
    return (
      <IntegrationSummary
        icon={<InstapaperIcon />}
        title={"Instapaper"}
        description={"Connect and import articles from Instapaper into your re:collect account"}
        button={
          <IconButton
            icon={<ImportIcon />}
            variant={"violet"}
            title={"Import"}
            label={"Import"}
            onClick={() => onExpand(true)}
          />
        }
      />
    );
  }

  const doParseExportFile = (file) => {
    let doParseInstapaperFile = parseInstapaperHTMLFromFile;
    if (file.name.endsWith(".csv")) {
      doParseInstapaperFile = parseInstapaperCSVFromFile;
    }
    doParseInstapaperFile(file)
      .then((visits) => {
        setVisits(visits);
      })
      .catch((error) => {
        console.warn("Instapaper: could not sync Instapaper data:", error.message);
        setError(new Error("Failed to import Instapaper .csv file"));
      });
  };

  const doSubmit = () => {
    setError(null);
    setIsImporting(true);
    apiLib
      .pushChunkedHistory({ visits })
      .then((_response) => {
        if (DEBUG) {
          console.log("Instapaper: pushed history", { response: _response });
        }
        setDidSubmit(true);
        analyticsService.logEvent(events.instapaperIntegrationSubmitted({ count: visits.length }));
      })
      .catch((error) => {
        const errorMsg = "Failed to submit data. Please try again.";
        setError(errorMsg);
        analyticsService.logEvent(
          events.instapaperIntegrationSubmitFailed({
            error: errorMsg,
            debugError: error.message,
            count: visits.length,
          })
        );
      })
      .finally(() => {
        setIsImporting(false);
        setVisits(null);
      });
  };

  const doReset = () => {
    setError(null);
    setVisits(null);
    setIsImporting(false);
    setDidSubmit(false);
  };

  const totalImported = visits?.length;

  return (
    <BaseIntegration
      className={styles.Instapaper}
      title={"Import your Instapaper data"}
      icon={<InstapaperIcon />}
      onCollapse={() => onExpand(false)}
    >
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}. Please try again.</div>}

        {didSubmit && (
          <>
            <div className={styles.description}>
              We’re on it! You can always check the progress in your <Link to="/library">Library</Link>.
            </div>
            <IconButton
              size={"large"}
              onClick={() => {
                doReset();
              }}
              label={"Submit more data"}
              title={"Submit more data"}
            />
          </>
        )}

        {visits === null && !didSubmit && (
          <>
            <div className={styles.description}>
              Add the content you’ve read or saved with a one-time Instapaper import. With Recall, we'll surface the
              hidden gems from the articles you've added to Instapaper.
            </div>
            <div className={styles.description}>
              You’ll need to{" "}
              <a href={"https://www.instapaper.com/user#download_csv_button"} target={"_blank"} rel={"noreferrer"}>
                export your Instapaper data
              </a>{" "}
              and upload the HTML or CSV file below:
            </div>
            <IconButton
              size={"large"}
              onClick={() => fileInputRef.current.click()}
              label={isImporting ? "Importing Instapaper data..." : "Upload Instapaper export file"}
              title={isImporting ? "Importing Instapaper data..." : "Upload Instapaper export file"}
              disabled={isImporting}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.html,.htm"
              onChange={(event) => {
                const file = event.target.files && event.target.files[0];
                setError(null);
                doParseExportFile(file);
              }}
              hidden
            />
          </>
        )}

        {visits !== null && !didSubmit && (
          <>
            <div className={styles.description}>
              We’ve found {totalImported} potential {totalImported === 1 ? "article" : "articles"} in your Instapaper
              data.
            </div>
            <div className={styles.description}>Would you like to submit this data to your re:collect account?</div>
            <div className={styles.nav}>
              <IconButton
                size={"large"}
                variant={"violet"}
                onClick={() => doSubmit()}
                label={isImporting ? "Submitting..." : "Yes, submit Instapaper data"}
                title={isImporting ? "Submitting..." : "Yes, submit Instapaper data"}
                disabled={isImporting}
              />
              <IconButton
                size={"large"}
                onClick={() => doReset()}
                label={"Cancel"}
                title={"Cancel"}
                disabled={isImporting}
              />
            </div>
          </>
        )}
      </div>
    </BaseIntegration>
  );
}

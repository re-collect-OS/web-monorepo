import React from "react";

import PageHeader from "../common/page-header";
import { MAC_DOWNLOAD_URL } from "../../config";
import { canInstallExtension, openChromeExtensionInstaller, extensionId } from "../../libs/chromeExtensionLib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";

import BaseDownload from "./BaseDownload";

import styles from "./Downloads.module.css";

export default function Downloads() {
  return (
    <div className={styles.Downloads}>
      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <PageHeader title={"Downloads"} description={"All the re:collect companion applications"} />
        </div>
        <div className={styles.content}>
          <BaseDownload
            title={"Browser Extension"}
            enabled={canInstallExtension()}
            onDownloadClick={() => {
              if (canInstallExtension()) {
                openChromeExtensionInstaller(extensionId);
                analyticsService.logEvent(events.downloadsChromeExtensionClicked({ source: sources.DOWNLOADS }));
              }
            }}
          >
            Please note: currently only supports Chromium-based browsers like Google Chrome, Arc, Microsoft Edge{" "}
            <a
              href={"https://en.wikipedia.org/wiki/Chromium_(web_browser)#Browsers_based_on_Chromium"}
              target={"_blank"}
              rel={"noreferrer"}
            >
              and more
            </a>
            .
          </BaseDownload>
          <BaseDownload
            title={"macOS Sidecar"}
            onDownloadClick={() => {
              window.open(MAC_DOWNLOAD_URL);
              analyticsService.logEvent(events.downloadsMacClicked({ source: sources.DOWNLOADS }));
            }}
            isNew
          >
            Please note: requires OS X 13.0 or greater.
          </BaseDownload>
        </div>
      </div>
    </div>
  );
}

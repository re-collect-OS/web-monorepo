import React from "react";
import { useParams, useHistory } from "react-router-dom";

import PageHeader from "../common/page-header";
import { APP_STAGE } from "../../config";

import Readwise from "./Readwise";
import Twitter from "./Twitter";
import Instapaper from "./Instapaper";
import Pocket from "./Pocket";
import AppleNotes from "./AppleNotes";
import GoogleDrive from "./GoogleDrive";

import styles from "./Integrations.module.css";

export default function Integrations() {
  const { expanded } = useParams();
  const history = useHistory();
  const setExpanded = (section) => history.push(`/integrations/${section}`);

  return (
    <div className={styles.Integrations}>
      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <PageHeader
            title={"Integrations"}
            description={"Bring all your content into one place by connecting other services you use."}
          />
        </div>
        <div className={styles.content}>
          <Readwise
            isExpanded={expanded === "readwise"}
            onExpand={(expanded) => setExpanded(expanded ? "readwise" : null)}
          />
          <Twitter
            isExpanded={expanded === "twitter"}
            onExpand={(expanded) => setExpanded(expanded ? "twitter" : null)}
          />
          <AppleNotes
            isExpanded={expanded === "apple-notes"}
            onExpand={(expanded) => setExpanded(expanded ? "apple-notes" : null)}
          />
          <GoogleDrive
            isExpanded={expanded === "google-drive"}
            onExpand={(expanded) => setExpanded(expanded ? "google-drive" : null)}
          />
          <Instapaper
            isExpanded={expanded === "instapaper"}
            onExpand={(expanded) => setExpanded(expanded ? "instapaper" : null)}
          />
          <Pocket isExpanded={expanded === "pocket"} onExpand={(expanded) => setExpanded(expanded ? "pocket" : null)} />
        </div>
      </div>
    </div>
  );
}

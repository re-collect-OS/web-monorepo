import React from "react";
import { shallow } from "zustand/shallow";
import cn from "classnames";
import { isValidIsoDate } from "js-shared-lib";
import { PlaygroundIcon, PinIcon, ArrowRightIcon, AddIcon } from "web-shared-lib";
import { useHistory } from "react-router-dom";

import { extractTitle } from "../../libs/documentLib";
import { useStore } from "../../store";
import { events, sources, analyticsService } from "../../libs/analyticsLib";

import Widget, {
  WidgetHeader,
  WidgetNavButton,
  WidgetSectionHeader,
  WidgetLoadingIndicator,
  WidgetRow,
  WidgetIconRow,
  WidgetInfoHeader,
} from "./Widget";

import styles from "./PlaygroundsWidget.module.css";

const selector = (state) => ({
  documents: state.documents.index,
  isLoading: state.documents.status === "loading",
  doDocumentCreateWithTitle: state.doDocumentCreateWithTitle,
});

export default function PlaygroundsWidget({ forceFreshAccountStatus = false }) {
  const { documents, isLoading, doDocumentCreateWithTitle } = useStore(selector, shallow);
  const history = useHistory();

  // Draft documents have a creation timestamp as the title
  const draftDocuments = documents.filter((d) => {
    const title = extractTitle({ body: d.body });
    return title && isValidIsoDate(title);
  });
  const recentDocuments = forceFreshAccountStatus
    ? []
    : documents
        .filter((d) => !d.archivedAt && !d.trashedAt && !draftDocuments.includes(d))
        .sort((d1, d2) => new Date(d2.modifiedAt) - new Date(d1.modifiedAt))
        .slice(0, 3);

  const hasPlaygrounds = !!recentDocuments.length;

  return (
    <Widget>
      <WidgetHeader title={"Playgrounds"}>
        <WidgetNavButton
          icon={<ArrowRightIcon />}
          title={"Go to Playgrounds"}
          onClick={() => {
            history.push("/playgrounds");
            analyticsService.logEvent(events.playgroundsOpened({ source: sources.HOME }));
          }}
        />
        <WidgetNavButton
          icon={<AddIcon />}
          title={"Create a new Playground"}
          onClick={() => doDocumentCreateWithTitle({ history, eventSource: sources.HOME })}
        />
      </WidgetHeader>
      {isLoading && <WidgetLoadingIndicator />}
      {!isLoading && !hasPlaygrounds && (
        <>
          <WidgetInfoHeader title={"Spaces to think out loud with"}>
            <p>
              Unlock your creativity with Playgrounds: an infinite canvas and text editor to work on your ideas and
              bring them to life.
            </p>
          </WidgetInfoHeader>
          <WidgetIconRow
            label={"Create a new Playground"}
            icon={<AddIcon />}
            onClick={() => doDocumentCreateWithTitle({ history, eventSource: sources.HOME })}
          />
        </>
      )}
      {!isLoading && hasPlaygrounds && (
        <>
          <WidgetSectionHeader label={"Recently edited"} />
          {recentDocuments.map((d) => {
            const count = d.cards.length;
            const isPinned = !!d.pinnedAt;
            return (
              <WidgetRow
                className={cn(styles.row, { [styles.isPinned]: isPinned })}
                key={d.documentId}
                onClick={() => {
                  history.push(`/play/${d.documentId}`);
                }}
              >
                <div className={styles.title}>
                  <div className={styles.icon}>
                    <PlaygroundIcon />
                  </div>
                  <div className={styles.label}>{extractTitle({ body: d.body })}</div>
                </div>
                <div className={styles.stats}>
                  {isPinned && <PinIcon />} {count} {count === 1 ? "card" : "cards"}
                </div>
              </WidgetRow>
            );
          })}
        </>
      )}
    </Widget>
  );
}

import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { shallow } from "zustand/shallow";
import { useHistory } from "react-router-dom";

import { useStore } from "../../store";
import { useQuery } from "../../utils/router";
import { events, analyticsService } from "../../libs/analyticsLib";

import ReaderModal from "../reader";

import ReaderTopToolbar from "./ReaderTopToolbar";

import styles from "./ReaderLayout.module.css";

const selector = (state) => ({
  doDocumentAddKeptCard: state.doDocumentAddKeptCard,
  doDocumentAddKeptHighlightCard: state.doDocumentAddKeptHighlightCard,
  doQueryStackJump: state.doQueryStackJump,
  doDailyLogAddKeptCard: state.doDailyLogAddKeptCard,
  queryStacks: state.stacks,
});

const emptyArray = Object.freeze([]); // Avoid invalidating callbacks by using a stable empty array

export default function ReaderLayout({ artifactId, documentId, eventSource, onClose, getEditor }) {
  const {
    queryStacks,
    doDocumentAddKeptHighlightCard,
    doDocumentAddKeptCard,
    doQueryStackJump,
    doDailyLogAddKeptCard,
  } = useStore(selector, shallow);
  const history = useHistory();

  const document = useStore(
    useCallback((state) => state.documents.index.find((doc) => doc.documentId === documentId), [documentId])
  );
  const artifact = useStore(useCallback((state) => state.artifacts.get(artifactId), [artifactId]));
  const routerQuery = useQuery();
  const expandedSentence = routerQuery.get("text");
  const expandedPage = routerQuery.get("page");
  const expandedStackId = routerQuery.get("stack");
  const stack = queryStacks.find((stack) => stack.id === expandedStackId);
  const kept = documentId ? document?.cards || emptyArray : emptyArray;
  const highlights = documentId ? kept.filter((card) => card.artifactId === artifactId) : emptyArray;

  const readerProps = {
    contextLabel: documentId ? "Playground" : "Daily Log",
    keptCards: highlights,
    artifactId,
    sentence: expandedSentence,
    page: expandedPage ? parseInt(expandedPage) : undefined,
    stack,
    eventSource,
    onReadMore: () => {
      analyticsService.logEvent(
        events.documentExternalArtifactOpened({
          documentId,
          source: eventSource,
        })
      );
    },
    doSelectCard: (cardId) => {
      // onClose();

      const editor = getEditor();
      editor?.selectionUtil.set(cardId, true);

      // If we're in the full editor, switch to the split view so we can see the card:
      // TODO use helper to construct URL
      if (editor && !editor.isPlayground()) {
        history.push(`/split/${documentId}`);
      }
    },
    doKeep: ({ sentenceIds, isHighlight }) => {
      // withNoteCard

      if (documentId) {
        // Keep to playground
        const editor = getEditor();
        const position = editor?.getNextKeepPosition();

        let keptCard;
        if (isHighlight) {
          keptCard = doDocumentAddKeptHighlightCard({
            artifactId,
            id: documentId,
            page: expandedPage,
            position,
            sentenceIds,
            source: eventSource,
          });
        } else {
          keptCard = doDocumentAddKeptCard({
            id: documentId,
            position,
            sentenceId: sentenceIds[0],
            shouldAdvanceStack: false,
            source: eventSource,
            stackId: expandedStackId,
          });
        }

        if (!keptCard) return;
        // let noteCard;
        // if (withNoteCard) {
        //   noteCard = doDocumentAddNoteCard({
        //     id: documentId,
        //     toCardId: keptCard.id,
        //     source,
        //   });
        //   selectionUtil.set(noteCard.id, true);
        //   // If we're in the full editor, switch to the split view so we can see the card:
        //   if (!isPlayground) {
        //     history.push(`/split/${documentId}`);
        //   }
        //   defer(() => {
        //     cardRefs.current[noteCard.id]?.focusEditor(true);
        //   });
        // } else {
        editor?.selectionUtil.set(keptCard.id, true);
        // }
      } else {
        // Keep to daily log
        if (isHighlight) {
          // TODO
        } else {
          const matchSentence = sentenceIds[0];
          const matchIndex = stack.results.findIndex((result) => result.matchSentence === matchSentence);
          if (matchIndex < 0) {
            return;
          }
          doQueryStackJump({ id: expandedStackId, index: matchIndex });
          doDailyLogAddKeptCard({ stackId: expandedStackId, source: eventSource });
        }
      }
    },
  };

  return (
    <div className={styles.ReaderLayout}>
      <div className={styles.toolbar}>
        <ReaderTopToolbar title={artifact?.title || "Loading..."} onClose={onClose} />
      </div>
      <div className={styles.content}>
        <div className={styles.readerWrapper}>
          <ReaderModal {...readerProps} />
        </div>
      </div>
    </div>
  );
}

ReaderLayout.propTypes = {
  artifactId: PropTypes.string.isRequired,
  documentId: PropTypes.string,
  eventSource: PropTypes.string.isRequired,
  getEditor: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

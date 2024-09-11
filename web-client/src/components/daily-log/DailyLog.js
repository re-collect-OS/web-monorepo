import React, { useState, useMemo, useRef } from "react";
import cn from "classnames";
import { shallow } from "zustand/shallow";
import PropTypes from "prop-types";
import {
  textFromSlateBody,
  relativeDayOfWeek,
  textToSlateBody,
  isoDateStrToLocalDateStr,
  errorToString,
} from "js-shared-lib";
import { HighlightCard, KeptCard, IconButton, ArticleIcon, LoadingIndicator, ExpandIcon } from "web-shared-lib";
import TextareaAutosize from "react-textarea-autosize";
import { useHistory } from "react-router-dom";

import { events, analyticsService, sources } from "../../libs/analyticsLib";
import apiLib from "../../libs/apiLib";
import PageHeader from "../common/page-header";
import { useStore } from "../../store";

import styles from "./DailyLog.module.css";

function ContextFooter({ title, url }) {
  const hostname = new URL(url)?.hostname;

  return (
    <a
      href={url}
      title={`${title} (${hostname})`}
      target="_blank"
      rel="noreferrer"
      className={styles.ContextFooter}
      onClick={() => {
        analyticsService.logEvent(events.dailyLogArticleOpened({ source: sources.DAILY_LOG }));
      }}
    >
      <div className={styles.icon}>
        <ArticleIcon />
      </div>
      <div className={styles.title}>{title || "Untitled"} </div>
      <div className={styles.hostname}>{hostname}</div>
    </a>
  );
}

function EditableNoteCard({ value, onChange, doAddOrUpdate, autoFocus = false }) {
  return (
    <div className={styles.NoteCard}>
      <TextareaAutosize
        maxRows={15}
        placeholder={"Add a note..."}
        value={value}
        className={styles.noteInput}
        onChange={onChange}
        autoFocus={autoFocus}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            doAddOrUpdate();
            // Attempt to blur the textarea to signal a commit
            document?.activeElement?.blur();
          }
        }}
      />
    </div>
  );
}

EditableNoteCard.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  doAddOrUpdate: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
};

function GridCell({ card, noteCard, doDailyLogRemoveCards, doDailyLogAddNote, doDailyLogUpdateNote, doExpand }) {
  const initialNoteValue = useMemo(
    () => textFromSlateBody(noteCard?.content.body || card?.content.body || ""),
    [card, noteCard]
  );
  const [noteValue, setNoteValue] = useState(initialNoteValue);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState(null);
  const hasNote = noteCard || card.type === "note" || isAddingNote;

  const doAddOrUpdate = () => {
    setError(null);

    if (!hasNote) {
      setIsAddingNote(true);
    } else {
      setIsSaving(true);
      const body = noteValue ? textToSlateBody(noteValue) : null;
      let id = noteCard?.id || (card.type === "note" && card.id);
      if (!id) {
        doDailyLogAddNote({ id: card.id, body })
          .catch((error) => {
            setError(errorToString(error));
            console.warn("Failed to add note card", error);
          })
          .finally(() => {
            setIsSaving(false);
            setIsAddingNote(false);
          });
        analyticsService.logEvent(
          events.dailyLogNoteAdded({
            context: card.contextUrl || card.contextIdeaId ? "note" : "daily-note",
            source: sources.DAILY_LOG,
          })
        );
      } else {
        doDailyLogUpdateNote({ id, body })
          .catch((error) => {
            setError(errorToString(error));
            console.warn("Failed to update note", error);
          })
          .finally(() => {
            setIsSaving(false);
          });
        analyticsService.logEvent(
          events.dailyLogNoteUpdated({
            context: card.contextUrl || card.contextIdeaId ? "note" : "daily-note",
            source: sources.DAILY_LOG,
          })
        );
      }
    }
  };

  return (
    <div key={card.id} className={styles.gridCell}>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.contentRow}>
        {isAddingNote && (
          <EditableNoteCard
            value={noteValue}
            onChange={(event) => setNoteValue(event.target.value)}
            doAddOrUpdate={doAddOrUpdate}
            autoFocus
          />
        )}
        {noteCard && (
          <EditableNoteCard
            value={noteValue}
            onChange={(event) => setNoteValue(event.target.value)}
            doAddOrUpdate={doAddOrUpdate}
          />
        )}
        {card.type === "note" && (
          <EditableNoteCard
            value={noteValue}
            onChange={(event) => setNoteValue(event.target.value)}
            doAddOrUpdate={doAddOrUpdate}
          />
        )}
        {card.type === "highlight" && <HighlightCard>{card.content.text}</HighlightCard>}
        {card.type === "kept" && (
          <KeptCard
            model={card.content}
            loadThumbnailFromS3Path={apiLib.loadThumbnailFromS3Path}
            renderArtifactNav={() => (
              <IconButton
                icon={<ExpandIcon />}
                variant={"grey"}
                label={"Expand"}
                title={"Expand card"}
                onClick={doExpand}
              />
            )}
          />
        )}
        {card.contextUrl && <ContextFooter title={card.contextTitle} url={card.contextUrl} />}
      </div>
      <div className={styles.navRow}>
        {isRemoving && (
          <div className={styles.removeConfirmation}>
            <div className={styles.leftCol}>Are you sure you want to remove?</div>
            <div className={styles.rightCol}>
              <IconButton
                label={"Yes, remove"}
                title={"Remove"}
                onClick={() => {
                  setError(null);
                  setIsSaving(true);
                  const ids = [card.id];
                  if (noteCard) {
                    ids.push(noteCard.id);
                  }
                  doDailyLogRemoveCards({ ids })
                    .catch((error) => {
                      console.warn("Failed to remove annotation", error);
                      setError(errorToString(error));
                      setIsSaving(false);
                    })
                    .finally(() => {
                      setIsRemoving(false);
                    });

                  let context;
                  if (card.type === "note") {
                    context = card.contextUrl || card.contextIdeaId ? "note" : "daily-note";
                  } else {
                    context = "annotation";
                  }
                  analyticsService.logEvent(events.dailyLogCardRemoved({ context, source: sources.DAILY_LOG }));
                }}
                disabled={isSaving}
                variant={"rose"}
              />
              <IconButton
                label={"Cancel"}
                title={"Cancel"}
                onClick={() => {
                  setIsRemoving(false);
                }}
              />
            </div>
          </div>
        )}
        {!isRemoving && (
          <>
            <IconButton
              label={hasNote ? "Update note" : "Add note"}
              title={hasNote ? "Update note" : "Add note"}
              onClick={doAddOrUpdate}
              disabled={isSaving || (hasNote && noteValue === initialNoteValue)}
              variant={"grey"}
            />
            <IconButton
              label={"Remove"}
              title={"Remove"}
              onClick={() => {
                setIsRemoving(true);
              }}
              disabled={isSaving}
              variant={"rose"}
            />
          </>
        )}
      </div>
    </div>
  );
}

function DailyGrid({ day, cards, doDailyLogAddNote, doDailyLogRemoveCards, doDailyLogUpdateNote }) {
  const [dailyNoteValue, setDailyNoteValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const relativeDay = relativeDayOfWeek(day);
  const isToday = relativeDay === "Today";
  const inputRef = useRef();
  const history = useHistory();

  // Filter out linked (have a parentId pointer) from root cards
  // (we render the root cards which linked cards as children)
  const rootCards = cards.filter((a1) => cards.findIndex((a2) => a2.content.parentId === a1.id) < 0);
  const linkedCards = cards.filter((a1) => rootCards.findIndex((a2) => a2.id === a1.id) < 0);

  const doAddDailyNote = () => {
    setIsSaving(true);
    doDailyLogAddNote({ body: textToSlateBody(dailyNoteValue) })
      .then(() => {
        setDailyNoteValue("");
      })
      .catch((error) => {
        // TODO
        console.warn("Failed to add daily note", error);
      })
      .finally(() => {
        setIsSaving(false);
      });
    analyticsService.logEvent(events.dailyLogNoteAdded({ context: "daily-note", source: sources.DAILY_LOG }));
  };

  return (
    <>
      <h1>{relativeDay}</h1>
      <div className={styles.grid}>
        {isToday && (
          <div
            className={cn(styles.gridCell, styles.dailyNoteCell)}
            onClick={() => {
              // Focus input when clicking anywhere on this cell
              inputRef.current?.focus();
            }}
          >
            <div className={styles.contentRow}>
              <TextareaAutosize
                ref={inputRef}
                maxRows={15}
                placeholder={"Capture a note you'd like to remember..."}
                value={dailyNoteValue}
                className={styles.noteInput}
                onChange={(event) => {
                  setDailyNoteValue(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    doAddDailyNote();
                    // Attempt to blur the textarea to signal a commit
                    document?.activeElement?.blur();
                  }
                }}
              />
            </div>
            <div className={styles.navRow}>
              <IconButton
                label={"Add note"}
                title={"Add a note to Daily Log"}
                onClick={doAddDailyNote}
                disabled={isSaving || !dailyNoteValue}
                variant={"grey"}
              />
            </div>
          </div>
        )}
        {rootCards.map((card) => {
          const noteCard = linkedCards.find((a) => a.id === card.content.parentId);
          return (
            <GridCell
              key={card.id}
              card={card}
              noteCard={noteCard}
              doDailyLogRemoveCards={doDailyLogRemoveCards}
              doDailyLogAddNote={doDailyLogAddNote}
              doDailyLogUpdateNote={doDailyLogUpdateNote}
              doExpand={
                card
                  ? () => {
                      history.push(`/daily-log?artifact=${card.content.artifactId}`);
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </>
  );
}

const selector = (state) => ({
  dailyLogStatus: state.dailyLog.status,
  // doDailyLogLoad: state.doDailyLogLoad,
  doDailyLogAddNote: state.doDailyLogAddNote,
  doDailyLogRemoveCards: state.doDailyLogRemoveCards,
  doDailyLogUpdateNote: state.doDailyLogUpdateNote,
  dailyLogCards: state.dailyLog.cards,
  doComputeDayCardsMap: state.doComputeDayCardsMap,
});

export function DailyLogTimeline() {
  const {
    dailyLogStatus,
    // doDailyLogLoad,
    dailyLogCards,
    doComputeDayCardsMap,
    doDailyLogAddNote,
    doDailyLogRemoveCards,
    doDailyLogUpdateNote,
  } = useStore(selector, shallow);

  const dayCardsMap = useMemo(() => doComputeDayCardsMap(dailyLogCards), [doComputeDayCardsMap, dailyLogCards]);

  const days = Object.keys(dayCardsMap);
  const nowDay = isoDateStrToLocalDateStr(new Date().toISOString());
  if (!days.includes(nowDay)) {
    days.push(nowDay);
  }

  if (dailyLogStatus === "loading") {
    return (
      <div className={styles.DailyLogTimeline}>
        <LoadingIndicator className={styles.loadingIndicator} />
      </div>
    );
  }

  return (
    <div className={styles.DailyLogTimeline}>
      {dailyLogStatus === "error" && (
        <div className={styles.errorWrapper}>
          <div className={styles.error}>Sorry, failed to load Daily Log...</div>
        </div>
      )}
      {days
        .sort((a, b) => new Date(b) - new Date(a))
        .map((key) => (
          <DailyGrid
            key={key}
            day={key}
            cards={dayCardsMap[key] || []}
            doDailyLogAddNote={doDailyLogAddNote}
            doDailyLogRemoveCards={doDailyLogRemoveCards}
            doDailyLogUpdateNote={doDailyLogUpdateNote}
          />
        ))}
    </div>
  );
}

export default function DailyLog() {
  return (
    <div className={styles.DailyLog}>
      <PageHeader
        title={"Daily Log"}
        description={
          "A stream of highlights and notes you made through the browser extension, with the ability to add one-off notes."
        }
      />
      <DailyLogTimeline />
    </div>
  );
}

DailyLog.propTypes = {};

import React, { useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { ArrowRightIcon, IconButton } from "web-shared-lib";
import TextareaAutosize from "react-textarea-autosize";
import { shallow } from "zustand/shallow";
import { textToSlateBody } from "js-shared-lib";
import { events, analyticsService, sources } from "../../libs/analyticsLib";
import { useStore } from "../../store";

import Widget, { WidgetHeader, WidgetNavButton } from "./Widget";

import styles from "./DailyLogWidget.module.css";

const selector = (state) => ({
  doDailyLogAddNote: state.doDailyLogAddNote,
});

export default function DailyLogWidget() {
  const history = useHistory();
  const { doDailyLogAddNote } = useStore(selector, shallow);
  const inputRef = useRef();
  const [dailyNoteValue, setDailyNoteValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const onClick = () => history.push("/daily-log");
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
        history.push("/daily-log");
      });
    analyticsService.logEvent(events.dailyLogNoteAdded({ context: "daily-note", source: sources.HOME }));
  };

  return (
    <Widget>
      <WidgetHeader title={"Daily Log"}>
        <WidgetNavButton icon={<ArrowRightIcon />} title={"Go to Daily Log"} onClick={onClick} />
      </WidgetHeader>
      <div
        className={styles.noteInputWrapper}
        onClick={() => {
          // Focus input when clicking anywhere on this cell
          inputRef.current?.focus();
        }}
      >
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
    </Widget>
  );
}

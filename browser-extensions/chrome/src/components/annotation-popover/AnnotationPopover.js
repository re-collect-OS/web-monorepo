import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
import PropTypes from "prop-types";
import { IconButton, Logo, SmallCrossIcon } from "web-shared-lib";
import TextareaAutosize from "react-textarea-autosize";
import cn from "classnames";
import { textToSlateBody, textFromSlateBody } from "js-shared-lib";
import { HighlightCard } from "web-shared-lib";

import { events, analyticsService, sources } from "../../libs/analyticsLib";

import styles from "./AnnotationPopover.module.css";

const AnnotationPopover = ({ highlitedText, noteBody, doResizeIframe, maxHeight, onClose, onRemove, onSave }) => {
  const ref = useRef(null);
  const textareaRef = useRef(null);
  const [note, setNote] = useState(noteBody ? textFromSlateBody(noteBody) : "");
  const [isRemoving, setIsRemoving] = useState(false);
  const isFixedHeight = !!maxHeight;

  useLayoutEffect(() => {
    if (!ref?.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      const offsetHeight = Math.round(ref.current.offsetHeight);
      if (isFixedHeight && offsetHeight >= maxHeight) {
        return;
      }
      doResizeIframe(offsetHeight);
    });
    resizeObserver.observe(ref.current);

    return () => resizeObserver.disconnect();
  }, [ref, doResizeIframe, maxHeight, isFixedHeight]);

  useEffect(() => {
    const handleDocumentClick = () => {
      onClose();
    };
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  });

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const doInstrumentedSave = (note) => {
    onSave(note ? textToSlateBody(note) : null);

    if (noteBody) {
      // update
      analyticsService.logEvent(
        events.annotationUpdatedNote({ isOnHighlight: true, source: sources.ANNOTATION_POPOVER })
      );
    } else {
      // new
      analyticsService.logEvent(
        events.annotationAddedNote({ isOnHighlight: true, source: sources.ANNOTATION_POPOVER })
      );
    }
  };

  return (
    <div
      className={cn(styles.AnnotationPopover, { [styles.isFixedHeight]: isFixedHeight })}
      onKeyUp={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div className={styles.container} ref={ref}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo height={26} />
          </div>
          <IconButton icon={<SmallCrossIcon />} title={"Dismiss"} onClick={onClose} />
        </div>
        <div className={styles.wrapper}>
          {/* for some reason causes positioning flicker on mount if highlight is dead center on page */}
          <TextareaAutosize
            ref={textareaRef}
            className={styles.note}
            placeholder={"Add a note..."}
            value={note || ""}
            onChange={(event) => {
              setNote(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                doInstrumentedSave(note);
                onClose();
              }
            }}
          />
          <HighlightCard className={styles.highlight} isChildCard>
            {highlitedText}
          </HighlightCard>
          <div className={styles.footer}>
            {isRemoving ? (
              <>
                <div className={styles.leftCol}>
                  <div className={styles.removeConfirmation}>Are you sure?</div>
                </div>
                <div className={styles.rightCol}>
                  <IconButton
                    type={"button"}
                    variant={"rose"}
                    label={"Yes, remove"}
                    title={"Yes, remove"}
                    onClick={(event) => {
                      setIsRemoving(false);
                      onRemove(event);
                      analyticsService.logEvent(
                        events.annotationDeleted({ count: 1, source: sources.ANNOTATION_POPOVER })
                      );
                    }}
                  />
                  <IconButton type={"button"} label={"Cancel"} title={"Cancel"} onClick={() => setIsRemoving(false)} />
                </div>
              </>
            ) : (
              <>
                <div className={styles.leftCol}>
                  <IconButton
                    type={"button"}
                    label={noteBody ? "Update note" : "Add note"}
                    title={noteBody ? "Update note" : "Add note"}
                    onClick={() => {
                      doInstrumentedSave(note);
                      onClose();
                    }}
                    disabled={note === null || note === noteBody}
                  />
                </div>
                <div className={styles.rightCol}>
                  <IconButton
                    type={"button"}
                    variant={"rose"}
                    label={"Remove"}
                    title={"Remove"}
                    onClick={() => setIsRemoving(true)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

AnnotationPopover.propTypes = {
  doResizeIframe: PropTypes.func.isRequired,
  highlitedText: PropTypes.string.isRequired,
  maxHeight: PropTypes.number,
  noteBody: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default AnnotationPopover;

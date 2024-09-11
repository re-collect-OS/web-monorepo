import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { IconButton, CrossIcon, Dialog } from "web-shared-lib";

import styles from "./RenameIdeaDialog.module.css";

const RenameIdeaDialog = React.forwardRef(
  (
    {
      children,
      initialTopic,
      isDraft,
      didAutoOpen,
      open,
      onOpenChange,
      onCancel,
      onSubmit,
      onSkipAutoChange,
      container,
    },
    ref
  ) => {
    const [topic, setTopic] = useState(isDraft ? "" : initialTopic);
    const inputRef = useRef(null);

    useEffect(() => {
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.select();
        }, 0);
      }
    }, []);

    const submitButtonLabel = isDraft ? "Name Playground" : "Rename Playground";
    const cancelButtonLabel = isDraft ? "Continue as draft" : "Cancel";

    return (
      <Dialog.Root
        open={open}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        onOpenChange={onOpenChange}
      >
        {!!children && <Dialog.Trigger asChild>{children}</Dialog.Trigger>}
        <Dialog.Portal container={container}>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content ref={ref} className={styles.content}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit({ topic });
              }}
            >
              <Dialog.Title className={styles.title}>What are you working on?</Dialog.Title>
              <div className={styles.description}>
                <input
                  ref={inputRef}
                  id={"topic"}
                  type={"text"}
                  value={topic}
                  onChange={(event) => {
                    setTopic(event.target.value);
                  }}
                  className={styles.topicInput}
                  placeholder={"Untitled"}
                />
              </div>
              <div className={styles.actions}>
                <IconButton
                  className={styles.button}
                  type={"button"}
                  size={"large"}
                  label={submitButtonLabel}
                  title={submitButtonLabel}
                  variant={"violet"}
                  onClick={() => onSubmit({ topic })}
                  full
                />
                <IconButton
                  className={styles.button}
                  type={"button"}
                  size={"large"}
                  label={cancelButtonLabel}
                  title={cancelButtonLabel}
                  onClick={onCancel}
                  full
                />
              </div>
              {didAutoOpen && (
                <div className={styles.skipCheckboxWrapper}>
                  <input id={"skip-checkbox"} type={"checkbox"} onChange={onSkipAutoChange} />
                  <label htmlFor={"skip-checkbox"}>Don't ask me again - always continue as draft</label>
                </div>
              )}
              <Dialog.Close asChild>
                <button className={styles.CloseButton} title="Dismiss">
                  <CrossIcon />
                </button>
              </Dialog.Close>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
);

RenameIdeaDialog.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  container: PropTypes.object,
  didAutoOpen: PropTypes.bool,
  initialTopic: PropTypes.string,
  isDraft: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onSkipAutoChange: PropTypes.func,
  onSubmit: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

export default RenameIdeaDialog;

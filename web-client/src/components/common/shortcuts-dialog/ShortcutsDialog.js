import React from "react";
import PropTypes from "prop-types";
import { CrossIcon, Dialog } from "web-shared-lib";

import { events, analyticsService } from "../../../libs/analyticsLib";

import styles from "./ShortcutsDialog.module.css";

const ShortcutsDialog = ({ children, open, onOpenChange, eventSource, ...rest }) => {
  React.useEffect(() => {
    if (open) {
      analyticsService.logEvent(events.shortcutsDialogInitiated({ source: eventSource }));
    }
  }, [eventSource, open]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} {...rest}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>Keyboard shortcuts</Dialog.Title>
          <div className={styles.description}>
            <section>
              <p className={styles.label}>Global</p>
              <ul>
                <li>
                  <code>?</code> to toggle the Help and Resources dialog
                </li>
              </ul>
            </section>
            <section>
              <p className={styles.label}>Text editors</p>
              <ul>
                <li>
                  <code>Cmd / Ctrl</code> + <code>Enter</code> to recall using selected text
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>b</code> to bold selected text
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>i</code> to italicize selected text
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>k</code> to add a link to selected text
                </li>
                <li>
                  <code>Tab</code> to indent or create a list
                </li>
                <li>
                  <code>Shift</code> + <code>Tab</code> to remove a level of indentation
                </li>

                <li>
                  <code>Cmd / Ctrl</code> + <code>z</code> to undo text change
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>Shift</code> + <code>z</code> to redo text change
                </li>
              </ul>
            </section>

            <section>
              <p className={styles.label}>Playground</p>
              <ul>
                <li>
                  <code>Cmd / Ctrl</code> + <code>Plus</code> to zoom in
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>Minus</code> to zoom out
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>0</code> to zoom to 100%
                </li>
                <li>
                  <code>Ctrl</code> + <code>1</code> to zoom to fit
                </li>
                <li>
                  <code>Space</code> / <code>Middle mouse button</code> to pan
                </li>
                <li>
                  <code>Double click</code> to add note card
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>c</code> to copy selected cards
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>x</code> to cut selected cards
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>v</code> to paste cut / copied cards
                </li>
              </ul>
            </section>

            <p className={styles.label}>Cards</p>

            <section>
              <p className={styles.subLabel}>Navigation</p>
              <ul>
                <li>
                  <code>Arrow keys</code> to move up and down the card stack
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>a</code> to select all cards
                </li>
                <li>
                  <code>Opt / Alt</code> + <code>Arrow keys</code> to jump to the top or bottom
                </li>
                <li>
                  <code>Shift</code> and <code>Arrow keys</code> to range select cards
                </li>
                <li>
                  <code>Delete</code> to delete selected cards
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>Shift</code> + <code>Arrow keys</code> to move selected cards up and
                  down
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>z</code> to undo
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>Shift</code> + <code>z</code> to redo
                </li>
              </ul>
            </section>

            <section>
              <p className={styles.subLabel}>Note cards</p>
              <ul>
                <li>
                  <code>Plus</code> to add a note to selected card
                </li>
                <li>
                  <code>Plus</code> to join selected card and note card
                </li>
                <li>
                  <code>Minus</code> to separate a selected card from note card
                </li>
                <li>
                  <code>Enter</code> to trigger the primary action: expand or edit depending on card type
                </li>
                <li>
                  <code>Esc</code> to exit note card edit mode or deselect the card
                </li>
              </ul>
            </section>

            <section>
              <p className={styles.subLabel}>Kept cards</p>
              <ul>
                <li>
                  <code>Enter</code> to expand selected card
                </li>
              </ul>
            </section>

            <section>
              <p className={styles.label}>Recall results stack</p>
              <p className={styles.instructions}>While stack has focus:</p>
              <ul>
                <li>
                  <code>Arrow keys</code> to navigate
                </li>
                <li>
                  <code>Enter</code> to expand card
                </li>
                <li>
                  <code>Cmd / Ctrl</code> + <code>Enter</code> to keep card
                </li>
                <li>
                  <code>Esc</code> to dismiss stack
                </li>
              </ul>
            </section>
          </div>
          <Dialog.Close asChild>
            <button className={styles.CloseButton} title="Dismiss">
              <CrossIcon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

ShortcutsDialog.propTypes = {
  eventSource: PropTypes.string.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

export default ShortcutsDialog;

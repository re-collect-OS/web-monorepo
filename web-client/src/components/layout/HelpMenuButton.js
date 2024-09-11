import React, { useState, useEffect, useLayoutEffect } from "react";
import cn from "classnames";
import PropTypes from "prop-types";
import {
  MailIcon,
  KeyboardIcon,
  HelpMenuIcon,
  Menu,
  MenuItem,
  MenuItemSeparator,
  MenuTrigger,
  FAQIcon,
} from "web-shared-lib";

import { HELP_GUIDE_URL } from "../../config";
import { useKeyState } from "../../libs/useKeyState";
import { usePrevious } from "../../libs/hooksLib";
import { events, analyticsService } from "../../libs/analyticsLib";

import ShortcutsDialog from "../common/shortcuts-dialog";
import { FeedbackDialog } from "../common/feedback-button";

import MenuButton from "./MenuButton";

import styles from "./HelpMenuButton.module.css";

const HelpMenuButton = React.forwardRef(({ className, isCollapsed = false, eventSource, menuSide }, ref) => {
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const triggerRef = React.useRef();

  const { shortcutsKey, escKey } = useKeyState(
    {
      shortcutsKey: ["shift + /"],
      // Can't rely on Dialog default behavior because Editor potentially intercepts Esc to deselect
      escKey: "esc",
    },
    {
      ignoreRepeatEvents: true,
      captureEvents: false,
    }
  );

  useEffect(() => {
    const escKeyDown = escKey.down;
    if (shortcutsKey.down) {
      // This doesn't actually work anymore because we can't bring up the menu w/o
      // user clicking the trigger as of Radix v1.0.0
      // The pointer-events none flag on body never gets removed (waiting for fix... assuming related to their reference counting)
      // https://github.com/radix-ui/primitives/discussions/1234
      // https://github.com/radix-ui/primitives/issues/1241
      // https://github.com/radix-ui/website/issues/384
      // setIsShortcutsDialogOpen((prev) => !prev);

      // Opening the help menu instead:
      setIsMenuOpen((prev) => !prev);
    } else if (isShortcutsDialogOpen && escKeyDown) {
      setIsShortcutsDialogOpen(false);
    } else if (isFeedbackDialogOpen && escKeyDown) {
      setIsFeedbackDialogOpen(false);
    }
  }, [shortcutsKey, escKey, isShortcutsDialogOpen, isFeedbackDialogOpen]);

  const isHidden = isFeedbackDialogOpen || isShortcutsDialogOpen;
  const prevIsHidden = usePrevious(isHidden);

  // Dismiss menu if we're coming back from a hidden state (child dialog was open)
  useLayoutEffect(() => {
    if (!isHidden && prevIsHidden) {
      setIsMenuOpen(false);
      triggerRef.current.focus();
    }
  }, [isHidden, prevIsHidden]);

  const keyboardShortcutsMenuItem = (
    <ShortcutsDialog open={isShortcutsDialogOpen} onOpenChange={setIsShortcutsDialogOpen} eventSource={eventSource}>
      <MenuItem
        textValue="Keyboard shortcuts"
        className={styles.menuItem}
        icon={<KeyboardIcon />}
        onSelect={(event) => event.preventDefault()}
      >
        Keyboard shortcuts
      </MenuItem>
    </ShortcutsDialog>
  );
  const helpMenuItem = (
    <MenuItem
      textValue="Help and support guide"
      className={styles.menuItem}
      icon={<FAQIcon />}
      onSelect={() => {
        window.open(HELP_GUIDE_URL, "_blank");
        analyticsService.logEvent(events.helpMenuSupportGuideOpened());
      }}
    >
      Help and support guide
    </MenuItem>
  );
  const sendFeedbackMenuItem = (
    <FeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} eventSource={eventSource}>
      <MenuItem
        textValue="Send us feedback"
        icon={<MailIcon />}
        className={cn(styles.menuItem, styles.feedbackMenuItem)}
        onSelect={(event) => event.preventDefault()}
      >
        Send us feedback
      </MenuItem>
    </FeedbackDialog>
  );

  let menuItems = (
    <>
      {helpMenuItem}
      {keyboardShortcutsMenuItem}
      <MenuItemSeparator />
      {sendFeedbackMenuItem}
    </>
  );

  return (
    <>
      <MenuTrigger
        ref={triggerRef}
        open={isMenuOpen}
        onOpenChange={(open) => {
          setIsMenuOpen(open);
          if (open) {
            analyticsService.logEvent(events.helpMenuOpened({ source: eventSource }));
          }
        }}
        button={
          <MenuButton
            ref={ref}
            className={cn(className, styles.HelpMenuButton)}
            icon={<HelpMenuIcon />}
            label={"Help Center"}
            title={"Help Center"}
            size={"large"}
            isCollapsed={isCollapsed}
          />
        }
        menuContent={
          <Menu
            // Hide menu when dialogs are open
            // This shouldn't be necessary but for some reason it blocks pointer events
            // from reaching the dialog (or something to that extent - buttons work?!)
            hidden={isHidden}
            align="start"
            side={menuSide || "top"}
            avoidCollisions={false}
            alignOffset={-8}
            sideOffset={-4}
            className={styles.menu}
            container={document.body}
            onEscapeKeyDown={(event) => {
              if (isHidden) {
                event.preventDefault();
              }
            }}
          >
            {menuItems}
          </Menu>
        }
      />
    </>
  );
});

HelpMenuButton.propTypes = {
  className: PropTypes.string,
  eventSource: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool,
  menuSide: PropTypes.string,
};

export default HelpMenuButton;

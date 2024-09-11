import React, { useState, forwardRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  IconButton,
  CrossIcon,
  MailIcon,
  AeroplaneIcon,
  MenuTrigger,
  MenuHorizontalIcon,
  Menu,
  MenuItem,
  Dialog,
} from "web-shared-lib";
import { shallow } from "zustand/shallow";
import useLocalStorage from "use-local-storage";

import { events, analyticsService } from "../../../libs/analyticsLib";
import { sendFeedbackEmail } from "../../../libs/mailLib";
import { useStore } from "../../../store";

import styles from "./FeedbackButton.module.css";

const selector = (state) => ({
  email: state.user.email,
});

const FeedbackDialogContent = forwardRef(({ eventSource, title, placeholder }, ref) => {
  const { email } = useStore(selector, shallow);
  const [message, setMessage] = useLocalStorage("feedback_message_draft", "");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Dialog.Content className={styles.dialog} ref={ref}>
        <Dialog.Title className={styles.title}>Message sent</Dialog.Title>
        <Dialog.Description>Thank you! We'll be in touch over email.</Dialog.Description>
        <div className={styles.sentActions}>
          <Dialog.Close asChild>
            <IconButton title={"Done"} label={"Done"} variant={"grey"} size={"large"} />
          </Dialog.Close>
        </div>
      </Dialog.Content>
    );
  }

  return (
    <Dialog.Content className={styles.dialog} ref={ref}>
      <Dialog.Title className={styles.title}>{title}</Dialog.Title>
      <div>
        <textarea
          className={styles.messageInput}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div className={styles.actions}>
        <IconButton
          icon={<AeroplaneIcon />}
          className={styles.sendMessageButton}
          title={isLoading ? "Sending message..." : "Send message"}
          label={isLoading ? "Sending message..." : "Send message"}
          variant={"grey"}
          size={"large"}
          disabled={isLoading}
          onClick={() => {
            analyticsService.logEvent(events.feedbackDialogMessaged({ source: eventSource }));
            setIsLoading(true);
            sendFeedbackEmail({ email, message })
              .then(() => {
                setSent(true);
                // Reset message since we're persisting the draft
                setMessage("");
              })
              .finally(() => {
                setIsLoading(false);
              });
          }}
          full
        />
        <div className={styles.moreButtonWrapper}>
          <MenuTrigger
            button={
              <IconButton
                title={"More feedback options"}
                icon={<MenuHorizontalIcon />}
                variant={"grey"}
                size={"large"}
                full
              />
            }
            menuContent={
              <Menu align={"end"} alignOffset={-8} className={styles.moreMenu}>
                <MenuItem
                  textValue={"send us an email"}
                  onSelect={() => {
                    analyticsService.logEvent(events.feedbackDialogEmailed({ source: eventSource }));
                    window.open("mailto:hello@re-collect.ai?subject=Feedback", "_blank");
                  }}
                >
                  Send us an email
                </MenuItem>
                <MenuItem
                  textValue={"book a call"}
                  onSelect={() => {
                    analyticsService.logEvent(events.feedbackDialogCalled({ source: eventSource }));
                    window.open("https://calendly.com/jnthndiaz/re-collect", "_blank");
                  }}
                >
                  Book a call
                </MenuItem>
              </Menu>
            }
          />
        </div>
      </div>
      <Dialog.Close asChild>
        <button className={styles.CloseButton} title="Dismiss">
          <CrossIcon />
        </button>
      </Dialog.Close>
    </Dialog.Content>
  );
});

FeedbackDialogContent.propTypes = {
  eventSource: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

export const FeedbackDialog = forwardRef(
  ({ children, eventSource, onOpenChange, open, isOnboardingFeedback, ...props }, ref) => {
    useEffect(() => {
      if (open) {
        analyticsService.logEvent(events.feedbackDialogInitiated({ source: eventSource }));
      }
    }, [open, eventSource]);

    const title = isOnboardingFeedback
      ? "How can we improve our onboarding experience?"
      : "Thank you for helping test our private beta product! We’re eager to understand your experience with re:collect.";
    const placeholder = isOnboardingFeedback
      ? "First impressions matter. If you have a question, an idea, or want to say “hi!” we would love to hear from you!"
      : "If you have a problem, an idea, or just want to say hi we would love to hear from you. Reach out anytime!";

    return (
      <Dialog.Root ref={ref} open={open} onOpenChange={onOpenChange} {...props}>
        <Dialog.Trigger asChild>{children}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <FeedbackDialogContent eventSource={eventSource} title={title} placeholder={placeholder} />
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
);

FeedbackDialog.propTypes = {
  children: PropTypes.element,
  eventSource: PropTypes.string.isRequired,
  isOnboardingFeedback: PropTypes.bool,
  onOpenChange: PropTypes.func,
  open: PropTypes.bool,
};

const FeedbackButton = forwardRef(({ className, label = "Feedback?", eventSource, ...rest }, ref) => {
  return (
    <FeedbackDialog eventSource={eventSource}>
      <IconButton ref={ref} className={className} icon={<MailIcon />} title={"Send feedback"} label={label} {...rest} />
    </FeedbackDialog>
  );
});

FeedbackButton.propTypes = {
  className: PropTypes.string,
  eventSource: PropTypes.string.isRequired,
  label: PropTypes.string,
};

export default FeedbackButton;

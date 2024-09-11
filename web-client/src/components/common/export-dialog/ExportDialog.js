import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { CrossIcon, IconButton, DownloadIcon, ClipboardIcon, Dialog, extractParagraphMatch } from "web-shared-lib";

import { events, analyticsService } from "../../../libs/analyticsLib";
import { serializeMarkdown, extractTitle } from "../../../libs/documentLib";

import styles from "./ExportDialog.module.css";

function cardSerializeMarkdown(card) {
  if (card.type === "note") {
    return serializeMarkdown({ body: card.body });
  } else {
    let sentences = [];
    if (card.artifactType === "tweet-thread") {
      const tweet = card.tweets[card.matchTweetIndex];
      sentences = tweet.sentences;
    } else {
      sentences = card.sentences;
    }
    const { beforeStr, matchStr, afterStr } = extractParagraphMatch({
      sentences,
      matchSentences: card.matchSentences,
    });
    const quote = [beforeStr, matchStr, afterStr].filter(Boolean).join(" ");

    return `> ${quote}\n\nSource: [${card.title}](${card.url})`;
  }
}

const ExportDialog = React.forwardRef(
  ({ open, onOpenChange, documentId, documentBody, keptCards, eventSource }, ref) => {
    const [value, setValue] = useState("");

    useEffect(() => {
      if (open) {
        analyticsService.logEvent(events.exportDocumentDialogInitiated({ documentId, source: eventSource }));

        // Avoid computing on every editor re-render
        const documentText = serializeMarkdown({ body: documentBody });
        const parentCards = keptCards.filter((c) => !c.parentId);
        const childCards = keptCards.filter((c) => !!c.parentId);
        const serializedParentCards = parentCards.map((c) => cardSerializeMarkdown(c));
        const serializedChildCards = childCards.map((c) => cardSerializeMarkdown(c));

        serializedChildCards.forEach((childText, index) => {
          const childCard = childCards[index];
          const parentCardIndex = parentCards.findIndex((c) => c.id === childCard.parentId);
          if (parentCardIndex >= 0) {
            const parentText = serializedParentCards[parentCardIndex];
            serializedParentCards[parentCardIndex] = `${parentText}\n\n${childText}`;
          }
        });
        setValue(`${documentText}\n\n---\n\n${serializedParentCards.join("\n\n---\n\n")}`);
      }
    }, [open, documentBody, documentId, eventSource, keptCards]);

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content ref={ref} className={styles.content}>
            <Dialog.Title className={styles.title}>Export</Dialog.Title>
            <div className={styles.description}>
              <textarea className={styles.textarea} value={value} readOnly />
              <div className={styles.actions}>
                <IconButton
                  className={styles.button}
                  icon={<ClipboardIcon />}
                  type={"button"}
                  size={"large"}
                  label={"Copy to clipboard"}
                  title={"Copy .md to clipboard"}
                  variant={"grey"}
                  onClick={() => {
                    analyticsService.logEvent(
                      events.documentExportCopied({ documentId, type: "markdown", source: eventSource })
                    );
                    navigator.clipboard.writeText(value).then(
                      () => console.info("Successfully copied .md to clipboard"),
                      () => alert("Failed to write .md to clipboard")
                    );
                  }}
                  full
                />
                <IconButton
                  className={styles.button}
                  icon={<DownloadIcon />}
                  type={"button"}
                  size={"large"}
                  label={"Download .md"}
                  title={"Download .md file"}
                  variant={"grey"}
                  onClick={() => {
                    analyticsService.logEvent(
                      events.documentExportDownloaded({ documentId, type: "markdown", source: eventSource })
                    );

                    const now = new Date();
                    const title = extractTitle({ body: documentBody }).toLowerCase().split(" ").join("-");
                    const el = document.createElement("a");
                    el.setAttribute("href", "data:text/text;charset=utf-8," + encodeURIComponent(value));
                    el.setAttribute("download", `${title}-${now.getDay()}-${now.getMonth()}-${now.getFullYear()}.md`);
                    el.style.display = "none";
                    document.body.appendChild(el);
                    el.click();
                    document.body.removeChild(el);
                  }}
                  full
                />
              </div>
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
  }
);

ExportDialog.propTypes = {
  documentBody: PropTypes.array.isRequired,
  documentId: PropTypes.string.isRequired,
  eventSource: PropTypes.string.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

export default ExportDialog;

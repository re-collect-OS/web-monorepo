import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import {
  CalendarIcon,
  ClipboardIcon,
  PlaygroundIcon,
  ExpandIcon,
  generateRecallResultExternalLink,
  IconButton,
  IconMenuTriggerButton,
  IconPickerButton,
  KeepIcon,
  MenuHorizontalIcon,
  OpenIcon,
  RecallResults,
  SmallChevronDownIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  usePrevious,
  Menu,
  MenuItem,
  MenuItemSeparator,
  Toast,
  KeepConfirmationToast,
  FiltersIcon,
  RecallFilters,
  Logo,
} from "web-shared-lib";
import TextareaAutosize from "react-textarea-autosize";
import { textToSlateBody, textFromSlateBody } from "js-shared-lib";
import { shallow } from "zustand/shallow";

import { NoteCard, HighlightCard, KeptCard } from "web-shared-lib";

import { PAGE_NAV_TAB, RECALL_NAV_TAB } from "./TabBar";
import TabBar from "./TabBar";
import NavBar from "./NavBar";
import Lander from "./Lander";
import Notifications from "./Notifications";

import { useStore } from "../../store";

import { events, analyticsService, sources } from "../../libs/analyticsLib";
import { logFeedbackEvent, loadThumbnailFromS3Path } from "../../libs/contentLib";

import styles from "./AuthenticatedUI.module.css";

const selector = (state) => ({
  annotationNodes: state.annotations.nodes,
  annotations: state.annotations.cards,
  doAnnotationsAddKeptCard: state.doAnnotationsAddKeptCard,
  doAnnotationsAddKeptCardToDailyLog: state.doAnnotationsAddKeptCardToDailyLog,
  doPopoverShowNotifications: state.doPopoverShowNotifications,
  doRecallMarkGoodResult: state.doRecallMarkGoodResult,
  doRecallRemoveResult: state.doRecallRemoveResult,
  hasNotifications:
    state.version.status === "loading" ? false : state.version.appVersion !== state.version.lastAppVersion,
  hasRecallError: !!state.recall.errorMsg,
  isRecalling: state.recall.status === "loading",
  options: state.recall.options,
  recallMarkedGoodResultIds: state.recall.markedGoodResultIds || [],
  recallResults: state.recall.results || [],
  recallStackId: state.recall.stackId,
  selectedCardId: state.popover.selectedCardId,
  setSelectedCardId: state.doPopoverSelectCardSet,
  setShowFilters: state.doRecallFiltersOpen,
  shouldShowNotifications: state.popover.showNotifications,
  showFilters: state.recall.areFiltersVisible,
  canUseRecallFilters: state.tabState.canUseRecallFilters,
  isAccountDeactivated: state.tabState.isAccountDeactivated,
});

function YellowCard({ className, model, onClick, isSelected = false, ...rest }) {
  switch (model.type) {
    case "highlight": {
      return (
        <HighlightCard className={className} isSelected={isSelected} onClick={onClick} {...rest}>
          {model.text}
        </HighlightCard>
      );
    }
    case "kept": {
      return (
        <KeptCard
          className={className}
          isSelected={isSelected}
          onClick={onClick}
          model={model}
          loadThumbnailFromS3Path={loadThumbnailFromS3Path}
          {...rest}
        />
      );
    }
    default:
      console.log("Cannot render card of type:", model.type);
  }

  return null;
}

YellowCard.propTypes = {
  className: PropTypes.string,
  isSelected: PropTypes.bool,
  model: PropTypes.object.isRequired,
  onClick: PropTypes.func,
};

function MatchNav({
  isMarkedGood,
  onExpandClick,
  onTabKeepClick,
  onLogKeepClick,
  onCopyClick,
  onMarkGoodClick,
  onMarkBadClick,
}) {
  return (
    <div className={styles.matchNav}>
      <div className={styles.leftCol}>
        <IconButton icon={<ExpandIcon />} label={"Expand"} title={"Expand result"} onClick={onExpandClick} />
        <IconPickerButton
          icon={<KeepIcon />}
          pickerIcon={<SmallChevronDownIcon />}
          label={"Keep"}
          title={"Keep result to Daily Log"}
          pickerTitle={"Keep to..."}
          menuContent={
            <Menu
              align="end"
              side="bottom"
              sideOffset={0}
              alignOffset={-8}
              avoidCollisions={true}
              className={styles.menu}
            >
              <MenuItem
                icon={<CalendarIcon />}
                textValue="keep-daily-log"
                title={"Keep to Daily Log"}
                onSelect={onLogKeepClick}
              >
                Keep to Daily Log
              </MenuItem>
              <MenuItemSeparator />

              <MenuItem
                icon={<PlaygroundIcon />}
                textValue="keep-idea"
                title={"Keep to current Idea"}
                onSelect={onTabKeepClick}
              >
                Keep to Current Tab
              </MenuItem>
            </Menu>
          }
          onClick={onLogKeepClick}
        />
      </div>
      <div className={styles.rightCol}>
        <IconMenuTriggerButton
          icon={<MenuHorizontalIcon />}
          title={"More"}
          menuContent={
            <Menu
              align="end"
              side="bottom"
              sideOffset={0}
              alignOffset={-8}
              avoidCollisions={true}
              className={styles.menu}
            >
              <MenuItem icon={<ClipboardIcon />} textValue="copy" title={"Copy"} onSelect={onCopyClick}>
                Copy to clipboard
              </MenuItem>
              {!isMarkedGood && (
                <>
                  <MenuItem
                    icon={<ThumbsUpIcon />}
                    textValue="mark-good"
                    title={"Mark good result"}
                    variant={"violet"}
                    onSelect={onMarkGoodClick}
                  >
                    Mark good result
                  </MenuItem>
                  <MenuItem
                    icon={<ThumbsDownIcon />}
                    textValue="mark-bad"
                    title={"Mark bad result"}
                    variant={"destructive"}
                    onSelect={onMarkBadClick}
                  >
                    Mark bad result
                  </MenuItem>
                </>
              )}
            </Menu>
          }
        />
      </div>
    </div>
  );
}

MatchNav.propTypes = {
  onTabKeepClick: PropTypes.func.isRequired,
  onLogKeepClick: PropTypes.func.isRequired,
  onCopyClick: PropTypes.func.isRequired,
  onExpandClick: PropTypes.func.isRequired,
};

function AuthenticatedUI({
  canAutoCollect,
  canCollect,
  doAnnotationsAddNoteCard,
  doAnnotationsRemoveCard,
  doAnnotationsUpdateNoteCard,
  doAnnotationsUpdateNoteForCard,
  error,
  isAutoCollecting,
  isExpanded,
  isRemembered,
  isSubscribed,
  menuContainer,
  navTab,
  onClose,
  onForgetVisit,
  onLaunchApp,
  onLogout,
  onNavTabChange,
  onOptIn,
  onOptOut,
  onQueryChange,
  onShowAnnotations,
  onSubmitVisit,
  onSubscribe,
  query,
  rememberedTimeAgo,
  status,
  tabInfo,
  username,
}) {
  const {
    annotationNodes,
    annotations,
    doAnnotationsAddKeptCard,
    doAnnotationsAddKeptCardToDailyLog,
    doPopoverShowNotifications,
    doRecallMarkGoodResult,
    doRecallRemoveResult,
    hasNotifications,
    hasRecallError,
    isRecalling,
    options,
    recallMarkedGoodResultIds,
    recallResults,
    recallStackId,
    selectedCardId,
    setSelectedCardId,
    setShowFilters,
    shouldShowNotifications,
    showFilters,
    canUseRecallFilters,
    isAccountDeactivated,
  } = useStore(selector, shallow);

  const [note, setNote] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const prevSelectedCardId = usePrevious(selectedCardId);
  const logicalAnnotationsCount = useMemo(() => annotations.filter((c) => !c.parentId).length, [annotations]);
  const prevAnnotationsLength = usePrevious(annotations.length);

  const confirmationToastRef = useRef(null);
  const annotationLogWrapperRef = useRef(null);
  // Manage textarea focus
  const noteTextAreaRef = useRef(null);
  const recallTextAreaRef = useRef(null);
  const onNoteTextAreaMount = useCallback((el) => {
    if (el) {
      noteTextAreaRef.current = el;
      el.select();
    }
  }, []);
  const onRecallTextAreaMount = useCallback((el) => {
    if (el) {
      recallTextAreaRef.current = el;
      el.select();
    }
  }, []);

  useEffect(() => {
    if (navTab === PAGE_NAV_TAB) {
      const el = noteTextAreaRef.current;
      if (selectedCardId) {
        if (el) {
          el.focus();
          el.selectionStart = el.value.length;
        }
      } else {
        el?.select();
      }
    } else if (navTab === RECALL_NAV_TAB) {
      const el = recallTextAreaRef.current;
      el?.select();
    }
  }, [navTab, selectedCardId]);

  // If a card has a note the note is always selected
  // but the selected card may not always be a note card (because it has none associated)
  // Look up associated note <> child cards
  const selectedCard = useMemo(() => {
    return selectedCardId !== null ? annotations.find((a) => a.id === selectedCardId) : null;
  }, [selectedCardId, annotations]);
  const selectedNoteCard = useMemo(() => {
    if (selectedCard) {
      return selectedCard.type === "note" ? selectedCard : annotations.find((a) => a.id === selectedCard.parentId);
    }
    return null;
  }, [selectedCard, annotations]);
  const selectedChildCard = useMemo(() => {
    if (selectedCard) {
      return selectedCard.type === "note" ? annotations.find((a) => a.parentId === selectedCard.id) : selectedCard;
    }
    return null;
  }, [selectedCard, annotations]);

  const doRemoveSelectedNote = ({ shouldSplit = false } = {}) => {
    doAnnotationsRemoveCard({ id: selectedCardId, shouldSplit });
    setSelectedCardId(null);
    setIsRemoving(false);
    analyticsService.logEvent(events.annotationDeleted({ count: 1, source: sources.RECOLLECT_POPOVER }));
  };

  const doAddOrUpdate = () => {
    const noteText = note.trim();

    const logUpdateEvent = () => {
      analyticsService.logEvent(
        events.annotationUpdatedNote({ isOnHighlight: !!selectedChildCard, source: sources.RECOLLECT_POPOVER })
      );
    };

    const logAddedEvent = () => {
      analyticsService.logEvent(
        events.annotationAddedNote({ isOnHighlight: !!selectedChildCard, source: sources.RECOLLECT_POPOVER })
      );
    };

    if (noteText) {
      if (selectedChildCard) {
        // Update or add a new note and associate it with child card
        doAnnotationsUpdateNoteForCard({
          id: selectedChildCard.id,
          body: textToSlateBody(noteText),
        });
        if (selectedNoteCard) {
          logUpdateEvent();
        } else {
          logAddedEvent();
        }

        if (!isExpanded) {
          onShowAnnotations();
        }
      } else if (selectedNoteCard) {
        doAnnotationsUpdateNoteCard({
          id: selectedNoteCard.id,
          body: textToSlateBody(noteText),
        });
        logUpdateEvent();
      } else {
        // Add a new note card
        doAnnotationsAddNoteCard({ body: textToSlateBody(noteText) });
        logAddedEvent();
      }
    } else if (selectedNoteCard) {
      doRemoveSelectedNote({ shouldSplit: true });
    }

    // Clean up
    if (selectedCardId) {
      setSelectedCardId(null);
    } else {
      // Manually clear note because it won't be cleaned up as a side effect of deselecting the card
      setNote("");
    }
  };

  // Sync note with selected card
  useEffect(() => {
    if (prevSelectedCardId !== selectedCardId) {
      if (isRemoving) {
        setIsRemoving(false);
      }

      if (!selectedCard) {
        return void setNote("");
      }

      if (selectedNoteCard) {
        setNote(textFromSlateBody(selectedNoteCard.body) || "");
      } else {
        setNote("");
      }
    }
  }, [prevSelectedCardId, selectedCardId, selectedCard, selectedNoteCard, isRemoving]);

  useEffect(() => {
    // If we added a card, scroll to it
    if (prevAnnotationsLength < annotations.length) {
      const el = annotationLogWrapperRef.current;
      if (el) {
        el.scrollTo(0, el.scrollHeight);
      }
    }
  }, [annotations, prevAnnotationsLength]);

  // Deselect card when collapsing
  useEffect(() => {
    if (!isExpanded && selectedCardId) {
      setSelectedCardId(null);
    }
  }, [isExpanded, selectedCardId, setSelectedCardId]);

  // Filter out linked (have a parentId pointer) from root cards
  // (we render the root cards which linked cards as children)
  const rootCards = annotations.filter((a1) => annotations.findIndex((a2) => a2.parentId === a1.id) < 0);
  const linkedCards = annotations.filter((a1) => rootCards.findIndex((a2) => a2.id === a1.id) < 0);

  if (isAccountDeactivated) {
    return (
      <div className={cn(styles.AuthenticatedUI, { [styles.isExpanded]: true })}>
        <div className={styles.deactivatedNotice}>
          <Logo height={26} className={styles.logo} />
          <h1 className={styles.title}>Your account has been deactivated</h1>
          <p className={styles.description}>
            Due to inactivity, your account has been deactivated. If you'd like to restore your account please{" "}
            <a href="mailto:hello@re-collect.ai">reach out</a>.
          </p>
        </div>
      </div>
    );
  }

  if (shouldShowNotifications) {
    return (
      <div className={cn(styles.AuthenticatedUI, { [styles.isExpanded]: true })}>
        <Notifications onClose={onClose} onGoBack={() => doPopoverShowNotifications(false)} />
      </div>
    );
  }

  return (
    <div className={cn(styles.AuthenticatedUI, { [styles.isExpanded]: isExpanded })}>
      <div className={styles.navWrapper}>
        <NavBar
          username={username}
          onLogout={onLogout}
          // onMinimize={() => {}}
          onClose={onClose}
          onLaunchApp={onLaunchApp}
          hasNotifications={hasNotifications}
          onShowNotifications={() => {
            doPopoverShowNotifications(true);
            analyticsService.logEvent(events.popupNotificationsOpened());
          }}
        />
        {canCollect && (
          <TabBar
            value={navTab}
            onChange={(_navTab) => {
              setSelectedCardId(null);
              onNavTabChange(_navTab);
            }}
            isRecalling={isRecalling}
          />
        )}
        {navTab === RECALL_NAV_TAB && (
          <div className={styles.queryInput}>
            <div className={styles.inputWrapper}>
              <TextareaAutosize
                ref={onRecallTextAreaMount}
                maxRows={4}
                placeholder={"Describe an idea or concept..."}
                value={query || ""}
                className={styles.input}
                onChange={(event) => {
                  onQueryChange({ query: event.target.value, options });
                }}
              />
              {canUseRecallFilters && (
                <IconButton
                  className={styles.toggleFiltersBtn}
                  icon={<FiltersIcon />}
                  title={"Toggle recall filters"}
                  onClick={() => setShowFilters((prev) => !prev)}
                />
              )}
            </div>
            {canUseRecallFilters && showFilters && (
              <RecallFilters
                menuContainer={menuContainer}
                options={options}
                setOptions={(opts) => onQueryChange({ query, options: { ...opts, source: "manual" } })}
                onReportFilterSet={({ key, value }) => {
                  analyticsService.logEvent(events.recallFiltersSet({ key, value }));
                }}
              />
            )}
          </div>
        )}
      </div>
      <div className={cn(styles.pageTabWrapper, { [styles.isHidden]: navTab !== PAGE_NAV_TAB })}>
        {!isExpanded && (
          <Lander
            tabInfo={tabInfo}
            canCollect={canCollect}
            canAutoCollect={canAutoCollect}
            isRemembered={isRemembered}
            isSubscribed={isSubscribed}
            rememberedTimeAgo={rememberedTimeAgo}
            onForgetVisit={onForgetVisit}
            onSubmitVisit={onSubmitVisit}
            onSubscribe={onSubscribe}
            isAutoCollecting={isAutoCollecting}
            onOptIn={onOptIn}
            onOptOut={onOptOut}
            error={error}
            status={status}
          />
        )}
        {isExpanded && (
          <div
            className={styles.annotationLogWrapper}
            ref={annotationLogWrapperRef}
            onClick={() => {
              setSelectedCardId(null);
            }}
          >
            {rootCards.map((card) => {
              let noteCard = null;
              if (card.type === "note") {
                noteCard = card;
              } else if (card.parentId) {
                noteCard = linkedCards.find((a) => a.id === card.parentId);
              }

              const doSelect = () => {
                // Select note card if we have one
                if (noteCard) {
                  setSelectedCardId((prev) => (prev === noteCard.id ? null : noteCard.id));
                } else {
                  setSelectedCardId((prev) => (prev === card.id ? null : card.id));
                }
              };

              let yellowCard =
                card.type === "note" ? null : (
                  <YellowCard
                    isChildCard={!!noteCard}
                    key={card.id}
                    model={card}
                    isSelected={selectedCardId === card.id && !noteCard}
                    onClick={(event) => {
                      event.stopPropagation();
                      doSelect();

                      if (card.type === "highlight") {
                        const spans = annotationNodes.find((n) => n.id === card.id)?.spans;
                        if (spans) {
                          spans[0].scrollIntoView({ behavior: "auto", block: "center" });
                        }
                      }
                    }}
                  />
                );

              if (noteCard) {
                return (
                  <NoteCard
                    key={noteCard.id}
                    isSelected={selectedCardId === noteCard.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      doSelect();
                    }}
                    childCard={!!yellowCard && yellowCard}
                  >
                    {textFromSlateBody(noteCard.body)}
                  </NoteCard>
                );
              } else {
                return yellowCard;
              }
            })}
          </div>
        )}
        {canCollect && (
          <div className={cn(styles.noteWrapper, { [styles.isExpanded]: isExpanded })}>
            {!isExpanded && annotations.length > 0 && (
              <IconButton
                icon={<OpenIcon />}
                type={"button"}
                className={styles.showAnnotationsBtn}
                size={"large"}
                label={`Show ${logicalAnnotationsCount} annotation${logicalAnnotationsCount === 1 ? "" : "s"}`}
                title={`Expand`}
                onClick={() => {
                  onShowAnnotations();
                }}
              />
            )}
            <div>
              <TextareaAutosize
                ref={onNoteTextAreaMount}
                maxRows={4}
                placeholder={isExpanded ? "Add a note..." : "Why was this important to remember?"}
                value={note}
                className={styles.noteInput}
                onChange={(event) => {
                  setNote(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    doAddOrUpdate();
                  }
                }}
              />
              {selectedChildCard && selectedChildCard?.type !== "note" && (
                <YellowCard model={selectedChildCard} className={styles.editorHighlightCard} isChildCard />
              )}
            </div>

            <div className={styles.noteControls}>
              {isRemoving ? (
                <>
                  <div className={styles.leftCol}>
                    <div className={styles.removeConfirmation}>Are you sure?</div>
                  </div>
                  <div className={styles.rightCol}>
                    <IconButton
                      variant={"rose"}
                      type={"button"}
                      label={"Yes, remove"}
                      title={"Yes, remove"}
                      onClick={() => {
                        doRemoveSelectedNote();
                      }}
                    />
                    <IconButton
                      type={"button"}
                      label={"Cancel"}
                      title={"Cancel"}
                      onClick={() => setIsRemoving(false)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.leftCol}>
                    <IconButton
                      type={"button"}
                      label={selectedNoteCard ? "Update note" : "Add note"}
                      title={selectedNoteCard ? "Update note" : "Add note"}
                      onClick={doAddOrUpdate}
                      disabled={selectedCardId ? selectedCard?.note === note : !note}
                    />
                  </div>
                  <div className={styles.rightCol}>
                    {selectedCardId && (
                      <IconButton
                        variant={"rose"}
                        type={"button"}
                        label={"Remove"}
                        title={"Remove"}
                        onClick={() => setIsRemoving(true)}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={cn(styles.recallTabWrapper, { [styles.isHidden]: navTab !== RECALL_NAV_TAB })}>
        <Toast.Provider duration={10000} swipeDirection={"down"}>
          {!isRecalling && !query && (
            <div className={styles.emptyState}>
              Search and resurface your digital information to help you remember what you consumed, further your
              thinking, and spark new ideas.
            </div>
          )}
          <RecallResults
            query={query}
            isLoading={isRecalling}
            results={recallResults}
            hasError={hasRecallError}
            markedGoodResultIds={recallMarkedGoodResultIds}
            onArtifactClick={({ event, model }) => {
              // HACK - given we can't handle the annotation URL in web-client yet,
              // just open the page the annotation was added to:
              if (model.artifactType === "recollect-note") {
                event.preventDefault();
                event.stopPropagation();
                window.open(generateRecallResultExternalLink({ model }), "_blank");
              }
              analyticsService.logEvent(events.recallOpenedArticleLink({ stackId: recallStackId }));
            }}
            loadThumbnailFromS3Path={loadThumbnailFromS3Path}
            renderMatchNav={({ model }) => {
              return (
                <MatchNav
                  isMarkedGood={recallMarkedGoodResultIds.includes(model.matchSentence)}
                  onExpandClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(generateRecallResultExternalLink({ model }), "_blank");
                    analyticsService.logEvent(
                      events.recallOpenedResultLink({ stackId: recallStackId, stackIndex: model.index })
                    );
                    logFeedbackEvent({
                      action: "expand",
                      query,
                      score: model.score,
                      stackId: recallStackId,
                      sentenceNumber: model.matchSentence,
                      contextUrl: tabInfo?.url,
                    });
                  }}
                  onLogKeepClick={() => {
                    doAnnotationsAddKeptCardToDailyLog({ model, query }).catch((error) => {
                      console.warn("Failed to keep to daily log:", error);
                    });
                    analyticsService.logEvent(
                      events.recallKeptResultToDailyLog({ stackId: recallStackId, stackIndex: model.index })
                    );
                    logFeedbackEvent({
                      action: "keep",
                      query,
                      score: model.score,
                      stackId: recallStackId,
                      sentenceNumber: model.matchSentence,
                    });
                    confirmationToastRef.current.add({
                      title: "Result kept",
                      doAction: () => {
                        onLaunchApp("/daily-log");
                      },
                    });
                  }}
                  onTabKeepClick={() => {
                    doAnnotationsAddKeptCard({ model, query });
                    analyticsService.logEvent(
                      events.recallKeptResultToPage({ stackId: recallStackId, stackIndex: model.index })
                    );
                    logFeedbackEvent({
                      action: "keep",
                      query,
                      score: model.score,
                      stackId: recallStackId,
                      sentenceNumber: model.matchSentence,
                      contextUrl: tabInfo?.url,
                    });
                  }}
                  onCopyClick={() => {
                    const sentences =
                      model.artifactType === "tweet-thread"
                        ? model.tweets[model.matchTweetIndex].sentences
                        : model.sentences;
                    const text = `"${sentences.map((s) => s.text).join(" ")}"\n\nSource: ${model.title} (${model.url})`;
                    navigator.clipboard.writeText(text).catch((error) => {
                      console.error("[!] Could not copy recall result to clipboard:", error);
                    });
                    analyticsService.logEvent(
                      events.recallCopiedResultText({ stackId: recallStackId, stackIndex: model.index })
                    );
                    logFeedbackEvent({
                      action: "copy",
                      query,
                      score: model.score,
                      stackId: recallStackId,
                      sentenceNumber: model.matchSentence,
                      contextUrl: tabInfo?.url,
                    });
                  }}
                  onMarkGoodClick={() => {
                    doRecallMarkGoodResult({ model });
                    logFeedbackEvent({
                      action: "mark_good",
                      query,
                      score: model.score,
                      stackId: recallStackId,
                      sentenceNumber: model.matchSentence,
                      contextUrl: tabInfo?.url,
                    });
                  }}
                  onMarkBadClick={() => {
                    // Delay to give menu a chance to clean up before we tear out the DOM
                    setTimeout(() => {
                      doRecallRemoveResult({ model });
                    }, 0);
                    logFeedbackEvent({
                      action: "mark_bad",
                      query,
                      score: model.score,
                      stackId: recallStackId,
                      sentenceNumber: model.matchSentence,
                      contextUrl: tabInfo?.url,
                    });
                  }}
                />
              );
            }}
          />
          <div className={styles.toastContainer}>
            <Toast.Viewport className={styles.toastViewport} />
            <KeepConfirmationToast ref={confirmationToastRef} />
          </div>
        </Toast.Provider>
      </div>
    </div>
  );
}

AuthenticatedUI.propTypes = {
  canAutoCollect: PropTypes.bool,
  canCollect: PropTypes.bool,
  doAnnotationsAddNoteCard: PropTypes.func.isRequired,
  doAnnotationsRemoveCard: PropTypes.func.isRequired,
  doAnnotationsUpdateNoteCard: PropTypes.func.isRequired,
  doAnnotationsUpdateNoteForCard: PropTypes.func.isRequired,
  error: PropTypes.string,
  isAutoCollecting: PropTypes.bool,
  isExpanded: PropTypes.bool.isRequired,
  isRemembered: PropTypes.bool,
  isSubscribed: PropTypes.bool,
  menuContainer: PropTypes.object,
  navTab: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onForgetVisit: PropTypes.func.isRequired,
  onLaunchApp: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  onNavTabChange: PropTypes.func.isRequired,
  onOptIn: PropTypes.func.isRequired,
  onOptOut: PropTypes.func.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  onShowAnnotations: PropTypes.func.isRequired,
  onSubmitVisit: PropTypes.func.isRequired,
  onSubscribe: PropTypes.func.isRequired,
  query: PropTypes.string,
  rememberedTimeAgo: PropTypes.string,
  status: PropTypes.string.isRequired,
  tabInfo: PropTypes.object.isRequired,
  username: PropTypes.string.isRequired,
};

export default AuthenticatedUI;

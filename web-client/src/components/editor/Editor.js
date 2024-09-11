import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect, useImperativeHandle } from "react";
import { shallow } from "zustand/shallow";
import { useParams, useHistory } from "react-router-dom";
import { makeRandomNumber, isValidIsoDate, onlyUnique, getMatchSentenceFromModel } from "js-shared-lib";
import { ParagraphMatch, QuotedTweetParagraphMatch } from "web-shared-lib";

import { useStore } from "../../store";
import { DEBUG } from "../../config";
import { CANVAS_GRID_SIZE, DEFAULT_EDITOR_LAYOUT } from "../../config";
import SelectionUtil from "../../utils/selectionUtil";
import SpatialIndex from "../../utils/spatialIndex";
import { useQuery, useHash } from "../../utils/router";
import {
  buildEditorBasePath,
  buildExpandedCardUrl as _buildExpandedCardUrl,
  buildExpandedStackUrl as _buildExpandedStackUrl,
} from "../../utils/path";
import { snapToGrid } from "../../utils/grid";

import { extractTitle, serializeText } from "../../libs/documentLib";
import { events, sources, analyticsService } from "../../libs/analyticsLib";
import { useKeyState, KeyStateLayer } from "../../libs/useKeyState";
import { useDeferredQueue, useEffectOnce, usePrevious } from "../../libs/hooksLib";
import { extensionId } from "../../libs/chromeExtensionLib";
import apiLib from "../../libs/apiLib";
const { USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS } = apiLib;

import FullPageLoadingIndicator from "../common/full-page-loading-indicator";
import RenameIdeaDialog from "../common/rename-idea-dialog";

import {
  NoteCard,
  IdeaNoteKeptCard,
  GoogleScreenshotKeptCard,
  TweetKeptCard,
  YouTubeKeptCard,
  ArticleKeptCard,
  PDFKeptCard,
} from "./Card";
import CardStacks from "./CardStack";
import RTE, { withLayout } from "./RTE";
import TopToolbar from "./TopToolbar";
import CardsToolbar from "./CardsToolbar";
import EditorLayout from "./EditorLayout";
import Canvas from "./Canvas";

import styles from "./Editor.module.css";

const MIN_SPLIT_LAYOUT_COL_WIDTH = 450;
const LANDING_PAD_RECT = {
  x: 0,
  y: 0,
  width: 704,
  height: 424,
};

const selector = (state) => ({
  doArtifactLoad: state.doArtifactLoad,
  doDocumentAddNoteCard: state.doDocumentAddNoteCard,
  doDocumentCardMarkReasonKept: state.doDocumentCardMarkReasonKept,
  doDocumentCopyCards: state.doDocumentCopyCards,
  doDocumentCutCards: state.doDocumentCutCards,
  doDocumentJoinSelectedCards: state.doDocumentJoinSelectedCards,
  doDocumentLoad: state.doDocumentLoad,
  doDocumentPasteCards: state.doDocumentPasteCards,
  doDocumentRedo: state.doDocumentRedo,
  doDocumentRemoveCards: state.doDocumentRemoveCards,
  doDocumentRename: state.doDocumentRename,
  doDocumentRepositionCards: state.doDocumentRepositionCards,
  doDocumentSeparateCard: state.doDocumentSeparateCard,
  doDocumentUndo: state.doDocumentUndo,
  doDocumentUndoClear: state.doDocumentUndoClear,
  doDocumentUpdate: state.doDocumentUpdate,
  doDocumentUpdateCamera: state.doDocumentUpdateCamera,
  doDocumentUpdateCard: state.doDocumentUpdateCard,
  doDocumentUpdateLayout: state.doDocumentUpdateLayout,
  doQueryStackLoad: state.doQueryStackLoad,
  doRecallOpen: state.doRecallOpen,
  doSetAccountSetting: state.doSetAccountSetting,
  hasDismissedDraftPlaygroundPrompts: !!state.user.accountSettings[USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS],
  hasLoaded: state.documents.status === "success",
  splitLayoutWidthPref: state.prefs.splitLayoutWidth, // legacy
  doDocumentBeginUndoCapture: state.doDocumentBeginUndoCapture,
  doDocumentEndUndoCapture: state.doDocumentEndUndoCapture,
});

const emptyArray = Object.freeze([]); // Avoid invalidating callbacks by using a stable empty array
const countWords = (text) => {
  const _text = text?.trim();
  if (!_text || _text.length === 0) {
    return 0;
  }
  return _text.split(/\s+/).length;
};
const countCharacters = (text) => text?.length || 0;

function renderCard({
  buildContextUrls,
  buildHandleCardExpand,
  buildHandleSelectCardStack,
  buildOnAltEnterKeyDown,
  childCards,
  documentId,
  handleCardSelect,
  handleGenerate,
  handleSetReason,
  handleSetValue,
  hasMultipleSelection,
  isEmbedded,
  isSelected,
  isShuffleMode,
  model,
  onReposition,
  ref,
  selectionUtil,
  setIsShuffleMode,
  spatialIndex,
  zIndex,
}) {
  const onClick = handleCardSelect.bind(null, model);
  switch (model.type) {
    case "kept": {
      const onGenerate = handleGenerate.bind(null, documentId, sources.PLAYGROUND_CARD, buildContextUrls(model));
      const onSetReason = handleSetReason.bind(null, documentId, model);

      return (
        <KeptCardForModel
          ref={ref}
          key={model.id}
          documentId={documentId}
          isEmbedded={isEmbedded}
          isOnCanvas={!isEmbedded}
          isShuffleMode={isShuffleMode}
          isSelected={isSelected}
          model={model}
          onClick={onClick}
          onExpand={buildHandleCardExpand({
            eventSource: sources.PLAYGROUND_KEYBOARD,
          })}
          onExpandClick={buildHandleCardExpand({
            card: model,
            eventSource: sources.PLAYGROUND_CARD,
          })}
          onReposition={onReposition}
          onSelectCardStack={buildHandleSelectCardStack({ card: model })}
          onSetReason={onSetReason}
          onGenerate={onGenerate}
          spatialIndex={spatialIndex}
          selectionUtil={selectionUtil}
          zIndex={zIndex}
        />
      );
    }
    case "note": {
      const onGenerate = handleGenerate.bind(null, documentId, sources.PLAYGROUND_NOTE_CARD, buildContextUrls(model));
      // HACK - instead of this we want to deselect the other cards on focus if hasMultipleSelection
      const setValue = hasMultipleSelection ? null : handleSetValue.bind(null, documentId, model);

      return (
        <NoteCardForModel
          ref={ref}
          key={model.id}
          isOnCanvas={true}
          isSelected={isSelected}
          isShuffleMode={isShuffleMode}
          // RTE captures Alt key so the event never makes it to the Editor
          // We manually forward the event so we can easily grab focused note cards
          forwardShuffleModeEvent={(down) => setIsShuffleMode(down)}
          model={model}
          onClick={onClick}
          onGenerate={onGenerate}
          onReposition={onReposition}
          onSelectCardStack={buildHandleSelectCardStack({ card: model })}
          setValue={setValue}
          zIndex={zIndex}
          spatialIndex={spatialIndex}
          selectionUtil={selectionUtil}
          onAltEnterKeyDown={buildOnAltEnterKeyDown({ card: model, eventSource: sources.PLAYGROUND_CARD })}
        >
          {childCards}
        </NoteCardForModel>
      );
    }
    default:
      return null;
  }
}

export const KeptCardForModel = React.forwardRef(
  (
    {
      documentId,
      isEmbedded,
      isOnCanvas,
      isSelected,
      isShuffleMode,
      model,
      onClick,
      onExpand,
      onExpandClick,
      onGenerate,
      onReposition,
      onSetReason,
      spatialIndex,
      zIndex,
      ...rest
    },
    ref
  ) => {
    const baseProps = {
      ref,
      id: model.id,
      href: model.url,
      isSelected,
      isOnCanvas,
      isEmbedded,
      isShuffleMode,
      reason: model.reason || null,
      onClick,
      onExpand,
      onExpandClick,
      onReadMore: () =>
        analyticsService.logEvent(
          events.documentExternalArtifactOpened({
            documentId,
            source: isOnCanvas ? sources.PLAYGROUND_CARD : sources.EDITOR_CARD,
          })
        ),
      onReposition: isOnCanvas ? onReposition : undefined,
      onSetReason,
      onGenerate,
      position: isOnCanvas ? model.position : undefined,
      spatialIndex,
      zIndex: isOnCanvas ? zIndex : undefined,
      ...rest,
    };

    if (model.artifactType === "recollect-note") {
      return (
        <IdeaNoteKeptCard model={model} {...baseProps}>
          <ParagraphMatch sentences={model.sentences} matchSentences={model.matchSentences} />
        </IdeaNoteKeptCard>
      );
    } else if (model.artifactType === "google-drive-screenshot") {
      return <GoogleScreenshotKeptCard model={model} {...baseProps} />;
    } else if (model.artifactType === "tweet-thread") {
      const tweet = model.tweets[model.matchTweetIndex];
      return (
        <TweetKeptCard
          model={model}
          tweet={tweet}
          textFragment={tweet.sentences.find((s) => s.sentenceNumber === model.matchSentence)?.text}
          {...baseProps}
        >
          <ParagraphMatch sentences={tweet.sentences} matchSentences={model.matchSentences} />
          {!!tweet.quotesTweet && (
            <QuotedTweetParagraphMatch
              sentences={tweet.quotesTweet.sentences}
              userName={tweet.quotesTweet.userName}
              matchSentences={model.matchSentences}
            />
          )}
        </TweetKeptCard>
      );
    } else if (model.artifactType === "youtube-video-transcript") {
      return (
        <YouTubeKeptCard model={model} {...baseProps}>
          <ParagraphMatch sentences={model.sentences} matchSentences={model.matchSentences} />
        </YouTubeKeptCard>
      );
    } else if (model.artifactType === "pdf") {
      return (
        <PDFKeptCard model={model} {...baseProps}>
          <ParagraphMatch sentences={model.sentences} matchSentences={model.matchSentences} />
        </PDFKeptCard>
      );
    }

    return (
      <ArticleKeptCard model={model} {...baseProps}>
        <ParagraphMatch sentences={model.sentences} matchSentences={model.matchSentences} />
      </ArticleKeptCard>
    );
  }
);

export const NoteCardForModel = React.forwardRef(
  (
    {
      children,
      isOnCanvas,
      isSelected,
      isShuffleMode,
      forwardShuffleModeEvent,
      model,
      onClick,
      onGenerate,
      onReposition,
      setValue,
      spatialIndex,
      zIndex,
      ...rest
    },
    ref
  ) => {
    return (
      <NoteCard
        ref={ref}
        id={model.id}
        isOnCanvas={isOnCanvas}
        isShuffleMode={isShuffleMode}
        forwardShuffleModeEvent={forwardShuffleModeEvent}
        isSelected={isSelected}
        onClick={onClick}
        onGenerate={onGenerate}
        onReposition={isOnCanvas ? onReposition : undefined}
        position={isOnCanvas ? model.position : undefined}
        setValue={setValue}
        spatialIndex={spatialIndex}
        value={model.body}
        zIndex={isOnCanvas ? zIndex : undefined}
        {...rest}
      >
        {children}
      </NoteCard>
    );
  }
);

const buildExpandedCardUrl = ({ documentId, artifactId, sentence, layout, page }) => {
  const basePath = buildEditorBasePath({ documentId, layout });
  return _buildExpandedCardUrl({ basePath, artifactId, sentence, page });
};
const buildExpandedStackUrl = ({ documentId, artifactId, sentence, stackId, layout, page }) => {
  const basePath = buildEditorBasePath({ documentId, layout });
  return _buildExpandedStackUrl({ basePath, artifactId, sentence, stackId, page });
};
const buildEditorUrl = ({ documentId, layout, card }) => {
  const base = `/${layout}/${documentId}`;
  if (card) {
    return `${base}#card=${card}`;
  }
  return base;
};

const Editor = React.forwardRef(({ layout = DEFAULT_EDITOR_LAYOUT }, ref) => {
  const { id } = useParams();
  const routerQuery = useQuery();
  const routerHash = useHash();
  const artifactId = routerQuery.get("artifact");
  const linkedToCardId = routerHash.get("card");
  const prevLinkedToCardId = usePrevious(linkedToCardId);

  const history = useHistory();

  const {
    doArtifactLoad,
    doDocumentAddNoteCard,
    doDocumentCardMarkReasonKept,
    doDocumentCopyCards,
    doDocumentCutCards,
    doDocumentJoinSelectedCards,
    doDocumentLoad,
    doDocumentPasteCards,
    doDocumentRedo,
    doDocumentRemoveCards,
    doDocumentRename,
    doDocumentRepositionCards,
    doDocumentSeparateCard,
    doDocumentUndo,
    doDocumentUndoClear,
    doDocumentUpdate,
    doDocumentUpdateCamera,
    doDocumentUpdateCard,
    doDocumentUpdateLayout,
    doQueryStackLoad,
    doRecallOpen,
    doSetAccountSetting,
    hasDismissedDraftPlaygroundPrompts,
    hasLoaded,
    splitLayoutWidthPref,
    doDocumentBeginUndoCapture,
    doDocumentEndUndoCapture,
  } = useStore(selector, shallow);

  useEffectOnce(() => {
    // We share undo stacks between documents:
    doDocumentUndoClear();
  });

  useEffectOnce(() => {
    doDocumentLoad({ id });
  }, []);

  const document = useStore(useCallback((state) => state.documents.index.find((doc) => doc.documentId === id), [id]));
  const prevDocumentBody = usePrevious(document?.body);
  const expectedEditRef = useRef(false);
  const editorLayoutRef = useRef(null);
  const cardRefs = useRef([]);
  const editorRef = useRef(null);
  const cardStacksRef = useRef(null);
  const canvasRef = useRef(null);
  const title = extractTitle({ body: document?.body });
  const isDraftTitle = useMemo(() => title?.length && isValidIsoDate(title), [title]);
  const documentBodyText = useMemo(() => serializeText({ body: document.body }), [document]);
  const [isRenaming, setIsRenaming] = useState(false);

  // Bring up rename dialog if we find a #rename in the url
  const shouldPromptRename = routerHash.get("rename") !== null;
  useEffectOnce(() => {
    if (shouldPromptRename) {
      setIsRenaming(true);
    }
  }, []);
  const onRenameDialogDismissed = () => {
    if (shouldPromptRename) {
      // Strip #rename hash from url
      history.replace(window.location.pathname + window.location.search);
    }
  };

  const documentBody = document.body;

  useLayoutEffect(() => {
    if (expectedEditRef.current) {
      // Reset flag, otherwise noop
      expectedEditRef.current = false;
    } else if (prevDocumentBody && documentBody !== prevDocumentBody) {
      // Reset editor to match unexpected new value
      if (DEBUG) {
        console.warn("[WARN] Unexpected document value reset RTE", documentBody);
      }
      editorRef.current.reset(documentBody);
    }
  }, [documentBody, prevDocumentBody]);

  // Canvas spatial index
  const spatialIndexRef = useRef(new SpatialIndex({ gridSize: CANVAS_GRID_SIZE }));

  // Layout
  const isSplitPlayground = layout === "split";
  const isPlayground = isSplitPlayground || layout === "play";
  useEffect(() => {
    if (layout === null) {
      const _layout = linkedToCardId ? "play" : document.layout || DEFAULT_EDITOR_LAYOUT;
      history.replace(buildEditorUrl({ documentId: id, layout: _layout, card: linkedToCardId }));
    }
  }, [id, layout, document, history, linkedToCardId]);

  const kept = document?.cards || emptyArray;
  const topLevelKept = kept.filter((card) => !card.parentId);

  const scrollIntoView = useCallback((cardId) => {
    const rect = spatialIndexRef.current.getRect(cardId);
    if (rect) {
      canvasRef.current.panRectIntoView(rect);
    }
  }, []);

  const navigateToArtifact = useCallback(
    ({ documentId, stackId, model, eventSource }) => {
      if (model.artifactType === "recollect-note") {
        doArtifactLoad({
          id: model.artifactId,
          artifactType: model.artifactType,
          title: model.title,
          url: model.url,
          sentences: model.sentences,
        });
      } else if (model.artifactType === "tweet-thread") {
        doArtifactLoad({
          id: model.artifactId,
          artifactType: model.artifactType,
          title: model.title,
          url: model.url,
          tweets: model.tweets,
        });
      } else {
        doArtifactLoad({
          id: model.artifactId,
          artifactType: model.artifactType,
          title: model.title,
          url: model.url,
          sentences: model.sentences,
        });
      }

      let url;
      if (stackId) {
        url = buildExpandedStackUrl({
          documentId,
          artifactId: model.artifactId,
          sentence: getMatchSentenceFromModel({ model }),
          stackId,
          layout,
          ...(model.page ? { page: model.page } : {}),
        });
      } else {
        url = buildExpandedCardUrl({
          documentId,
          artifactId: model.artifactId,
          sentence: getMatchSentenceFromModel({ model }),
          layout,
          ...(model.page ? { page: model.page } : {}),
        });
      }

      history.push(url);

      analyticsService.logEvent(
        events.documentCardExpanded({
          documentId,
          source: eventSource || sources.PLAYGROUND,
        })
      );
    },
    [doArtifactLoad, history, layout]
  );

  // Track mount state
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Editor selection state:
  const [selectionState, setSelectionState] = useState({ selected: [], start: null });
  const defer = useDeferredQueue();

  const selectionUtil = useMemo(
    () =>
      new SelectionUtil({
        spatialIndex: spatialIndexRef.current,
        selected: selectionState.selected,
        start: selectionState.start,
        commit: (value, scrollTo) => {
          if (!mountedRef.current) {
            return;
          }
          setSelectionState(value);
          if (scrollTo) {
            defer(() => {
              // https://webplatform.news/issues/2019-04-19
              // https://caniuse.com/mdn-api_htmlelement_focus_preventscroll_option
              // TODO Safari fix: https://stackoverflow.com/a/53242076
              cardRefs.current[scrollTo]?.focus({ preventScroll: true });
              scrollIntoView(scrollTo);
            });
          }
        },
      }),
    [selectionState, defer, scrollIntoView]
  );
  const selectedCardIds = selectionState.selected;

  // Scroll card hash into
  useEffect(() => {
    if (hasLoaded && linkedToCardId && prevLinkedToCardId !== linkedToCardId) {
      defer(() => {
        // Initial render timing is tricky, let's wait until the browser is idle to attempt:
        requestIdleCallback(() => {
          selectionUtil.set(linkedToCardId);
          scrollIntoView(linkedToCardId);
        });
      });
    }
  }, [defer, hasLoaded, linkedToCardId, prevLinkedToCardId, scrollIntoView, selectionUtil]);

  const selectedNoteCard =
    selectionUtil.hasSelection() && selectionUtil.hasSingleSelection()
      ? kept.filter((k) => selectionUtil.isSelected(k.id) && k.type === "note")[0] || null
      : null;
  const selectedNoteCardText = useMemo(
    () => (selectedNoteCard ? serializeText({ body: selectedNoteCard.body }) : null),
    [selectedNoteCard]
  );

  const removeSelectedCards = useCallback(
    ({ eventSource }) => {
      // Fill any gaps - restack all stacks impacted by removal of selected cards
      const positionMap = {};
      const spatialIndex = spatialIndexRef.current;
      const stackIndexes = selectedCardIds
        .map((id) => spatialIndex.rectIdToStackIndexMap[id])
        .filter(Number.isFinite)
        .filter(onlyUnique);
      stackIndexes.forEach((stackIndex) => {
        const stackedIds = spatialIndex.stacks[stackIndex];
        const stackRect = spatialIndex.getCommonRect(stackedIds);
        const remainingStackedIds = stackedIds.filter((id) => !selectedCardIds.includes(id));
        const rectsRestacked = spatialIndex.getRestackedRectsForIds({
          startPoint: { x: stackRect.x, y: stackRect.y },
          ids: remainingStackedIds,
        });
        rectsRestacked.forEach((pos, index) => {
          const cardId = remainingStackedIds[index];
          const curPos = spatialIndex.getPoint(cardId);
          if (curPos.x !== pos.x || curPos.y !== pos.y) {
            positionMap[cardId] = pos;
          }
        });
      });

      // We have to do this in one undo block so it can be reverted in lock step:
      doDocumentBeginUndoCapture();
      doDocumentRemoveCards({ id, selectedCardIds, source: eventSource });
      doDocumentRepositionCards({ id, positionMap });
      doDocumentEndUndoCapture();

      selectionUtil.clear();
    },
    [
      id,
      selectedCardIds,
      doDocumentRemoveCards,
      doDocumentRepositionCards,
      selectionUtil,
      doDocumentBeginUndoCapture,
      doDocumentEndUndoCapture,
    ]
  );

  // A sad-side-effect of the design is that it takes 2 frames for the updated note
  // card position to get into the spatial index when created. This totally messes
  // with the undo system as we generally want these complex insertions to be one
  // undo step. To sidestep the issue we hardcode the new card heights based on what
  // we know it should be. This works OK for now but in the future it might be worth
  // optimistically mutating the spatial index and not rely on dim-capture.
  const BLANK_NOTE_CARD_HEIGHT = 40;
  const PARENT_BLANK_NOTE_CARD_HEIGHT = BLANK_NOTE_CARD_HEIGHT + CANVAS_GRID_SIZE * 2;
  const doAddNoteCard = useCallback(
    ({ toId, position, eventSource }) => {
      let newCard;

      const selectedCards = selectionUtil.getSelected();
      const selectedCardId = toId || selectedCards[0];
      const selectedCard = kept.find((card) => card.id === selectedCardId);

      // 1. If we don't have any cards selected
      if (!selectedCard) {
        // - Add note card
        newCard = doDocumentAddNoteCard({
          id,
          position: position || getNextKeepPosition(),
          source: eventSource,
        });
      } else {
        const spatialIndex = spatialIndexRef.current;
        const stackIndex = spatialIndex.rectIdToStackIndexMap[selectedCard.id];

        // 2. Otherwise, pick first selected card (or accept a cardId)
        doDocumentBeginUndoCapture();
        const positionMap = {};
        if (selectedCard.type === "note") {
          // a. If selected card is a note card
          // - add a new note card under selected card
          const selectedRect = spatialIndex.getRect(selectedCard.id);
          newCard = doDocumentAddNoteCard({
            id,
            position: { x: selectedRect.x, y: selectedRect.y + selectedRect.height + CANVAS_GRID_SIZE },
            source: eventSource,
          });
          if (Number.isFinite(stackIndex)) {
            // If we have an existing stack, make room for new card
            const stackedIds = spatialIndex.stacks[stackIndex];
            const selectedIndex = stackedIds.indexOf(selectedCard.id);
            const shiftedIds = stackedIds.slice(selectedIndex + 1);
            shiftedIds.forEach((cardId) => {
              const pos = spatialIndex.getPoint(cardId);
              positionMap[cardId] = { ...pos, y: pos.y + BLANK_NOTE_CARD_HEIGHT + CANVAS_GRID_SIZE };
            });
          }
        } else {
          // b. Otherwise, if we don't already have a parent card
          if (!selectedCard.parentId) {
            // - add note to card
            newCard = doDocumentAddNoteCard({
              id,
              toCardId: selectedCard.id,
              position: selectedCard.position,
              source: eventSource,
            });
            if (Number.isFinite(stackIndex)) {
              // If we have an existing stack, make room for new card
              const stackedIds = spatialIndex.stacks[stackIndex];
              const selectedIndex = stackedIds.indexOf(selectedCard.id);
              const shiftedIds = stackedIds.slice(selectedIndex + 1);
              shiftedIds.forEach((cardId) => {
                const pos = spatialIndex.getPoint(cardId);
                positionMap[cardId] = { ...pos, y: pos.y + PARENT_BLANK_NOTE_CARD_HEIGHT + CANVAS_GRID_SIZE };
              });
            }
          }
          // Commit reposition if we have any
          if (Object.keys(positionMap).length) {
            doDocumentRepositionCards({ id, positionMap });
          }
          doDocumentEndUndoCapture();
        }
      }

      if (newCard) {
        defer(() => {
          // Select new note card and switch focus to it
          // Don't bring into view if we know the starting point is visible:
          selectionUtil.set(newCard.id, position || toId ? false : true);
          cardRefs.current[newCard.id]?.focusEditor(true);
        });
      }
    },
    [
      kept,
      selectionUtil,
      doDocumentAddNoteCard,
      id,
      defer,
      getNextKeepPosition,
      doDocumentBeginUndoCapture,
      doDocumentEndUndoCapture,
      doDocumentRepositionCards,
      PARENT_BLANK_NOTE_CARD_HEIGHT,
    ]
  );

  const joinSelectedCards = useCallback(
    ({ eventSource }) => {
      // Pick the first selected stand-alone query card off the stack:
      const _card = kept.filter((k) => selectionUtil.isSelected(k.id) && k.type === "kept" && !k.parentId)[0];
      // Pick the first note card that doesn't have any cards linked to it:
      const hasChildren = (_id) => !!kept.find((k) => k.parentId === _id);
      const _noteCard = kept.filter(
        (k) => selectionUtil.isSelected(k.id) && k.type === "note" && !hasChildren(k.id)
      )[0];
      if (_card && _noteCard) {
        // Parent card
        doDocumentJoinSelectedCards({ id, cardId: _card.id, parentId: _noteCard.id, source: eventSource });
        selectionUtil.set(_noteCard.id);
        defer(() => {
          cardRefs.current[_noteCard.id]?.focusEditor(true);
        });
      }
    },
    [id, kept, selectionUtil, doDocumentJoinSelectedCards, defer]
  );

  const separateSelectedCardFromNote = useCallback(
    ({ eventSource }) => {
      // Pick the first selected connected query card off the stack:
      let _card = kept.find((k) => selectionUtil.isSelected(k.id) && k.type === "kept" && !!k.parentId);
      // If not, pick the first connected note off the stack:
      if (!_card) {
        const parentIds = kept.map((k) => k.parentId).filter(Boolean);
        const _noteCard = kept.find(
          (k) => selectionUtil.isSelected(k.id) && k.type === "note" && parentIds.includes(k.id)
        );
        if (_noteCard) {
          _card = kept.find((k) => k.parentId === _noteCard.id);
        }
      }
      if (_card) {
        doDocumentSeparateCard({
          id,
          cardId: _card.id,
          source: eventSource,
        });
      }
    },
    [id, kept, selectionUtil, doDocumentSeparateCard]
  );

  const _isEditingCards = selectionUtil.hasSelection();
  const {
    downArrowKey,
    keyStateQuery: keyQuery, // capture keyQuery here before other key state hooks run (since it captures)
    plusKey,
    selectAllKey,
    undoKey,
    upArrowKey,
    cutKey,
    copyKey,
    pasteKey,
    shuffleKey,
  } = useKeyState(
    {
      upArrowKey: _isEditingCards ? "up" : "",
      downArrowKey: _isEditingCards ? "down" : "",
      undoKey: ["meta+z", "ctrl+z"],
      selectAllKey: ["meta+a", "ctrl+a"],
      plusKey: "plus",
      cutKey: _isEditingCards ? ["meta+x", "ctrl+x"] : "",
      copyKey: _isEditingCards ? ["meta+c", "ctrl+c"] : "",
      pasteKey: ["meta+v", "ctrl+v"],
      shuffleKey: "option",
    },
    {
      ignoreRepeatEvents: true,
      captureEvents: window.getSelection().isCollapsed,
    }
  );

  const { escKey } = useKeyState(
    {
      escKey: _isEditingCards ? "esc" : "",
    },
    {
      captureEvents: _isEditingCards && !artifactId,
    }
  );

  const { deleteKey, minusKey } = useKeyState(
    {
      deleteKey: _isEditingCards ? "delete" : "",
      minusKey: _isEditingCards ? "minus" : "",
    },
    {
      captureEvents: _isEditingCards,
    }
  );

  const camera = document.camera;

  useEffectOnce(() => {
    if (camera.x === 0 && camera.y === 0 && camera.z === 1) {
      canvasRef.current.panRectIntoView(LANDING_PAD_RECT);
    }
  });

  const [isShuffleMode, setIsShuffleMode] = useState(false);

  useEffect(() => {
    const _up = upArrowKey.down;
    const _down = downArrowKey.down;
    const _shiftKeyPressed = keyQuery.shift();
    const _metaKeyPressed = keyQuery.meta();
    const _ctrlKeyPressed = keyQuery.ctrl();
    const _optKeypressed = keyQuery.option();
    const _metaOrCtrlPressed = _metaKeyPressed || _ctrlKeyPressed;

    if (shuffleKey.pressed && !isShuffleMode) {
      setIsShuffleMode(true);
    } else if (shuffleKey.up && isShuffleMode) {
      setIsShuffleMode(false);
    } else if (copyKey.down) {
      // Ignore if we have selected text
      if (!window.getSelection().isCollapsed) return;

      // Ignore if we don't have any cards selected
      if (!selectionUtil.hasSelection()) return;

      // Build spatial map
      const spatialIndex = spatialIndexRef.current;
      const rectMap = {};
      for (let i = 0; i < selectedCardIds.length; i++) {
        const cardId = selectedCardIds[i];
        rectMap[cardId] = spatialIndex.getRect(cardId);
      }

      doDocumentCopyCards({ id, selectedCardIds, rectMap, source: sources.EDITOR_KEYBOARD });
    } else if (cutKey.down) {
      if (!selectionUtil.hasSelection()) return;

      // Build spatial map
      const spatialIndex = spatialIndexRef.current;
      const rectMap = {};
      for (let i = 0; i < selectedCardIds.length; i++) {
        const cardId = selectedCardIds[i];
        rectMap[cardId] = spatialIndex.getRect(cardId);
      }

      doDocumentCutCards({ id, selectedCardIds, rectMap, source: sources.EDITOR_KEYBOARD });
    } else if (pasteKey.down) {
      const viewportRect = canvasRef.current.getCanvasViewportRect();
      doDocumentPasteCards({ id, viewportRect, source: sources.EDITOR_KEYBOARD }).then(
        ({ selectedCardIds: newCardIds, bounds: centeredBounds }) => {
          if (newCardIds.length) {
            selectionUtil.setMultiple(newCardIds);
          }
          // Zoom out to fit bounds
          canvasRef.current.zoomToFit(centeredBounds);
        }
      );
    } else if (undoKey.down) {
      if (_shiftKeyPressed) {
        doDocumentRedo({ id, source: isPlayground ? sources.PLAYGROUND_KEYBOARD : sources.EDITOR_KEYBOARD });
      } else {
        doDocumentUndo({ id, source: isPlayground ? sources.PLAYGROUND_KEYBOARD : sources.EDITOR_KEYBOARD });
      }
    } else if (_up || _down) {
      if (_shiftKeyPressed) {
        if (_up) {
          selectionUtil.expandUp(true);
        } else {
          selectionUtil.expandDown(true);
        }
      } else if (_optKeypressed) {
        if (_up) {
          selectionUtil.jumpToTop(true);
        } else {
          selectionUtil.jumpToBottom(true);
        }
      } else {
        if (_up) {
          selectionUtil.moveUp(true);
        } else {
          selectionUtil.moveDown(true);
        }
      }
    } else if (escKey.down) {
      selectionUtil.clear();
    } else if (selectAllKey.down) {
      selectionUtil.all(true);
    } else if (deleteKey.down) {
      if (selectionUtil.hasSelection()) {
        removeSelectedCards({ eventSource: sources.PLAYGROUND_KEYBOARD });
      }
    } else if (plusKey.down && !_metaOrCtrlPressed) {
      if (selectionUtil.hasMultipleSelection()) {
        joinSelectedCards({ eventSource: sources.PLAYGROUND_KEYBOARD });
      } else {
        doAddNoteCard({ eventSource: sources.PLAYGROUND_KEYBOARD });
      }
    } else if (minusKey.down) {
      separateSelectedCardFromNote({
        eventSource: sources.PLAYGROUND_KEYBOARD,
      });
    }
  }, [
    doAddNoteCard,
    copyKey,
    cutKey,
    defer,
    deleteKey,
    doDocumentCopyCards,
    doDocumentCutCards,
    doDocumentPasteCards,
    doDocumentRedo,
    doDocumentRepositionCards,
    doDocumentUndo,
    downArrowKey,
    escKey,
    id,
    isPlayground,
    isShuffleMode,
    joinSelectedCards,
    kept,
    keyQuery,
    minusKey,
    pasteKey,
    plusKey,
    removeSelectedCards,
    selectAllKey,
    selectedCardIds,
    selectionUtil,
    separateSelectedCardFromNote,
    setIsShuffleMode,
    shuffleKey,
    undoKey,
    upArrowKey,
  ]);

  // Reset shuffle mode when window loses focus so it doesn't end up "stuck"
  useEffect(() => {
    const cb = () => {
      if (isShuffleMode) {
        setIsShuffleMode(false);
      }
    };
    window.document.addEventListener("blur", cb, true);
    return () => {
      window.document.removeEventListener("blur", cb, true);
    };
  }, [isShuffleMode, setIsShuffleMode]);

  useEffect(() => {
    if (hasLoaded && !document) {
      history.replace("/playgrounds");
    }
  }, [history, hasLoaded, document]);

  const handleReposition = useCallback(
    ({ dragSourceId, position, isFirst, isLast, isDragging, stackDropRepositionMap }) => {
      // This delegates drag events from the card itself so we can move the other selected cards
      // in sync. Which means this is the place where the DOM mutation happens to translate the cards

      const dragSourcePosition = spatialIndexRef.current.getPoint(dragSourceId);
      if (!dragSourcePosition) {
        return;
      }

      let hasMultipleSelection = selectionUtil.hasMultipleSelection();
      if (isDragging && !selectionUtil.hasSelection()) {
        // Select card when we start to drag
        selectionUtil.set(dragSourceId);
      } else if (selectionUtil.hasSelection() && !selectionUtil.isSelected(dragSourceId)) {
        // If dragged card is not selected, deselect selected cards:
        selectionUtil.clear();
        hasMultipleSelection = false;
      }

      const selectedIds = hasMultipleSelection ? selectionUtil.getSelected() : [dragSourceId];

      // Figure out if we need to reposition the stack
      const stackIndexes = selectedIds
        .map((cardId) => spatialIndexRef.current.rectIdToStackIndexMap[cardId])
        .filter(onlyUnique)
        .filter((index) => index !== undefined && index >= 0);

      if (stackIndexes?.length) {
        stackIndexes.forEach((stackIndex) => {
          const stackedIds = spatialIndexRef.current.stacks[stackIndex];
          const selectedStackedCards = selectedIds.filter((cardId) => stackedIds.includes(cardId));
          const isStackDragged = selectedStackedCards.length === stackedIds.length;
          if (isStackDragged) {
            const stackRect = spatialIndexRef.current.getCommonRect(stackedIds);
            const diffX = dragSourcePosition.x - stackRect.x;
            const diffY = dragSourcePosition.y - stackRect.y;
            cardStacksRef.current?.setPosition(stackIndex, {
              x: position.x - diffX,
              y: position.y - diffY,
            });
          }
        });
      }

      // Reposition the cards

      // This restack work is duplicated in spatialIndex getStackDropRepositionMap because
      // spatialIndex is one frame behind but it still needs to make room for these cards.
      // Otherwise we could include the selected cards positions inside dragRepositionMap
      // and that would be a lot cleaner...
      const selectedRectsRestacked = spatialIndexRef.current.getRestackedRectsForIds({
        startPoint: position,
        ids: selectedIds,
      });

      // TODO drop into different stack (needs increase height of stack)
      // TODO handle mixed selection where some are in stack and some outside
      // TODO I've also seen weird flicker whend dragging mixed selections that don't make sense

      // Commit reposition...
      if (isLast) {
        const positionMap = {};
        const selectedRectsRestackedMap = selectedIds.reduce((acc, cardId, index) => {
          return { ...acc, [cardId]: selectedRectsRestacked[index] };
        }, {});

        // Make sure everything we commit is snapped to grid
        const repositionedIds = [...selectedIds, ...Object.keys(stackDropRepositionMap)].filter(onlyUnique);
        repositionedIds.forEach((cardId) => {
          const stackDropPos = stackDropRepositionMap[cardId];
          const selectedDragPos = selectedRectsRestackedMap[cardId];
          let x, y;
          if (stackDropPos) {
            // If this card was part of the stack drop reposition map
            // use that position as final
            [x, y] = [stackDropPos.x, stackDropPos.y];
          } else if (selectedDragPos) {
            // Otherwise, drop to the nearest selectedRectsRestacked
            [x, y] = [selectedDragPos.x, selectedDragPos.y];
          } else {
            console.warn("handleReposition: could not map a final position for card", cardId);
          }
          const pos = {
            x: snapToGrid(x, CANVAS_GRID_SIZE),
            y: snapToGrid(y, CANVAS_GRID_SIZE),
          };
          // Only report position change if the position actually changed
          const curPos = spatialIndexRef.current.getPoint(cardId);
          if (curPos.x !== pos.x || curPos.y !== pos.y) {
            positionMap[cardId] = pos;
          }
          // Sync viewport
          cardRefs.current[cardId]?.setPosition(pos, true);
        });

        doDocumentRepositionCards({ id, positionMap });
      } else {
        // Reposition temporary drag state
        selectedIds.forEach((cardId, index) => {
          const rect = selectedRectsRestacked[index];
          if (rect) {
            // We set position directly on DOM until drag ends for performance reasons
            cardRefs.current[cardId]?.setPosition({ x: rect.x, y: rect.y }, isFirst);
          } else {
            console.warn("handleReposition: missing restacked rect for selected card id:", cardId);
          }
        });

        for (const cardId in stackDropRepositionMap) {
          if (!selectedIds.includes(cardId)) {
            const { x, y } = stackDropRepositionMap[cardId];
            cardRefs.current[cardId]?.setPosition({ x, y }, true);
          }
        }
      }
    },
    [id, doDocumentRepositionCards, selectionUtil]
  );

  const _handleSelectCardStack = useCallback(
    ({ sourceId }) => {
      const stackId = spatialIndexRef.current.rectIdToStackIndexMap[sourceId];
      const selectedIds = stackId !== undefined ? spatialIndexRef.current.stacks[stackId] : [];
      selectionUtil.setMultiple(selectedIds);
    },
    [selectionUtil]
  );

  const doUpdateCamera = useCallback((camera) => doDocumentUpdateCamera({ id, camera }), [id, doDocumentUpdateCamera]);

  // Center card in visible viewport with the caveat that we don't know how tall it is (assuming 300ish is safe)
  // We do currently know the width (496)
  const getNextKeepPosition = useCallback(() => {
    const viewport = canvasRef.current.getCanvasViewportRect();
    const position = {
      x: snapToGrid(viewport.x + viewport.width / 2 - makeRandomNumber(496 / 2 - 40, 496 / 2), CANVAS_GRID_SIZE),
      y: snapToGrid(viewport.y + viewport.height / 2 - makeRandomNumber(150 - 40, 150), CANVAS_GRID_SIZE),
    };
    return position;
  }, []);

  // Establish two-way communication channel with the extension
  useEffect(() => {
    if (!window.chrome?.runtime) {
      return;
    }
    // TODO move into store
    //  - handle re-connect
    //  - how to connect when the extension reloads? can it inject a special content script that triggers it?
    const port = window.chrome.runtime.connect(extensionId, { name: "web-client" });
    if (DEBUG) {
      console.log("[CHROME_RUNTIME_CONNECT] Connected");
    }
    port.onDisconnect.addListener(() => {
      if (window.chrome.runtime.lastError && DEBUG) {
        console.log("[CHROME_RUNTIME_CONNECT] Failed to connect:", window.chrome.runtime.lastError);
      }
    });
    port.onMessage.addListener((message) => {
      switch (message.action) {
        case "recall": {
          doRecallOpen({ isOpen: (prev) => !prev, eventSource: sources.EXTENSION });
          break;
        }
        default: {
          console.log(`[CHROME_RUNTIME_CONNECT] Unexpected message action: ${message.action}`);
        }
      }
    });

    return () => {
      port.disconnect();
      if (DEBUG) {
        console.log("[CHROME_RUNTIME_CONNECT] Disconnected");
      }
    };
  }, [getNextKeepPosition, doRecallOpen]);

  const getPlaygroundUrl = useCallback(() => {
    return `https://app.re-collect.ai/idea/${id}`;
  }, [id]);
  // Stable reference for recall
  const buildContextUrls = useCallback(
    ({ id: cardId, type, url }) => {
      const playgroundUrl = getPlaygroundUrl();
      const contextUrls = [playgroundUrl];

      if (type === "kept") {
        contextUrls.push(url);
      } else if (type === "note") {
        contextUrls.push(`${playgroundUrl}#card=${cardId}`);
      }

      return contextUrls;
    },
    [getPlaygroundUrl]
  );

  // Imperative API
  useImperativeHandle(ref, () => ({
    selectionUtil,
    getNextKeepPosition,
    isPlayground: () => isPlayground,
  }));

  if (!hasLoaded || !document) {
    return <FullPageLoadingIndicator />;
  }

  // Fires on every card click
  const handleCardSelect = (card, event) => {
    event.stopPropagation();

    const isSelected = selectionUtil.isSelected(card.id);

    if (event.metaKey || event.shiftKey) {
      const isNoteCard = card.type === "note";
      const editorHasFocus = (isNoteCard && cardRefs.current[card.id]?.editorHasFocus()) || false;
      if (!editorHasFocus) {
        selectionUtil.toggle(card.id);
      }
    } else if (!isSelected) {
      selectionUtil.set(card.id);
    }
  };

  const buildHandleCardExpand = ({ card, eventSource }) => {
    return () => {
      let _card = card;
      if (!_card) {
        // Pick the first selected query card off the stack:
        _card = kept.filter((k) => selectionUtil.isSelected(k.id) && k.type === "kept")[0];
      }
      if (_card) {
        navigateToArtifact({ documentId: id, model: _card, eventSource });
      }
    };
  };

  const buildOnAltEnterKeyDown = ({ card, eventSource }) => {
    return () => {
      doAddNoteCard({ toId: card.id, eventSource });
    };
  };

  const buildHandleSelectCardStack = ({ card }) => {
    return () => {
      _handleSelectCardStack({ sourceId: card.id });
    };
  };

  const handleSetValue = (documentId, model, value) => {
    const startHeight = spatialIndexRef.current.getRect(model.id)?.height;

    doDocumentUpdateCard({ id: documentId, cardId: model.id, body: value, canUndo: true });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const endHeight = spatialIndexRef.current.getRect(model.id)?.height;
        const diffY = endHeight - startHeight;
        if (diffY) {
          const rectsToMove = spatialIndexRef.current.getStackedRects(model.id, diffY);

          if (!rectsToMove.length) {
            return;
          }

          const positionMap = {};
          rectsToMove.forEach((cardRect) => {
            positionMap[cardRect.id] = { x: cardRect.x, y: cardRect.y + diffY };
          });

          doDocumentRepositionCards({ id: documentId, positionMap });
        }
      });
    });
  };

  const handleSetReason = (documentId, model, reason) => {
    doDocumentCardMarkReasonKept({
      id: documentId,
      cardId: model.id,
      reason,
      source: sources.PLAYGROUND_CARD,
    });
  };

  const handleGenerate = (documentId, source, contextUrls, query) => {
    return doQueryStackLoad({ documentId, query, contextUrls, source });
  };

  const baseCardRenderProps = {
    doAddNoteCard,
    buildHandleCardExpand,
    buildContextUrls,
    onReposition: handleReposition,
    buildHandleSelectCardStack,
    documentId: id,
    handleCardSelect,
    handleGenerate,
    handleSetReason,
    handleSetValue,
    isShuffleMode,
    setIsShuffleMode,
    spatialIndex: spatialIndexRef.current,
    selectionUtil,
    buildOnAltEnterKeyDown,
  };

  const keptCards = topLevelKept.map((card) => {
    // const index = kept.findIndex((c) => c.id === card.id);
    const isSelected = selectedCardIds.includes(card.id);
    const spatialStackIndex = spatialIndexRef.current.rectIdToStackIndexMap[card.id];
    const spatialStack = spatialIndexRef.current.stacks[spatialStackIndex];
    // Keep selected cards (and their stack) above all other cards
    const isPartOfSelectedStack = isSelected || spatialStack?.some((cid) => selectedCardIds?.includes(cid));
    const zIndex = isSelected || isPartOfSelectedStack ? kept.length + (isSelected ? 2 : 1) : 1;

    return renderCard({
      ref: (element) => (cardRefs.current[card.id] = element),
      model: card,
      zIndex,
      isSelected: isSelected,
      ...baseCardRenderProps,
      childCards: kept
        .filter((childCard) => childCard.parentId === card.id)
        .map((childCard) =>
          renderCard({
            ref: (element) => (cardRefs.current[childCard.id] = element),
            model: childCard,
            isEmbedded: true,
            isSelected: selectedCardIds.includes(childCard.id),
            ...baseCardRenderProps,
          })
        ),
      hasMultipleSelection: selectionUtil.hasMultipleSelection(),
    });
  });
  const _layoutWidth = document.splitLayoutWidth || splitLayoutWidthPref;
  const splitLayoutWidth = _layoutWidth ? Math.max(MIN_SPLIT_LAYOUT_COL_WIDTH, _layoutWidth) : null;

  return (
    <KeyStateLayer>
      <EditorLayout
        ref={editorLayoutRef}
        documentId={id}
        cardCharacterCount={selectedNoteCardText ? countCharacters(selectedNoteCardText) : undefined}
        cardWordCount={selectedNoteCardText ? countWords(selectedNoteCardText) : undefined}
        editorCharacterCount={countCharacters(documentBodyText)}
        editorWordCount={countWords(documentBodyText)}
        zoom={Math.round(camera.z * 100)}
        canZoomOut={canvasRef.current?.canZoomOut()}
        canZoomIn={canvasRef.current?.canZoomIn()}
        doSetCanvasZoom={(value, zoomToFit, zoomIn, zoomOut) => {
          if (zoomToFit) {
            canvasRef.current.zoomToFit();
          } else if (zoomIn) {
            canvasRef.current.zoomIn();
          } else if (zoomOut) {
            canvasRef.current.zoomOut();
          } else if (value !== camera.z) {
            canvasRef.current.zoom(value);
          }
          analyticsService.logEvent(
            events.documentResetZoom({
              level: zoomToFit ? "fit" : value,
              source: sources.PLAYGROUND_TOOLBAR,
            })
          );
        }}
        layout={layout}
        splitLayoutMinWidth={MIN_SPLIT_LAYOUT_COL_WIDTH}
        splitLayoutWidth={splitLayoutWidth}
        onSetSplitLayoutWidth={(width) => doDocumentUpdateLayout({ id, splitLayoutWidth: width })}
        onSetLayout={(layout) => doDocumentUpdateLayout({ id, layout })}
        isEditingCards={_isEditingCards}
        toolbar={
          <TopToolbar
            documentTitle={title}
            isArchived={!!document.archivedAt}
            isDraftTitle={isDraftTitle}
            isTrashed={!!document.trashedAt}
            onRenameClick={() => setIsRenaming(true)}
          />
        }
        cardsToolbar={
          <CardsToolbar
            documentId={id}
            documentBody={document.body}
            keptCards={[...kept].sort((a, b) => {
              // Sort cards visually so they get exported in a predictable order
              if (a.id === b.parentId) return -1;
              if (b.id === a.parentId) return 1;
              const sortedIds = spatialIndexRef.current.getSortedIds();
              return sortedIds.indexOf(a.parentId || a.id) - sortedIds.indexOf(b.parentId || b.id);
            })}
            selectedCards={kept.filter((card) => selectionUtil.isSelected(card.id))}
            onRemoveClick={() => removeSelectedCards({ eventSource: sources.PLAYGROUND_TOOLBAR })}
            onExpandClick={buildHandleCardExpand({
              eventSource: sources.PLAYGROUND_TOOLBAR,
            })}
            onAddNoteClick={() => doAddNoteCard({ eventSource: sources.PLAYGROUND_TOOLBAR })}
            onSeparateClick={() =>
              separateSelectedCardFromNote({
                eventSource: sources.PLAYGROUND_TOOLBAR,
              })
            }
            onJoinClick={() => joinSelectedCards({ eventSource: sources.PLAYGROUND_TOOLBAR })}
            onTweetClick={() => {
              const selectedNoteCardId = selectionUtil.getSelected()[0];
              if (!selectedNoteCardId) {
                return;
              }

              const noteCard = kept.find((card) => card.id === selectedNoteCardId);
              try {
                const textValue = encodeURIComponent(serializeText(noteCard));
                window.open(`https://twitter.com/intent/tweet?text=${textValue}`, "_blank");
              } catch (error) {
                console.warn("[!] Failed to tweet note card", error);
              }

              analyticsService.logEvent(
                events.documentCardTweeted({
                  source: sources.EDITOR_TOOLBAR,
                })
              );
            }}
            onRenameClick={() => setIsRenaming(true)}
            isPlayground={isPlayground}
            isDraftTitle={isDraftTitle}
          />
        }
        editor={
          <div className={styles.editor}>
            <RTE
              autoFocus
              ref={editorRef}
              placeholder="Untitled"
              value={document.body}
              setValue={(value) => {
                // Mark edit as expected so we don't reset the RTE value
                expectedEditRef.current = true;
                doDocumentUpdate({ id, body: value });
              }}
              onGenerate={handleGenerate.bind(null, id, isPlayground ? sources.PLAYGROUND : sources.EDITOR, null)}
              withLayout={withLayout}
            />
          </div>
        }
        canvas={
          <Canvas
            ref={canvasRef}
            camera={camera}
            doUpdateCamera={doUpdateCamera}
            isShuffleMode={isShuffleMode}
            onClick={() => {
              // If event makes it here we want to deselect cards (click outside the cards)
              if (selectionUtil.hasSelection() && !canvasRef.current.isDragSelectMode()) {
                selectionUtil.clear();
              }
            }}
            onDoubleClick={(position) => {
              // Shouldn't be needed because the first click clears the selection but it seems to be happening sometimes
              if (selectionUtil.hasSelection()) {
                return;
              }
              doAddNoteCard({ position, eventSource: sources.PLAYGROUND_DOUBLE_CLICK });
            }}
            onRangeSelect={(selRect, shiftKey, metaKey) => {
              const selectedIds = spatialIndexRef.current.intersect(selRect);
              if (selectedIds.length) {
                if (shiftKey) {
                  selectionUtil.addMultiple(selectedIds);
                } else if (metaKey) {
                  selectionUtil.removeMultiple(selectedIds);
                } else {
                  selectionUtil.setMultiple(selectedIds);
                }
              } else if (!shiftKey && !metaKey && selectionUtil.hasSelection()) {
                selectionUtil.clear();
              }
            }}
            spatialIndex={spatialIndexRef.current}
          >
            {isPlayground ? keptCards : null}
            <CardStacks ref={cardStacksRef} spatialIndex={spatialIndexRef.current} />
          </Canvas>
        }
      />

      <RenameIdeaDialog
        container={editorLayoutRef.current}
        didAutoOpen={shouldPromptRename}
        isDraft={isDraftTitle}
        open={isRenaming}
        onOpenChange={(isOpen) => {
          setIsRenaming(isOpen);
          // Strip hash parameter
          onRenameDialogDismissed();
        }}
        onSkipAutoChange={() => {
          doSetAccountSetting({
            key: USER_SETTING_HAS_DISMISSED_DRAFT_PLAYGROUND_PROMPTS,
            value: !hasDismissedDraftPlaygroundPrompts,
          });
        }}
        initialTopic={title}
        onSubmit={({ topic }) => {
          doDocumentRename({ id, topic, source: sources.EDITOR });
          setIsRenaming(false);
          onRenameDialogDismissed();
        }}
        onCancel={() => {
          setIsRenaming(false);
          onRenameDialogDismissed();
        }}
        onClose
      />
    </KeyStateLayer>
  );
});

export default Editor;

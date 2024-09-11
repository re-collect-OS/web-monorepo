import { DEBUG } from "../config";

let undoStack = []; // { patches, inversePatches }
let undoStackPointer = -1;
let undoStackDeletedCardsMap = {};
let isCapturing = false;

const MAX_UNDO = 100;

if (DEBUG) {
  window.undoStackState = () => ({
    undoStack,
    undoStackPointer,
  });
}

export const hasUndoPatches = () => !isCapturing && undoStackPointer >= 0;

export const hasRedoPatches = () => !isCapturing && undoStackPointer < undoStack.length - 1;

function injectRestoredDirtyKeysPatches({ patches, dirtyKeys }) {
  // Extract the document index from the first patch:
  if (patches) {
    // Lazy way to get the document index from the patch itself (undo system doesn't have context)
    const index = patches[0]?.path[2];
    // Restore dirty keys for changeset
    if (Number.isInteger(index)) {
      dirtyKeys.forEach((key) => {
        patches.push({ op: "add", path: ["documents", "index", index, "dirtyKeys", 0], value: key });
      });
    } else {
      console.warn("getUndoPatches: could not extract document index from patches", patches);
    }
  }
}

export const getUndoPatches = ({ state }) => {
  if (!hasUndoPatches()) {
    return [];
  }

  const patches = undoStack[undoStackPointer];
  undoStackPointer--;
  const inversePatches = patches.inversePatches;
  // Keep track of deleted note cards in case we need to restore
  // Cards can be deleted in two ways:
  // - manually (handled by addPatchesToUndoStack)
  // - via undo / redo
  extractDeletedNoteCardsFromPatch({ patches: inversePatches, state });
  injectRestoredDirtyKeysPatches({ patches: inversePatches, dirtyKeys: patches.dirtyKeys });
  return inversePatches;
};

export const getRedoPatches = ({ state }) => {
  if (!hasRedoPatches()) {
    return [];
  }

  undoStackPointer++;
  const patches = undoStack[undoStackPointer];
  const forwardPatches = patches.patches;
  extractDeletedNoteCardsFromPatch({ patches: forwardPatches, state });
  injectRestoredDirtyKeysPatches({ patches: forwardPatches, dirtyKeys: patches.dirtyKeys });

  return forwardPatches;
};

const makeUndoEntry = ({ patches = [], inversePatches = [], dirtyKeys = [] } = {}) => ({
  patches,
  inversePatches,
  dirtyKeys,
});

const appendToUndoEntry = ({ entry, patches = [], inversePatches = [], dirtyKeys = [] }) => {
  if (!entry) {
    return;
  }

  entry.patches.push(...patches);
  entry.inversePatches.unshift(...inversePatches);
  entry.dirtyKeys.push(...dirtyKeys);
};

const hasPatches = (entry) => !!entry?.patches.length;

export const beginUndoCapture = () => {
  if (isCapturing) {
    return;
  }

  isCapturing = true;

  const pointer = ++undoStackPointer;
  undoStack[pointer] = makeUndoEntry();
};

export const endUndoCapture = () => {
  if (!isCapturing) {
    return;
  }

  if (!hasPatches(undoStack[undoStackPointer])) {
    // If we didn't push anything to the stack unwind the capture set
    if (undoStackPointer < 0) {
      // This should not happen..
      console.warn("[WARN] Unexpected negative undo stack pointer", undoStackPointer);
    }
    // Just in case, don't crash:
    undoStack.length = Math.max(0, undoStackPointer--);
  }

  isCapturing = false;
};

export const addPatchesToUndoStack = ({ patches, inversePatches, state, dirtyKeys }) => {
  const pointer = isCapturing ? undoStackPointer : ++undoStackPointer;

  // Clean up deleted cards when we "fork history":
  if (undoStack.length > pointer) {
    garbageCollectDeletedCardsMap({ undoStack });
  }

  // Filter out dirtyKeys changes and keep track of what keys we changed so we can restore the correct flags on undo
  const _patches = patches.filter((p) => !isDocumentDirtyPatch(p));
  const _inversePatches = inversePatches.filter((p) => !isDocumentDirtyPatch(p));

  if (isCapturing) {
    // Append patches to the last set
    const entry = undoStack[pointer];
    appendToUndoEntry({ entry, patches: _patches, inversePatches: _inversePatches, dirtyKeys });
  } else {
    undoStack.length = pointer;
    undoStack[pointer] = makeUndoEntry({
      patches: _patches,
      inversePatches: _inversePatches,
      dirtyKeys,
    });
  }
  // Keep track of deleted note cards in case we need to restore
  // Cards can be deleted in two ways:
  // - manually (handled by addPatchesToUndoStack)
  // - via undo / redo
  extractDeletedNoteCardsFromPatch({ patches, state });

  // Limit undo stack depth to MAX_UNDO
  var undoStackDepth = undoStack.length;
  if (undoStackDepth > MAX_UNDO) {
    const diff = undoStackDepth - MAX_UNDO;
    undoStackPointer -= diff;
    undoStack.splice(0, diff);
  }
};

export const clearUndoStack = () => {
  undoStack = [];
  undoStackPointer = -1;
  undoStackDeletedCardsMap = {};
};

const isDocumentDirtyPatch = (patch) => patch.path[patch.path.length - 2] === "dirtyKeys";
const isDocumentCardsPatch = (patch) => patch.path[patch.path.length - 1] === "cards";

const patchReferencesCardId = ({ patch, cardId }) => {
  if (!isDocumentCardsPatch(patch)) return false;

  return patch.value.findIndex((card) => card.id === cardId) >= 0;
};

const patchesReferenceCardId = ({ patches, cardId }) => {
  for (let i = 0; i < patches.length; i++) {
    if (patchReferencesCardId({ patch: patches[i], cardId })) {
      return true;
    }
  }
  return false;
};

export const garbageCollectDeletedCardsMap = ({ undoStack }) => {
  const garbage = [];
  for (let cardId in undoStackDeletedCardsMap) {
    for (let i = 0; i < undoStack.length; i++) {
      const undoEntry = undoStack[i];
      if (patchesReferenceCardId({ patches: [...undoEntry.patches, ...undoEntry.inversePatches], cardId })) {
        if (!garbage.includes(cardId)) {
          garbage.push(cardId);
        }
      }
    }
  }

  garbage.forEach((cardId) => {
    delete undoStackDeletedCardsMap[cardId];
  });
};

// Because note card edits don't go on the document undo stack (the RTEs have independent undo stacks),
// we can't trust the patches not to have stale data when undoing / redoing ops. So we attempt to sync
// the patches with the latest state.
// There is a special case when dealing with previously deleted cards as we don't have a reference in
// latest state. To deal with this we extract deleted cards and keep a copy of them in undoStackDeletedCardsMap
// for sync purposes.

// TODO think of alternative models
// For sanity reasons right now all ops on cards that don't go on the RTE stack goes on the document stack
// So it's not really a purely structural undo - which might be a feature or a bug.

export const extractDeletedNoteCardsFromPatch = ({ patches, state }) => {
  patches.forEach((patch) => {
    if (!isDocumentCardsPatch(patch)) return;

    const cards = state.documents.index[patch.path[2]].cards;

    if (patch.value.length >= cards.length) return;

    const deletedCards = cards.filter(
      (card) => card.type === "note" && patch.value.findIndex((patchCard) => patchCard.id === card.id) < 0
    );

    deletedCards.forEach((card) => {
      undoStackDeletedCardsMap[card.id] = card;
    });
  });
};

export const syncPatchesWithState = ({ patches, state }) => {
  if (!patches) return [];

  return patches.map((patch) => {
    if (isDocumentCardsPatch(patch)) {
      const cards = state.documents.index[patch.path[2]].cards;
      patch.value = patch.value.map((patchCard) => {
        if (patchCard.type !== "note") {
          return patchCard;
        }

        let card = cards.find((card) => card.id === patchCard.id);
        if (!card) {
          const deletedCard = undoStackDeletedCardsMap[patchCard.id];

          if (!deletedCard) return patchCard;

          card = deletedCard;

          // Clean up
          delete undoStackDeletedCardsMap[patchCard.id];
        }
        const { body, updatedAt } = card;

        return { ...patchCard, body, updatedAt };
      });
    }
    return patch;
  });
};

import { onlyUnique } from "js-shared-lib";

// Centralize card stack selection logic.
// Unorthodox commit pattern because we need to trigger react updates.
// Selection helper will be re-initialized on every relevant render.
//
// setter(value, shouldScrollTo) ~> commit(state, scrollToId)
//                               => scrollToId
export default class SelectionUtil {
  constructor({ spatialIndex, selected = [], start = null, commit = () => {} } = {}) {
    this.spatialIndex = spatialIndex;
    this.selectedElements = [...selected];
    this.start = start;
    this.commit = commit;
    // We'll cache this as we're not at this point handling updating the original inputs:
    this._sortedSelectedElements = this.__sortSelected(this.elements(), this.selectedElements);
  }

  elements() {
    return this.spatialIndex.getSortedIds() || [];
  }

  // State

  hasSelection() {
    return !!this.selectedElements.length;
  }

  hasSingleSelection() {
    return this.selectedElements.length === 1;
  }

  hasMultipleSelection() {
    return this.selectedElements.length > 1;
  }

  isSelected(id) {
    return this.selectedElements.includes(id);
  }

  getSelected() {
    return [...this.selectedElements];
  }

  isAbove(id, relativeId) {
    const index = this.elements().findIndex((_id) => _id === id);
    const relativeIndex = this.elements().findIndex((_id) => _id === relativeId);
    return index < relativeIndex;
  }

  topSelected() {
    const sortedIds = this._sortedSelected();
    return sortedIds[0];
  }

  bottomSelected() {
    const sortedIds = this._sortedSelected();
    return sortedIds[sortedIds.length - 1];
  }

  // Setters

  clear() {
    this.selectedElements = [];
    this.start = null;
    return this._commit();
  }

  add(id, scrollTo) {
    if (id && !this.isSelected(id)) {
      this.selectedElements = [...this.selectedElements, id];
      if (!this.start) {
        this.start = id;
      }
    }
    return this._commit(scrollTo ? id : undefined);
  }

  addMultiple(ids, scrollTo, up) {
    const newIds = ids.filter((_id) => !this.selectedElements.includes(_id));
    return this.setMultiple([...this.selectedElements, ...newIds], scrollTo, up);
  }

  remove(id, scrollTo) {
    if (id) {
      this.selectedElements = this.selectedElements.filter((_id) => _id !== id);
      if (this.start === id) {
        this.start = this.selectedElements[this.selectedElements.length - 1] || null;
      }
    }
    return this._commit(scrollTo ? this._pickNextBasedOnDirection() : undefined);
  }

  removeMultiple(ids, scrollTo) {
    return this.setMultiple(
      this.selectedElements.filter((_id) => !ids.includes(_id)),
      scrollTo
    );
  }

  toggle(id, scrollTo) {
    if (this.isSelected(id)) {
      return this.remove(id, scrollTo);
    }
    return this.add(id, scrollTo);
  }

  set(id, scrollTo) {
    if (id) {
      this.selectedElements = [id];
      this.start = id;
    }
    return this._commit(scrollTo ? id : undefined);
  }

  setMultiple(ids, scrollTo, up) {
    if (ids.length) {
      const uniqueIds = ids.filter(onlyUnique);
      this.selectedElements = uniqueIds;
      this.start = up ? uniqueIds[0] : uniqueIds[uniqueIds.length - 1];
    } else {
      this.clear();
    }
    return this._commit(scrollTo ? this.start : undefined);
  }

  all(scrollTo) {
    this.selectedElements = [...this.elements()];
    this.start = this.selectedElements[0];
    return this._commit(scrollTo ? this.topSelected() : undefined);
  }

  jumpToTop(scrollTo) {
    return this.set(this.elements()[0], scrollTo);
  }

  jumpToBottom(scrollTo) {
    return this.set(this.elements()[this.elements().length - 1], scrollTo);
  }

  moveUp(scrollTo) {
    // If we don't have a selection, select last item
    if (!this.hasSelection()) {
      return this.set(this.elements()[this.elements().length - 1], scrollTo);
    }
    // If we have a selection, select one above the top most item
    const topId = this.topSelected();
    const topIndex = this.elements().findIndex((_id) => _id === topId);
    return this.set(this.elements()[Math.max(0, topIndex - 1)], scrollTo);
  }

  moveDown(scrollTo) {
    // If we don't have a selection, select first item
    if (!this.hasSelection()) {
      return this.set(this.elements()[0], scrollTo);
    }
    // If we have a selection, select one above the bottom most item
    const bottomId = this.bottomSelected();
    const bottomIndex = this.elements().findIndex((_id) => _id === bottomId);
    return this.set(this.elements()[Math.min(this.elements().length - 1, bottomIndex + 1)], scrollTo);
  }

  expandUp(scrollTo) {
    // If we don't have a selection, moveUp()
    if (!this.hasSelection()) {
      return this.moveUp(scrollTo);
    }

    if (this.hasMultipleSelection()) {
      if (this.isAbove(this.start, this.bottomSelected())) {
        // Drop bottom selected
        return this.remove(this.bottomSelected(), scrollTo);
      }
    }

    // Find first element above not already selected, add it to selection
    const topId = this.topSelected();
    const topIndex = this.elements().findIndex((_id) => _id === topId);
    const aboveIds = this.elements().slice(0, topIndex);
    const nextId = aboveIds.reverse().find((_id) => !this.isSelected(_id));
    return this.add(nextId, scrollTo);
  }

  expandDown(scrollTo) {
    // If we don't have a selection, moveDown()
    if (!this.hasSelection()) {
      return this.moveDown(scrollTo);
    }

    if (this.hasMultipleSelection()) {
      if (!this.isAbove(this.start, this.bottomSelected())) {
        // Drop top selected
        return this.remove(this.topSelected(), scrollTo);
      }
    }
    // Find first element below not already selected, add it to selection
    const bottomId = this.bottomSelected();
    const bottomIndex = this.elements().findIndex((_id) => _id === bottomId);
    const belowIds = this.elements().slice(bottomIndex + 1);
    const nextId = belowIds.find((_id) => !this.isSelected(_id));
    return this.add(nextId, scrollTo);
  }

  rangeSelectTo(id, scrollTo) {
    // If we don't have a selection use the first item as start
    const start = this.start || this.elements()[0];
    let startIndex = this.elements().findIndex((_id) => _id === start);
    let endIndex = this.elements().findIndex((_id) => _id === id);
    // Swap indexes because splice can't handle backwards ranges:
    let _down = startIndex < endIndex;

    // If id was already selected, walk the list in the direction we're moving
    // and remove all adjacent selected ids above or below
    if (this.isSelected(id)) {
      const sortedIds = this._sortedSelected();
      const index = sortedIds.findIndex((_id) => _id === id);
      const keepIds = _down ? sortedIds.slice(0, index + 1) : sortedIds.slice(index, sortedIds.length);
      this.selectedElements = this.selectedElements.filter((_id) => keepIds.includes(_id));
      return this._commit(scrollTo ? id : undefined);
    }

    // Select everything from selection start to id
    if (!_down) {
      [startIndex, endIndex] = [endIndex, startIndex];
    }
    const newIds = this.elements().slice(startIndex, endIndex + 1);
    // Keep starting id stable as we want to always range select from that:
    this.selectedElements = [start, ...newIds.filter((_id) => _id !== start)];
    return this._commit(scrollTo ? id : undefined);
  }

  _pickNextBasedOnDirection() {
    const top = this.topSelected();
    const bottom = this.bottomSelected();
    if (this.isAbove(this.start, bottom)) {
      return bottom;
    }
    return top;
  }

  _sortedSelected() {
    return this._sortedSelectedElements;
  }

  __sortSelected(elements, selectedElements) {
    return selectedElements.sort((a, b) => {
      const aIndex = elements.findIndex((_id) => _id === a);
      const bIndex = elements.findIndex((_id) => _id === b);
      return aIndex - bIndex;
    });
  }

  _commit(next) {
    this.commit(this._state(), next);
    return next;
  }

  _state() {
    return {
      selected: [...this.selectedElements],
      start: this.start,
    };
  }
}

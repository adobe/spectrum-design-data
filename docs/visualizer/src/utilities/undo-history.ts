export class UndoHistory {
  history: string[] = [];

  head: number = -1;

  get canUndo() {
    return this.head > 0;
  }

  get canRedo() {
    return this.head + 1 < this.history.length;
  }

  save(stringifiedState: string) {
    // @TODO, is saving a new state
    // and head is NOT at the end,
    // COPY the current state and
    // add the new state after it
    this.history.push(stringifiedState);
    this.head = this.history.length - 1;
  }

  undo(): string {
    if (this.history.length === 0) {
      return "";
    }
    this.head = Math.max(0, this.head - 1);
    return this.history[this.head];
  }

  redo(): string {
    if (this.history.length === 0) {
      return "";
    }
    this.head = Math.min(this.history.length - 1, this.head + 1);
    return this.history[this.head];
  }
}

export default UndoHistory;

/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

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

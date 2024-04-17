/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

export class PoolQueue {
  concurrent: number = 1;

  items: any[] = [];

  process: any = () => {};

  running: boolean = false;

  pending: number = 0;

  rejected: number = 0;

  resolved: number = 0;

  progressHandlers: any[] = [];

  thenHandlers: any[] = [];

  catchHandlers: any[] = [];

  callHandlers(
    handlers: any[],
    status: any,
    result: any = null,
    err: any = null,
  ) {
    const c = handlers.length;
    for (let i = 0; i < c; i += 1) {
      handlers[i].call(this, status, result, err);
    }
  }

  constructor(config: any) {
    if (typeof config.process !== "function") {
      // eslint-disable-next-line no-throw-literal
      throw "Pool Queue process argument must be a function";
    }

    if (typeof config.items !== "object") {
      // eslint-disable-next-line no-throw-literal
      throw "Pool Queue items argument must be an array";
    }

    this.concurrent = config.concurrent || 1;
    this.items = config.items.slice(0); // use a COPY of the argument array
    this.process = config.process; // process method called in the 'next' method
  }

  rejectQ() {
    this.stop();
    this.callHandlers(this.catchHandlers, this.status());
  }

  resolveQ() {
    this.callHandlers(this.thenHandlers, this.status());
  }

  resolveItem(result: any) {
    this.resolved += 1;
    this.processItemEnd(result);
  }

  rejectItem(reason: any) {
    this.rejected += 1;
    this.processItemEnd(undefined, reason);
  }

  processItemStart() {
    this.pending += 1;
    setTimeout(
      this.process.bind(this),
      0,
      this.items.shift(),
      this.resolveItem.bind(this),
      this.rejectItem.bind(this),
      this.rejectQ.bind(this),
    );
  }

  processItemEnd(result: any, reason: any = null) {
    this.pending -= 1;
    this.callHandlers(this.progressHandlers, this.status(), result, reason);
    if (this.running === false) {
      return;
    }
    if (this.items.length > 0) {
      this.processItemStart();
    } else if (this.pending === 0) {
      this.resolveQ();
    }
  }

  processItems() {
    const numToStart = Math.min(
      this.concurrent - this.pending,
      this.items.length,
    );
    for (let i = numToStart; i > 0; i -= 1) {
      this.processItemStart();
    }
  }

  status() {
    return {
      resolved: this.resolved,
      rejected: this.rejected,
      pending: this.pending + this.items.length,
    };
  }

  // drop all queued items
  clear() {
    this.items = [];
    return this;
  }

  // accepts a fn, or a value, or an array of values
  remove(predicate: any) {
    if (Array.isArray(predicate)) {
      const valsToRemove = predicate;
      predicate = (item: any) => {
        for (let j = valsToRemove.length - 1; j >= 0; j -= 1) {
          if (valsToRemove[j] === item) {
            return true; // break and return
          }
        }
        return false;
      };
    }

    if (typeof predicate !== "function") {
      const p = predicate;
      predicate = (item: any) => p === item;
    }

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      if (predicate(this.items[i])) {
        this.items.splice(i, 1);
      }
    }

    return this;
  }

  add(itemsToAdd: any) {
    this.items = this.items.concat(itemsToAdd);
    if (this.running === true) {
      this.processItems();
    }
    return this;
  }

  stop() {
    this.running = false;
    return this;
  }

  start() {
    if (this.running === false) {
      this.running = true;
      this.processItems();
    }
    return this;
  }

  progress(callback: any) {
    this.progressHandlers.push(callback);
    return this;
  }

  then(callback: any) {
    this.thenHandlers.push(callback);
    return this;
  }

  catch(callback: any) {
    this.catchHandlers.push(callback);
    return this;
  }
}

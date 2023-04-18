export declare class PoolQueue {
  concurrent: number;
  items: any[];
  process: any;
  running: boolean;
  pending: number;
  rejected: number;
  resolved: number;
  progressHandlers: any[];
  thenHandlers: any[];
  catchHandlers: any[];
  callHandlers(handlers: any[], status: any, result?: any, err?: any): void;
  constructor(config: any);
  rejectQ(): void;
  resolveQ(): void;
  resolveItem(result: any): void;
  rejectItem(reason: any): void;
  processItemStart(): void;
  processItemEnd(result: any, reason?: any): void;
  processItems(): void;
  status(): {
    resolved: number;
    rejected: number;
    pending: number;
  };
  clear(): this;
  remove(predicate: any): this;
  add(itemsToAdd: any): this;
  stop(): this;
  start(): this;
  progress(callback: any): this;
  then(callback: any): this;
  catch(callback: any): this;
}

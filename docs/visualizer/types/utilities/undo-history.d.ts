export declare class UndoHistory {
  history: string[];
  head: number;
  get canUndo(): boolean;
  get canRedo(): boolean;
  save(stringifiedState: string): void;
  undo(): string;
  redo(): string;
}
export default UndoHistory;

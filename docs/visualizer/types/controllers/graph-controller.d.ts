import { GraphModel, GraphState, GraphNodeId } from "../models/graph-model";
import { AppState } from "../models/app-model";
import { GraphDataSource } from "./graph-data-source";
import { StringMatchDictionaryItem } from "../workers/string-match";
export type NewGraphStateCallbackFn = (
  state: GraphState,
  listOfComponents: string[],
) => void;
export type NewDictionaryCallbackFn = (
  dictionary: StringMatchDictionaryItem[],
) => void;
type KeyValueObject = {
  [key: string]: any;
};
export declare class GraphController {
  graphDataSource: GraphDataSource;
  completeGraphModel: GraphModel;
  displayGraphModel: GraphModel;
  baseDisplayGraphModel: GraphModel;
  appState: AppState;
  newGraphStateCallbacks: NewGraphStateCallbackFn[];
  newDictionaryCallbacks: NewDictionaryCallbackFn[];
  selectedComponent: string;
  listOfComponents: string[];
  listOfOrphanNodes: string[];
  graphLayoutWorker: Worker;
  constructor();
  getNodeType(id: GraphNodeId): "token" | "component" | "orphan-category";
  getDownstreamGraphFrom(...nodes: GraphNodeId[]): GraphModel;
  getUpstreamGraphFrom(
    nodes: GraphNodeId[],
    sourceGraph?: GraphModel,
  ): GraphModel;
  getAncestorNodes(...nodeIds: string[]): string[];
  getDescendentNodes(...nodeIds: string[]): string[];
  getDescendentIntersectNodes(...nodeIds: string[]): string[];
  assignGraphs(target: GraphModel, ...sources: GraphModel[]): GraphModel;
  hydrateFromJson(): Promise<void>;
  emitNewGraphState(): void;
  emitNewDictionary(): void;
  onNewGraphState(cb: NewGraphStateCallbackFn): void;
  onDictionaryAvailable(cb: NewDictionaryCallbackFn): void;
  doSomeMutation(): Promise<void>;
  updateDisplayGraph(): void;
  setAppState(newAppState: AppState): Promise<void>;
  recieveNewGraphLayout(event: any): void;
  requestGraphLayout(graphModel: GraphModel): void;
  handleEvent(eventName: string, eventDetail: KeyValueObject): void;
}
export default GraphController;

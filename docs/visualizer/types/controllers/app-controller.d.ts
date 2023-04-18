import { AppModel, AppState } from "../models/app-model";
import { GraphController } from "./graph-controller";
export type NewAppStateCallbackFn = (state: AppState) => void;
type KeyValueObject = {
  [key: string]: any;
};
export declare class AppController {
  graphController: GraphController;
  appModel: AppModel;
  newAppStateCallbacks: NewAppStateCallbackFn[];
  _priorAppState: AppState;
  _priorTopologyKey: string;
  constructor({
    graphController,
    selectedComponents,
    selectedTokens,
    setFilters,
  }: {
    graphController: GraphController;
    selectedComponents: string[];
    selectedTokens: string[];
    setFilters: string[];
  });
  initialize({
    selectedComponents,
    selectedTokens,
    setFilters,
  }: {
    selectedComponents: string[];
    selectedTokens: string[];
    setFilters: string[];
  }): Promise<void>;
  emitNewAppState(): void;
  onNewAppState(cb: NewAppStateCallbackFn): void;
  handleNewGraphState(): void;
  handleHoverOver(nodeId: string): void;
  handleHoverOut(nodeId: string): void;
  toggleGraphNodeSelection(graphNodeId: string, modifierKey?: boolean): void;
  setZoomCenteredOnCanvas(newZoom: number): void;
  handleEvent(eventName: string, eventDetail: KeyValueObject): void;
  doSomeMutation(): Promise<void>;
}
export default AppController;

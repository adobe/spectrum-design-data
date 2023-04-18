type SpectrumColorThemeValue =
  | ""
  | "light"
  | "lightest"
  | "dark"
  | "darkest"
  | "light-express"
  | "lightest-express"
  | "dark-express"
  | "darkest-express";
export interface AppState {
  panX: number;
  panY: number;
  zoom: number;
  spectrumColorTheme: SpectrumColorThemeValue;
  isDragging: boolean;
  fullscreenMode: boolean;
  hoverNodeId: string;
  setFilters: string[];
  listOfComponents: string[];
  selectedTokens: string[];
  selectionAncestorNodes: string[];
  selectionDescendentNodes: string[];
  selectionDescendentIntersectNodes: string[];
  componentDescendentNodes: string[];
  selectedComponents: string[];
  hoverUpstreamNodes: string[];
}
export declare class AppModel {
  static readonly DEFAULT_STATE: AppState;
  _state: AppState;
  _stringifiedState: string;
  constructor();
  dirtyState(): void;
  get stringifiedState(): string;
  setFullscreenMode(b: boolean): void;
  setIsDragging(b: boolean): void;
  setPan(x: number, y: number): void;
  setZoom(z: number): void;
  setHoverId(id: string): void;
  getSetFilters(): any;
  setSetFilters(value: string[]): void;
  getSelectedComponents(): any;
  setSelectedComponents(value: string[]): void;
  setSpectrumColorTheme(value: SpectrumColorThemeValue): void;
  getSelectedTokens(): any;
  setSelectedTokens(value: string[]): void;
  setSelectionAncestorNodes(value: string[]): void;
  setSelectionDescendentNodes(value: string[]): void;
  setSelectionDescendentIntersectNodes(value: string[]): void;
  setListOfComponents(value: string[]): void;
  setComponentDescendentNodes(value: string[]): void;
  setHoverUpstreamNodes(value: string[]): void;
  reset(): void;
  get state(): AppState;
  set state(newState: AppState);
}
export default AppModel;

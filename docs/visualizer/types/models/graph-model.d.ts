export type GraphNodeId = string;
export declare const ValuePathSplitter = ":^;";
export declare const ValuesListSplitter = ":*;";
export interface GraphNode {
  type: "token" | "component" | "orphan-category";
  id: GraphNodeId;
  x: number;
  y: number;
  value?: string;
  adjacencyLabels?: {
    [targetId: string]: string;
  };
}
export interface MutableGraphNodeProperties {
  x?: number;
  y?: number;
  value?: string;
  adjacencyLabels?: {
    [targetId: string]: string;
  };
}
export interface GraphState {
  width: number;
  height: number;
  topologyKey: string;
  nodes: {
    [uniquenessKey: string]: GraphNode;
  };
  adjacencyList: {
    [GraphNodeId: string]: GraphNodeId[];
  };
}
export declare class GraphModel {
  static readonly DEFAULT_STATE: GraphState;
  _state: GraphState;
  _stringifiedState: string;
  _dirtyTopology: boolean;
  constructor();
  filter(fn: (node: GraphNode) => boolean): GraphModel;
  dirtyState(): void;
  get stringifiedState(): string;
  orphanNodes(): string[];
  hasNode(nodeId: string): boolean;
  createNode(node: GraphNode): void;
  updateNode(
    id: GraphNodeId,
    updatedProperties: MutableGraphNodeProperties,
  ): void;
  deleteNode(id: GraphNodeId): void;
  createAdjacency(from: GraphNodeId, to: GraphNodeId, label?: string): void;
  deleteAdjacency(from: GraphNodeId, to: GraphNodeId): void;
  setSize(w: number, h: number): void;
  reset(): void;
  get state(): GraphState;
  set state(newState: GraphState);
}
export default GraphModel;

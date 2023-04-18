import { GraphModel, GraphState } from "../models/graph-model";
export type NewGraphStateCallbackFn = (
  state: GraphState,
  listOfComponents: string[],
) => void;
export type NewDictionaryCallbackFn = (dictionary: string[]) => void;
interface RawJsonSets {
  [setEnumVal: string]: RawJsonItem;
}
interface RawJsonItem {
  component?: string;
  value?: string;
  sets?: RawJsonSets;
}
interface RawSpectrumTokenJson {
  [tokenIdentifier: string]: RawJsonItem;
}
export declare class GraphDataSource {
  listOfComponents: string[];
  listOfOrphanTokens: string[];
  _completeSpectrumTokenJson: RawSpectrumTokenJson;
  getCompleteSpectrumTokenJson(): Promise<RawSpectrumTokenJson>;
  getAllComponentNames(): Promise<string[]>;
  getFilteredGraphModel(filters: string[]): Promise<GraphModel>;
}
export default GraphDataSource;

export declare class MatrixUtils {
  static get defaultMatrix(): number[];
  static getScalingTransform(scaleX: number, scaleY: number): number[];
  static getTranslationTransform(x: number, y: number): number[];
  static scale(out: number[], a: number[], v: number[]): number[];
  static difference(out: number[], a: number[], b: number[]): number[];
  static multiply(out: number[], a: number[], ...b: number[][]): number[];
  static rotate(out: number[], a: number[], rad: number): number[];
  static translate(out: number[], a: number[], v: number[]): number[];
  static transformPoint(
    x: number,
    y: number,
    m: number[],
  ): {
    x: number;
    y: number;
  };
  static invert(out: number[], a: number[]): number[];
  static compose(x?: number, y?: number, r?: number): number[];
  static decompose(m: number[]): {
    skew: {
      x: number;
      y: number;
    };
    scale: {
      x: number;
      y: number;
    };
    position: {
      x: number;
      y: number;
    };
    rotation: number;
  };
  static decomposeScale(m: number[]): {
    x: number;
    y: number;
  };
}
export default MatrixUtils;

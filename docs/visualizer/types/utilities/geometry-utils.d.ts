export interface Point {
  x: number;
  y: number;
}
type Rectangle = [Point, Point, Point, Point];
export declare class GeometryUtils {
  static radians(deg: number): number;
  static degrees(rad: number): number;
  static slope(p1: Point, p2: Point): number;
  static degreesBetweenPoints(p1: Point, p2: Point): number;
  static radiansBetweenPoints(p1: Point, p2: Point): number;
  static vectorBetweenPoints(p1: Point, p2: Point): Point;
  static rotatePoint(
    point: Point,
    rad: number,
    origin?: Point,
  ): {
    x: number;
    y: number;
  };
  static screenCoordinateToDocumentCoordinate(
    clientX: number,
    clientY: number,
    renderScale: number,
    originOffsetX: number,
    originOffsetY: number,
  ): {
    x: number;
    y: number;
  };
  static distance(p1: Point, p2: Point): number;
  static distanceSquared(p1: Point, p2: Point): number;
  static closestPointOfLineToAPoint(
    p: Point,
    l1: Point,
    l2: Point,
  ): {
    x: number;
    y: number;
  };
  static isPointWithinRectangle(
    { x, y }: Point,
    rectBottomLeft: Point,
    rectTopRight: Point,
  ): boolean;
  static doRectanglesIntersect(a: Rectangle, b: Rectangle): boolean;
}
export default GeometryUtils;

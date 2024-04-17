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

export interface Point {
  x: number;
  y: number;
}

type Rectangle = [Point, Point, Point, Point];

export class GeometryUtils {
  static radians(deg: number) {
    return (deg * Math.PI) / 180;
  }

  static degrees(rad: number) {
    return (rad * 180) / Math.PI;
  }

  static slope(p1: Point, p2: Point) {
    return (p2.y - p1.y) / (p2.x - p1.x);
  }

  static degreesBetweenPoints(p1: Point, p2: Point) {
    return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  }

  static radiansBetweenPoints(p1: Point, p2: Point) {
    return this.radians(this.degreesBetweenPoints(p1, p2));
  }

  static vectorBetweenPoints(p1: Point, p2: Point): Point {
    return {
      x: p1.x - p2.x,
      y: p1.y - p2.y,
    };
  }

  static rotatePoint(
    point: Point,
    rad: number,
    origin: Point = { x: 0, y: 0 },
  ) {
    const rX =
      Math.cos(rad) * (point.x - origin.x) -
      Math.sin(rad) * (point.y - origin.y) +
      origin.x;
    const rY =
      Math.sin(rad) * (point.x - origin.x) +
      Math.cos(rad) * (point.y - origin.y) +
      origin.y;
    return { x: rX, y: rY };
  }

  static screenCoordinateToDocumentCoordinate(
    clientX: number,
    clientY: number,
    renderScale: number,
    originOffsetX: number,
    originOffsetY: number,
  ) {
    const vectorToViewportCornerFromOrigin = {
      x: -originOffsetX / renderScale,
      y: -originOffsetY / renderScale,
    };

    const vectorToTouchPoint = {
      x: clientX / renderScale,
      y: clientY / renderScale,
    };

    const vectorFromOriginToTouchPoint = {
      x: vectorToViewportCornerFromOrigin.x + vectorToTouchPoint.x,
      y: vectorToViewportCornerFromOrigin.y + vectorToTouchPoint.y,
    };

    return vectorFromOriginToTouchPoint;
  }

  static distance(p1: Point, p2: Point) {
    const a = p1.x - p2.x;
    const b = p1.y - p2.y;
    return Math.sqrt(a * a + b * b);
  }

  static distanceSquared(p1: Point, p2: Point) {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
  }

  static closestPointOfLineToAPoint(p: Point, l1: Point, l2: Point) {
    // p is the point
    // l1 and l2 define two arbitrary points on the line
    const t =
      ((p.x - l1.x) * (l2.x - l1.x) + (p.y - l1.y) * (l2.y - l1.y)) /
      GeometryUtils.distanceSquared(l1, l2);
    // return a point on the line that is the perpendicular
    // intersection with the line
    return {
      x: l1.x + t * (l2.x - l1.x),
      y: l1.y + t * (l2.y - l1.y),
    };
  }

  static isPointWithinRectangle(
    { x, y }: Point,
    rectBottomLeft: Point,
    rectTopRight: Point,
  ) {
    return (
      x > rectBottomLeft.x &&
      x < rectTopRight.x &&
      y > rectBottomLeft.y &&
      y < rectTopRight.y
    );
  }

  //
  //  function to determine whether there is an intersection between the two rectangles described
  //  by the lists of vertices. Uses the Separating Axis Theorem
  //
  //
  static doRectanglesIntersect(a: Rectangle, b: Rectangle): boolean {
    const rectangles = [a, b];
    let rect: Rectangle;
    let normal: Point; // well, a vector actually ¯\_(ツ)_/¯
    let p1: Point;
    let p2: Point;
    let minA: number;
    let maxA: number;
    let i: number;
    let i1: number;
    let i2: number;
    let j: number;
    let minB: number;
    let maxB: number;
    let projectedValues: number[];

    for (i = 0; i < rectangles.length; i += 1) {
      // for each rectangle, look at each edge of the rectangle, and determine if it separates
      // the two shapes
      rect = rectangles[i];

      // only loop through HALF the points of the rectangle
      // since we only need to test the projections of two
      // adjacent edges because it is a proper RECTANGLE
      //
      // in a more general convex polygon case we would need to
      // test ALL of the edges.
      for (i1 = 0; i1 < rect.length / 2; i1 += 1) {
        // grab 2 vertices to create an edge
        i2 = (i1 + 1) % rect.length;
        p1 = rect[i1];
        p2 = rect[i2];

        // find the line perpendicular to this edge
        normal = { x: p2.y - p1.y, y: p1.x - p2.x };

        // for each vertex in the first shape, project it onto the line perpendicular to the edge
        // and keep track of the min and max of these values
        projectedValues = [];
        for (j = 0; j < a.length; j += 1) {
          projectedValues.push(normal.x * a[j].x + normal.y * a[j].y);
        }
        minA = Math.min(...projectedValues);
        maxA = Math.max(...projectedValues);

        // for each vertex in the second shape, project it onto the line perpendicular to the edge
        // and keep track of the min and max of these values
        projectedValues = [];
        for (j = 0; j < b.length; j += 1) {
          projectedValues.push(normal.x * b[j].x + normal.y * b[j].y);
        }
        minB = Math.min(...projectedValues);
        maxB = Math.max(...projectedValues);

        // if there is no overlap between the projects, the edge we are looking at separates the two
        // rectangles, and we know there is no overlap
        if (maxA < minB || maxB < minA) {
          // console.log("rectangles don't intersect!");
          return false;
        }
      }
    }
    return true;
  }
}

export default GeometryUtils;

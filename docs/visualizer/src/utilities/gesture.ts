/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { randomId } from "./random-id.js";

const CLICK_DEAD_ZONE = 2;

const DOUBLECLICK_TIMEOUT_MS = 300;

interface Point {
  x: number;
  y: number;
}

interface PointerEvent {
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  clientX: number;
  clientY: number;
  buttons: number;
}

interface GestureEventDetail {
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  gestureId: string;
  deltaX: number;
  deltaY: number;
  totalDistance: number;
  totalDeltaX: number;
  totalDeltaY: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  originalEvent: PointerEvent;
}

export interface GestureEvent extends CustomEvent {
  detail: {
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    gestureId: string;
    deltaX: number;
    deltaY: number;
    totalDistance: number;
    totalDeltaX: number;
    totalDeltaY: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    originalEvent: PointerEvent;
  };
}

// Events emitted through the dom
// from the host element passed
// into the gesture constructor
const START = "gesture-start";
const DRAG_MOVE = "gesture-drag-move";
const DRAG_START = "gesture-drag-start";
const DRAG_END = "gesture-drag-end";
const CLICK = "gesture-click";
const DOUBLE_CLICK = "gesture-doubleclick";
const SINGLE_CLICK = "gesture-singleclick";

export class Gesture {
  id: string;

  startPoint: Point = { x: 0, y: 0 };

  currentPoint: Point = { x: 0, y: 0 };

  priorPoint: Point = { x: 0, y: 0 };

  totalDistance: number = 0;

  isDragGesture: boolean = false;

  waitingForDoubleClick: boolean = false;

  active: boolean = false;

  waitingForDoubleClickTimeout?: ReturnType<typeof setTimeout>;

  element: Element;

  promise: Promise<string>;

  promiseResolve: (value: any) => void = () => {};

  boundUpHandler: (e: any) => void;

  boundDownHandler: (e: any) => void;

  boundMoveHandler: (e: any) => void;

  static distance(p1: Point, p2: Point) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  constructor(pointerDownEvent: PointerEvent, element: Element) {
    this.id = randomId();
    this.boundUpHandler = this.handlePointerUp.bind(this);
    this.boundMoveHandler = this.handlePointerMove.bind(this);
    this.boundDownHandler = this.handlePointerDown.bind(this);
    this.element = element;
    this.active = true;
    this.startPoint = {
      x: pointerDownEvent.clientX,
      y: pointerDownEvent.clientY,
    };
    this.currentPoint = this.startPoint;
    this.priorPoint = this.startPoint;
    document.body.addEventListener("pointermove", this.boundMoveHandler);
    document.body.addEventListener("pointerup", this.boundUpHandler);
    document.body.addEventListener("pointerdown", this.boundDownHandler);

    this.emitEvent(START, pointerDownEvent);
    this.promise = new Promise((resolve) => {
      this.promiseResolve = resolve;
    });
  }

  emitEvent(event: string, originalEvent: PointerEvent) {
    const { altKey, ctrlKey, shiftKey, metaKey } = originalEvent;
    const detail: GestureEventDetail = {
      altKey,
      ctrlKey,
      shiftKey,
      metaKey,
      gestureId: this.id,
      deltaX: this.currentPoint.x - this.priorPoint.x,
      deltaY: this.currentPoint.y - this.priorPoint.y,
      totalDistance: this.totalDistance,
      totalDeltaX: this.currentPoint.x - this.startPoint.x,
      totalDeltaY: this.currentPoint.y - this.startPoint.y,
      startX: this.startPoint.x,
      startY: this.startPoint.y,
      currentX: this.currentPoint.x,
      currentY: this.currentPoint.y,
      originalEvent,
    };
    this.element.dispatchEvent(
      new CustomEvent(event, {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail,
      }),
    );
  }

  unbind() {
    document.body.removeEventListener("pointermove", this.boundMoveHandler);
    document.body.removeEventListener("pointerup", this.boundUpHandler);
    document.body.removeEventListener("pointerdown", this.boundDownHandler);
    this.active = false;
    this.promiseResolve("gesturecomplete");
  }

  handlePointerMove(e: PointerEvent) {
    if (e.buttons === 0) {
      this.handlePointerUp(e);
      return;
    }
    this.priorPoint = this.currentPoint;
    this.currentPoint = { x: e.clientX, y: e.clientY };
    this.totalDistance = Gesture.distance(this.startPoint, this.currentPoint);
    if (this.isDragGesture) {
      this.emitEvent(DRAG_MOVE, e);
    } else if (this.totalDistance > CLICK_DEAD_ZONE) {
      this.isDragGesture = true;
      this.emitEvent(DRAG_START, e);
    }
  }

  handlePointerDown(e: PointerEvent) {
    // console.info('gesture p down');
    if (this.waitingForDoubleClick) {
      this.emitEvent(DOUBLE_CLICK, e);
      this.waitingForDoubleClick = false;
      if (this.waitingForDoubleClickTimeout) {
        clearTimeout(this.waitingForDoubleClickTimeout);
      }
      this.unbind();
    }
  }

  handlePointerUp(e: PointerEvent) {
    // is the pointer up at the end of a drag?
    if (this.isDragGesture) {
      this.emitEvent(DRAG_END, e);
      this.unbind();
      // is the pointer up AGAIN while we're waiting
      // to see if this is a doubleclick?
    } else if (!this.waitingForDoubleClick) {
      this.emitEvent(CLICK, e);
      this.waitingForDoubleClick = true;
      this.waitingForDoubleClickTimeout = setTimeout(() => {
        // AND was there no second click to make it a double
        this.emitEvent(SINGLE_CLICK, e);
        this.waitingForDoubleClick = false;
        this.unbind();
      }, DOUBLECLICK_TIMEOUT_MS);
    }
  }
}

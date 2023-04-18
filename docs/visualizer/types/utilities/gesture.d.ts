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
export declare class Gesture {
  id: string;
  startPoint: Point;
  currentPoint: Point;
  priorPoint: Point;
  totalDistance: number;
  isDragGesture: boolean;
  waitingForDoubleClick: boolean;
  active: boolean;
  waitingForDoubleClickTimeout?: ReturnType<typeof setTimeout>;
  element: Element;
  promise: Promise<string>;
  promiseResolve: (value: any) => void;
  boundUpHandler: (e: any) => void;
  boundDownHandler: (e: any) => void;
  boundMoveHandler: (e: any) => void;
  static distance(p1: Point, p2: Point): number;
  constructor(pointerDownEvent: PointerEvent, element: Element);
  emitEvent(event: string, originalEvent: PointerEvent): void;
  unbind(): void;
  handlePointerMove(e: PointerEvent): void;
  handlePointerDown(e: PointerEvent): void;
  handlePointerUp(e: PointerEvent): void;
}
export {};

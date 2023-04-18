interface ConstructorInterface {
  maxFPS?: number;
  minFPS?: number;
  paused?: boolean;
  onResume?: () => void;
  onPause?: () => void;
  onTick?: (
    currentTimeSeconds: number,
    tickDeltaTimeSeconds: number,
    currentTick: number,
  ) => void;
  onFrame?: (
    currentTimeSeconds: number,
    tickDeltaTimeSeconds: number,
    currentTick: number,
  ) => void;
}
export declare class Ticker {
  private _isRunning;
  private _timeScale;
  private _currentTick;
  private _currentTime;
  private _tickDeltaTime;
  private _maxFPS;
  private _lastTimeUpdated;
  private _minInterval;
  private _now;
  private _frameDeltaTime;
  private _onResume;
  private _onPause;
  private _onTick;
  private _onFrame;
  private _frame;
  constructor({
    maxFPS,
    paused,
    onResume,
    onPause,
    onTick,
    onFrame,
  }: ConstructorInterface);
  resume(): void;
  pause(): void;
  get currentTick(): number;
  get currentTimeSeconds(): number;
  get tickDeltaTimeSeconds(): number;
  get timeScale(): number;
  set timeScale(value: number);
  get isRunning(): boolean;
  private requestFrame;
  private doFrame;
  static getTime(): number;
}
export {};

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

export class Ticker {
  private _isRunning: boolean;

  private _timeScale: number;

  private _currentTick: number;

  private _currentTime: number;

  private _tickDeltaTime: number;

  private _maxFPS: number;

  private _lastTimeUpdated: number;

  private _minInterval: number;

  private _now: number;

  private _frameDeltaTime: number;

  private _onResume: () => void;

  private _onPause: () => void;

  private _onTick: (
    currentTimeSeconds: number,
    tickDeltaTimeSeconds: number,
    currentTick: number,
  ) => void;

  private _onFrame: (
    currentTimeSeconds: number,
    tickDeltaTimeSeconds: number,
    currentTick: number,
  ) => void;

  private _frame: number;

  constructor({
    maxFPS = NaN,
    paused = false,
    onResume = () => {},
    onPause = () => {},
    onTick = () => {},
    onFrame = () => {},
  }: ConstructorInterface) {
    this._maxFPS = maxFPS;
    this._timeScale = 1;
    this._currentTick = 0;
    this._currentTime = 0;
    this._tickDeltaTime = 0;
    this._isRunning = false;
    this._lastTimeUpdated = 0;
    this._now = 0;
    this._frameDeltaTime = 0;
    this._frame = 0;
    this._minInterval = Number.isNaN(this._maxFPS) ? NaN : 1000 / this._maxFPS;
    this._onResume = onResume;
    this._onPause = onPause;
    this._onTick = onTick;
    this._onFrame = onFrame;

    if (!paused) this.resume();
  }

  public resume(): void {
    if (!this._isRunning) {
      this._isRunning = true;
      this._lastTimeUpdated = Ticker.getTime();
      this._onResume();
      this.requestFrame();
    }
  }

  public pause(): void {
    if (this._isRunning) {
      this._isRunning = false;
      this._onPause();
      window.cancelAnimationFrame(this._frame);
    }
  }

  public get currentTick(): number {
    return this._currentTick;
  }

  public get currentTimeSeconds(): number {
    return this._currentTime / 1000;
  }

  public get tickDeltaTimeSeconds(): number {
    return this._tickDeltaTime / 1000;
  }

  public get timeScale(): number {
    return this._timeScale;
  }

  public set timeScale(value: number) {
    if (this._timeScale !== value) {
      this._timeScale = value;
    }
  }

  public get isRunning() {
    return this._isRunning;
  }

  private requestFrame(): void {
    this._frame = window.requestAnimationFrame(() => this.doFrame());
  }

  private doFrame(): void {
    this._now = Ticker.getTime();
    this._frameDeltaTime = this._now - this._lastTimeUpdated;
    this._lastTimeUpdated = this._now;
    this._tickDeltaTime = this._frameDeltaTime * this._timeScale;
    this._currentTick += 1;
    this._currentTime += this._tickDeltaTime;
    // We're going to TICK on EVERY window animation frame
    // BUT we're only going to FRAME based on the maxFPS value ( _minInterval )
    this._onTick(
      this.currentTimeSeconds,
      this.tickDeltaTimeSeconds,
      this.currentTick,
    );
    if (
      Number.isNaN(this._minInterval) ||
      this._frameDeltaTime >= this._minInterval
    ) {
      this._onFrame(
        this.currentTimeSeconds,
        this.tickDeltaTimeSeconds,
        this.currentTick,
      );
    }
    if (this._isRunning) this.requestFrame();
  }

  static getTime(): number {
    return Date.now();
  }
}

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

const testCanvas = document.createElement("canvas");
const testCanvasCtx = testCanvas.getContext("2d") as CanvasRenderingContext2D;
const testFontSize = 100;
const wordShapeLookup: Map<string, number> = new Map();

export function textAspectRatio(
  words: string[],
  family: string,
  weight: string = "normal",
  style: string = "normal",
): number[] {
  testCanvasCtx.font = `${style} ${weight} 100px ${family}`;
  return words.map((word: string) => {
    const key = `${family}:${weight}:${style}:${word}`;
    if (!wordShapeLookup.has(key)) {
      wordShapeLookup.set(
        key,
        testCanvasCtx.measureText(word).width / testFontSize,
      );
    }
    return wordShapeLookup.get(key);
  }) as number[];
}

export default textAspectRatio;

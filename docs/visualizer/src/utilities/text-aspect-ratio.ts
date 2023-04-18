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

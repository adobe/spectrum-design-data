// Copyright 2026 Adobe. All rights reserved.
import type { OutputColorSpace, Oklab } from "../colorMath";
import {
  clamp01,
  deltaE,
  interpolateHue,
  oklabToOklch,
  renderGamutForOutput,
} from "../colorMath";
import { colorJsSpace } from "../outputSettings";
import {
  concreteColor,
  colorOklab,
  interpolatedCss,
  interpolatedOklchCss,
} from "./colors";
import type { ContinuousDataVisScale } from "./model";
import type { ResolvedDataVisPoint } from "./resolution";

export interface ContinuousScale {
  id: string;
  kind: "sequential" | "diverging";
  points: ResolvedDataVisPoint[];
  diagnostics: string[];
  evaluate: (normalizedValue: number) => string;
}

export function compileContinuousScale(
  definition: Pick<ContinuousDataVisScale, "id" | "kind">,
  points: ResolvedDataVisPoint[],
  output: OutputColorSpace = "srgb",
): ContinuousScale {
  if (
    points.length < 2 ||
    points[0].position !== 0 ||
    points.at(-1)?.position !== 1 ||
    points.some(
      (point, index) =>
        !Number.isFinite(point.position) ||
        point.position < 0 ||
        point.position > 1 ||
        (index > 0 && point.position <= points[index - 1].position),
    ) ||
    (definition.kind === "diverging" &&
      !points.some((point) => point.position === 0.5))
  ) {
    throw new Error(
      "A continuous scale requires ordered endpoints and a diverging center at 50%.",
    );
  }
  const prepared = points.map((point) => {
    const color = concreteColor(point.value);
    const lab = colorOklab(color);
    return { ...point, lab, lch: oklabToOklch(lab), alpha: color.alpha };
  });
  const diagnostics = points
    .filter((point) => point.targetReached === false)
    .map(
      (point) =>
        `Point ${Math.round(point.position * 100)}% cannot reach ${point.targetContrast}:1; its rendered contrast is ${point.actualContrast.toFixed(3)}:1.`,
    );
  for (const point of points)
    if (
      !concreteColor(point.value).inGamut(
        colorJsSpace(renderGamutForOutput(output)),
      )
    ) {
      diagnostics.push(
        `Point ${Math.round(point.position * 100)}% uses a linked color outside the interpolation output gamut. Interior colors are gamut-mapped; the exact linked endpoint is preserved.`,
      );
    }
  for (let index = 1; index < prepared.length; index++) {
    if (
      deltaE(prepared[index - 1].lab, prepared[index].lab) < 1e-6 &&
      Math.abs(prepared[index - 1].alpha - prepared[index].alpha) < 1e-6
    ) {
      diagnostics.push(
        `Points ${Math.round(points[index - 1].position * 100)}% and ${Math.round(points[index].position * 100)}% have collapsed colors.`,
      );
    }
  }
  const arms =
    definition.kind === "sequential"
      ? [prepared]
      : [
          prepared.filter((point) => point.position <= 0.5),
          prepared.filter((point) => point.position >= 0.5),
        ];
  for (const arm of arms) {
    const direction = Math.sign(arm.at(-1)!.lab[0] - arm[0].lab[0]);
    if (
      arm.some(
        (point, index) =>
          index > 0 &&
          (direction === 0
            ? Math.abs(point.lab[0] - arm[index - 1].lab[0]) > 0.00001
            : (point.lab[0] - arm[index - 1].lab[0]) * direction < -0.00001),
      )
    ) {
      diagnostics.push(
        "Lightness changes direction within an arm. This recipe is not a monotonic lightness progression.",
      );
    }
  }
  return {
    ...definition,
    points,
    diagnostics,
    evaluate(normalizedValue: number) {
      if (!Number.isFinite(normalizedValue))
        throw new Error(
          "A data vis function requires a finite normalized value.",
        );
      const value = clamp01(normalizedValue);
      const exact = prepared.find((point) => point.position === value);
      if (exact) return exact.value;
      const upperIndex = prepared.findIndex((point) => point.position > value);
      const a = prepared[upperIndex - 1],
        b = prepared[upperIndex];
      const t = (value - a.position) / (b.position - a.position);
      const alpha = a.alpha * (1 - t) + b.alpha * t;
      const first = definition.kind === "sequential" ? a.lch : a.lab;
      const second = definition.kind === "sequential" ? b.lch : b.lab;
      const channel = (index: number) =>
        alpha <= 0
          ? 0
          : (first[index] * a.alpha * (1 - t) + second[index] * b.alpha * t) /
            alpha;
      if (definition.kind === "sequential") {
        // Hue is not alpha-premultiplied; hue-less colors borrow the other stop's hue.
        const firstHue = a.lch[1] < 0.000004 ? b.lch[2] : a.lch[2];
        const secondHue = b.lch[1] < 0.000004 ? firstHue : b.lch[2];
        return interpolatedOklchCss(
          [channel(0), channel(1), interpolateHue(firstHue, secondHue, t)],
          alpha,
          output,
        );
      }
      const lab: Oklab = [channel(0), channel(1), channel(2)];
      return interpolatedCss(lab, alpha, output);
    },
  };
}

export function continuousSamples(scale: ContinuousScale, count = 17) {
  if (!Number.isSafeInteger(count) || count < 2 || count > 1025)
    throw new Error("Choose between 2 and 1025 presentation samples.");
  const positions = [
    ...new Set([
      ...scale.points.map((point) => point.position),
      ...Array.from({ length: count }, (_, index) => index / (count - 1)),
    ]),
  ].sort((a, b) => a - b);
  return positions.map((position) => ({
    position,
    value: scale.evaluate(position),
  }));
}

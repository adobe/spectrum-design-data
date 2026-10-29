// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createColorDefaults } from "../src/data/defaults";
import {
  analysisDomains,
  buildAnalysisScale,
  buildOutputProfile,
  decodeAnalysisColor,
  describeColor,
  findSlice,
  grayscaleForLightness,
  repairReference,
  sampleTrajectory,
  splitHueSamples,
  trajectorySample,
} from "../src/features/color-system/analysis";
import {
  planeCoordinates,
  planePosition,
} from "../src/features/color-system/colorPlane";
import {
  contrastRatio,
  luminance,
} from "../src/features/color-system/colorMath";
import { chartPath, chartSegments } from "../src/components/charts/chartPaths";
import {
  createColorFromCoords,
  getCanvasPixelColor,
  getColorSpaceConfig,
} from "../src/components/color-picker/colorUtils";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import { generateColors } from "../src/features/color-system/dynamicGeneration";
import {
  surfaceCss,
  surfaceLinear,
} from "../src/features/color-system/surfaceGeneration";
import {
  RasterCache,
  RasterQueue,
  rasterKey,
  renderColorRaster,
  type RasterSpec,
} from "../src/components/color-picker/colorRaster";

const near = (actual: number, expected: number, tolerance = 0.000001) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
const document = createColorDefaults();
const original = JSON.stringify(document);
for (const output of ["srgb", "display-p3", "oklch"] as const) {
  const scales = document.scales.map((scale) =>
    buildAnalysisScale(scale, output),
  );
  for (const scale of scales) {
    assert.equal(scale.samples[0].position, 0);
    assert.equal(scale.samples.at(-1)!.position, 1);
    assert.equal(
      new Set(scale.samples.map((sample) => sample.position)).size,
      scale.samples.length,
    );
    assert.equal(scale.keys.length, scale.data.scale.stops.length);
    assert.equal(scale.samples[0].hue, null);
    assert.equal(scale.samples.at(-1)!.hue, null);
    assert.equal(sampleTrajectory({ ...scale.data }), scale.samples);
    const plane = analysisDomains(scales);
    let segment = 0;
    for (let index = 0; index <= 2048; index += 1) {
      const position = index / 2048;
      while (
        segment + 1 < scale.samples.length - 1 &&
        scale.samples[segment + 1].position < position
      )
        segment += 1;
      const point = trajectorySample(scale.data, position);
      const a = planePosition(
        scale.samples[segment].lab[1],
        scale.samples[segment].lab[2],
        320,
        plane,
      );
      const b = planePosition(
        scale.samples[segment + 1].lab[1],
        scale.samples[segment + 1].lab[2],
        320,
        plane,
      );
      const p = planePosition(point.lab[1], point.lab[2], 320, plane);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = dx * dx + dy * dy;
      const fraction =
        length === 0
          ? 0
          : Math.max(
              0,
              Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length),
            );
      assert.ok(
        Math.hypot(p.x - a.x - fraction * dx, p.y - a.y - fraction * dy) <= 1,
        `${scale.name}: trajectory error exceeds 1 CSS pixel`,
      );
    }
    for (const level of [0, 0.25, 0.5, 0.75, 1]) {
      const slice = findSlice(scale.samples, level, (position) =>
        trajectorySample(scale.data, position),
      );
      assert.equal(slice.kind, "available");
      if (slice.kind === "available") near(slice.color.lightness, level, 0.001);
    }
  }
  const current = {
    ...document,
    settings: {
      ...document.settings,
      colorOutput: migrateLegacyColorOutput(output),
    },
  };
  const profile = buildOutputProfile(
    current,
    current.scales[1],
    current.surfaces[0],
    document.contrasts,
  );
  assert.equal(profile.length, current.contrasts.length);
  for (const stop of profile) {
    const gray = describeColor(
      decodeAnalysisColor(stop.grayscale, "srgb"),
      "srgb",
      stop.grayscale,
    );
    near(gray.lightness, stop.lightness, 0.001);
    near(gray.chroma, 0, 0.000001);
    assert.ok(Number.isFinite(stop.achieved));
    assert.ok(stop.achieved >= 1);
    const generator = generateColors(
      buildScaleData(current.scales[1], current.settings.colorOutput),
      surfaceLinear(current.surfaces[0], current),
      stop.target,
      current.settings,
    );
    assert.ok(
      stop.achieved >= stop.target,
      "Formatted output must not fall below the requested feasible contrast.",
    );
    assert.equal(stop.css, generator.dynamic.css);
    assert.equal(stop.calculated, generator.dynamic.measuredContrast);
    const gamut = output === "display-p3" ? "display-p3" : "srgb";
    near(
      stop.achieved,
      contrastRatio(
        luminance(decodeAnalysisColor(stop.css, gamut), gamut),
        luminance(
          decodeAnalysisColor(surfaceCss(current.surfaces[0], current), gamut),
          gamut,
        ),
      ),
    );
  }
}
assert.equal(JSON.stringify(document), original);
const scale = buildAnalysisScale(document.scales[1], "srgb");
const synthetic = (position: number) => ({
  ...scale.samples[0],
  position,
  lightness: position <= 0.5 ? position * 2 : (1 - position) * 2,
});
const selected = findSlice([0, 0.5, 1].map(synthetic), 0.5, synthetic);
assert.equal(selected.kind, "available");
if (selected.kind === "available") near(selected.color.position, 0.75);
assert.equal(
  findSlice([synthetic(0.2), synthetic(0.3)], 0.9, synthetic).kind,
  "unavailable",
);
assert.throws(() => findSlice([], NaN, synthetic));
assert.throws(() => decodeAnalysisColor("invalid color", "srgb"));
assert.throws(() => decodeAnalysisColor("rgb(0 0 0 / 50%)", "srgb"), /opaque/);
assert.throws(() => describeColor([NaN, 0, 0], "srgb", ""));
assert.throws(() =>
  buildAnalysisScale({ ...document.scales[0], stops: [] }, "srgb"),
);
assert.throws(
  () =>
    buildAnalysisScale(
      {
        ...document.scales[0],
        stops: [{ ...document.scales[0].stops[0], lightness: -1 }],
      },
      "srgb",
    ),
  /invalid key/,
);
const coincidentKeys = buildAnalysisScale(
  {
    ...document.scales[0],
    stops: [
      { ...document.scales[0].stops[0], id: "first" },
      { ...document.scales[0].stops[0], id: "second" },
    ],
  },
  "srgb",
).keys;
assert.deepEqual(
  coincidentKeys.map((key) => key.id),
  ["first", "second"],
);
assert.deepEqual(coincidentKeys[0].lab, coincidentKeys[1].lab);
const sharedScale = document.scales.find((scale) => !scale.customContrasts)!;
assert.deepEqual(
  buildOutputProfile(
    { ...document, contrasts: [] },
    sharedScale,
    document.surfaces[0],
    [],
  ),
  [],
);
assert.throws(
  () =>
    buildOutputProfile(
      { ...document, contrasts: [{ id: "bad", value: NaN }] },
      sharedScale,
      document.surfaces[0],
      [],
    ),
  /Contrast targets/,
);
near(
  describeColor(decodeAnalysisColor("#000000", "srgb"), "srgb", "").lightness,
  0,
  0.001,
);
near(
  describeColor(decodeAnalysisColor("#ffffff", "srgb"), "srgb", "").lightness,
  1,
  0.001,
);
for (const level of [0.001, 0.025, 0.05, 0.5, 0.999]) {
  near(
    describeColor(
      decodeAnalysisColor(grayscaleForLightness(level), "srgb"),
      "srgb",
      "",
    ).lightness,
    level,
    0.001,
  );
}
near(contrastRatio(luminance([0, 0, 0]), luminance([1, 1, 1])), 21, 0.01);
near(contrastRatio(0.5, 0.5), 1, 0.01);
const tooHigh = { ...document, contrasts: [{ id: "high", value: 100 }] };
assert.throws(
  () =>
    buildOutputProfile(
      tooHigh,
      sharedScale,
      document.surfaces[0],
      tooHigh.contrasts,
    ),
  /contrast target/,
);
const duplicates = {
  ...document,
  contrasts: [
    { id: "b", value: 4 },
    { id: "a", value: 1 },
    { id: "c", value: 4 },
  ],
};
assert.deepEqual(
  buildOutputProfile(
    duplicates,
    document.scales[1],
    document.surfaces[0],
    duplicates.contrasts,
  ).map((stop) => stop.id),
  ["a", "b", "c"],
);
assert.equal(
  repairReference([...document.scales].reverse(), document.scales[1].id)?.id,
  document.scales[1].id,
);
assert.equal(
  repairReference(document.scales, "removed")?.id,
  document.scales[0].id,
);
assert.equal(
  repairReference(document.scales, null, document.scales[1].id)?.id,
  document.scales[1].id,
);
assert.equal(repairReference([], "removed"), undefined);
const wraps = splitHueSamples([
  { ...scale.samples[1], hue: 359 },
  { ...scale.samples[2], hue: 1 },
  { ...scale.samples[3], hue: null },
]);
assert.equal(wraps[1].breakBefore, true);
assert.equal(wraps[2].y, null);

const domains = [
  [-0.4, 0.4],
  [-0.4, 0.4],
] as const;
for (const [a, b, x, y] of [
  [0.2, 0, 240, 160],
  [0, 0.2, 160, 80],
  [-0.2, 0, 80, 160],
  [0, -0.2, 160, 240],
]) {
  const point = planePosition(a, b, 320, domains);
  near(point.x, x, 0.01);
  near(point.y, y, 0.01);
  const coords = planeCoordinates(x, y, 320, domains);
  near(coords[0], a);
  near(coords[1], b);
}
assert.ok(planePosition(0.6, 0, 320, domains).x > 320);
const spec: RasterSpec = {
  size: 33,
  config: getColorSpaceConfig("OKlch", "cartesian"),
  channels: ["a", "b"],
  gamut: "sRGB",
  encoding: "srgb",
  colorScheme: "light",
  thirdChannelValue: 0.5,
  domains,
  outside: "transparent",
};
const pixels = renderColorRaster(spec);
assert.equal(pixels[3], 0);
const center = (16 * 33 + 16) * 4;
assert.equal(pixels[center + 3], 255);
assert.equal(pixels[center], 99);
assert.equal(pixels[center + 1], 99);
assert.equal(pixels[center + 2], 99);
for (const endpoint of [0, 1]) {
  const boundary = renderColorRaster({ ...spec, thirdChannelValue: endpoint });
  assert.equal(
    boundary.filter((value, index) => index % 4 === 3 && value === 255).length,
    1,
  );
  assert.equal(boundary[center], endpoint * 255);
  assert.equal(boundary[center + 3], 255);
  assert.equal(
    renderColorRaster({ ...spec, size: 32, thirdChannelValue: endpoint }).some(
      (value, index) => index % 4 === 3 && value !== 0,
    ),
    false,
  );
}
const p3 = renderColorRaster({
  ...spec,
  gamut: "Display-P3",
  encoding: "display-p3",
});
assert.ok(
  p3.filter((value, index) => index % 4 === 3 && value === 255).length >=
    pixels.filter((value, index) => index % 4 === 3 && value === 255).length,
);
assert.throws(() => renderColorRaster({ ...spec, thirdChannelValue: NaN }));
assert.throws(
  () => renderColorRaster({ ...spec, channels: ["a", "a"] }),
  /channels/,
);
assert.throws(
  () =>
    renderColorRaster({
      ...spec,
      domains: [
        [0, 0],
        [0, 1],
      ],
    }),
  /domains/,
);
assert.throws(() => renderColorRaster({ ...spec, size: 1025 }), /size/);
for (const space of ["sRGB", "Display P3"] as const) {
  const config = getColorSpaceConfig(space, "cartesian");
  for (const encoding of ["srgb", "display-p3"] as const) {
    const rendered = renderColorRaster({
      ...spec,
      size: 4,
      config,
      channels: ["r", "g"],
      gamut: space === "sRGB" ? "sRGB" : "Display-P3",
      thirdChannelValue: 0.3,
      domains: [
        [0.1, 0.9],
        [0.1, 0.9],
      ],
      encoding,
    });
    for (let y = 0; y < 4; y += 1)
      for (let x = 0; x < 4; x += 1) {
        const [r, g] = planeCoordinates(x + 0.5, y + 0.5, 4, [
          [0.1, 0.9],
          [0.1, 0.9],
        ]);
        const expected = getCanvasPixelColor(
          createColorFromCoords(config, [r, g, 0.3]),
          encoding,
        );
        const offset = (y * 4 + x) * 4;
        assert.equal(rendered[offset + 3], 255);
        expected.forEach((value, channel) =>
          near(rendered[offset + channel], value, 1),
        );
      }
  }
}
assert.notDeepEqual(
  getCanvasPixelColor(
    createColorFromCoords(getColorSpaceConfig("sRGB", "cartesian"), [1, 0, 0]),
    "srgb",
  ),
  getCanvasPixelColor(
    createColorFromCoords(getColorSpaceConfig("sRGB", "cartesian"), [1, 0, 0]),
    "display-p3",
  ),
);
assert.equal(rasterKey(spec), rasterKey({ ...spec, colorScheme: "dark" }));
const cache = new RasterCache(12);
cache.set("a", new Uint8ClampedArray(8));
cache.set("b", new Uint8ClampedArray(8));
assert.equal(cache.get("a"), undefined);
assert.ok(cache.bytes <= 12);
cache.set("b", new Uint8ClampedArray(4));
cache.set("c", new Uint8ClampedArray(4));
cache.get("b");
cache.set("d", new Uint8ClampedArray(8));
assert.equal(cache.get("c"), undefined);
assert.ok(cache.get("b"));
cache.set("b", new Uint8ClampedArray(20));
assert.equal(cache.get("b"), undefined);
assert.ok(cache.bytes <= 12);
const queue = new RasterQueue();
queue.request("a", spec);
const first = queue.take()!;
queue.request("b", spec);
queue.request("c", spec);
assert.equal(queue.take(), null);
assert.equal(queue.finish(first.id), false);
assert.equal(queue.take()!.key, "c");
assert.equal(queue.finish(queue.current), true);
queue.request("same", spec);
const same = queue.take()!;
queue.request("obsolete", spec);
queue.request("same", spec);
assert.equal(queue.pending, null);
assert.equal(queue.finish(999), false);
assert.equal(queue.running?.id, same.id);
assert.equal(queue.finish(same.id), true);
const points = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 0 },
];
assert.equal(chartPath(points, "steps"), "M0,0H0.5V1H1H1.5V0H2");
assert.ok(chartPath(points, "curve").includes(" 1,1"));
assert.equal(
  chartSegments([
    { x: 0, y: 0 },
    { x: 1, y: null },
    { x: 2, y: 2 },
  ]).length,
  2,
);
assert.equal(
  chartSegments([
    { x: 0, y: 0 },
    { x: 1, y: 1, breakBefore: true },
  ]).length,
  2,
);
assert.equal(chartPath([{ x: 1, y: 2 }], "curve"), "M1,2");
assert.equal(chartPath([]), "");
assert.throws(() => chartPath([{ x: 0, y: NaN }]));
assert.throws(
  () =>
    chartPath([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]),
  /increase/,
);
assert.throws(
  () =>
    chartPath([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]),
  /increase/,
);
for (const values of [
  [0, 1, 0],
  [1, 1, 1],
  [0, 0, 10, 11],
  [100, 0, 0.001, 0],
  [0, 2, 4, 9, 9],
]) {
  const observations = values.map((y, index) => ({
    x: index * index + index / 10,
    y,
  }));
  const curves = [
    ...chartPath(observations, "curve").matchAll(/C([^CMLHV]+)/g),
  ];
  assert.equal(curves.length, observations.length - 1);
  curves.forEach((match, index) => {
    const [x1, y1, x2, y2, x3, y3] = match[1]
      .trim()
      .split(/[,\s]+/)
      .map(Number);
    const start = observations[index];
    const end = observations[index + 1];
    near(x3, end.x);
    near(y3, end.y);
    for (let sample = 0; sample <= 100; sample += 1) {
      const t = sample / 100;
      const bezier = (a: number, b: number, c: number, d: number) =>
        (1 - t) ** 3 * a +
        3 * (1 - t) ** 2 * t * b +
        3 * (1 - t) * t ** 2 * c +
        t ** 3 * d;
      const x = bezier(start.x, x1, x2, x3);
      const y = bezier(start.y, y1, y2, y3);
      assert.ok(x >= start.x - 1e-8 && x <= end.x + 1e-8);
      assert.ok(
        y >= Math.min(start.y, end.y) - 1e-8 &&
          y <= Math.max(start.y, end.y) + 1e-8,
        "Curve overshoots observations",
      );
    }
  });
}
console.log("Color analysis, raster, geometry, and chart path checks passed.");
import { migrateLegacyColorOutput } from "../src/features/color-system/outputSettings";

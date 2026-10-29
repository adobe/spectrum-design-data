// Copyright 2026 Adobe. All rights reserved.
import {
  renderColorRaster,
  type RasterRequest,
  type RasterResponse,
} from "./colorRaster";

self.onmessage = ({ data }: MessageEvent<RasterRequest>) => {
  try {
    const pixels = renderColorRaster(data.spec);
    const response: RasterResponse = {
      id: data.id,
      key: data.key,
      pixels: pixels.buffer,
    };
    self.postMessage(response, { transfer: [pixels.buffer] });
  } catch (failure) {
    const response: RasterResponse = {
      id: data.id,
      key: data.key,
      error: failure instanceof Error ? failure.message : String(failure),
    };
    self.postMessage(response);
  }
};

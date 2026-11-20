// Copyright 2026 Adobe. All rights reserved.
import { studioDataset as dataset } from "../../data/studioData.generated";
import { isOpacityDocument, type OpacityDocument } from "./model";

const defaults = dataset.system.foundations.opacity;
if (!isOpacityDocument(defaults))
  throw new Error("The shipped opacity foundation is invalid.");
export const OPACITY_DEFAULTS: OpacityDocument = defaults;
export const DEFAULT_SHADOW_OPACITY_ID = "ce890e6f-73d8-4941-8c63-dcbbd11efad9";

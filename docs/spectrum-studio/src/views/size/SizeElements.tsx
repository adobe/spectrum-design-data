// Copyright 2026 Adobe. All rights reserved.
import { generatedSizeAtom } from "../../features/size/state";
import { DimensionElements } from "../spacing/SpacingElements";

export function SizeElements() {
  return (
    <DimensionElements
      title="Size"
      noun="size"
      generatedAtom={generatedSizeAtom}
    />
  );
}

// Copyright 2026 Adobe. All rights reserved.
import { ProgressCircle } from "@react-spectrum/s2";
import { useIconSample } from "../../features/icons/useIconSample";
import { spectrumIconLoaders, type SpectrumIconName } from "../../features/icons/spectrumIconCatalog.generated";
import type { ResolvedElement } from "../../features/structures/elementResolution";
import placeholder from "../../assets/structure-visual.svg";

function Glyph({ name }: { name: string }) {
  if (!Object.hasOwn(spectrumIconLoaders, name)) throw new Error(`Unsupported template glyph: ${name}.`);
  return <LoadedGlyph name={name as SpectrumIconName} />;
}
function LoadedGlyph({ name }: { name: SpectrumIconName }) {
  const result = useIconSample(name);
  return result.status === "ready" ? <result.Icon aria-hidden="true" UNSAFE_style={{ width: "100%", height: "100%" }} />
    : result.status === "error" ? <span role="alert">{result.message}</span>
    : <ProgressCircle size="S" isIndeterminate aria-label={`Loading ${name} icon`} />;
}
export function StructureElementPreview({ resolved }: { resolved: ResolvedElement }) {
  const { element } = resolved;
  return <span className={`structureElementContent structureElement-${element.kind}`} style={resolved.styles} data-element-kind={element.kind}>
    {element.kind === "text" ? "Text" : element.kind === "visual" ? <img src={placeholder} alt="" />
      : element.kind === "bar" ? null : <Glyph name={element.glyph!} />}
  </span>;
}

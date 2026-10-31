// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { useLayoutEffect, useRef, useState } from "react";
import { structureThumbnailPreviewAtom } from "../../features/structures/thumbnail";
import { rulesAtom } from "../../features/logic/library";
import { workingTshirtArtifactsAtom } from "../../features/design-data/tshirtState";
import { structuresDocumentAtom } from "../../features/structures/documentState";
import type { Structure } from "../../features/structures/model";
import { StructureOptionSample } from "./StructureOptionSample";

export function StructureThumbnail({ structure }: { structure: Structure }) {
  const preview = useAtomValue(structureThumbnailPreviewAtom);
  const rules = useAtomValue(rulesAtom);
  const generation = useAtomValue(workingTshirtArtifactsAtom);
  const catalog = useAtomValue(structuresDocumentAtom).structures;
  const host = useRef<HTMLDivElement>(null);
  const natural = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const root = host.current,
      sample = natural.current;
    if (!root || !sample) return;
    const measure = () =>
      setScale(
        Math.min(
          1,
          root.clientWidth / Math.max(1, sample.scrollWidth),
          root.clientHeight / Math.max(1, sample.scrollHeight),
        ),
      );
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(sample);
    measure();
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} className="structureThumbnail" aria-hidden="true" inert>
      <div
        ref={natural}
        className="structureThumbnailNatural"
        style={{ transform: `scale(${scale})` }}
      >
        {preview.status === "error" ? (
          <span role="alert">{preview.error}</span>
        ) : (
          <StructureOptionSample
            structure={structure}
            catalog={catalog}
            references={preview.references}
            rules={rules}
            bundle={
              generation.status === "ready" ? generation.bundle : undefined
            }
            mode={preview.selection}
          />
        )}
      </div>
    </div>
  );
}

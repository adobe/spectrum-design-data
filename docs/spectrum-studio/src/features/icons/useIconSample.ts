// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useState } from "react";
import {
  spectrumIconLoaders,
  type SpectrumIconName,
} from "./spectrumIconCatalog.generated";

type IconModule = Awaited<ReturnType<(typeof spectrumIconLoaders)["Home"]>>;
type IconResult = { name: SpectrumIconName } & (
  | { status: "ready"; Icon: IconModule["default"] }
  | { status: "error"; message: string }
);
const cache = new Map<SpectrumIconName, Promise<IconModule>>();

function loadIcon(name: SpectrumIconName) {
  let pending = cache.get(name);
  if (!pending) {
    pending = spectrumIconLoaders[name]();
    cache.set(name, pending);
    void pending.catch(() => cache.delete(name));
  }
  return pending;
}

export function useIconSample(name: SpectrumIconName, enabled = true) {
  const [result, setResult] = useState<IconResult>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void loadIcon(name).then(
      ({ default: Icon }) => {
        if (active) setResult({ name, status: "ready", Icon });
      },
      (error: unknown) => {
        if (active)
          setResult({
            name,
            status: "error",
            message: `Could not load ${name}: ${error instanceof Error ? error.message : String(error)}`,
          });
      },
    );
    return () => {
      active = false;
    };
  }, [name, enabled]);
  return result?.name === name ? result : { name, status: "loading" as const };
}

// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../../components/notifications/notificationContext";
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { authoringSnapshotAtom } from "../../../features/edit-session/state";
import { buildDataVisSourcePacket } from "../../../features/color-system/data-vis/export";
import { CodeBlock } from "../../../components/CodeBlock";
import { buildDataVisCategoricalCss } from "../../../features/color-system/data-vis/css";
import { completeAliasSource } from "../../../features/tokens/aliasTargets";

const layout = style({
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflow: "auto",
  minHeight: 0,
});
const row = style({ display: "flex", flexWrap: "wrap", gap: 8 });
function download(value: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
export function DataVisCode() {
  const notify = useNotify();
  const source = useAtomValue(authoringSnapshotAtom),
    [error, setError] = useState("");
  const result = useMemo(() => {
    try {
      return {
        packet: buildDataVisSourcePacket(source),
        css: buildDataVisCategoricalCss(completeAliasSource(source)),
        error: "",
      };
    } catch (failure) {
      return {
        packet: null,
        css: "",
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [source]);
  const packet = result.packet,
    json = packet ? JSON.stringify(packet, null, 2) : "";
  const first = packet?.color.dataVisScales[0];
  const usage = `import {createDataVisRuntime} from './data-vis.js';
import packet from './data-vis.json' with {type: 'json'};

const runtime = createDataVisRuntime(packet);
${
  first
    ? first.kind === "categorical"
      ? `const colors = runtime.categorical(${JSON.stringify(first.name)});`
      : `const color = runtime.continuous(${JSON.stringify(first.name)});
const output = color(0.37); // Your chart owns data normalization.`
    : "// Add a published data vis scale to export its recipe."
}

// Rebuild the context once when modes or adaptive controls change.
const adjusted = runtime.withContext({contrastMultiplier: 1.25});`;
  return (
    <div className={layout} data-component="DataVisCode">
      <h1>Data vis export</h1>
      <Text>
        This is a separate JavaScript adapter. The existing UI color library
        remains CSS-only. The packet contains recipes and their required source
        geometry, modes and manual edits, not current-mode hex snapshots.
      </Text>
      {!first && <Text>Add a published data vis scale before exporting.</Text>}
      {(result.error || error) && <p role="alert">{result.error || error}</p>}
      <CodeBlock code={usage} language="javascript" />
      <div className={row}>
        <Button
          variant="secondary"
          isDisabled={!first || !packet}
          onPress={() => download(json, "data-vis.json", "application/json")}
        >
          Download source packet
        </Button>
        <Button
          variant="secondary"
          isDisabled={
            !packet?.color.dataVisScales.some(
              (scale) => scale.kind === "categorical",
            )
          }
          onPress={() => download(result.css, "data-vis.css", "text/css")}
        >
          Download categorical CSS
        </Button>
        <Button
          variant="secondary"
          isDisabled={!first}
          onPress={async () => {
            try {
              const response = await fetch(
                `${import.meta.env.BASE_URL}data-vis/data-vis.js`,
              );
              if (
                !response.ok ||
                response.headers.get("content-type")?.includes("text/html")
              )
                throw new Error(
                  "Build the adapter with pnpm build:data-vis before downloading.",
                );
              const module = await response.text();
              if (!module.includes("createDataVisRuntime"))
                throw new Error(
                  "The compiled data vis adapter is unavailable.",
                );
              download(module, "data-vis.js", "text/javascript");
              setError("");
            } catch (failure) {
              setError(
                failure instanceof Error ? failure.message : String(failure),
              );
            }
          }}
        >
          Download JavaScript adapter
        </Button>
        <Button
          variant="secondary"
          isDisabled={!first}
          onPress={async () => {
            try {
              await navigator.clipboard.writeText(json);
              notify.copied();
            } catch (failure) {
              setError(
                failure instanceof Error ? failure.message : String(failure),
              );
            }
          }}
        >
          Copy source packet
        </Button>
      </div>
      <CodeBlock code={json} language="json" />
      <h2>Categorical CSS</h2>
      <Text>
        These are exact authored-mode values. Optional class rules reuse an
        existing UI-scale variable only on an element with the matching UI
        classes. Use the JavaScript adapter for continuous functions or fluid
        updates.
      </Text>
      <CodeBlock code={result.css} language="css" />
    </div>
  );
}

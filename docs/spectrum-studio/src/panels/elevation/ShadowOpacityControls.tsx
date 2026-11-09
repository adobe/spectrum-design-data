// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { useAtomValue } from "jotai";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import {
  normalizeNumericEntry,
  numericEntryValue,
} from "../../components/fields/tokenEntry";
import type { ShadowLayer } from "../../features/elevation/model";
import { opacityResultAtom } from "../../features/opacity/state";

export function ShadowOpacityControls({
  layer,
  isReadOnly,
  onChange,
}: {
  layer: ShadowLayer;
  isReadOnly: boolean;
  onChange: (patch: Partial<Omit<ShadowLayer, "id">>) => void;
}) {
  const result = useAtomValue(opacityResultAtom);
  const token = result.levels.find(
    (level) => level.id === layer.opacityTokenId,
  );
  const manual =
    layer.manualOpacity ??
    (layer.opacity === undefined ? undefined : layer.opacity / 100);
  const issue =
    result.issues.join(" ") ||
    (layer.opacityTokenId && !token
      ? "This opacity token is unavailable. Choose another token or enter a percentage."
      : undefined);
  if (isReadOnly)
    return (
      <Text>
        {token
          ? `${token.name}: ${token.value * 100}%`
          : manual !== undefined
            ? `Opacity: ${manual * 100}% (manual)`
            : issue}
      </Text>
    );
  return (
    <TokenComboBox
      label="Opacity"
      isRequired
      selectedKey={layer.opacityTokenId ?? null}
      options={result.levels.map((level) => ({
        id: level.id,
        kind: "token" as const,
        name: level.name,
        displayValue: `${level.value * 100}%`,
      }))}
      error={issue}
      normalizeValue={(text) => normalizeNumericEntry(text, "%")}
      customValue={{
        displayValue: manual === undefined ? "" : `${manual * 100}%`,
        onAccept: (text) => {
          const percentage = numericEntryValue(text, "%");
          if (percentage === undefined || percentage < 0 || percentage > 100)
            throw new Error("Enter an opacity between 0% and 100%.");
          onChange({
            opacityTokenId: undefined,
            opacity: undefined,
            manualOpacity: percentage / 100,
          });
        },
      }}
      onChange={(id) => {
        if (id)
          onChange({
            opacityTokenId: id,
            manualOpacity: undefined,
            opacity: undefined,
          });
      }}
    />
  );
}

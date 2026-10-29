// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { useAtomValue } from "jotai";
import { EditableNumberField } from "../../components/editable";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
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
      ? "This opacity token is unavailable. Choose another token or a manual percentage."
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
    <>
      <TokenComboBox
        label="Opacity"
        selectedKey={layer.opacityTokenId ?? "manual"}
        options={[
          {
            id: "manual",
            kind: "preset",
            name: "Manual percentage",
            displayValue: "Manual",
          },
          ...result.levels.map((level) => ({
            id: level.id,
            kind: "token" as const,
            name: level.name,
            displayValue: `${level.value * 100}%`,
          })),
        ]}
        error={issue}
        onChange={(id) => {
          if (id === "manual")
            onChange({
              opacityTokenId: undefined,
              opacity: undefined,
              manualOpacity: token?.value ?? manual ?? 0.2,
            });
          else if (id)
            onChange({
              opacityTokenId: id,
              manualOpacity: undefined,
              opacity: undefined,
            });
        }}
      />
      {manual !== undefined && !layer.opacityTokenId && (
        <EditableNumberField
          label="Opacity (%) — manual"
          value={manual * 100}
          minValue={0}
          maxValue={100}
          onChange={(value) =>
            onChange({ manualOpacity: value / 100, opacity: undefined })
          }
        />
      )}
    </>
  );
}

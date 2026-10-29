// Copyright 2026 Adobe. All rights reserved.
import { PickerItem, TextField } from "@react-spectrum/s2";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useMemo, useState } from "react";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { generateDimensionScale } from "../../features/scales/foundation";
import {
  resolveBaseValue,
  resolveParameterValues,
} from "../../features/scales/scaleType";
import { dimensionExampleInput } from "../../../tests/fixtures/dimension-foundations";
import {
  DimensionScaleCard,
  type DimensionScaleCardProps,
} from "./DimensionScaleCard";

function CardFixture({
  fixedValues,
  ...args
}: DimensionScaleCardProps & {
  fixedValues?: DimensionScaleCardProps["values"];
}) {
  const initial = useMemo(() => {
    const input = dimensionExampleInput();
    const spacing = input.scaleTypes.find(
      (formula) => formula.id === "scale-type-spacing",
    )!;
    input.scaleTypes = [
      ...input.scaleTypes,
      {
        ...spacing,
        id: "story-locked-spacing",
        name: "Locked spacing",
        base: { ...spacing.base, overridable: false },
        parameters: spacing.parameters.map((part) => ({
          ...part,
          overridable: false,
        })),
      },
    ];
    return input;
  }, []);
  const [scale, setScale] = useState(args.scale);
  const formula = initial.scaleTypes.find(
    (formula) => formula.id === scale.scaleTypeId,
  )!;
  const parameters = resolveParameterValues(formula, scale.parameters);
  const patch = (next: Partial<typeof scale>) =>
    setScale((scale) => ({ ...scale, ...next }));
  const disabled = args.isReadOnly;
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 360,
        backgroundColor: "var(--spectrum-gray-50)",
      }}
    >
      <DimensionScaleCard
        {...args}
        scale={scale}
        values={
          fixedValues ??
          generateDimensionScale(
            args.noun,
            scale,
            initial.rules,
            initial.scaleTypes,
          )
        }
        onPublishingChange={(hideFromPublishing) => {
          patch({ hideFromPublishing });
          args.onPublishingChange(hideFromPublishing);
        }}
        nameField={
          <TextField
            label="Name"
            value={scale.name}
            isReadOnly={disabled}
            onChange={(name) => patch({ name })}
            isRequired
            isInvalid={!scale.name.trim()}
            errorMessage="Enter a name."
          />
        }
        formulaField={
          <Picker
            label="Formula"
            selectedKey={scale.scaleTypeId}
            isDisabled={disabled}
            onSelectionChange={(key) => {
              if (typeof key === "string")
                patch({ scaleTypeId: key, parameters: {}, base: undefined });
            }}
          >
            {initial.scaleTypes.map((formula) => (
              <PickerItem key={formula.id} id={formula.id}>
                {formula.name}
              </PickerItem>
            ))}
          </Picker>
        }
        variables={
          <>
            <NumberField
              label="Base value"
              value={resolveBaseValue(formula, scale.base)}
              isDisabled={disabled || !formula.base.overridable}
              onChange={(base) => {
                if (Number.isFinite(base)) patch({ base });
              }}
            />
            {formula.parameters.map((part) => (
              <NumberField
                key={part.id}
                label={part.label}
                value={parameters[part.id]}
                isDisabled={disabled || !part.overridable}
                step={part.step}
                minValue={part.min}
                maxValue={part.max}
                onChange={(value) => {
                  if (Number.isFinite(value))
                    patch({
                      parameters: { ...scale.parameters, [part.id]: value },
                    });
                }}
              />
            ))}
            <NumberField
              label="Smaller values"
              value={scale.below}
              isDisabled={disabled}
              minValue={0}
              maxValue={9}
              onChange={(below) => {
                if (Number.isFinite(below)) patch({ below });
              }}
            />
            <NumberField
              label="Larger values"
              value={scale.above}
              isDisabled={disabled}
              minValue={0}
              maxValue={40}
              onChange={(above) => {
                if (Number.isFinite(above)) patch({ above });
              }}
            />
          </>
        }
        roundingField={
          <Picker
            label="Rounding"
            selectedKey={scale.roundingRuleId}
            isDisabled={disabled}
            onSelectionChange={(key) => {
              if (typeof key === "string") patch({ roundingRuleId: key });
            }}
          >
            {initial.rules.map((rule) => (
              <PickerItem key={rule.id} id={rule.id}>
                {rule.name}
              </PickerItem>
            ))}
          </Picker>
        }
      />
    </div>
  );
}

const input = dimensionExampleInput();
const meta = {
  title: "Panels/Dimension scale card",
  component: DimensionScaleCard,
  render: (args) => <CardFixture {...args} />,
  parameters: { layout: "padded" },
  args: {
    noun: "spacing",
    scale: input.scale,
    values: input.values,
    isReadOnly: false,
    canDelete: true,
    nameField: null,
    formulaField: null,
    variables: null,
    roundingField: null,
    onDelete: fn(),
    onPublishingChange: fn(),
  },
} satisfies Meta<typeof DimensionScaleCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const accordion = canvas.getByRole("button", { name: "Formula variables" });
    await expect(accordion).toHaveAttribute("aria-expanded", "true");
    const base = canvas.getByRole("textbox", { name: "Base value" });
    await userEvent.clear(base);
    await userEvent.type(base, "12");
    await userEvent.tab();
    await expect(base).toHaveValue("12");
    accordion.focus();
    await userEvent.keyboard(" ");
    await expect(accordion).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{Enter}");
    await expect(accordion).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.queryByRole("button", { name: /Ratio preset/ }),
    ).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  name: "Read-only",
  args: { isReadOnly: true },
};
export const Size: Story = {
  args: {
    noun: "size",
    scale: {
      ...input.scale,
      name: "Size example",
      scaleTypeId: "scale-type-size",
      base: undefined,
    },
  },
};
export const LastScale: Story = {
  name: "Last scale",
  args: { canDelete: false },
};
export const Overridden: Story = {
  args: { scale: { ...input.scale, base: 12, parameters: { ratio: 1.5 } } },
};
export const Locked: Story = {
  args: {
    scale: {
      ...input.scale,
      scaleTypeId: "story-locked-spacing",
      base: undefined,
    },
  },
};
export const Invalid: Story = {
  name: "Non-positive values",
  args: { scale: { ...input.scale, base: 0 } },
};
export const DuplicateValues: Story = { name: "Duplicate values" };
export const InvalidValues: Story = {
  name: "Invalid values",
  render: (args) => <CardFixture {...args} fixedValues={args.values} />,
  args: {
    values: input.values.map((value, index) => ({
      ...value,
      value: index === 0 ? NaN : index + 1,
    })),
  },
};
export const MixedIssues: Story = {
  name: "Mixed issues",
  render: (args) => <CardFixture {...args} fixedValues={args.values} />,
  args: {
    values: input.values.map((value, index) => ({
      ...value,
      value:
        index === input.values.length - 1
          ? NaN
          : index === input.values.length - 2
            ? 0
            : value.value,
    })),
  },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

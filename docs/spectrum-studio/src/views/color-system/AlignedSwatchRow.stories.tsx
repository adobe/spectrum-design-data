// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { AlignedSwatchRow } from "./AlignedSwatchRow";
import { alignedSwatchCellStyles } from "./alignedSwatchStyles";

const cellPresentationStyles = style({
  alignItems: "center",
  justifyContent: "center",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
});
const cellStyles = `${alignedSwatchCellStyles} ${cellPresentationStyles}`;

const meta = {
  title: "Views/Aligned swatch row",
  component: AlignedSwatchRow,
  parameters: { layout: "padded" },
  args: {
    label: "Opacity",
    children: (
      <>
        <div className={cellStyles}>2%</div>
        <div className={cellStyles}>20%</div>
        <div className={cellStyles}>100%</div>
      </>
    ),
  },
  render: ({ label, children }) => (
    <div style={{ width: "100%", overflow: "auto" }}>
      <AlignedSwatchRow label={label} isScaleLabel>
        {children}
      </AlignedSwatchRow>
      <AlignedSwatchRow label="Opacity">
        <>
          <div className={cellStyles}>
            <Text>2%</Text>
          </div>
          <div className={cellStyles}>
            <Text>20%</Text>
          </div>
          <div className={cellStyles}>
            <Text>100%</Text>
          </div>
        </>
      </AlignedSwatchRow>
    </div>
  ),
} satisfies Meta<typeof AlignedSwatchRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Aligned: Story = {};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};

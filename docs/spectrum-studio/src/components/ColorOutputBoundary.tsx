// Copyright 2026 Adobe. All rights reserved.
import { Component, type ReactNode } from "react";
import { ColorOutputError } from "../features/color-system/outputContrast";
import { useAtomValue } from "jotai";
import { tokenOverridesAtom } from "../features/tokens/overrides";
import { browserTokenEditsAtom } from "../features/tokens/browserEdits";
import { colorSystemDocumentAtom } from "../features/color-system/state";
import { opacityDocumentAtom } from "../features/opacity/state";
import { ColorScaleOutputError } from "../features/color-system/colorScaleType";
import { modeSelectionAtom } from "../features/modes/selection";
import { modeSetsAtom } from "../features/modes/state";
import { previewOverridesAtom } from "../features/modes/previewState";

export function CurrentColorOutputBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const document = useAtomValue(colorSystemDocumentAtom);
  const opacity = useAtomValue(opacityDocumentAtom);
  const selection = useAtomValue(modeSelectionAtom);
  const modes = useAtomValue(modeSetsAtom);
  const preview = useAtomValue(previewOverridesAtom);
  const overrides = useAtomValue(tokenOverridesAtom),
    edits = useAtomValue(browserTokenEditsAtom);
  return (
    <ColorOutputBoundary
      revision={[
        document,
        opacity,
        overrides,
        edits,
        selection,
        modes,
        preview,
      ]}
    >
      {children}
    </ColorOutputBoundary>
  );
}

export class ColorOutputBoundary extends Component<
  { children: ReactNode; revision: readonly unknown[] },
  {
    error: ColorOutputError | ColorScaleOutputError | null;
    revision: readonly unknown[];
  }
> {
  state = {
    error: null as ColorOutputError | ColorScaleOutputError | null,
    revision: this.props.revision,
  };

  static getDerivedStateFromError(error: unknown) {
    if (
      !(error instanceof ColorOutputError) &&
      !(error instanceof ColorScaleOutputError)
    )
      throw error;
    return { error };
  }

  static getDerivedStateFromProps(
    props: { revision: readonly unknown[] },
    state: { revision: readonly unknown[] },
  ) {
    return props.revision.length === state.revision.length &&
      props.revision.every((value, index) => value === state.revision[index])
      ? null
      : { error: null, revision: props.revision };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section role="alert" style={{ padding: 24 }}>
        <h2>Color output unavailable</h2>
        <p>{this.state.error.message}</p>
        <p>
          Your authored colors have not changed. Adjust Color settings in
          Foundations, or revert the affected color edit in Changes. Output will
          return when the affected inputs are available and any contrast targets
          can be met.
        </p>
      </section>
    );
  }
}

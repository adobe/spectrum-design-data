// Copyright 2026 Adobe. All rights reserved.
import { Component, type ReactNode } from "react";
import { ColorOutputError } from "../features/color-system/outputContrast";
import { useAtomValue } from "jotai";
import { resolvedColorSystemDocumentAtom } from "../features/color-system/state";
import { tokenOverridesAtom } from "../features/tokens/overrides";
import { browserTokenEditsAtom } from "../features/tokens/browserEdits";

export function CurrentColorOutputBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const document = useAtomValue(resolvedColorSystemDocumentAtom);
  const overrides = useAtomValue(tokenOverridesAtom),
    edits = useAtomValue(browserTokenEditsAtom);
  return (
    <ColorOutputBoundary revision={[document, overrides, edits]}>
      {children}
    </ColorOutputBoundary>
  );
}

export class ColorOutputBoundary extends Component<
  { children: ReactNode; revision: readonly unknown[] },
  { error: ColorOutputError | null; revision: readonly unknown[] }
> {
  state = {
    error: null as ColorOutputError | null,
    revision: this.props.revision,
  };

  static getDerivedStateFromError(error: unknown) {
    if (!(error instanceof ColorOutputError)) throw error;
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
          return when its contrast target can be met.
        </p>
      </section>
    );
  }
}

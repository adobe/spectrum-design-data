// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useMemo, useState } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Heading,
} from "@react-spectrum/s2";
import { saveTokenDialogAtom } from "../../features/tokens/dialogState";
import {
  browserModeContextAtom,
  browserTokensAtom,
} from "../../features/tokens/browserState";
import {
  componentsDocumentAtom,
  selectedComponentIdAtom,
} from "../../features/components/documentState";
import { activePageAtom } from "../../state/view/navigation";
import { modeSetsAtom } from "../../features/modes/state";
import { editModeAtom } from "../../state/view/editMode";
import { authoringSnapshotAtom } from "../../features/edit-session/state";
import { tokenComponentUsage } from "../../features/tokens/dialogModel";
import type { CanonicalAliasRow } from "../../features/tokens/aliasTargets";
import {
  afterNextPaint,
  tokenInspectorDataAtom,
  tokenInspectorWarmAtom,
} from "../../features/tokens/inspectorWarmup";
import { TokenInspector } from "./TokenInspector";

type InspectorData = ReturnType<(typeof tokenInspectorDataAtom)["read"]>;

const pendingDataAtom = atom<InspectorData | null>(null);
const NO_ROWS: CanonicalAliasRow[] = [];
const NO_IDS: ReadonlySet<string> = new Set();

export function TokenInspectorContainer({
  id,
  onClose,
  onOpenToken,
}: {
  id: string;
  onClose: () => void;
  onOpenToken: (id: string) => void;
}) {
  const live = useAtomValue(browserTokensAtom);
  const warm = useAtomValue(tokenInspectorWarmAtom);
  const markWarm = useSetAtom(tokenInspectorWarmAtom);
  const [liveToken] = useState(() => live.find((item) => item.id === id));
  // Show the dialog frame first only when the heavy data is not cached yet.
  const [startedCold] = useState(() => !warm && !!liveToken);
  const [ready, setReady] = useState(!startedCold);
  useEffect(
    () => (ready ? undefined : afterNextPaint(() => setReady(true))),
    [ready],
  );
  const data = useAtomValue<InspectorData | null>(
    ready ? tokenInspectorDataAtom : pendingDataAtom,
  );
  const [loaded, setLoaded] = useState<{
    catalog: InspectorData["catalog"];
    token: typeof liveToken;
  } | null>(null);
  if (data && !loaded)
    setLoaded({
      catalog: data.catalog,
      token:
        liveToken ??
        (data.catalog.status === "ready"
          ? data.catalog.rows.find((row) => row.token.id === id)?.token
          : undefined),
    });
  useEffect(() => {
    if (loaded) markWarm(true);
  }, [loaded, markWarm]);
  const snapshot = useAtomValue(authoringSnapshotAtom);
  const mode = useAtomValue(browserModeContextAtom);
  const components = useAtomValue(componentsDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const isEditing = useAtomValue(editModeAtom);
  const save = useSetAtom(saveTokenDialogAtom);
  const selectComponent = useSetAtom(selectedComponentIdAtom);
  const selectPage = useSetAtom(activePageAtom);
  const catalog =
    loaded?.catalog.status === "ready" ? loaded.catalog : undefined;
  const usageTokens = data?.usageCatalog.tokens;
  const usage = useMemo(
    () =>
      catalog && usageTokens
        ? tokenComponentUsage(
            id,
            catalog.rows,
            components.components,
            usageTokens,
          )
        : [],
    [catalog, components, id, usageTokens],
  );
  const provenance = data?.provenance;
  if (loaded && (!catalog || provenance?.status !== "ready" || !loaded.token)) {
    const message =
      loaded.catalog.status !== "ready"
        ? loaded.catalog.error
        : provenance && provenance.status !== "ready"
          ? provenance.error
          : "This token is no longer available.";
    return (
      <DialogContainer onDismiss={onClose}>
        <Dialog size="M">
          <Heading slot="title">Token details unavailable</Heading>
          <Content>
            <p role="alert">{message}</p>
          </Content>
          <ButtonGroup>
            <Button onPress={onClose}>Close</Button>
          </ButtonGroup>
        </Dialog>
      </DialogContainer>
    );
  }
  const token = (loaded?.token ?? liveToken)!;
  const source = catalog?.snapshot ?? snapshot;
  const aliases = catalog
    ? live.filter(
        (item) =>
          item.id !== id &&
          (item.referenceId === id ||
            (item.alias &&
              catalog.rows.some(
                (row) => row.token.id === id && row.id === item.alias?.$ref,
              ))),
      )
    : [];
  return (
    <TokenInspector
      isLoading={!catalog}
      revealContent={startedCold}
      token={token}
      rows={catalog?.rows ?? NO_ROWS}
      edits={source.browserTokenEdits ?? {}}
      taxonomy={source.taxonomy!}
      modeSets={modeSets}
      modeKey={mode.key}
      isEditing={isEditing}
      releasedIds={provenance?.status === "ready" ? provenance.ids : NO_IDS}
      settings={source.colorSystem.settings.colorOutput}
      colorSystem={source.colorSystem}
      aliases={aliases}
      components={usage}
      usageError={data?.usageCatalog.error}
      onSave={(draft) => {
        if (catalog) save({ draft, expected: catalog.snapshot });
      }}
      onClose={onClose}
      onOpenToken={onOpenToken}
      onOpenComponent={(componentId) => {
        selectComponent(componentId);
        selectPage("components");
        onClose();
      }}
    />
  );
}

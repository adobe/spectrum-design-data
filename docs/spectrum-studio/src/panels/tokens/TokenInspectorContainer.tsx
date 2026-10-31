// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Heading,
} from "@react-spectrum/s2";
import {
  tokenDialogCatalogAtom,
  saveTokenDialogAtom,
  shippedTokenIdsAtom,
} from "../../features/tokens/dialogState";
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
import { tokenComponentUsage } from "../../features/tokens/dialogModel";
import { TokenInspector } from "./TokenInspector";
import { componentTokensAtom } from "../../features/components/state";

const usageCatalogAtom = atom((get) => {
  try {
    return { tokens: get(componentTokensAtom), error: undefined };
  } catch (failure) {
    return {
      tokens: [],
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});

export function TokenInspectorContainer({
  id,
  onClose,
  onOpenToken,
  issues,
}: {
  id: string;
  onClose: () => void;
  onOpenToken: (id: string) => void;
  issues?: readonly string[];
}) {
  const currentCatalog = useAtomValue(tokenDialogCatalogAtom);
  const [catalog] = useState(currentCatalog);
  const provenance = useAtomValue(shippedTokenIdsAtom);
  const live = useAtomValue(browserTokensAtom);
  const mode = useAtomValue(browserModeContextAtom);
  const components = useAtomValue(componentsDocumentAtom);
  const usageCatalog = useAtomValue(usageCatalogAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const isEditing = useAtomValue(editModeAtom);
  const save = useSetAtom(saveTokenDialogAtom);
  const selectComponent = useSetAtom(selectedComponentIdAtom);
  const selectPage = useSetAtom(activePageAtom);
  const [expected] = useState(
    catalog.status === "ready" ? catalog.snapshot : undefined,
  );
  const [token] = useState(
    () =>
      live.find((item) => item.id === id) ??
      (catalog.status === "ready"
        ? catalog.rows.find((row) => row.token.id === id)?.token
        : undefined),
  );
  const usage = useMemo(
    () =>
      catalog.status === "ready"
        ? tokenComponentUsage(
            id,
            catalog.rows,
            components.components,
            usageCatalog.tokens,
          )
        : [],
    [catalog, components, id, usageCatalog],
  );
  if (
    catalog.status !== "ready" ||
    provenance.status !== "ready" ||
    !token ||
    !expected
  ) {
    const message =
      catalog.status !== "ready"
        ? catalog.error
        : provenance.status !== "ready"
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
  const aliases = live.filter(
    (item) =>
      item.id !== id &&
      (item.referenceId === id ||
        (item.alias &&
          catalog.rows.some(
            (row) => row.token.id === id && row.id === item.alias?.$ref,
          ))),
  );
  return (
    <TokenInspector
      token={token}
      rows={catalog.rows}
      edits={catalog.snapshot.browserTokenEdits ?? {}}
      taxonomy={catalog.snapshot.taxonomy!}
      modeSets={modeSets}
      modeKey={mode.key}
      isEditing={isEditing}
      releasedIds={provenance.ids}
      settings={catalog.snapshot.colorSystem.settings.colorOutput}
      colorSystem={catalog.snapshot.colorSystem}
      aliases={aliases}
      components={usage}
      usageError={usageCatalog.error}
      issues={issues}
      onSave={(draft) => save({ draft, expected })}
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

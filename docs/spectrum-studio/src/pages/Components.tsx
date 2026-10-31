// Copyright 2026 Adobe. All rights reserved.
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNotify } from "../components/notifications/notificationContext";
import { atom } from "jotai";
import { AlertDialog, DialogContainer } from "@react-spectrum/s2";
import { editModeAtom } from "../state/view/editMode";
import { taxonomyDocumentAtom } from "../features/taxonomy/state";
import {
  componentCatalogAtom,
  componentTokensAtom,
  editComponentsAtom,
} from "../features/components/state";
import {
  componentsDocumentAtom,
  componentDraftRevisionAtom,
  selectedComponentIdAtom,
} from "../features/components/documentState";
import { ComponentDataView } from "../views/components/ComponentDataView";
import { ComponentsPanel } from "../panels/components/ComponentsPanel";
import { useComponentNavigation } from "../panels/components/useComponentNavigation";

const referencesAtom = atom((get) => {
  try {
    return { tokens: get(componentTokensAtom), error: undefined };
  } catch (failure) {
    return {
      tokens: [],
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});

export default function Components() {
  const notify = useNotify();
  const document = useAtomValue(componentsDocumentAtom);
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const catalog = useAtomValue(componentCatalogAtom);
  const references = useAtomValue(referencesAtom);
  const editable = useAtomValue(editModeAtom);
  const [selected, select] = useAtom(selectedComponentIdAtom);
  const commit = useSetAtom(editComponentsAtom);
  const revision = useAtomValue(componentDraftRevisionAtom);
  const navigation = useComponentNavigation(editable, select);
  const selectedId = selected ?? document.components[0]?.id ?? null;
  return (
    <div className="componentsLayout" data-component="Components">
      <ComponentsPanel
        catalog={catalog}
        selected={selectedId}
        editable={editable}
        search={navigation.search}
        onSearch={navigation.setSearch}
        onSelect={navigation.select}
        onAdd={() => navigation.create()}
      />
      <ComponentDataView
        key={`${editable}:${selectedId ?? ""}:${revision}`}
        document={document}
        catalog={catalog}
        taxonomy={taxonomy}
        tokens={references.tokens}
        referenceError={references.error}
        editable={editable}
        selected={selectedId}
        onSelect={select}
        onCommit={commit}
        creating={navigation.creating}
        onCreate={navigation.create}
        onCloseCreation={() => navigation.setCreating(undefined)}
        onCreated={() => {
          navigation.setCreating(undefined);
          navigation.setSearch("");
        }}
        onDefinitionDirtyChange={navigation.setDefinitionDirty}
        draftVersion={navigation.draftVersion}
      />
      <DialogContainer onDismiss={() => navigation.setPending(undefined)}>
        {navigation.pending && (
          <AlertDialog
            title="Discard unapplied changes"
            variant="warning"
            primaryActionLabel="Discard"
            cancelLabel="Keep editing"
            onPrimaryAction={() => notify.quietly(navigation.discard)}
          >
            Your definition edits have not been applied. Discard them to
            continue.
          </AlertDialog>
        )}
      </DialogContainer>
    </div>
  );
}

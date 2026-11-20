// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  DialogTrigger,
  Heading,
  Text,
  TextField,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { useNotify } from "../../components/notifications/notificationContext";
import { editModeAtom } from "../../state/view/editMode";
import { activePageAtom } from "../../state/view/navigation";
import { designSectionAtom } from "../../state/view/design";
import { rulesTabAtom } from "../../state/view/logicView";
import { rulePresentation } from "../../features/logic/rulePresentation";
import {
  subPanelTabSelectionAtom,
  SECTIONS_SUBPANEL_TABS_STATE_KEY,
} from "../../state/view/subPanelTabs";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import {
  editReferencedTaxonomyAtom,
  referencedTaxonomySourceAtom,
} from "../../features/taxonomy/editing";
import {
  taxonomyEmissionKey,
  type TaxonomyDocument,
  type TaxonomyTerm,
} from "../../features/taxonomy/model";
import {
  deprecateTaxonomyCategory,
  deprecateTaxonomyTerm,
  renameTaxonomyTerm,
  termReplacementCandidates,
} from "../../features/taxonomy/lifecycle";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { isShipped } from "../../features/changelog/shipped";
import { isDeprecated } from "../../features/edit-session/lifecycle";
import {
  registryCategoryBatch,
  type RegistryBatch,
} from "../../features/taxonomy/registryDraft";
import {
  registryReferences,
  type RegistryReference,
} from "../../features/taxonomy/registryReferences";
import { TaxonomyEditor } from "../../panels/registry/TaxonomyEditor";
import { TaxonomyTermDialog } from "../../panels/registry/TaxonomyTermDialog";
import { RegistryFilters } from "../../panels/registry/RegistryFilters";
import { registryFiltersAtom } from "../../state/view/registryFilters";
import { RegistryError } from "../../panels/registry/RegistryFields";
import {
  registryField,
  registryMuted,
  registryPasteboard,
  registrySection,
} from "../../panels/registry/registryStyles";
import { RegistryBoard } from "./RegistryBoard";
import "./TaxonomyView.css";

export function TaxonomyView() {
  const document = useAtomValue(taxonomyDocumentAtom);
  const source = useAtomValue(referencedTaxonomySourceAtom);
  const editable = useAtomValue(editModeAtom);
  const filters = useAtomValue(registryFiltersAtom);
  const edit = useSetAtom(editReferencedTaxonomyAtom);
  const setPage = useSetAtom(activePageAtom);
  const setDesignSection = useSetAtom(designSectionAtom);
  const setRulesTab = useSetAtom(rulesTabAtom);
  const setFoundation = useSetAtom(subPanelTabSelectionAtom);
  const store = useStore();
  const notify = useNotify();
  const [opened, setOpened] = useState<{
    document: TaxonomyDocument;
    categoryId: string;
    termId?: string;
  }>();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const information = useMemo(() => {
    try {
      return { index: registryReferences(document, source), error: "" };
    } catch (failure) {
      return {
        index: null,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [document, source]);
  function commit(
    next: TaxonomyDocument | RegistryBatch,
    base: TaxonomyDocument,
  ) {
    if (store.get(taxonomyDocumentAtom) !== base)
      throw new Error(
        "The Registry changed while this edit was pending. Reopen the editor before applying your change.",
      );
    edit(next);
  }
  function navigate(reference: RegistryReference) {
    const foundation = reference.foundation;
    if (foundation)
      setFoundation((tabs) => ({
        ...tabs,
        [SECTIONS_SUBPANEL_TABS_STATE_KEY]: foundation,
      }));
    if (reference.designSection) setDesignSection(reference.designSection);
    if (reference.ruleType)
      setRulesTab(rulePresentation(reference.ruleType).type);
    setPage(reference.href.slice(1));
  }
  function remove(base: TaxonomyDocument, categoryId: string, termId?: string) {
    const next = termId
      ? { ...base, terms: base.terms.filter((term) => term.id !== termId) }
      : {
          ...base,
          categories: base.categories.filter(
            (category) => category.id !== categoryId,
          ),
          terms: base.terms.filter((term) => term.categoryId !== categoryId),
          order: base.order.filter((id) => id !== categoryId),
        };
    const item = termId
      ? base.terms.find((term) => term.id === termId)
      : base.categories.find((category) => category.id === categoryId);
    if (!item) return;
    const noun = "value" in item ? termLabel(item.value) : item.name;
    const shipped = isShipped(termId ? "terms" : "categories", item.id);
    // Shipped items are renamed or deprecated against the latest Registry.
    const change = (
      update: (current: TaxonomyDocument) => TaxonomyDocument,
    ) => {
      const current = store.get(taxonomyDocumentAtom);
      commit(update(current), current);
      return { before: current, after: store.get(taxonomyDocumentAtom) };
    };
    if (shipped) setOpened(undefined);
    notify.remove({
      kind: termId ? "term" : "taxonomyCategory",
      noun,
      local: true,
      run: () => {
        try {
          commit(next, base);
          setError("");
          return { before: base, after: store.get(taxonomyDocumentAtom) };
        } catch (failure) {
          const message =
            failure instanceof Error ? failure.message : String(failure);
          setError(message);
          return { ok: false as const, error: message };
        }
      },
      undo: (receipt) => {
        if ("ok" in receipt) return;
        commit(receipt.before, receipt.after);
      },
      onDone: () => setOpened(undefined),
      lifecycle: {
        shipped,
        deprecated: isDeprecated(item),
        ...(termId
          ? {
              rename: {
                current: String((item as TaxonomyTerm).value),
                run: (text: string) =>
                  change((current) =>
                    renameTaxonomyTerm(current, termId, text),
                  ),
              },
              candidates: termReplacementCandidates(base, termId),
            }
          : {}),
        deprecate: (replacedBy?: string) =>
          change((current) =>
            termId
              ? deprecateTaxonomyTerm(current, termId, replacedBy)
              : deprecateTaxonomyCategory(current, categoryId),
          ),
        undoDeprecate: (receipt) => commit(receipt.before, receipt.after),
      },
    });
  }
  function saveCategory(batch: RegistryBatch, categoryId: string) {
    if (!batch.operations.length) return;
    let failure: unknown;
    const run = () => {
      try {
        commit(batch, batch.base);
        return { before: batch.base, after: store.get(taxonomyDocumentAtom) };
      } catch (caught) {
        failure = caught;
        return {
          ok: false as const,
          error: caught instanceof Error ? caught.message : String(caught),
        };
      }
    };
    if (batch.operations.some((operation) => operation.kind === "remove-term"))
      notify.remove({
        kind: "term",
        local: true,
        confirmed: true,
        run,
        // Shipped terms leave the editor for the lifecycle dialog first.
        lifecycle: { shipped: false },
        undo: (receipt) => {
          if ("ok" in receipt) return;
          commit(
            registryCategoryBatch(receipt.after, receipt.before, categoryId),
            receipt.after,
          );
        },
      });
    else notify.edit(run);
    if (failure) throw failure;
  }
  const category = opened?.document.categories.find(
    (item) => item.id === opened.categoryId,
  );
  const term = opened?.document.terms.find((item) => item.id === opened.termId);
  return (
    <div className={`taxonomyView ${registrySection}`}>
      {!editable && (
        <p className={registryMuted}>
          Choose Edit to make changes. Your changes use the system Save and
          Cancel controls.
        </p>
      )}
      <RegistryError message={error || information.error} />
      <div className={`registryBoardSurface ${registryPasteboard}`}>
        <div className="registryBoardToolbar">
          {editable && (
            <DialogTrigger
              onOpenChange={(open) => {
                if (open) {
                  setName("");
                  setError("");
                }
              }}
            >
              <ActionButton>
                <Add />
                <Text>Add category</Text>
              </ActionButton>
              <Dialog size="S">
                {({ close }) => (
                  <>
                    <Heading slot="title">Create category</Heading>
                    <Content>
                      <div className={registrySection}>
                        <TextField
                          label="New category name"
                          value={name}
                          onChange={setName}
                          isRequired
                          styles={registryField}
                        />
                        <RegistryError message={error} />
                      </div>
                    </Content>
                    <ButtonGroup>
                      <Button variant="secondary" onPress={close}>
                        Cancel
                      </Button>
                      <Button
                        variant="accent"
                        isDisabled={!name.trim()}
                        onPress={() => {
                          try {
                            const id = crypto.randomUUID();
                            const created = notify.added(
                              "taxonomyCategory",
                              () => {
                                commit(
                                  {
                                    ...document,
                                    categories: [
                                      ...document.categories,
                                      {
                                        id,
                                        key: taxonomyEmissionKey(id),
                                        name: name.trim(),
                                        description: "",
                                        valueType: "string",
                                        cardinality: "one",
                                        scopes: [
                                          "colors",
                                          "typography",
                                          "spacing",
                                          "size",
                                          "radius",
                                          "elevation",
                                        ],
                                        required: false,
                                        includeInProjections: true,
                                      },
                                    ],
                                    order: [...document.order, id],
                                  },
                                  document,
                                );
                                return true;
                              },
                            );
                            if (!created) return;
                            setError("");
                            close();
                          } catch (failure) {
                            setError(
                              failure instanceof Error
                                ? failure.message
                                : String(failure),
                            );
                          }
                        }}
                      >
                        Create category
                      </Button>
                    </ButtonGroup>
                  </>
                )}
              </Dialog>
            </DialogTrigger>
          )}
          <RegistryFilters />
        </div>
        <RegistryBoard
          document={document}
          filters={filters}
          source={source}
          editable={editable}
          onCommit={commit}
          onOpen={(categoryId, termId) =>
            setOpened({ document, categoryId, termId })
          }
          onDelete={(categoryId, termId) =>
            remove(document, categoryId, termId)
          }
        />
      </div>
      <DialogContainer onDismiss={() => setOpened(undefined)}>
        {opened &&
          category &&
          (term ? (
            <TaxonomyTermDialog
              key={term.id}
              document={opened.document}
              category={category}
              term={term}
              source={source}
              references={
                information.index
                  ? (information.index.terms.get(term.id) ?? [])
                  : null
              }
              editable={editable}
              onSave={(next) =>
                commit(
                  {
                    ...opened.document,
                    terms: opened.document.terms.map((item) =>
                      item.id === next.id ? next : item,
                    ),
                  },
                  opened.document,
                )
              }
              onDelete={() => remove(opened.document, category.id, term.id)}
              onClose={() => setOpened(undefined)}
              onNavigate={navigate}
            />
          ) : (
            <TaxonomyEditor
              key={category.id}
              document={opened.document}
              category={category}
              editable={editable}
              validationSource={source}
              references={information.index}
              onSave={(batch) => saveCategory(batch, category.id)}
              onDelete={() => remove(opened.document, category.id)}
              onDeleteTerm={(termId) =>
                remove(opened.document, category.id, termId)
              }
              onClose={() => setOpened(undefined)}
              onNavigate={navigate}
            />
          ))}
      </DialogContainer>
    </div>
  );
}

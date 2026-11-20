// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useRef, useState } from "react";
import { AlertDialog, DialogContainer } from "@react-spectrum/s2";
import type { Meta, StoryObj } from "@storybook/react";
import {
  createRegistrySnapshot,
  registryCategoryIds,
  registryStoryReferences,
} from "../../../tests/fixtures/registry";
import {
  updateTaxonomy,
  type TaxonomyDocument,
} from "../../features/taxonomy/model";
import {
  validateReferencedTaxonomy,
  type ReferencedTaxonomySource,
} from "../../features/taxonomy/referenceValidation";
import {
  registryBatchSteps,
  type RegistryBatch,
} from "../../features/taxonomy/registryDraft";
import { TaxonomyEditor } from "../../panels/registry/TaxonomyEditor";
import { TaxonomyTermDialog } from "../../panels/registry/TaxonomyTermDialog";
import { RegistryBoard } from "./RegistryBoard";
import { registryPasteboard } from "../../panels/registry/registryStyles";
import { RegistryError } from "../../panels/registry/RegistryFields";
import type { RegistryFilters } from "../../features/taxonomy/registryFilters";

function RegistryStory({
  editable = true,
  unavailableReferences = false,
  filters,
  empty = false,
}: {
  editable?: boolean;
  unavailableReferences?: boolean;
  filters?: RegistryFilters;
  empty?: boolean;
}) {
  const [snapshot] = useState(createRegistrySnapshot);
  const [document, setDocument] = useState(() =>
    empty
      ? { ...snapshot.taxonomy, categories: [], terms: [], order: [] }
      : snapshot.taxonomy,
  );
  const current = useRef(document);
  current.current = document;
  const [opened, setOpened] = useState<{
    categoryId: string;
    termId?: string;
  }>();
  const [deleting, setDeleting] = useState<{
    categoryId: string;
    termId?: string;
  }>();
  const [error, setError] = useState("");
  const source = useMemo(
    (): ReferencedTaxonomySource => ({
      previous: document,
      snapshot: { ...snapshot, taxonomy: document },
      sources: [],
      tokens: [],
    }),
    [snapshot, document],
  );
  function commit(next: TaxonomyDocument, base: TaxonomyDocument) {
    if (base !== current.current)
      throw new Error("The Registry changed while editing.");
    next = updateTaxonomy(base, next);
    validateReferencedTaxonomy(source, next);
    current.current = next;
    setDocument(next);
  }
  function batchCommit(batch: RegistryBatch) {
    let previous = document;
    for (const next of registryBatchSteps(document, batch)) {
      validateReferencedTaxonomy({ ...source, previous }, next);
      previous = next;
    }
    current.current = previous;
    setDocument(previous);
  }
  const category = document.categories.find(
    (row) => row.id === opened?.categoryId,
  );
  const term = document.terms.find((row) => row.id === opened?.termId);
  const references = unavailableReferences ? null : registryStoryReferences;
  return (
    <div style={{ minWidth: 0, width: "100%" }}>
      <RegistryError message={error} />
      <div data-testid="registry-accepted" hidden>
        {JSON.stringify({
          order: document.order.filter((id) =>
            registryCategoryIds.includes(id),
          ),
          terms: document.terms.filter((row) =>
            registryCategoryIds.includes(row.categoryId),
          ),
          categories: document.categories.filter((row) =>
            registryCategoryIds.includes(row.id),
          ),
        })}
      </div>
      <div className={registryPasteboard}>
        <RegistryBoard
          document={document}
          source={source}
          editable={editable}
          filters={filters}
          onCommit={commit}
          onOpen={(categoryId, termId) => setOpened({ categoryId, termId })}
          onDelete={(categoryId, termId) => setDeleting({ categoryId, termId })}
        />
      </div>
      <DialogContainer onDismiss={() => setOpened(undefined)}>
        {category &&
          (term ? (
            <TaxonomyTermDialog
              document={document}
              category={category}
              term={term}
              source={source}
              references={
                references?.terms.get(term.id) ?? (references ? [] : null)
              }
              editable={editable}
              onSave={(next) =>
                commit(
                  {
                    ...document,
                    terms: document.terms.map((row) =>
                      row.id === next.id ? next : row,
                    ),
                  },
                  document,
                )
              }
              onClose={() => setOpened(undefined)}
              onDelete={() =>
                setDeleting({ categoryId: category.id, termId: term.id })
              }
            />
          ) : (
            <TaxonomyEditor
              document={document}
              category={category}
              editable={editable}
              validationSource={source}
              references={references}
              onSave={batchCommit}
              onClose={() => setOpened(undefined)}
              onDelete={() => setDeleting({ categoryId: category.id })}
              onDeleteTerm={(termId) =>
                setDeleting({ categoryId: category.id, termId })
              }
            />
          ))}
      </DialogContainer>
      <DialogContainer onDismiss={() => setDeleting(undefined)}>
        {deleting && (
          <AlertDialog
            title="Delete Registry entry"
            variant="destructive"
            primaryActionLabel="Delete"
            cancelLabel="Cancel"
            onPrimaryAction={() => {
              try {
                commit(
                  {
                    ...document,
                    categories: document.categories.filter(
                      (row) =>
                        deleting.termId || row.id !== deleting.categoryId,
                    ),
                    order: document.order.filter(
                      (id) => deleting.termId || id !== deleting.categoryId,
                    ),
                    terms: document.terms.filter((row) =>
                      deleting.termId
                        ? row.id !== deleting.termId
                        : row.categoryId !== deleting.categoryId,
                    ),
                  },
                  document,
                );
                setOpened(undefined);
                setError("");
              } catch (failure) {
                setError(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
              setDeleting(undefined);
            }}
          >
            Referenced entries must be remapped before deletion.
          </AlertDialog>
        )}
      </DialogContainer>
    </div>
  );
}

const meta = {
  title: "Views/Registry",
  component: RegistryStory,
  parameters: { layout: "fullscreen" },
  args: { editable: true, unavailableReferences: false },
} satisfies Meta<typeof RegistryStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editing: Story = {};
export const ReadOnly: Story = { args: { editable: false } };
export const ReferencesUnavailable: Story = {
  args: { editable: false, unavailableReferences: true },
};
export const NoResults: Story = {
  args: { filters: { tiers: [], types: [] } },
};
export const Empty: Story = { args: { empty: true } };

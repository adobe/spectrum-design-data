// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState } from "react";
import {
  ActionButton,
  AlertDialog,
  Button,
  Checkbox,
  Content,
  Dialog,
  DialogContainer,
  Footer,
  Heading,
  InlineAlert,
  Link,
  PickerItem,
  SearchField,
  Text,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import OpenIn from "@react-spectrum/s2/icons/OpenIn";
import { Picker } from "../../components/fields/Picker";
import {
  TAXONOMY_TOKEN_TYPES,
  TAXONOMY_TOKEN_TYPE_LABELS,
  updateTaxonomy,
  type TaxonomyCategory,
  type TaxonomyDocument,
  type TaxonomyTerm,
} from "../../features/taxonomy/model";
import {
  validateReferencedTaxonomy,
  type ReferencedTaxonomySource,
} from "../../features/taxonomy/referenceValidation";
import {
  registryCategoryBatch,
  type RegistryBatch,
} from "../../features/taxonomy/registryDraft";
import type {
  RegistryReference,
  RegistryReferenceIndex,
} from "../../features/taxonomy/registryReferences";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { isShipped } from "../../features/changelog/shipped";
import { DeprecatedBadge } from "../../components/DeprecatedBadge";
import {
  RegistryCategoryFields,
  RegistryError,
  RegistryScopeFields,
} from "./RegistryFields";
import {
  registryActions,
  registryField,
  registryMuted,
  registrySection,
  registrySurface,
  registryTableMedium,
} from "./registryStyles";
import { RegistryTermComposer } from "./RegistryTermComposer";
import { TaxonomyTermDialog } from "./TaxonomyTermDialog";

export function TaxonomyEditor({
  document,
  category,
  editable,
  validationSource,
  references,
  onSave,
  onDelete,
  onDeleteTerm,
  onClose,
  onNavigate,
}: {
  document: TaxonomyDocument;
  category: TaxonomyCategory;
  editable: boolean;
  validationSource: ReferencedTaxonomySource;
  references: RegistryReferenceIndex | null;
  onSave: (batch: RegistryBatch) => void;
  onDelete: () => void;
  onDeleteTerm: (termId: string) => void;
  onClose: () => void;
  onNavigate?: (reference: RegistryReference) => void;
}) {
  const [base] = useState(document);
  const [draft, setDraft] = useState(document);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [termId, setTermId] = useState<string>();
  const [deleting, setDeleting] = useState<TaxonomyTerm>();
  const value = draft.categories.find((item) => item.id === category.id)!;
  const term = draft.terms.find((item) => item.id === termId);
  const terms = draft.terms.filter((item) => item.categoryId === category.id);
  const matchingTerms = terms.filter((item) =>
    `${termLabel(item.value)} ${item.value} ${item.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const source = useMemo(
    () => ({
      ...validationSource,
      previous: draft,
      snapshot: { ...validationSource.snapshot, taxonomy: draft },
    }),
    [validationSource, draft],
  );
  const linked = [
    ...new Map(
      (references?.categories.get(category.id) ?? [])
        .filter((row) => row.foundation)
        .map((row) => [row.foundation, row]),
    ).values(),
  ];
  function changeCategory(next: TaxonomyCategory) {
    setDraft({
      ...draft,
      categories: draft.categories.map((item) =>
        item.id === category.id ? next : item,
      ),
    });
  }
  function changeTerm(next: TaxonomyTerm) {
    const updated = updateTaxonomy(draft, {
      ...draft,
      terms: draft.terms.some((item) => item.id === next.id)
        ? draft.terms.map((item) => (item.id === next.id ? next : item))
        : [...draft.terms, next],
    });
    validateReferencedTaxonomy(source, updated);
    setDraft(updated);
    setAdding(false);
    setError("");
  }
  /** Shipped terms leave this editor for the rename/deprecate dialog. */
  function requestDelete(item: TaxonomyTerm) {
    if (!isShipped("terms", item.id)) setDeleting(item);
    else if (draft !== base)
      setError(
        `Save or cancel your changes before deleting ${termLabel(item.value)}.`,
      );
    else onDeleteTerm(item.id);
  }
  return (
    <>
      <Dialog size="XL" isDismissible>
        <Heading slot="title">{category.name}</Heading>
        <Content>
          <div className={registrySection}>
            {!!linked.length && (
              <InlineAlert variant="informative">
                <Heading>Linked category</Heading>
                <Content>
                  Terms in this category are used in{" "}
                  {linked.map((row, index) => {
                    const foundation = TAXONOMY_TOKEN_TYPES.find(
                      (id) => id === row.foundation,
                    );
                    return (
                      <span key={row.foundation}>
                        {index > 0 && ", "}
                        <Link
                          href={row.href}
                          onPress={() => {
                            onNavigate?.(row);
                            onClose();
                          }}
                        >
                          Foundations &gt;{" "}
                          {foundation
                            ? TAXONOMY_TOKEN_TYPE_LABELS[foundation]
                            : row.foundation}
                        </Link>
                      </span>
                    );
                  })}
                  .
                </Content>
              </InlineAlert>
            )}
            <RegistryError
              message={
                error ||
                (!references ? "Reference information is unavailable." : "")
              }
            />
            <div className="registryCategoryDialog">
              <div className={registrySection}>
                <section
                  className={registrySurface}
                  aria-label="Category metadata"
                >
                  <h3>Metadata</h3>
                  <RegistryCategoryFields
                    category={value}
                    editable={editable}
                    onChange={changeCategory}
                  />
                  <div className="registryFieldPair">
                    <Picker
                      label="Term value type"
                      labelPosition="top"
                      selectedKey={value.valueType}
                      isDisabled={!editable}
                      onSelectionChange={(key) =>
                        changeCategory({
                          ...value,
                          valueType: key === "number" ? "number" : "string",
                        })
                      }
                    >
                      <PickerItem id="string">Text</PickerItem>
                      <PickerItem id="number">Number</PickerItem>
                    </Picker>
                    <Picker
                      label="Cardinality"
                      labelPosition="top"
                      selectedKey={value.cardinality}
                      isDisabled
                    >
                      <PickerItem id="one">One term</PickerItem>
                      <PickerItem id="ordered">Ordered terms</PickerItem>
                    </Picker>
                  </div>
                  <Checkbox
                    isSelected={value.required}
                    isDisabled={!editable}
                    onChange={(required) =>
                      changeCategory({ ...value, required })
                    }
                  >
                    Required classification
                  </Checkbox>
                  <Checkbox
                    isSelected={value.includeInProjections}
                    isDisabled={!editable}
                    onChange={(includeInProjections) =>
                      changeCategory({ ...value, includeInProjections })
                    }
                  >
                    Include in names and hierarchy
                  </Checkbox>
                </section>
                <section
                  className={registrySurface}
                  aria-label="Category scope"
                >
                  <h3>Scope</h3>
                  <RegistryScopeFields
                    category={value}
                    editable={editable}
                    onChange={changeCategory}
                  />
                </section>
              </div>
              <section
                className={registrySurface}
                aria-label="Registered terms"
              >
                <div className="registryCardHeader">
                  <h3>Terms</h3>
                  {editable && (
                    <ActionButton
                      isDisabled={adding}
                      onPress={() => setAdding(true)}
                    >
                      <Add />
                      <Text>Add term</Text>
                    </ActionButton>
                  )}
                </div>
                <SearchField
                  label="Search terms"
                  value={search}
                  onChange={setSearch}
                  styles={registryField}
                />
                <div className="registryTableScroll">
                  <table
                    className={`registryTable ${registryTableMedium}`}
                    aria-label={`${category.name} term details`}
                  >
                    <thead>
                      <tr>
                        <th scope="col">Term</th>
                        <th scope="col">Description</th>
                        <th scope="col">Uses</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchingTerms.map((item) => (
                        <tr key={item.id}>
                          <th scope="row">
                            {termLabel(item.value)}{" "}
                            <DeprecatedBadge lifecycle={item.lifecycle} />
                          </th>
                          <td>{item.description || "No description"}</td>
                          <td>
                            {references
                              ? (
                                  references.terms.get(item.id)?.length ?? 0
                                ).toLocaleString()
                              : "Unavailable"}
                          </td>
                          <td>
                            <div className={registryActions}>
                              <ActionButton
                                isQuiet
                                size="S"
                                aria-label={`Open ${termLabel(item.value)} term`}
                                onPress={() => setTermId(item.id)}
                              >
                                <OpenIn />
                              </ActionButton>
                              {editable && (
                                <ActionButton
                                  isQuiet
                                  size="S"
                                  aria-label={`Delete ${termLabel(item.value)} term`}
                                  onPress={() => requestDelete(item)}
                                >
                                  <Delete />
                                </ActionButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {adding && (
                  <RegistryTermComposer
                    document={draft}
                    category={value}
                    source={source}
                    onAdd={changeTerm}
                    onCancel={() => setAdding(false)}
                  />
                )}
                {!terms.length && (
                  <p className={registryMuted}>No terms registered yet.</p>
                )}
                {!!terms.length && !matchingTerms.length && (
                  <p className={registryMuted}>No matching terms.</p>
                )}
              </section>
            </div>
          </div>
        </Content>
        <Footer>
          <div className={`registryDialogFooter ${registryActions}`}>
            {editable && (
              <Button variant="negative" onPress={onDelete}>
                Delete category
              </Button>
            )}
            <div className={registryActions}>
              <Button variant="secondary" onPress={onClose}>
                {editable ? "Cancel" : "Close"}
              </Button>
              {editable && (
                <Button
                  variant="accent"
                  isDisabled={adding}
                  onPress={() => {
                    try {
                      onSave(registryCategoryBatch(base, draft, category.id));
                      onClose();
                    } catch (failure) {
                      setError(
                        failure instanceof Error
                          ? failure.message
                          : String(failure),
                      );
                    }
                  }}
                >
                  Save
                </Button>
              )}
            </div>
          </div>
        </Footer>
      </Dialog>
      <DialogContainer onDismiss={() => setTermId(undefined)}>
        {term && (
          <TaxonomyTermDialog
            document={draft}
            category={value}
            term={term}
            source={source}
            references={
              references ? (references.terms.get(term.id) ?? []) : null
            }
            editable={editable}
            onSave={changeTerm}
            onDelete={() => {
              setTermId(undefined);
              requestDelete(term);
            }}
            onClose={() => setTermId(undefined)}
            onNavigate={(row) => {
              onNavigate?.(row);
              onClose();
            }}
          />
        )}
      </DialogContainer>
      <DialogContainer onDismiss={() => setDeleting(undefined)}>
        {deleting && (
          <AlertDialog
            title="Delete term"
            variant="destructive"
            primaryActionLabel="Delete"
            cancelLabel="Cancel"
            onPrimaryAction={() => {
              try {
                const next = updateTaxonomy(draft, {
                  ...draft,
                  terms: draft.terms.filter((item) => item.id !== deleting.id),
                });
                validateReferencedTaxonomy(source, next);
                setDraft(next);
                setError("");
              } catch (failure) {
                setError(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
              setDeleting(undefined);
            }}
          >
            Delete {termLabel(deleting.value)}? Referenced terms require
            explicit remapping first.
          </AlertDialog>
        )}
      </DialogContainer>
    </>
  );
}

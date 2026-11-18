// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActionButton, Text } from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import OpenIn from "@react-spectrum/s2/icons/OpenIn";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  TaxonomyCategory,
  TaxonomyDocument,
  TaxonomyTerm,
} from "../../features/taxonomy/model";
import type { ReferencedTaxonomySource } from "../../features/taxonomy/referenceValidation";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { DeprecatedBadge } from "../../components/DeprecatedBadge";
import {
  RegistryCategoryFields,
  RegistryError,
  RegistryScopeFields,
} from "./RegistryFields";
import {
  registryActions,
  registrySection,
  registryTableBody,
  registryTableMedium,
} from "./registryStyles";
import { RegistryTermComposer } from "./RegistryTermComposer";

const cardStyles = style({
  backgroundColor: "layer-1",
  padding: 16,
  borderRadius: "xl",
});
export function RegistryCategoryCard({
  document,
  category,
  source,
  editable,
  handle,
  onCommit,
  onOpen,
  onOpenTerm,
  onDelete,
  onDeleteTerm,
}: {
  document: TaxonomyDocument;
  category: TaxonomyCategory;
  source: ReferencedTaxonomySource;
  editable: boolean;
  handle?: ReactNode;
  onCommit: (next: TaxonomyDocument, base: TaxonomyDocument) => void;
  onOpen: () => void;
  onOpenTerm: (termId: string) => void;
  onDelete: () => void;
  onDeleteTerm: (termId: string) => void;
}) {
  const [draft, setDraft] = useState(category);
  const accepted = useRef(JSON.stringify(category));
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (!editable) {
      setAdding(false);
      setError("");
    }
    const signature = JSON.stringify(category);
    if (!editable || signature !== accepted.current) {
      accepted.current = signature;
      setDraft(category);
    }
  }, [category, editable]);
  function apply(next: TaxonomyCategory) {
    setDraft(next);
    if (JSON.stringify(next) === accepted.current) return;
    try {
      onCommit(
        {
          ...document,
          categories: document.categories.map((item) =>
            item.id === category.id ? next : item,
          ),
        },
        document,
      );
      accepted.current = JSON.stringify(next);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }
  function add(term: TaxonomyTerm) {
    onCommit({ ...document, terms: [...document.terms, term] }, document);
    setAdding(false);
  }
  return (
    <article
      aria-label={`${category.name} category`}
      className={`registryCategoryCard ${registrySection} ${cardStyles}`}
    >
      <header className="registryCardHeader">
        <div className={registryActions}>
          {handle}
          <DeprecatedBadge lifecycle={category.lifecycle} />
        </div>
        <div className={registryActions}>
          <ActionButton
            isQuiet
            aria-label={`Open ${category.name} category`}
            onPress={onOpen}
          >
            <OpenIn />
          </ActionButton>
          {editable && (
            <ActionButton
              isQuiet
              aria-label={`Delete ${category.name} category`}
              onPress={onDelete}
            >
              <Delete />
            </ActionButton>
          )}
        </div>
      </header>
      <RegistryCategoryFields
        size="M"
        category={draft}
        editable={editable}
        onChange={setDraft}
        onApply={apply}
        onCancel={() => {
          setDraft(category);
          setError("");
        }}
      />
      <RegistryScopeFields
        size="M"
        tagSize="S"
        category={draft}
        editable={editable}
        onChange={apply}
      />
      <RegistryError message={error} />
      <table
        className={`registryTable ${registryTableMedium}`}
        aria-label={`${category.name} terms`}
      >
        <thead>
          <tr>
            <th scope="col">Terms</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody className={registryTableBody}>
          {!adding &&
            !document.terms.some((term) => term.categoryId === category.id) && (
              <tr>
                <td colSpan={2}>No terms registered yet.</td>
              </tr>
            )}
          {document.terms
            .filter((term) => term.categoryId === category.id)
            .map((term) => (
              <tr key={term.id}>
                <th scope="row">
                  {termLabel(term.value)}{" "}
                  <DeprecatedBadge lifecycle={term.lifecycle} />
                </th>
                <td>
                  <div className={registryActions}>
                    <ActionButton
                      isQuiet
                      aria-label={`Open ${termLabel(term.value)} term`}
                      onPress={() => onOpenTerm(term.id)}
                    >
                      <OpenIn />
                    </ActionButton>
                    {editable && (
                      <ActionButton
                        isQuiet
                        aria-label={`Delete ${termLabel(term.value)} term`}
                        onPress={() => onDeleteTerm(term.id)}
                      >
                        <Delete />
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          {adding && (
            <tr>
              <td colSpan={2}>
                <RegistryTermComposer
                  size="M"
                  document={document}
                  category={category}
                  source={source}
                  onAdd={add}
                  onCancel={() => setAdding(false)}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {editable && (
        <ActionButton
          isQuiet
          isDisabled={adding}
          onPress={() => setAdding(true)}
        >
          <Add />
          <Text>Add term</Text>
        </ActionButton>
      )}
    </article>
  );
}

// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import {
  Button,
  Checkbox,
  Content,
  Dialog,
  Footer,
  Heading,
  Link,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import type {
  TaxonomyCategory,
  TaxonomyDocument,
  TaxonomyTerm,
} from "../../features/taxonomy/model";
import type { ReferencedTaxonomySource } from "../../features/taxonomy/referenceValidation";
import type { RegistryReference } from "../../features/taxonomy/registryReferences";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { useTaxonomyValidation } from "../../features/taxonomy/useTaxonomyValidation";
import { RegistryError } from "./RegistryFields";
import {
  registryActions,
  registryField,
  registrySurface,
  registryTableBody,
  registryTableMedium,
} from "./registryStyles";

export function TaxonomyTermDialog({
  document,
  category,
  term,
  source,
  references,
  editable,
  onSave,
  onDelete,
  onClose,
  onNavigate,
}: {
  document: TaxonomyDocument;
  category: TaxonomyCategory;
  term: TaxonomyTerm;
  source: ReferencedTaxonomySource;
  references: readonly RegistryReference[] | null;
  editable: boolean;
  onSave: (term: TaxonomyTerm) => void;
  onDelete: () => void;
  onClose: () => void;
  onNavigate?: (reference: RegistryReference) => void;
}) {
  const [draft, setDraft] = useState(term);
  const [text, setText] = useState(String(term.value));
  const [error, setError] = useState("");
  const validation = useTaxonomyValidation(source);
  function change(field: "value" | "description", value: string) {
    const next =
      field === "value"
        ? {
            ...draft,
            value:
              category.valueType === "number"
                ? value.trim()
                  ? Number(value)
                  : NaN
                : value.trim(),
          }
        : { ...draft, description: value };
    if (field === "value") setText(value);
    setDraft(next);
    setError("");
    validation.request(term.id, field, value, {
      ...document,
      terms: document.terms.map((item) => (item.id === term.id ? next : item)),
    });
  }
  return (
    <Dialog size="L" isDismissible>
      <Heading slot="title">{termLabel(term.value)}</Heading>
      <Content>
        <div className="registryTermDialog">
          <section className={registrySurface} aria-label="Term metadata">
            <TextField
              label="Term"
              value={text}
              isRequired
              isReadOnly={!editable}
              styles={registryField}
              onChange={(value) => change("value", value)}
              isInvalid={!!validation.error(term.id, "value", text)}
              errorMessage={
                validation.error(term.id, "value", text) ?? undefined
              }
            />
            <TextArea
              label="Description"
              value={draft.description}
              isReadOnly={!editable}
              styles={registryField}
              onChange={(value) => change("description", value)}
            />
            <Checkbox
              isSelected={
                category.includeInProjections &&
                draft.includeInProjections !== false
              }
              isDisabled={!editable || !category.includeInProjections}
              onChange={(includeInProjections) =>
                setDraft({ ...draft, includeInProjections })
              }
            >
              Include in names and hierarchy
            </Checkbox>
            <RegistryError message={error || validation.failure} />
            {validation.failure && (
              <Button variant="secondary" onPress={validation.retry}>
                Retry
              </Button>
            )}
            {validation.showPending && (
              <LoadingIndicator size="M" aria-label="Checking term" />
            )}
          </section>
          <section className={registrySurface} aria-label="Term references">
            <h3>
              References
              {references && ` (${references.length.toLocaleString()})`}
            </h3>
            {!references && (
              <RegistryError message="Reference information is unavailable." />
            )}
            {references && (
              <div className="registryTableScroll">
                <table
                  className={`registryTable ${registryTableMedium}`}
                  aria-label="References"
                >
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Page</th>
                    </tr>
                  </thead>
                  <tbody className={registryTableBody}>
                    {!references.length && (
                      <tr>
                        <td colSpan={2}>No references.</td>
                      </tr>
                    )}
                    {[...references]
                      .sort(
                        (a, b) =>
                          Number(a.group !== "Token uses") -
                          Number(b.group !== "Token uses"),
                      )
                      .map((row) => (
                        <tr key={row.id}>
                          <th scope="row">
                            <Link
                              href={row.href}
                              onPress={() => {
                                onNavigate?.(row);
                                onClose();
                              }}
                            >
                              {row.label}
                            </Link>
                          </th>
                          <td>{row.owner}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </Content>
      <Footer>
        <div className={`registryDialogFooter ${registryActions}`}>
          {editable && (
            <Button variant="negative" onPress={onDelete}>
              Delete term
            </Button>
          )}
          <div className={registryActions}>
            <Button variant="secondary" onPress={onClose}>
              {editable ? "Cancel" : "Close"}
            </Button>
            {editable && (
              <Button
                variant="accent"
                onPress={() => {
                  try {
                    if (!text.trim()) throw new Error("Enter a term.");
                    if (
                      typeof draft.value === "number" &&
                      !Number.isFinite(draft.value)
                    )
                      throw new Error("Enter a finite number.");
                    onSave(draft);
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
  );
}

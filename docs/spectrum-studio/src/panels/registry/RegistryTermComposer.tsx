// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import { ActionButton, Button, Form, TextField } from "@react-spectrum/s2";
import Checkmark from "@react-spectrum/s2/icons/Checkmark";
import Close from "@react-spectrum/s2/icons/Close";
import { useTaxonomyValidation } from "../../features/taxonomy/useTaxonomyValidation";
import type { ReferencedTaxonomySource } from "../../features/taxonomy/referenceValidation";
import type {
  TaxonomyCategory,
  TaxonomyDocument,
  TaxonomyTerm,
} from "../../features/taxonomy/model";
import { RegistryError } from "./RegistryFields";
import { registryActions, registryField } from "./registryStyles";

export function RegistryTermComposer({
  document,
  category,
  source,
  onAdd,
  onCancel,
  size = "M",
}: {
  document: TaxonomyDocument;
  category: TaxonomyCategory;
  source: ReferencedTaxonomySource;
  onAdd: (term: TaxonomyTerm) => void;
  onCancel: () => void;
  size?: "S" | "M";
}) {
  const [id] = useState(() => crypto.randomUUID());
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const validation = useTaxonomyValidation(source);
  const term: TaxonomyTerm = {
    id,
    categoryId: category.id,
    description: "",
    value:
      category.valueType === "number"
        ? text.trim()
          ? Number(text)
          : NaN
        : text.trim(),
  };
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        try {
          if (!text.trim()) throw new Error("Enter a term.");
          if (typeof term.value === "number" && !Number.isFinite(term.value))
            throw new Error("Enter a finite number.");
          onAdd(term);
        } catch (failure) {
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
        }
      }}
    >
      <TextField
        size={size}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- Focus follows Add term.
        autoFocus
        onFocus={(event) =>
          event.target.scrollIntoView({ block: "nearest", inline: "nearest" })
        }
        aria-label="New term name"
        value={text}
        isRequired
        styles={registryField}
        onChange={(value) => {
          setText(value);
          setError("");
          const next = {
            ...term,
            value:
              category.valueType === "number"
                ? value.trim()
                  ? Number(value)
                  : NaN
                : value.trim(),
          };
          validation.request(id, "value", value, {
            ...document,
            terms: [...document.terms, next],
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        isInvalid={!!(error || validation.error(id, "value", text))}
        errorMessage={error || validation.error(id, "value", text) || undefined}
      />
      <div className={registryActions}>
        <ActionButton size={size} aria-label="Accept term" type="submit">
          <Checkmark />
        </ActionButton>
        <ActionButton
          size={size}
          aria-label="Cancel new term"
          onPress={onCancel}
        >
          <Close />
        </ActionButton>
      </div>
      <RegistryError message={validation.failure} />
      {validation.failure && (
        <Button size={size} variant="secondary" onPress={validation.retry}>
          Retry
        </Button>
      )}
      {validation.showPending && <span role="status">Checking term</span>}
    </Form>
  );
}

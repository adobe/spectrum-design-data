// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  ActionButton,
  AlertDialog,
  Badge,
  Button,
  Checkbox,
  CheckboxGroup,
  Content,
  DialogContainer,
  Form,
  Heading,
  InlineAlert,
  PickerItem,
  ProgressCircle,
  SearchField,
  Text,
  TextArea,
  TextField,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import { Picker } from "../../components/fields/Picker";
import {
  Cell,
  Column,
  EditableCell,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Edit from "@react-spectrum/s2/icons/Edit";
import Checkmark from "@react-spectrum/s2/icons/Checkmark";
import Close from "@react-spectrum/s2/icons/Close";
import {
  updateTaxonomy,
  type TaxonomyCategory,
  type TaxonomyDocument,
  type TaxonomyTerm,
} from "../../features/taxonomy/model";
import {
  standardCategoryName,
  type StandardizationOccurrence,
} from "../../features/taxonomy/standardization";
import {
  classificationReviewMessages,
  CLASSIFICATION_REVIEW_LABEL,
} from "../../features/taxonomy/reviewPresentation";
import type { ReferencedTaxonomySource } from "../../features/taxonomy/referenceValidation";
import { useTaxonomyValidation } from "../../features/taxonomy/useTaxonomyValidation";

const editorStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: { default: 24, "@container taxonomy (width < 440px)": 16 },
  backgroundColor: "layer-1",
  borderRadius: "xl",
  minWidth: 0,
});
const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const headerStyles = style({
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: 12,
});
const headingStyles = style({ font: "title-lg", margin: 0 });
const subheadingStyles = style({ font: "title-sm", margin: 0 });
const detailStyles = style({
  font: "detail",
  color: "neutral-subdued",
  margin: 0,
});
const reviewDetailStyles = style({
  font: "detail",
  color: "neutral-subdued",
  maxHeight: 128,
  overflow: "auto",
});
const pairStyles = style({ display: "grid", gap: 16, alignItems: "start" });
const fieldStyles = style({ width: "full", minWidth: 0 });
const actionsStyles = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
});
const termActionsStyles = style({ display: "flex", gap: 0 });
const tableStyles = style({ width: "full", height: 240 });
const emptyTableStyles = style({ width: "full", height: 160 });
const cellStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minWidth: 0,
});
const termValueStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 4,
  minWidth: 0,
});
const applicableScopes = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "size", label: "Size" },
  { id: "radius", label: "Corner radius" },
  { id: "elevation", label: "Elevation" },
  { id: "structures", label: "Structures" },
] as const;

export function TaxonomyEditor({
  document,
  category,
  editable,
  usage,
  onCommit,
  termReviews,
  categoryReview,
  validationSource,
}: {
  document: TaxonomyDocument;
  category: TaxonomyCategory;
  editable: boolean;
  usage: (termId?: string) => number;
  onCommit: (document: TaxonomyDocument) => void;
  termReviews: ReadonlyMap<string, StandardizationOccurrence>;
  categoryReview?: StandardizationOccurrence;
  validationSource: ReferencedTaxonomySource;
}) {
  const notify = useNotify();
  const [committing, startCommit] = useTransition();
  const validation = useTaxonomyValidation(validationSource, committing);
  const cancelDraftValidation = validation.cancel;
  const [draft, setDraft] = useState(category);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [newTerm, setNewTerm] = useState<TaxonomyTerm>();
  const [rejected, setRejected] = useState<{
    termId: string;
    field: "value" | "description";
    text: string;
    error: string;
    source: ReferencedTaxonomySource;
  }>();
  const termsRef = useRef<HTMLElement>(null);
  const newTermId = editable ? newTerm?.id : undefined;
  useEffect(() => {
    if (!newTermId) return;
    const table = termsRef.current?.querySelector<HTMLElement>('[role="grid"]');
    if (!table) return;
    let frame = 0;
    const reveal = () => {
      frame = 0;
      const input = table.querySelector<HTMLInputElement>(
        'input[aria-label="New term name"]',
      );
      if (input) {
        observer.disconnect();
        input.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
      table.scrollTo({ top: table.scrollHeight });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(reveal);
    };
    // Follow measured row-group growth, not an estimated end from a single frame.
    const observer = new ResizeObserver(schedule);
    for (const group of table.querySelectorAll('[role="rowgroup"]'))
      observer.observe(group);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [newTermId]);
  const [pending, setPending] = useState<{
    document: TaxonomyDocument;
    message: string;
    destructive?: boolean;
    deleteKind?: "term" | "taxonomyCategory";
    deleteNoun?: string;
  }>();
  const terms = document.terms.filter(
    (term) => term.categoryId === category.id,
  );
  const filteredTerms = terms.filter((term) =>
    `${term.value} ${termLabel(term.value)}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const rows =
    editable && newTerm ? [...filteredTerms, newTerm] : filteredTerms;
  function commit(next: TaxonomyDocument) {
    try {
      onCommit(next);
      validation.cancel();
      setRejected(undefined);
      setError("");
      setPending(undefined);
      return null;
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : String(failure);
      setError(message);
      return message;
    }
  }
  function saveCategory() {
    const next = {
      ...document,
      categories: document.categories.map((item) =>
        item.id === category.id ? draft : item,
      ),
    };
    setPending({
      document: next,
      message: `${usage()} token and source references may change names or hierarchy. IDs, values and modes will not change.`,
    });
  }
  function termDocument(
    term: TaxonomyTerm,
    field: "value" | "description",
    text: string,
  ): TaxonomyDocument {
    const value =
      category.valueType === "number"
        ? text.trim() === ""
          ? NaN
          : Number(text)
        : text.trim();
    const updated =
      field === "value" ? { ...term, value } : { ...term, description: text };
    return {
      ...document,
      terms:
        newTerm?.id === term.id
          ? [...document.terms, updated]
          : document.terms.map((entry) =>
              entry.id === term.id ? updated : entry,
            ),
    };
  }
  function basicTermError(field: "value" | "description", text: string) {
    if (field === "value" && !text.trim()) return "Enter a term.";
    if (
      field === "value" &&
      category.valueType === "number" &&
      !Number.isFinite(Number(text))
    )
      return "Enter a finite number.";
    return null;
  }
  function checkDraft(
    term: TaxonomyTerm,
    field: "value" | "description",
    text: string,
  ) {
    setRejected(undefined);
    if (basicTermError(field, text)) {
      validation.cancel();
      return;
    }
    validation.request(term.id, field, text, termDocument(term, field, text));
  }
  function draftError(
    term: TaxonomyTerm,
    field: "value" | "description",
    text: string,
  ) {
    const basic = basicTermError(field, text);
    if (basic) return basic;
    if (field === "value") {
      try {
        updateTaxonomy(document, termDocument(term, field, text));
      } catch (failure) {
        return failure instanceof Error ? failure.message : String(failure);
      }
    }
    return (
      rejectedTermError(term, field, text) ??
      validation.error(term.id, field, text)
    );
  }
  function rejectedTermError(
    term: TaxonomyTerm,
    field: "value" | "description",
    text: string,
  ) {
    return rejected?.source === validationSource &&
      rejected.termId === term.id &&
      rejected.field === field &&
      rejected.text === text
      ? rejected.error
      : null;
  }
  const cancelValidation = useCallback(() => {
    cancelDraftValidation();
    setRejected(undefined);
  }, [cancelDraftValidation]);
  function applyTerm(
    term: TaxonomyTerm,
    field: "value" | "description",
    text: string,
  ) {
    let accepted = false;
    startCommit(() => {
      const problem =
        basicTermError(field, text) ?? commit(termDocument(term, field, text));
      if (problem)
        setRejected({
          source: validationSource,
          termId: term.id,
          field,
          text,
          error: problem,
        });
      else {
        accepted = true;
        if (newTerm?.id === term.id) {
          setNewTerm(undefined);
          setSearch("");
        }
      }
    });
    return accepted;
  }
  function acceptTerm(event: FormEvent<HTMLElement>) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const input = form.querySelector<HTMLElement>("[data-taxonomy-term-id]");
    if (!input) return;
    const term = rows.find(
      (entry) => entry.id === input.dataset.taxonomyTermId,
    );
    const field = input.dataset.taxonomyField;
    const text = field ? new FormData(form).get(field) : null;
    event.preventDefault();
    if (
      !term ||
      (field !== "value" && field !== "description") ||
      typeof text !== "string"
    ) {
      event.stopPropagation();
      setError(
        "The term editor is no longer available. Open the term again before saving.",
      );
      return;
    }
    if (!applyTerm(term, field, text)) {
      // S2 closes EditableCell after onSubmit, so reject before that handler.
      event.stopPropagation();
    }
  }
  const failureAlert = validation.failure && (
    <InlineAlert variant="negative">
      <Heading>Could not check term</Heading>
      <Content>{validation.failure}</Content>
      <Button variant="secondary" type="button" onPress={validation.retry}>
        Retry
      </Button>
    </InlineAlert>
  );
  return (
    <section
      aria-label="Category editor"
      className={editorStyles}
      onSubmitCapture={acceptTerm}
    >
      <header className={headerStyles}>
        <div className={sectionStyles}>
          <h3 className={headingStyles}>{standardCategoryName(category)}</h3>
          <p className={detailStyles}>
            {terms.length.toLocaleString()} terms. {usage().toLocaleString()}{" "}
            token and source references.
          </p>
          {categoryReview?.status !== "standard" && (
            <Badge variant="notice" fillStyle="subtle">
              {CLASSIFICATION_REVIEW_LABEL}
            </Badge>
          )}
          {categoryReview?.fixRequired &&
            classificationReviewMessages(document, [categoryReview]).map(
              (message) => (
                <p key={message} className={detailStyles}>
                  {message}
                </p>
              ),
            )}
          {standardCategoryName(category) !== category.name && (
            <p className={detailStyles}>
              The proposed name is Prominence. Your saved label remains{" "}
              {category.name} until you explicitly rename it.
            </p>
          )}
        </div>
        {editable && (
          <TooltipTrigger>
            <ActionButton
              isQuiet
              aria-label="Delete category"
              onPress={() =>
                setPending({
                  document: {
                    ...document,
                    categories: document.categories.filter(
                      (item) => item.id !== category.id,
                    ),
                    terms: document.terms.filter(
                      (term) => term.categoryId !== category.id,
                    ),
                    order: document.order.filter((id) => id !== category.id),
                  },
                  message:
                    "Delete this category? Referenced categories cannot be deleted until tokens are explicitly remapped.",
                  destructive: true,
                })
              }
            >
              <Delete />
            </ActionButton>
            <Tooltip>Delete category</Tooltip>
          </TooltipTrigger>
        )}
      </header>
      {error && (
        <InlineAlert variant="negative">
          <Heading>Could not apply change</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}
      <div className={sectionStyles}>
        <TextField
          label="Category name"
          value={draft.name}
          onChange={(name) => setDraft({ ...draft, name })}
          isReadOnly={!editable}
          styles={fieldStyles}
        />
        <TextArea
          label="Category description"
          value={draft.description}
          onChange={(description) => setDraft({ ...draft, description })}
          isReadOnly={!editable}
          styles={fieldStyles}
        />
      </div>
      <section className={sectionStyles} aria-label="Classification rules">
        <h4 className={subheadingStyles}>Classification rules</h4>
        <div className={`${pairStyles} taxonomyFieldPair`}>
          <Picker
            label="Value type"
            selectedKey={draft.valueType}
            isDisabled={!editable}
            styles={fieldStyles}
            onSelectionChange={(key) =>
              setDraft({
                ...draft,
                valueType: key === "number" ? "number" : "string",
              })
            }
          >
            <PickerItem id="string">Text</PickerItem>
            <PickerItem id="number">Number</PickerItem>
          </Picker>
          <Picker
            label="Cardinality"
            selectedKey="one"
            isDisabled
            styles={fieldStyles}
          >
            <PickerItem id="one">One term</PickerItem>
          </Picker>
        </div>
        <CheckboxGroup
          label="Applicable token types"
          orientation="horizontal"
          isDisabled={!editable}
          value={draft.scopes}
          onChange={(checked) =>
            setDraft({
              ...draft,
              scopes: applicableScopes
                .filter((scope) => checked.includes(scope.id))
                .map((scope) => scope.id),
            })
          }
        >
          {applicableScopes.map((scope) => (
            <Checkbox key={scope.id} value={scope.id}>
              {scope.label}
            </Checkbox>
          ))}
        </CheckboxGroup>
        <Checkbox
          isDisabled={!editable}
          isSelected={draft.includeInProjections}
          onChange={(includeInProjections) =>
            setDraft({ ...draft, includeInProjections })
          }
        >
          Include in names and hierarchy
        </Checkbox>
        <Checkbox
          isDisabled={!editable}
          isSelected={draft.required}
          onChange={(required) => setDraft({ ...draft, required })}
        >
          Required classification
        </Checkbox>
      </section>
      {editable && (
        <div className={actionsStyles}>
          <Button
            variant="primary"
            isDisabled={JSON.stringify(draft) === JSON.stringify(category)}
            onPress={saveCategory}
          >
            Apply category changes
          </Button>
        </div>
      )}
      <section
        ref={termsRef}
        className={sectionStyles}
        aria-label="Registered terms"
        aria-busy={validation.pending || undefined}
        data-registry-commit-pending={committing || undefined}
      >
        <div className={`${headerStyles} ${style({ position: "relative" })}`}>
          <h4 className={subheadingStyles}>Terms</h4>
          {validation.showPending && (
            <div className={style({ position: "absolute", right: 0, top: 0 })}>
              <ProgressCircle
                size="M"
                isIndeterminate
                aria-label="Checking term"
              />
            </div>
          )}
        </div>
        {newTerm && validation.termId === newTerm.id && failureAlert}
        <SearchField
          label="Search terms"
          value={search}
          onChange={setSearch}
          styles={fieldStyles}
        />
        <TableView
          key={editable ? "editable" : "readonly"}
          aria-label={`${standardCategoryName(category)} terms`}
          isQuiet
          density="compact"
          overflowMode="wrap"
          styles={rows.length ? tableStyles : emptyTableStyles}
        >
          <TableHeader>
            <Column id="value" isRowHeader minWidth={220}>
              Term
            </Column>
            <Column id="description" minWidth={160}>
              Description
            </Column>
            <Column
              id="usage"
              width={64}
              aria-label="Token and source references"
            >
              Uses
            </Column>
            <Column id="standardization" minWidth={240}>
              Classification review
            </Column>
            {editable && (
              <Column id="actions" width={80}>
                Actions
              </Column>
            )}
          </TableHeader>
          <TableBody
            items={rows}
            dependencies={[
              editable,
              document,
              usage,
              newTerm,
              termReviews,
              validation,
            ]}
            renderEmptyState={() => (
              <p className={detailStyles}>
                {search ? "No matching terms." : "No terms registered yet."}
              </p>
            )}
          >
            {(term) =>
              newTermId === term.id ? (
                <Row id={term.id} aria-label="New term">
                  <Cell>
                    <Form
                      onSubmit={(event) => {
                        event.preventDefault();
                        applyTerm(term, "value", String(term.value));
                      }}
                    >
                      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- Focus follows the user's Add term action. */}
                      <TextField
                        autoFocus
                        name="value"
                        aria-label="New term name"
                        value={String(term.value)}
                        isRequired
                        isInvalid={
                          rejectedTermError(term, "value", String(term.value))
                            ? true
                            : undefined
                        }
                        errorMessage={
                          rejectedTermError(
                            term,
                            "value",
                            String(term.value),
                          ) ?? undefined
                        }
                        onChange={(value) => {
                          setNewTerm({ ...term, value });
                          checkDraft(term, "value", value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelValidation();
                            setNewTerm(undefined);
                            setError("");
                          }
                        }}
                        validate={(text) => draftError(term, "value", text)}
                        styles={fieldStyles}
                      />
                      <div className={actionsStyles}>
                        <ActionButton
                          isQuiet
                          size="S"
                          aria-label="Accept term"
                          type="submit"
                        >
                          <Checkmark />
                        </ActionButton>
                        <ActionButton
                          isQuiet
                          size="S"
                          aria-label="Cancel new term"
                          onPress={() => {
                            cancelValidation();
                            setNewTerm(undefined);
                            setError("");
                          }}
                        >
                          <Close />
                        </ActionButton>
                      </div>
                    </Form>
                  </Cell>
                  <Cell>No description</Cell>
                  <Cell>0</Cell>
                  <Cell>Needs definition review</Cell>
                  <Cell>{null}</Cell>
                </Row>
              ) : (
                <Row id={term.id} aria-label={termLabel(term.value)}>
                  {(["value", "description"] as const).map((field) =>
                    editable ? (
                      <EditableCell
                        key={field}
                        textValue={
                          field === "value"
                            ? termLabel(term.value)
                            : String(term[field])
                        }
                        onCancel={cancelValidation}
                        aria-label={`Edit ${termLabel(term.value)} ${field === "value" ? "term" : "description"}`}
                        onSubmit={(event) => {
                          event.preventDefault();
                        }}
                        // eslint-disable-next-line jsx-a11y/no-autofocus -- S2's documented popover focuses the input after the user opens it.
                        renderEditing={() => (
                          <>
                            <TextField
                              autoFocus
                              name={field}
                              label={field === "value" ? "Term" : "Description"}
                              data-taxonomy-term-id={term.id}
                              data-taxonomy-field={field}
                              defaultValue={String(term[field])}
                              isRequired={field === "value"}
                              isInvalid={
                                rejectedTermError(
                                  term,
                                  field,
                                  validation.text ?? String(term[field]),
                                )
                                  ? true
                                  : undefined
                              }
                              errorMessage={
                                rejectedTermError(
                                  term,
                                  field,
                                  validation.text ?? String(term[field]),
                                ) ?? undefined
                              }
                              onChange={(text) => checkDraft(term, field, text)}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  cancelValidation();
                                  event.continuePropagation();
                                }
                              }}
                              validate={(text) => draftError(term, field, text)}
                              styles={fieldStyles}
                            />
                            {validation.termId === term.id &&
                              validation.field === field &&
                              failureAlert}
                          </>
                        )}
                      >
                        <div className={cellStyles}>
                          <div className={termValueStyles}>
                            <span>
                              {field === "value"
                                ? termLabel(term.value)
                                : String(term[field]) || "No description"}
                            </span>
                            {field === "value" &&
                              termReviews.get(term.id)?.status !==
                                "standard" && (
                                <Badge variant="notice" fillStyle="subtle">
                                  {CLASSIFICATION_REVIEW_LABEL}
                                </Badge>
                              )}
                          </div>
                          <ActionButton
                            slot="edit"
                            aria-label={`Edit ${termLabel(term.value)} ${field === "value" ? "term" : "description"}`}
                          >
                            <Edit />
                          </ActionButton>
                        </div>
                      </EditableCell>
                    ) : (
                      <Cell key={field}>
                        <div className={termValueStyles}>
                          <span>
                            {field === "value"
                              ? termLabel(term.value)
                              : String(term[field]) || "No description"}
                          </span>
                          {field === "value" &&
                            termReviews.get(term.id)?.status !== "standard" && (
                              <Badge variant="notice" fillStyle="subtle">
                                {CLASSIFICATION_REVIEW_LABEL}
                              </Badge>
                            )}
                        </div>
                      </Cell>
                    ),
                  )}
                  <Cell>{usage(term.id).toLocaleString()}</Cell>
                  <Cell focusMode="child">
                    <div className={sectionStyles}>
                      <Badge
                        variant={
                          termReviews.get(term.id)?.status === "standard"
                            ? "neutral"
                            : "notice"
                        }
                        fillStyle="subtle"
                      >
                        {termReviews.get(term.id)?.status === "standard"
                          ? "Proposed standard"
                          : CLASSIFICATION_REVIEW_LABEL}
                      </Badge>
                      {termReviews.get(term.id)?.status !== "standard" && (
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Full review reasons must remain keyboard-scrollable.
                        <div
                          className={reviewDetailStyles}
                          role="region"
                          aria-label={`${termLabel(term.value)} classification review`}
                          tabIndex={0}
                        >
                          {termReviews.get(term.id)
                            ? classificationReviewMessages(document, [
                                termReviews.get(term.id)!,
                              ]).map((message) => (
                                <p key={message}>{message}</p>
                              ))
                            : "This definition has not been assessed. Review it before using standard-compliant taxonomy export."}
                        </div>
                      )}
                    </div>
                  </Cell>
                  {editable && (
                    <Cell>
                      <div className={termActionsStyles}>
                        <TooltipTrigger>
                          <ActionButton
                            isQuiet
                            size="S"
                            aria-label={`Delete ${termLabel(term.value)}`}
                            onPress={() =>
                              setPending({
                                document: {
                                  ...document,
                                  terms: document.terms.filter(
                                    (item) => item.id !== term.id,
                                  ),
                                },
                                message: `Delete ${termLabel(term.value)}? Referenced terms require explicit remapping first.`,
                                destructive: true,
                              })
                            }
                          >
                            <Delete />
                          </ActionButton>
                          <Tooltip>Delete term</Tooltip>
                        </TooltipTrigger>
                      </div>
                    </Cell>
                  )}
                </Row>
              )
            }
          </TableBody>
        </TableView>
        {editable && (
          <div className={actionsStyles}>
            <ActionButton
              isDisabled={!!newTerm}
              onPress={() => {
                cancelValidation();
                setError("");
                setNewTerm({
                  id: crypto.randomUUID(),
                  categoryId: category.id,
                  value: "",
                  description: "",
                });
              }}
            >
              <Add />
              <Text>Add term</Text>
            </ActionButton>
          </div>
        )}
      </section>
      <DialogContainer onDismiss={() => setPending(undefined)}>
        {pending && (
          <AlertDialog
            title={
              pending.destructive
                ? `Delete ${pending.deleteKind === "term" ? "term" : "category"}`
                : "Review taxonomy change"
            }
            variant={pending.destructive ? "destructive" : "confirmation"}
            primaryActionLabel={pending.destructive ? "Delete" : "Apply change"}
            cancelLabel="Cancel"
            onPrimaryAction={() => {
              if (pending.destructive) {
                notify.remove({
                  kind: pending.deleteKind ?? "term",
                  noun: pending.deleteNoun,
                  local: true,
                  confirmed: true,
                  run: () => {
                    const failure = commit(pending.document);
                    return failure
                      ? { ok: false as const, error: failure }
                      : document;
                  },
                  undo: (previous) => {
                    if ("ok" in previous) return;
                    const failure = commit(previous);
                    if (failure) throw new Error(failure);
                  },
                });
              } else {
                const addedTerm = pending.document.terms.some(
                  (term) =>
                    !document.terms.some((current) => current.id === term.id),
                );
                const run = () => {
                  const failure = commit(pending.document);
                  return failure
                    ? { ok: false as const, error: failure }
                    : true;
                };
                if (addedTerm) notify.added("term", run);
                else notify.edit(run);
              }
            }}
          >
            {pending.message}
          </AlertDialog>
        )}
      </DialogContainer>
    </section>
  );
}

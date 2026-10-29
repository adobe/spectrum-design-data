// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Disclosure,
  DisclosurePanel,
  DisclosureTitle,
  Heading,
  InlineAlert,
  Radio,
  RadioGroup,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import ChevronUp from "@react-spectrum/s2/icons/ChevronUp";
import ChevronDown from "@react-spectrum/s2/icons/ChevronDown";
import { editModeAtom } from "../../state/view/editMode";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import {
  editReferencedTaxonomyAtom,
  referencedTaxonomySourceAtom,
  taxonomyComponentReferencesAtom,
  taxonomyEvidenceProjections,
  taxonomyEvidenceSourcesAtom,
  taxonomyTemplateReferencesAtom,
} from "../../features/taxonomy/editing";
import { browserTokensAtom } from "../../features/tokens/browserState";
import {
  registerTerm,
  taxonomyEmissionKey,
  withTaxonomyProjection,
  type TaxonomyDocument,
} from "../../features/taxonomy/model";
import { TaxonomyEditor } from "../../panels/registry/TaxonomyEditor";
import {
  assessClassificationStandard,
  standardCategoryName,
} from "../../features/taxonomy/standardization";
import { classificationStandard } from "../../features/taxonomy/standardContract";
import {
  classificationReviewMessages,
  CLASSIFICATION_REVIEW_CONTEXT,
} from "../../features/taxonomy/reviewPresentation";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import "./TaxonomyView.css";

const viewStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 32,
  minWidth: 0,
});
const columnsStyles = style({ display: "grid", gap: 32, alignItems: "start" });
const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const headerStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});
const titleStyles = style({ font: "title", margin: 0 });
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const listStyles = style({ display: "flex", flexDirection: "column", gap: 4 });
const rowStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  minWidth: 0,
  paddingX: 8,
  paddingY: 4,
  borderRadius: "default",
  backgroundColor: { default: "transparent", isSelected: "gray-100" },
});
const categoryLabelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 0,
  flexGrow: 1,
  minWidth: 0,
});
const categoryStatusStyles = style({
  font: "detail-sm",
  color: "neutral-subdued",
  marginStart: 24,
});
const categoryNameStyles = style({ font: "title-sm" });
const detailStyles = style({ font: "detail-sm", color: "neutral-subdued" });
const actionsStyles = style({ display: "flex", gap: 0, flexShrink: 0 });
const fieldStyles = style({ width: "full" });
const proposalTableStyles = style({ width: "full", height: 280 });

export function TaxonomyView() {
  const document = useAtomValue(taxonomyDocumentAtom);
  const tokens = useAtomValue(browserTokensAtom);
  const sources = useAtomValue(taxonomyEvidenceSourcesAtom);
  const templateReferences = useAtomValue(taxonomyTemplateReferencesAtom);
  const componentReferences = useAtomValue(taxonomyComponentReferencesAtom);
  const projections = useMemo(
    () => taxonomyEvidenceProjections(document, sources),
    [document, sources],
  );
  const references = useMemo(
    () => [
      ...projections.map((projection) => projection.classification),
      ...templateReferences.map((source) => source.classification),
      ...componentReferences.map((source) => source.classification),
    ],
    [projections, templateReferences, componentReferences],
  );
  const assessment = useMemo(
    () =>
      withTaxonomyProjection(document, () =>
        assessClassificationStandard(
          document,
          projections.map((projection, index) => ({
            id: sources[index].id,
            scope: sources[index].scope,
            classification: projection.classification,
            projectionIssues: projection.issues,
            measurement: sources[index].measurement,
          })),
        ),
      ),
    [document, sources, projections],
  );
  const termReviews = useMemo(
    () =>
      new Map(
        assessment.occurrences
          .filter((entry) => entry.recordKind === "term-definition")
          .map((entry) => [entry.termId!, entry]),
      ),
    [assessment],
  );
  const categoryReviews = useMemo(
    () =>
      new Map(
        assessment.occurrences
          .filter((entry) => entry.recordKind === "category-definition")
          .map((entry) => [entry.categoryId!, entry]),
      ),
    [assessment],
  );
  const editable = useAtomValue(editModeAtom);
  const edit = useSetAtom(editReferencedTaxonomyAtom);
  const store = useStore();
  const commit = useCallback(
    (next: TaxonomyDocument) => {
      if (store.get(taxonomyDocumentAtom) !== document)
        throw new Error(
          "The Registry changed while this edit was pending. Reopen the editor before applying your change.",
        );
      edit(next);
    },
    [document, edit, store],
  );
  const validationSource = useAtomValue(referencedTaxonomySourceAtom);
  const [selected, setSelected] = useState(document.order[0]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const category =
    document.categories.find((item) => item.id === selected) ??
    document.categories.find((item) => item.id === document.order[0]);
  const write = useCallback(
    (next: TaxonomyDocument) => {
      try {
        commit(next);
        setError("");
        return true;
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));
        return false;
      }
    },
    [commit],
  );
  function move(index: number, delta: number) {
    const order = [...document.order];
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    write({ ...document, order });
  }
  const proposals = useMemo(() => {
    const proposals = new Map<
      string,
      { key: string; value: string | number }
    >();
    for (const token of sources) {
      if (document.classifications[token.id] || token.context?.governed)
        continue;
      for (const [field, value] of Object.entries(token.evidence)) {
        const category = document.categories.find((item) => item.key === field);
        if (
          category &&
          !document.terms.some(
            (term) => term.categoryId === category.id && term.value === value,
          )
        ) {
          proposals.set(JSON.stringify([field, value]), { key: field, value });
        }
      }
    }
    return proposals;
  }, [document, sources]);
  const editor = useMemo(
    () =>
      category && (
        <TaxonomyEditor
          key={`${editable}:${JSON.stringify(category)}`}
          document={document}
          category={category}
          editable={editable}
          onCommit={commit}
          validationSource={validationSource}
          termReviews={termReviews}
          categoryReview={categoryReviews.get(category.id)}
          usage={(termId) =>
            references.filter((classification) => {
              const assignment = classification[category.id];
              return termId
                ? Array.isArray(assignment)
                  ? assignment.includes(termId)
                  : assignment === termId
                : assignment !== undefined;
            }).length
          }
        />
      ),
    [
      category,
      editable,
      document,
      commit,
      validationSource,
      termReviews,
      categoryReviews,
      references,
    ],
  );
  const review = useMemo(
    () => (
      <>
        <Disclosure isQuiet>
          <DisclosureTitle>Components and elements</DisclosureTitle>
          <DisclosurePanel>
            <div className={sectionStyles}>
              <p className={noteStyles}>
                Elements are abstract styling targets. Body, Heading, Detail,
                and Code belong to the same component catalog as Button,
                Checkbox, and Slider, grouped by purpose.
              </p>
              <TableView
                aria-label="Proposed component catalog"
                isQuiet
                density="compact"
                styles={proposalTableStyles}
              >
                <TableHeader>
                  <Column id="name" isRowHeader>
                    Component
                  </Column>
                  <Column id="group">Group</Column>
                  <Column id="elements">Shared Element references</Column>
                </TableHeader>
                <TableBody items={classificationStandard.components}>
                  {(component) => (
                    <Row id={component.id}>
                      <Cell>{component.name}</Cell>
                      <Cell>{component.group}</Cell>
                      <Cell>
                        {component.elementIds
                          .map(
                            (id) =>
                              classificationStandard.concepts.find(
                                (concept) => concept.id === id,
                              )?.value,
                          )
                          .join(", ")}
                      </Cell>
                    </Row>
                  )}
                </TableBody>
              </TableView>
              <p className={noteStyles}>
                These are shared proposal identities, not a new component editor
                or an automatic anatomy migration. Slider track and handle
                references remain distinct.
              </p>
            </div>
          </DisclosurePanel>
        </Disclosure>
        <section aria-label="Migration review">
          <Disclosure isQuiet>
            <DisclosureTitle>Migration review</DisclosureTitle>
            <DisclosurePanel>
              <div className={sectionStyles}>
                <p className={noteStyles}>
                  {tokens
                    .filter((token) => token.projection?.issues.length)
                    .length.toLocaleString()}{" "}
                  tokens need classification review. Your existing names, edits,
                  and token IDs are preserved.
                </p>
                <p className={noteStyles}>
                  Review these source terms before registering them. Legacy name
                  edits still need explicit mapping in Tokens.
                </p>
                <TableView
                  aria-label="Proposed source terms"
                  isQuiet
                  density="compact"
                  styles={proposalTableStyles}
                >
                  <TableHeader>
                    <Column id="value" isRowHeader>
                      Term
                    </Column>
                    <Column id="category">Category</Column>
                    <Column id="actions" width={64}>
                      Review
                    </Column>
                  </TableHeader>
                  <TableBody
                    items={[...proposals].map(([id, proposal]) => ({
                      id,
                      ...proposal,
                    }))}
                    renderEmptyState={() => (
                      <p className={noteStyles}>
                        No new source terms to review.
                      </p>
                    )}
                  >
                    {(proposal) => (
                      <Row id={proposal.id}>
                        <Cell>{String(proposal.value)}</Cell>
                        <Cell>
                          {
                            document.categories.find(
                              (item) => item.key === proposal.key,
                            )?.name
                          }
                        </Cell>
                        <Cell>
                          {editable && (
                            <TooltipTrigger>
                              <ActionButton
                                isQuiet
                                aria-label={`Review and register ${String(proposal.value)}`}
                                onPress={() => {
                                  try {
                                    write(
                                      registerTerm(
                                        document,
                                        document.categories.find(
                                          (item) => item.key === proposal.key,
                                        )!.id,
                                        proposal.value,
                                        crypto.randomUUID(),
                                      ),
                                    );
                                  } catch (failure) {
                                    setError(
                                      failure instanceof Error
                                        ? failure.message
                                        : String(failure),
                                    );
                                  }
                                }}
                              >
                                <Add />
                              </ActionButton>
                              <Tooltip>Register term</Tooltip>
                            </TooltipTrigger>
                          )}
                        </Cell>
                      </Row>
                    )}
                  </TableBody>
                </TableView>
                <p className={noteStyles}>
                  Proposals use typed source fields, not token name splitting.
                  Reference counts include tokens, source assignments, structure
                  bindings, and foundation surfaces, including unpublished
                  mappings. Structure bindings and surface projections are not
                  extra published tokens.
                </p>
                <TableView
                  aria-label="Classification entries needing review"
                  isQuiet
                  density="compact"
                  overflowMode="wrap"
                  styles={proposalTableStyles}
                >
                  <TableHeader>
                    <Column id="record" isRowHeader minWidth={180}>
                      Record
                    </Column>
                    <Column id="location" minWidth={180}>
                      Location in data
                    </Column>
                    <Column id="fix" minWidth={260}>
                      What to review and next steps
                    </Column>
                  </TableHeader>
                  <TableBody
                    items={assessment.occurrences.filter(
                      (entry) => entry.fixRequired,
                    )}
                    renderEmptyState={() => (
                      <p className={noteStyles}>
                        No classification entries need review.
                      </p>
                    )}
                  >
                    {(entry) => (
                      <Row id={entry.id}>
                        <Cell>{entry.recordId}</Cell>
                        <Cell>{entry.pointer}</Cell>
                        <Cell>
                          {classificationReviewMessages(document, [entry]).map(
                            (message) => (
                              <p key={message}>{message}</p>
                            ),
                          )}
                        </Cell>
                      </Row>
                    )}
                  </TableBody>
                </TableView>
              </div>
            </DisclosurePanel>
          </Disclosure>
        </section>
      </>
    ),
    [tokens, proposals, document, editable, write, assessment],
  );
  const deferredReview = useDeferredValue(review);
  const reviewPending = review !== deferredReview;
  return (
    <div className={`${viewStyles} taxonomyView`}>
      {!editable && (
        <p className={noteStyles}>
          Choose Edit to make changes. Your changes use the system Save and
          Cancel controls.
        </p>
      )}
      {assessment.counts.nonStandard > 0 && (
        <InlineAlert variant="notice">
          <Heading>Classification needs review</Heading>
          <Content>
            {assessment.counts.nonStandard.toLocaleString()} classification
            entries need review. One shared definition can flag many tokens that
            use it. You can still edit and save, but standard-compliant taxonomy
            export stays blocked until all entries pass.
          </Content>
        </InlineAlert>
      )}
      <p className={noteStyles}>
        {CLASSIFICATION_REVIEW_CONTEXT} The count includes shared definitions
        and their uses, not a count of unique tokens or color values.
      </p>
      {templateReferences.length > 0 && (
        <p className={noteStyles}>
          {templateReferences.length} template element references protect their
          Registry types and orientations. These are authoring dependencies, not
          generated token occurrences.
        </p>
      )}
      {componentReferences.length > 0 && (
        <p className={noteStyles}>
          {componentReferences.length} component property references protect
          their Registry terms. These authoring dependencies do not add
          generated tokens.
        </p>
      )}
      {error && (
        <InlineAlert variant="negative">
          <Heading>Could not apply change</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}
      <div className={`${columnsStyles} taxonomyColumns`}>
        <section aria-label="Global category order" className={sectionStyles}>
          <div className={headerStyles}>
            <h3 className={titleStyles}>Categories</h3>
            <span className={detailStyles}>{document.order.length}</span>
          </div>
          <p className={noteStyles}>
            This order controls token names and hierarchy.
          </p>
          <RadioGroup
            aria-label="Categories"
            size="S"
            value={category?.id ?? ""}
            onChange={setSelected}
          >
            <div className={listStyles}>
              {document.order.map((id, index) => {
                const item = document.categories.find(
                  (entry) => entry.id === id,
                )!;
                return (
                  <div
                    key={id}
                    className={rowStyles({ isSelected: category?.id === id })}
                  >
                    <div className={categoryLabelStyles}>
                      <Radio value={id} aria-label={standardCategoryName(item)}>
                        <span className={categoryNameStyles}>
                          {standardCategoryName(item)}
                        </span>
                      </Radio>
                      <span className={categoryStatusStyles}>
                        {item.includeInProjections
                          ? "Names and hierarchy"
                          : "Classification only"}
                      </span>
                    </div>
                    {editable && (
                      <div className={actionsStyles}>
                        <TooltipTrigger>
                          <ActionButton
                            isQuiet
                            size="S"
                            aria-label={`Move ${item.name} earlier`}
                            isDisabled={index === 0}
                            onPress={() => move(index, -1)}
                          >
                            <ChevronUp />
                          </ActionButton>
                          <Tooltip>Move earlier</Tooltip>
                        </TooltipTrigger>
                        <TooltipTrigger>
                          <ActionButton
                            isQuiet
                            size="S"
                            aria-label={`Move ${item.name} later`}
                            isDisabled={index === document.order.length - 1}
                            onPress={() => move(index, 1)}
                          >
                            <ChevronDown />
                          </ActionButton>
                          <Tooltip>Move later</Tooltip>
                        </TooltipTrigger>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </RadioGroup>
          {editable && (
            <DialogTrigger
              onOpenChange={(open) => {
                if (open) {
                  setName("");
                  setError("");
                }
              }}
            >
              <Button variant="accent">
                <Add />
                <Text>Create category</Text>
              </Button>
              <Dialog size="S">
                {({ close }) => (
                  <>
                    <Heading slot="title">Create category</Heading>
                    <Content>
                      <div className={sectionStyles}>
                        <TextField
                          label="New category name"
                          value={name}
                          onChange={setName}
                          styles={fieldStyles}
                          isRequired
                        />
                        {error && (
                          <InlineAlert variant="negative">
                            <Heading>Could not create category</Heading>
                            <Content>{error}</Content>
                          </InlineAlert>
                        )}
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
                          const id = crypto.randomUUID();
                          if (
                            write({
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
                            })
                          ) {
                            setSelected(id);
                            close();
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
        </section>
        {editor}
      </div>
      <DerivedContentBoundary
        state={reviewPending ? "pending" : "ready"}
        label="Updating classification review"
      >
        <div
          className={viewStyles}
          data-taxonomy-review
          inert={reviewPending || undefined}
        >
          {deferredReview}
        </div>
      </DerivedContentBoundary>
    </div>
  );
}

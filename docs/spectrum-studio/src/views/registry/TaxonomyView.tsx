// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  InlineAlert,
  Radio,
  RadioGroup,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
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
import {
  taxonomyEmissionKey,
  type TaxonomyDocument,
} from "../../features/taxonomy/model";
import { TaxonomyEditor } from "../../panels/registry/TaxonomyEditor";
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

export function TaxonomyView() {
  const document = useAtomValue(taxonomyDocumentAtom);
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
    [category, editable, document, commit, validationSource, references],
  );
  return (
    <div className={`${viewStyles} taxonomyView`}>
      {!editable && (
        <p className={noteStyles}>
          Choose Edit to make changes. Your changes use the system Save and
          Cancel controls.
        </p>
      )}
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
                      <Radio value={id} aria-label={item.name}>
                        <span className={categoryNameStyles}>{item.name}</span>
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
    </div>
  );
}

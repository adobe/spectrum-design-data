// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import {
  ActionButton,
  AlertDialog,
  DialogContainer,
  LabeledValue,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
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
import Edit from "@react-spectrum/s2/icons/Edit";
import Delete from "@react-spectrum/s2/icons/Delete";
import { CategoryIcon } from "../../components/CategoryIcon";
import type {
  ComponentsDocument,
  ComponentRecord,
  ComponentAssignment,
} from "../../features/components/model";
import type { ComponentToken } from "../../features/components/references";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import { componentRelationships } from "../../features/components/projection";
import { reorderIds } from "../../features/components/ordering";
import { canonicalJson } from "../../features/design-data/canonicalJson";
import { ComponentDefinitionEditor } from "../../panels/components/ComponentDefinitionEditor";
import { ComponentDeclarationsEditor } from "../../panels/components/ComponentDeclarationsEditor";
import { ComponentAssignmentEditor } from "../../panels/components/ComponentAssignmentEditor";
import type { ComponentCatalogEntry } from "../../panels/components/ComponentsPanel";
import type { ComponentCreation } from "../../panels/components/useComponentNavigation";
import { useComponentReordering } from "../../panels/components/useComponentReordering";
import "./Components.css";

const tableStyles = style({ width: "full", height: 420, minWidth: 0 });
const tabsStyles = style({ minWidth: 0, width: "full" });
const sections = [
  "definitions",
  "parts",
  "properties",
  "options",
  "states",
  "tokens",
] as const;

export function ComponentDataView({
  document,
  catalog,
  taxonomy,
  tokens,
  editable,
  selected,
  onSelect,
  onCommit,
  referenceError,
  creating,
  onCreate,
  onCloseCreation,
  onCreated,
  onDefinitionDirtyChange,
  draftVersion = 0,
}: {
  document: ComponentsDocument;
  catalog: readonly ComponentCatalogEntry[];
  taxonomy: TaxonomyDocument;
  tokens: readonly ComponentToken[];
  editable: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onCommit: (document: ComponentsDocument) => void;
  referenceError?: string;
  creating?: ComponentCreation;
  onCreate?: (entry: ComponentCatalogEntry) => void;
  onCloseCreation?: () => void;
  onCreated?: () => void;
  onDefinitionDirtyChange?: (dirty: boolean) => void;
  draftVersion?: number;
}) {
  const [section, setSection] = useState("definitions");
  const [assignment, setAssignment] = useState<ComponentAssignment | "new">();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const component = document.components.find(
    (record) => record.id === selected,
  );
  const catalogEntry = catalog.find((entry) => entry.id === selected);
  const commitComponent = (record: ComponentRecord) => {
    const next = structuredClone(document);
    const index = next.components.findIndex((entry) => entry.id === record.id);
    if (index < 0) next.components.unshift(record);
    else next.components[index] = record;
    onCommit(next);
    onSelect(record.id);
    setError("");
  };
  const relationships = component
    ? componentRelationships(component, taxonomy)
    : [];
  const dragAndDropHooks = useComponentReordering<{ id: string; name: string }>(
    editable,
    `${selected ?? "empty"}-properties`,
    (keys, target, position) => {
      if (!component) throw new Error("This component is no longer available.");
      const rows = new Map(component.assignments.map((row) => [row.id, row]));
      const order = reorderIds(
        component.assignments.map((row) => row.id),
        keys,
        target,
        position,
      );
      commitComponent({
        ...component,
        assignments: order.map((id) => rows.get(id)!),
      });
    },
    setError,
  );
  return (
    <main className="componentContent" data-component="ComponentDataView">
      {referenceError && (
        <p role="alert">Token references are unavailable. {referenceError}</p>
      )}
      {!component ? (
        <>
          <h2>{catalogEntry?.name ?? "Component data"}</h2>
          <p>
            {catalogEntry
              ? "This shared catalog entry has no authored component declaration yet."
              : "Choose a component to inspect its data."}
          </p>
          {catalogEntry && editable && onCreate && (
            <ActionButton onPress={() => onCreate(catalogEntry)}>
              <Add />
              <Text>Add component data</Text>
            </ActionButton>
          )}
        </>
      ) : (
        <>
          <header className="componentHeader">
            <div>
              <h2>{component.declaration.displayName}</h2>
              <p>{component.declaration.description}</p>
            </div>
            {editable && (
              <ActionButton onPress={() => setConfirmDelete(true)}>
                <Delete />
                <Text>Delete component</Text>
              </ActionButton>
            )}
          </header>
          <Tabs
            aria-label="Component sections"
            selectedKey={section}
            onSelectionChange={(key) => setSection(String(key))}
            styles={tabsStyles}
          >
            <TabList>
              {sections.map((id) => (
                <Tab
                  key={id}
                  id={id}
                  aria-label={id[0].toUpperCase() + id.slice(1)}
                >
                  <CategoryIcon category={`component.${id}`} />
                  <Text>{id[0].toUpperCase() + id.slice(1)}</Text>
                </Tab>
              ))}
            </TabList>
            <TabPanel id="definitions" shouldForceMount>
              {editable ? (
                <ComponentDefinitionEditor
                  key={`${component.id}:${draftVersion}`}
                  component={component}
                  onApply={commitComponent}
                  onDirtyChange={onDefinitionDirtyChange}
                />
              ) : (
                <section className="componentSection">
                  <LabeledValue
                    label="Machine name"
                    value={component.declaration.name}
                  />
                  <LabeledValue
                    label="Category"
                    value={component.declaration.meta.category}
                  />
                  <LabeledValue
                    label="Documentation URI"
                    value={component.declaration.meta.documentationUrl}
                  />
                  <LabeledValue
                    label="Document URI"
                    value={component.declaration.$id}
                  />
                </section>
              )}
            </TabPanel>
            <TabPanel id="parts">
              <ComponentDeclarationsEditor
                component={component}
                section="parts"
                editable={editable}
                onApply={commitComponent}
              />
            </TabPanel>
            <TabPanel id="properties">
              <section
                className="componentSection"
                aria-label="Component properties"
              >
                {editable && (
                  <ActionButton onPress={() => setAssignment("new")}>
                    <Add />
                    <Text>Add property</Text>
                  </ActionButton>
                )}
                <p>
                  {relationships.length} property assignments. These rows do not
                  generate additional tokens.
                </p>
                <TableView
                  key={editable ? "editing" : "readonly"}
                  aria-label="Property assignments"
                  styles={tableStyles}
                  dragAndDropHooks={dragAndDropHooks}
                >
                  <TableHeader>
                    <Column id="part" isRowHeader minWidth={100}>
                      Part
                    </Column>
                    <Column id="property" minWidth={90}>
                      Property
                    </Column>
                    <Column id="scope" minWidth={100}>
                      Applies when
                    </Column>
                    <Column id="value" minWidth={100}>
                      Value
                    </Column>
                    <Column id="description" minWidth={100}>
                      Description
                    </Column>
                    {editable && (
                      <Column id="actions" width={104}>
                        Actions
                      </Column>
                    )}
                  </TableHeader>
                  <TableBody
                    items={relationships.map((row) => ({
                      ...row,
                      id: row.uuid,
                      name: `${row.scope.part ?? "Whole component"} ${row.scope.property}`,
                    }))}
                    dependencies={[editable, tokens]}
                    renderEmptyState={() =>
                      "No property assignments are authored."
                    }
                  >
                    {(row) => {
                      const target = row.$ref
                        ? tokens.find((token) => token.id === row.$ref)
                        : undefined;
                      const value = row.$ref
                        ? target
                          ? `${target.name}: ${target.displayValue}${Object.keys(target.context).length ? ` (${canonicalJson(target.context)})` : ""}`
                          : "Unavailable token"
                        : typeof row.value === "string"
                          ? row.value
                          : canonicalJson(row.value);
                      return (
                        <Row id={row.id} textValue={row.name}>
                          <Cell>{row.scope.part ?? "Whole component"}</Cell>
                          <Cell>{row.scope.property}</Cell>
                          <Cell>
                            <span
                              className="componentDescription"
                              title={
                                row.scope.options
                                  ? canonicalJson(row.scope.options)
                                  : undefined
                              }
                            >
                              {row.scope.options
                                ? canonicalJson(row.scope.options)
                                : "All contexts"}
                            </span>
                          </Cell>
                          <Cell>
                            <span
                              className="componentDescription"
                              title={value}
                            >
                              {value}
                            </span>
                          </Cell>
                          <Cell>
                            <span
                              className="componentDescription"
                              title={row.description}
                            >
                              {row.description ?? ""}
                            </span>
                          </Cell>
                          {editable && (
                            <Cell>
                              <div className="componentRowActions">
                                <ActionButton
                                  isQuiet
                                  size="S"
                                  aria-label={`Edit property ${row.scope.property} ${row.scope.part ?? "whole component"}`}
                                  onPress={() => {
                                    const source = component.assignments.find(
                                      (entry) => entry.id === row.uuid,
                                    );
                                    if (!source) {
                                      setError(
                                        "This property assignment changed. Reopen the table before editing it.",
                                      );
                                      return;
                                    }
                                    setAssignment(source);
                                  }}
                                >
                                  <Edit />
                                </ActionButton>
                                <ActionButton
                                  isQuiet
                                  size="S"
                                  aria-label={`Delete property ${row.scope.property} ${row.scope.part ?? "whole component"}`}
                                  onPress={() => {
                                    try {
                                      commitComponent({
                                        ...component,
                                        assignments:
                                          component.assignments.filter(
                                            (entry) => entry.id !== row.uuid,
                                          ),
                                      });
                                    } catch (failure) {
                                      setError(
                                        failure instanceof Error
                                          ? failure.message
                                          : String(failure),
                                      );
                                    }
                                  }}
                                >
                                  <Delete />
                                </ActionButton>
                              </div>
                            </Cell>
                          )}
                        </Row>
                      );
                    }}
                  </TableBody>
                </TableView>
              </section>
            </TabPanel>
            <TabPanel id="options">
              <ComponentDeclarationsEditor
                component={component}
                section="options"
                editable={editable}
                onApply={commitComponent}
              />
            </TabPanel>
            <TabPanel id="states">
              <ComponentDeclarationsEditor
                component={component}
                section="states"
                editable={editable}
                onApply={commitComponent}
              />
            </TabPanel>
          </Tabs>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {creating && editable && (
        <ComponentDefinitionEditor
          initialName={creating.name}
          initialCategory={creating.category}
          catalogId={creating.catalogId}
          onApply={(record) => {
            commitComponent(record);
            onCreated?.();
          }}
          onCancel={onCloseCreation}
        />
      )}
      {assignment && component && editable && (
        <ComponentAssignmentEditor
          key={assignment === "new" ? "new" : assignment.id}
          component={component}
          assignment={assignment === "new" ? undefined : assignment}
          taxonomy={taxonomy}
          tokens={tokens}
          onApply={(row) => {
            commitComponent({
              ...component,
              assignments:
                assignment === "new"
                  ? [...component.assignments, row]
                  : component.assignments.map((entry) =>
                      entry.id === row.id ? row : entry,
                    ),
            });
            setAssignment(undefined);
          }}
          onCancel={() => setAssignment(undefined)}
        />
      )}
      <DialogContainer onDismiss={() => setConfirmDelete(false)}>
        {confirmDelete && component && (
          <AlertDialog
            title="Delete component?"
            variant="destructive"
            primaryActionLabel="Delete component"
            cancelLabel="Cancel deletion"
            onPrimaryAction={() => {
              try {
                onCommit({
                  ...document,
                  components: document.components.filter(
                    (entry) => entry.id !== component.id,
                  ),
                });
                onSelect(null);
                setConfirmDelete(false);
              } catch (failure) {
                setError(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
            }}
          >
            Delete this component and its owned property assignments? Global
            Cancel can restore your saved data.
          </AlertDialog>
        )}
      </DialogContainer>
    </main>
  );
}

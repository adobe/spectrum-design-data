// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ActionButton,
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  IllustratedMessage,
  Content,
  Heading,
  InlineAlert,
  Text,
} from "@react-spectrum/s2";
import _3D from "@react-spectrum/s2/illustrations/linear/3D";
import Add from "@react-spectrum/s2/icons/Add";
import {
  atom,
  useAtomValue,
  useSetAtom,
  useStore,
  type ExtractAtomValue,
} from "jotai";
import {
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { editModeAtom } from "../../state/view/editMode";
import {
  assignStructureAtom,
  selectedStructureAtom,
  structuresDocumentAtom,
  selectedStructureIdAtom,
  setStructureTokenNamingAtom,
} from "../../features/structures/state";
import { primitiveReferencesAtom } from "../../features/tokens/primitiveReferenceState";
import { STRUCTURE_SLOT_KEYS } from "../../features/structures/model";
import {
  resolveStructure,
  constraintChoiceIssue,
  isConstraintSlot,
  UNMEASURED_LAYOUT,
  type PreviewLayoutContext,
} from "../../features/structures/resolution";
import { StructureEditorPanel } from "../../panels/structures/StructureEditorPanel";
import { StructurePreview } from "./StructurePreview";
import { StructureElementEditorPanel } from "../../panels/structures/StructureElementEditorPanel";
import {
  insertElementAtom,
  insertStructureInstanceAtom,
  removeElementAtom,
  restoreElementAtom,
  selectedElementIdAtom,
  updateElementAtom,
} from "../../features/structures/elementState";
import { resolveElements } from "../../features/structures/elementResolution";
import { rulesAtom } from "../../features/logic/library";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import "./StructureDesignView.css";
import { Panel } from "../../components/Panel";
import {
  isLeaf,
  structureCandidates,
} from "../../features/structures/children";
import { resolveCompositionResult } from "../../features/structures/composition";
import { workingTshirtArtifactsAtom } from "../../features/design-data/tshirtState";
import { browserModeContextAtom } from "../../features/tokens/browserState";
import { measureCompositionLayouts } from "./compositionMeasurement";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { StructureMetadataPanel } from "../../panels/structures/StructureMetadataPanel";
import { StructureProperties } from "../../panels/structures/StructureProperties";
import {
  structurePreviewStateAtom,
  updateStructureEditorAtom,
  restoreStructureEditorRemovalAtom,
} from "../../features/structures/variantState";
import {
  resolveStructureOptions,
  structureEditor,
  optionSlotChanges,
} from "../../features/structures/variants";
import {
  activeVariant,
  updateOptionOverrides,
} from "../../features/structures/variantOperations";
import { StructureOptionSample } from "./StructureOptionSample";
import { useNotify } from "../../components/notifications/notificationContext";

const structureDesignInputAtom = atom((get) => ({
  structure: get(selectedStructureAtom),
  references: get(primitiveReferencesAtom),
  editing: get(editModeAtom),
  taxonomy: get(taxonomyDocumentAtom),
  rules: get(rulesAtom),
  catalog: get(structuresDocumentAtom).structures,
  generation: get(workingTshirtArtifactsAtom),
  mode: get(browserModeContextAtom),
  selectedElementId: get(selectedElementIdAtom),
}));

export function StructureDesignView() {
  const incoming = useAtomValue(structureDesignInputAtom);
  const deferred = useDeferredValue(incoming);
  const pending =
    incoming.structure !== null &&
    incoming.structure.conceptId !== deferred.structure?.conceptId;
  const displayed = pending ? deferred : incoming;
  const content = useMemo(
    () => <StructureDesignContent input={displayed} />,
    [displayed],
  );
  return (
    <DerivedContentBoundary
      state={pending ? "pending" : "ready"}
      label="Updating Structure preview"
    >
      <div className="structureDesignWork" inert={pending || undefined}>
        {content}
      </div>
    </DerivedContentBoundary>
  );
}

function StructureDesignContent({
  input,
}: {
  input: ExtractAtomValue<typeof structureDesignInputAtom>;
}) {
  const notify = useNotify();
  const {
    structure: authoredStructure,
    references,
    editing,
    taxonomy,
    rules,
    catalog,
    generation,
    mode,
    selectedElementId,
  } = input;
  const preview = useAtomValue(structurePreviewStateAtom);
  const setPreview = useSetAtom(structurePreviewStateAtom);
  const updateEditor = useSetAtom(updateStructureEditorAtom);
  const restoreEditor = useSetAtom(restoreStructureEditorRemovalAtom);
  const [addOptionRequest, setAddOptionRequest] = useState(0);
  const effective = useMemo(
    () =>
      authoredStructure
        ? resolveStructureOptions(authoredStructure, preview)
        : null,
    [authoredStructure, preview],
  );
  const structure = effective?.structure ?? null;
  const variant = authoredStructure
    ? activeVariant(
        authoredStructure,
        preview.activePropertyId,
        preview.options,
      )
    : null;
  const assign = useSetAtom(assignStructureAtom);
  const store = useStore();
  const selectStructure = useSetAtom(selectedStructureIdAtom),
    nameTokens = useSetAtom(setStructureTokenNamingAtom);
  const insertStructure = useSetAtom(insertStructureInstanceAtom);
  const selectElement = useSetAtom(selectedElementIdAtom);
  const insert = useSetAtom(insertElementAtom),
    updateElement = useSetAtom(updateElementAtom);

  const selectedElement =
    structure?.elements?.find((element) => element.id === selectedElementId) ??
    authoredStructure?.elements?.find(
      (element) => element.id === selectedElementId,
    );
  const elements = useMemo(
    () => (structure ? resolveElements(structure, references, rules) : []),
    [structure, references, rules],
  );
  const stage = useRef<HTMLDivElement>(null);
  const natural = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PreviewLayoutContext>(UNMEASURED_LAYOUT);
  const [moduleLayouts, setModuleLayouts] = useState<
    Record<string, PreviewLayoutContext>
  >({});
  const resolved = useMemo(
    () => (structure ? resolveStructure(structure, references, layout) : null),
    [structure, references, layout],
  );
  const compositionResult = useMemo(() => {
    if (!structure || generation.status !== "ready") return null;
    return resolveCompositionResult(
      structure,
      catalog,
      references,
      rules,
      generation.bundle,
      Object.fromEntries(JSON.parse(mode.key) as [string, string][]),
      "m",
      layout,
      moduleLayouts,
      preview.options,
    );
  }, [
    structure,
    catalog,
    references,
    rules,
    generation,
    mode.key,
    layout,
    moduleLayouts,
    preview.options,
  ]);
  const composition =
    compositionResult?.status === "ready" ? compositionResult.value : null;
  const measurementKey = JSON.stringify([
    resolved?.styles,
    resolved?.intrinsicStyles,
    composition?.children ?? elements,
  ]);
  const naturalInvalid =
    elements.some((element) => element.issues.length) ||
    (!!resolved &&
      [
        "gap",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ].some((slot) => slot in resolved.issues));
  useLayoutEffect(() => {
    if (!stage.current || !natural.current) return;
    const measure = () => {
      const frame = stage.current;
      const sample = natural.current;
      if (!frame || !sample) return;
      const rect = sample.getBoundingClientRect();
      const next: PreviewLayoutContext = {
        availableWidth: frame.clientWidth,
        availableHeight: frame.clientHeight,
        naturalWidth: naturalInvalid ? null : rect.width,
        naturalHeight: naturalInvalid ? null : rect.height,
      };
      setLayout((previous) =>
        Object.keys(next).every(
          (key) =>
            next[key as keyof PreviewLayoutContext] ===
            previous[key as keyof PreviewLayoutContext],
        )
          ? previous
          : next,
      );
      if (!resolved) return;
      const modules = measureCompositionLayouts(sample, frame, resolved);
      setModuleLayouts((previous) =>
        JSON.stringify(previous) === JSON.stringify(modules)
          ? previous
          : modules,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage.current);
    observer.observe(natural.current);
    return () => observer.disconnect();
  }, [measurementKey, structure?.conceptId, naturalInvalid, resolved]);
  const requireCurrentStructure = () => {
    const current = store.get(selectedStructureAtom);
    if (!current || current.conceptId !== structure?.conceptId)
      throw new Error(
        "The selected Structure has changed. Reopen its settings before editing.",
      );
    return current;
  };
  const deleteSelected = () => {
    requireCurrentStructure();
    if (!structure || !selectedElement)
      throw new Error("The selected element is no longer available.");
    notify.remove({
      kind: "structureElement",
      run: (store) =>
        store.set(removeElementAtom, {
          structureId: structure.conceptId,
          elementId: selectedElement.id,
          confirmed: true,
        }),
      undo: (removed) => store.set(restoreElementAtom, removed),
    });
  };
  return (
    <div className="structureDesignCanvas" data-component="StructureDesignView">
      {structure && resolved ? (
        <>
          {authoredStructure && (
            <StructureMetadataPanel
              key={authoredStructure.conceptId}
              structure={authoredStructure}
              catalog={catalog}
              preview={preview}
              isReadOnly={!editing}
            />
          )}
          <div className="structureDesignStage" ref={stage}>
            {effective?.issues.length ? (
              <InlineAlert variant="negative">
                <Heading>Resolve variant differences</Heading>
                <Content>{effective.issues.join(" ")}</Content>
              </InlineAlert>
            ) : generation.status === "error" ||
              compositionResult?.status === "error" ? (
              <InlineAlert variant="negative">
                <Heading>Generation needs repair</Heading>
                <Content>
                  {generation.status === "error"
                    ? generation.error
                    : compositionResult?.status === "error"
                      ? compositionResult.error
                      : ""}
                </Content>
              </InlineAlert>
            ) : (
              <div className="structureVariantFrames">
                {(variant?.property?.options ?? [null]).map((option) => (
                  <div
                    key={option?.id ?? "default"}
                    className="structureVariantOption"
                    data-selected={
                      !option || option.id === variant?.option?.id || undefined
                    }
                  >
                    <StructureOptionSample
                      structure={authoredStructure!}
                      catalog={catalog}
                      references={references}
                      rules={rules}
                      bundle={
                        generation.status === "ready"
                          ? generation.bundle
                          : undefined
                      }
                      mode={Object.fromEntries(
                        JSON.parse(mode.key) as [string, string][],
                      )}
                      preview={
                        option && variant?.property
                          ? {
                              ...preview,
                              options: {
                                ...preview.options,
                                [variant.property.id]: option.id,
                              },
                            }
                          : preview
                      }
                      structures={structureCandidates(
                        catalog,
                        structure.conceptId,
                      )}
                      taxonomy={taxonomy}
                      selectedElementId={
                        !option || option.id === variant?.option?.id
                          ? (selectedElement?.id ?? null)
                          : null
                      }
                      onSelectElement={(id) => {
                        if (option && variant?.property)
                          setPreview({
                            options: {
                              ...preview.options,
                              [variant.property.id]: option.id,
                            },
                          });
                        selectElement(id);
                      }}
                      onInsertStructure={
                        editing
                          ? (targetId, index, expected) => {
                              try {
                                requireCurrentStructure();
                                insertStructure({
                                  structureId: structure.conceptId,
                                  targetId,
                                  index,
                                  expected,
                                  preview:
                                    option && variant?.property
                                      ? {
                                          ...preview,
                                          options: {
                                            ...preview.options,
                                            [variant.property.id]: option.id,
                                          },
                                        }
                                      : preview,
                                });
                                if (option && variant?.property)
                                  setPreview({
                                    options: {
                                      ...preview.options,
                                      [variant.property.id]: option.id,
                                    },
                                  });
                              } catch (failure) {
                                notify.error(
                                  failure instanceof Error
                                    ? failure.message
                                    : String(failure),
                                );
                              }
                            }
                          : undefined
                      }
                      onInsert={
                        editing
                          ? (kind, index, expected) => {
                              try {
                                requireCurrentStructure();
                                insert({
                                  structureId: structure.conceptId,
                                  kind,
                                  index,
                                  expected,
                                  preview:
                                    option && variant?.property
                                      ? {
                                          ...preview,
                                          options: {
                                            ...preview.options,
                                            [variant.property.id]: option.id,
                                          },
                                        }
                                      : preview,
                                });
                                if (option && variant?.property)
                                  setPreview({
                                    options: {
                                      ...preview.options,
                                      [variant.property.id]: option.id,
                                    },
                                  });
                              } catch (failure) {
                                notify.error(
                                  failure instanceof Error
                                    ? failure.message
                                    : String(failure),
                                );
                              }
                            }
                          : undefined
                      }
                    />
                  </div>
                ))}
                {editing && (
                  <ActionButton
                    size="XS"
                    aria-label="Add variant option"
                    UNSAFE_className="structureVariantAdd"
                    onPress={() => setAddOptionRequest((value) => value + 1)}
                  >
                    <Add />
                  </ActionButton>
                )}
              </div>
            )}
          </div>
          <StructurePreview
            name={structure.name}
            resolved={resolved}
            elements={elements}
            composition={composition ?? undefined}
            isMeasurement
            measurementRef={natural}
          />
          {composition?.warnings.length ? (
            <InlineAlert variant="notice">
              <Heading>Structure preview targets</Heading>
              <Content>{[...new Set(composition.warnings)].join(" ")}</Content>
            </InlineAlert>
          ) : null}
          <Panel
            label="Structure properties and appearance"
            className="structureEditorPanel"
          >
            <NestedPanelAccordion
              defaultExpandedKeys={["properties", "appearance"]}
            >
              {authoredStructure && (
                <StructureProperties
                  editor={structureEditor(authoredStructure)}
                  addOptionRequest={addOptionRequest}
                  taxonomy={taxonomy}
                  preview={preview}
                  isReadOnly={!editing}
                  onPreview={setPreview}
                  report={(error) =>
                    notify.error(
                      error instanceof Error ? error.message : String(error),
                    )
                  }
                  onUndo={(before, after) => {
                    try {
                      restoreEditor({
                        structureId: authoredStructure.conceptId,
                        before,
                        after,
                      });
                    } catch (error) {
                      notify.error(
                        error instanceof Error ? error.message : String(error),
                      );
                    }
                  }}
                  onChange={(editor, nextTaxonomy) =>
                    updateEditor({
                      structureId: authoredStructure.conceptId,
                      editor,
                      taxonomy: nextTaxonomy,
                    })
                  }
                />
              )}
              <AccordionItem id="appearance">
                <AccordionItemTitle>Appearance</AccordionItemTitle>
                <AccordionItemPanel>
                  {selectedElement && !isLeaf(selectedElement) ? (
                    <div className="structureEditorFields">
                      <Text>
                        {
                          catalog.find(
                            (source) =>
                              source.conceptId === selectedElement.structureId,
                          )?.name
                        }
                      </Text>
                      <p>
                        Settings, tokens and sizing rules are inherited from the
                        source Structure.
                      </p>
                      <Button
                        variant="secondary"
                        onPress={() => {
                          selectElement(null);
                          selectStructure(selectedElement.structureId);
                        }}
                      >
                        Open source Structure
                      </Button>
                      <Button
                        variant="secondary"
                        onPress={() => selectElement(null)}
                      >
                        Back to Structure
                      </Button>
                      {editing && (
                        <Button
                          variant="secondary"
                          onPress={() => {
                            try {
                              deleteSelected();
                            } catch (failure) {
                              notify.error(
                                failure instanceof Error
                                  ? failure.message
                                  : String(failure),
                              );
                            }
                          }}
                        >
                          Remove instance
                        </Button>
                      )}
                    </div>
                  ) : selectedElement && isLeaf(selectedElement) ? (
                    <StructureElementEditorPanel
                      embedded
                      key={selectedElement.id}
                      element={selectedElement}
                      references={references}
                      isReadOnly={!editing}
                      report={notify.error}
                      onChange={(changes) => {
                        requireCurrentStructure();
                        updateElement({
                          structureId: structure.conceptId,
                          elementId: selectedElement.id,
                          optionId:
                            variant?.option && !variant.isDefault
                              ? variant.option.id
                              : undefined,
                          ...changes,
                        });
                      }}
                    />
                  ) : (
                    <StructureEditorPanel
                      embedded
                      key={structure.conceptId}
                      structure={structure}
                      references={references}
                      layout={layout}
                      isReadOnly={!editing}
                      taxonomy={taxonomy}
                      report={notify.error}
                      onTokenNaming={(input) => {
                        requireCurrentStructure();
                        nameTokens({
                          structureId: structure.conceptId,
                          ...input,
                        });
                      }}
                      onChange={(changes) => {
                        const frame = stage.current;
                        const sample = natural.current;
                        const current = requireCurrentStructure();
                        if (variant?.option && !variant.isDefault) {
                          const editor = structureEditor(current);
                          const effective = resolveStructureOptions(
                            current,
                            preview,
                          ).structure;
                          for (const slot of STRUCTURE_SLOT_KEYS) {
                            const selection = changes[slot];
                            if (!isConstraintSlot(slot) || !selection) continue;
                            const issue = constraintChoiceIssue(
                              effective,
                              slot,
                              selection,
                              store.get(primitiveReferencesAtom),
                              layout,
                            );
                            if (issue) throw new Error(issue);
                          }
                          updateEditor({
                            structureId: current.conceptId,
                            editor: updateOptionOverrides(
                              editor,
                              variant.option.id,
                              optionSlotChanges(
                                current,
                                editor.overrides[variant.option.id] ?? {},
                                changes,
                              ),
                            ),
                          });
                          return;
                        }
                        if (!frame || !sample)
                          throw new Error(
                            "The selected structure preview is no longer available.",
                          );
                        const currentResolved = resolveStructure(
                          current,
                          store.get(primitiveReferencesAtom),
                          layout,
                        );
                        const invalidNatural = [
                          "gap",
                          "paddingTop",
                          "paddingRight",
                          "paddingBottom",
                          "paddingLeft",
                        ].some((slot) => slot in currentResolved.issues);
                        const rect = sample.getBoundingClientRect();
                        assign({
                          id: current.conceptId,
                          changes,
                          layout: {
                            availableWidth: frame.clientWidth,
                            availableHeight: frame.clientHeight,
                            naturalWidth: invalidNatural ? null : rect.width,
                            naturalHeight: invalidNatural ? null : rect.height,
                          },
                        });
                      }}
                    />
                  )}
                </AccordionItemPanel>
              </AccordionItem>
            </NestedPanelAccordion>
          </Panel>
        </>
      ) : (
        <div className="structureDesignEmpty">
          <IllustratedMessage>
            <_3D />
            <Heading>
              {catalog.length
                ? "Select a structure to edit"
                : "Add a structure to begin"}
            </Heading>
          </IllustratedMessage>
        </div>
      )}
    </div>
  );
}

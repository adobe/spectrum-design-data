// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  Content,
  Heading,
  InlineAlert,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
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
import {
  resolveStructure,
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
import {
  resolveElements,
  templateTargets,
} from "../../features/structures/elementResolution";
import { structureGeneration } from "../../features/structures/model";
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
  const {
    structure,
    references,
    editing,
    taxonomy,
    rules,
    catalog,
    generation,
    mode,
    selectedElementId,
  } = input;
  const assign = useSetAtom(assignStructureAtom);
  const store = useStore();
  const selectStructure = useSetAtom(selectedStructureIdAtom),
    nameTokens = useSetAtom(setStructureTokenNamingAtom);
  const insertStructure = useSetAtom(insertStructureInstanceAtom);
  const selectElement = useSetAtom(selectedElementIdAtom);
  const insert = useSetAtom(insertElementAtom),
    updateElement = useSetAtom(updateElementAtom);
  const removeElement = useSetAtom(removeElementAtom),
    restoreElement = useSetAtom(restoreElementAtom);
  const selectedElement = structure?.elements?.find(
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
    const removed = removeElement({
      structureId: structure.conceptId,
      elementId: selectedElement.id,
      confirmed: true,
    });
    ToastQueue.info("Element deleted.", {
      actionLabel: "Undo",
      onAction: () => {
        try {
          restoreElement(removed);
        } catch (failure) {
          ToastQueue.negative(
            failure instanceof Error ? failure.message : String(failure),
          );
        }
      },
    });
  };
  return (
    <div className="structureDesignCanvas" data-component="StructureDesignView">
      {structure && resolved ? (
        <>
          <div className="structureDesignStage" ref={stage}>
            {generation.status === "error" ||
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
              <StructurePreview
                name={structure.name}
                resolved={resolved}
                elements={elements}
                composition={composition ?? undefined}
                structures={structureCandidates(catalog, structure.conceptId)}
                taxonomy={taxonomy}
                selectedElementId={selectedElement?.id ?? null}
                onSelectElement={selectElement}
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
                          });
                        } catch (failure) {
                          ToastQueue.negative(
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
                          });
                        } catch (failure) {
                          ToastQueue.negative(
                            failure instanceof Error
                              ? failure.message
                              : String(failure),
                          );
                        }
                      }
                    : undefined
                }
              />
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
          {selectedElement && !isLeaf(selectedElement) ? (
            <Panel label="Structure instance settings">
              <Text>
                {
                  catalog.find(
                    (source) =>
                      source.conceptId === selectedElement.structureId,
                  )?.name
                }
              </Text>
              <p>
                Settings, tokens and sizing rules are inherited from the source
                Structure.
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
              <Button variant="secondary" onPress={() => selectElement(null)}>
                Back to Structure
              </Button>
              {editing && (
                <Button
                  variant="secondary"
                  onPress={() => {
                    try {
                      deleteSelected();
                    } catch (failure) {
                      ToastQueue.negative(
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
            </Panel>
          ) : selectedElement && isLeaf(selectedElement) ? (
            <StructureElementEditorPanel
              key={selectedElement.id}
              element={selectedElement}
              label={String(
                taxonomy.terms.find(
                  (term) => term.id === selectedElement.termId,
                )?.value,
              )}
              references={references}
              isReadOnly={!editing}
              hasCustomTargets={structureGeneration(
                structure,
              ).applications.some((application) => {
                const targets = templateTargets(application);
                return (
                  targets.kind === "custom" &&
                  targets.bindingIds.some((id) =>
                    selectedElement.bindings.some(
                      (binding) => binding.id === id,
                    ),
                  )
                );
              })}
              onChange={(changes) => {
                requireCurrentStructure();
                updateElement({
                  structureId: structure.conceptId,
                  elementId: selectedElement.id,
                  ...changes,
                });
              }}
              onBack={() => selectElement(null)}
              onDelete={deleteSelected}
            />
          ) : (
            <StructureEditorPanel
              key={structure.conceptId}
              structure={structure}
              references={references}
              layout={layout}
              isReadOnly={!editing}
              taxonomy={taxonomy}
              onTokenNaming={(input) => {
                requireCurrentStructure();
                nameTokens({ structureId: structure.conceptId, ...input });
              }}
              onChange={(changes) => {
                const frame = stage.current;
                const sample = natural.current;
                const current = requireCurrentStructure();
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
        </>
      ) : (
        <div className="structureDesignEmpty">
          <Text>Select a structure to design it.</Text>
        </div>
      )}
    </div>
  );
}

// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  Button,
  ActionButton,
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
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { editModeAtom } from "../../state/view/editMode";
import {
  assignStructureAtom,
  selectedStructureAtom,
  structuresDocumentAtom,
  selectedStructureIdAtom,
  renameStructureAtom,
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
  insertLayoutAtom,
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
import {
  resolveCompositionResult,
  structureHasIndentation,
} from "../../features/structures/composition";
import { workingTshirtArtifactsAtom } from "../../features/design-data/tshirtState";
import { browserModeContextAtom } from "../../features/tokens/browserState";
import { measureCompositionLayouts } from "./compositionMeasurement";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import { StructureMetadataPanel } from "../../panels/structures/StructureMetadataPanel";
import { StructureProperties } from "../../panels/structures/StructureProperties";
import {
  structurePreviewStateAtom,
  updateStructureEditorAtom,
  restoreStructureEditorRemovalAtom,
} from "../../features/structures/variantState";
import { structurePreviewsAtom } from "../../features/structures/documentState";
import {
  findStructureLayer,
  structureLayers,
  structureLayerPreview,
} from "../../features/structures/layers";
import {
  resolveStructureOptions,
  structureEditor,
} from "../../features/structures/variants";
import { activeVariant } from "../../features/structures/variantOperations";
import { structureCanvasGrid } from "../../features/structures/canvasGrid";
import { StructureOptionSample } from "./StructureOptionSample";
import { useNotify } from "../../components/notifications/notificationContext";
import { configuredStructure } from "../../features/structures/configuration";
import { editStructureOptionBindingsAtom } from "../../features/structures/configurationState";

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
  const [previews, setPreviews] = [
    useAtomValue(structurePreviewsAtom),
    useSetAtom(structurePreviewsAtom),
  ];
  const setPreview = useSetAtom(structurePreviewStateAtom);
  const updateEditor = useSetAtom(updateStructureEditorAtom);
  const editOptionBindings = useSetAtom(editStructureOptionBindingsAtom);
  const restoreEditor = useSetAtom(restoreStructureEditorRemovalAtom);
  const [addOptionRequest, setAddOptionRequest] = useState(0);
  const [canvasCell, setCanvasCell] = useState<string | null>(null);
  const [propertyScope, setPropertyScope] = useState<"parent" | "local">(
    "parent",
  );
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
  const canvasGrid = authoredStructure
    ? structureCanvasGrid(
        structureEditor(authoredStructure).properties,
        preview,
        canvasCell,
      )
    : [];
  const assign = useSetAtom(assignStructureAtom);
  const rename = useSetAtom(renameStructureAtom);
  const store = useStore();
  const selectStructure = useSetAtom(selectedStructureIdAtom);
  const insertStructure = useSetAtom(insertStructureInstanceAtom);
  const insertLayout = useSetAtom(insertLayoutAtom);
  const selectElement = useSetAtom(selectedElementIdAtom);
  const insert = useSetAtom(insertElementAtom),
    updateElement = useSetAtom(updateElementAtom);

  const selectedLayer = authoredStructure
    ? findStructureLayer(
        structureLayers(authoredStructure, catalog, {
          ...previews,
          [authoredStructure.conceptId]: preview,
        }),
        selectedElementId,
      )
    : undefined;
  const selectedElement = selectedLayer?.child;
  const inspectorSource =
    selectedLayer?.layout ?? selectedLayer?.owner ?? authoredStructure;
  const inspectorPath = selectedLayer?.layout
    ? selectedLayer.path
    : selectedLayer?.owner.conceptId !== authoredStructure?.conceptId &&
        selectedLayer
      ? selectedLayer.path.slice(0, selectedLayer.path.lastIndexOf("/"))
      : "";
  const inspectorPreview =
    inspectorSource?.conceptId === authoredStructure?.conceptId
      ? preview
      : inspectorSource
        ? structureLayerPreview(inspectorSource, previews)
        : preview;
  const setInspectorPreview = (patch: Partial<typeof preview>) => {
    setPropertyScope("local");
    if (
      !inspectorSource ||
      inspectorSource.conceptId === authoredStructure?.conceptId
    ) {
      setPreview(patch);
      return;
    }
    setPreviews((current) => ({
      ...current,
      [inspectorSource.conceptId]: { ...inspectorPreview, ...patch },
    }));
  };
  const inspectorStructure =
    inspectorSource && authoredStructure
      ? configuredStructure(authoredStructure, inspectorPath, catalog, {
          ...previews,
          [authoredStructure.conceptId]: preview,
        }).structure
      : null;
  const inspectorVariant = inspectorSource
    ? activeVariant(
        inspectorSource,
        inspectorPreview.activePropertyId,
        inspectorPreview.options,
      )
    : null;
  const parentVariant =
    propertyScope === "parent" && variant?.option && !variant.isDefault
      ? variant
      : null;
  const elements = useMemo(
    () => (structure ? resolveElements(structure, references, rules) : []),
    [structure, references, rules],
  );
  const stage = useRef<HTMLDivElement>(null);
  const natural = useRef<HTMLDivElement>(null);
  const panGesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const target = event.target;
    const control = target.closest(
      "button, input, textarea, select, [role='button'], [role='combobox'], [role='switch'], [role='radio'], [role='checkbox']",
    );
    if (control || (!spacePressed && target.closest(".structurePreview")))
      return;
    panGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: canvasPan.x,
      panY: canvasPan.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    event.preventDefault();
  };
  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = panGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) > 3) gesture.moved = true;
    setCanvasPan({ x: gesture.panX + dx, y: gesture.panY + dy });
  };
  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = panGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    suppressClick.current = gesture.moved;
    panGesture.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const zoomCanvas = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const frame = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - frame.left;
    const y = event.clientY - frame.top;
    const nextZoom = Math.min(
      2.5,
      Math.max(0.25, canvasZoom * Math.exp(-event.deltaY * 0.001)),
    );
    setCanvasPan((current) => ({
      x: x - ((x - current.x) / canvasZoom) * nextZoom,
      y: y - ((y - current.y) / canvasZoom) * nextZoom,
    }));
    setCanvasZoom(nextZoom);
  };
  const [layout, setLayout] = useState<PreviewLayoutContext>(UNMEASURED_LAYOUT);
  const [moduleLayouts, setModuleLayouts] = useState<
    Record<string, PreviewLayoutContext>
  >({});
  const resolved = useMemo(
    () =>
      structure
        ? resolveStructure(
            structure,
            references,
            layout,
            preview.indentationLevel,
          )
        : null,
    [structure, references, layout, preview.indentationLevel],
  );
  const compositionResult = useMemo(() => {
    if (!authoredStructure || generation.status !== "ready") return null;
    return resolveCompositionResult(
      authoredStructure,
      catalog,
      references,
      rules,
      generation.bundle,
      Object.fromEntries(JSON.parse(mode.key) as [string, string][]),
      "m",
      layout,
      moduleLayouts,
      preview.options,
      preview.indentationLevel,
      { ...previews, [authoredStructure.conceptId]: preview },
    );
  }, [
    authoredStructure,
    catalog,
    references,
    rules,
    generation,
    mode.key,
    layout,
    moduleLayouts,
    previews,
    preview,
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
  const requireCurrentInspector = () => {
    requireCurrentStructure();
    const current = store
      .get(structuresDocumentAtom)
      .structures.find((item) => item.conceptId === inspectorSource?.conceptId);
    if (!current)
      throw new Error("The selected layout is no longer available.");
    return current;
  };
  const layoutInsertionPreview = (id: string) => {
    const owner = catalog.find((item) => item.conceptId === id);
    if (!owner) throw new Error("The selected layout is no longer available.");
    return structureLayerPreview(owner, previews);
  };
  const inspectorLayout = selectedLayer?.layout
    ? (moduleLayouts[selectedLayer.path] ?? UNMEASURED_LAYOUT)
    : selectedLayer?.owner.conceptId !== authoredStructure?.conceptId &&
        selectedLayer
      ? (moduleLayouts[
          selectedLayer.path.slice(0, selectedLayer.path.lastIndexOf("/"))
        ] ?? UNMEASURED_LAYOUT)
      : layout;
  const deleteSelected = () => {
    requireCurrentStructure();
    if (!structure || !selectedElement)
      throw new Error("The selected element is no longer available.");
    notify.remove({
      kind: selectedLayer?.layout ? "structure" : "structureElement",
      noun: selectedLayer?.layout ? "Layout" : undefined,
      run: (store) =>
        store.set(removeElementAtom, {
          structureId: selectedLayer?.owner.conceptId ?? structure.conceptId,
          elementId: selectedElement.id,
          selectionId: selectedElementId ?? undefined,
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
          {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          <div
            className="structureDesignStage"
            ref={stage}
            role="application"
            aria-label="Structure preview canvas"
            tabIndex={0}
            data-panning={isPanning || undefined}
            onPointerDown={beginPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={() => {
              panGesture.current = null;
              setIsPanning(false);
            }}
            onClickCapture={(event) => {
              if (!suppressClick.current) return;
              suppressClick.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
            onWheel={zoomCanvas}
            onKeyDown={(event) => {
              if (event.key === " " && event.target === event.currentTarget) {
                event.preventDefault();
                setSpacePressed(true);
              }
            }}
            onKeyUp={(event) => {
              if (event.key === " " && event.target === event.currentTarget)
                setSpacePressed(false);
            }}
            onBlur={() => setSpacePressed(false)}
          >
            <div
              className="structureDesignViewport"
              style={{
                transform: `translate3d(${canvasPan.x}px, ${canvasPan.y}px, 0) scale(${canvasZoom})`,
              }}
            >
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
                  {canvasGrid.map((column) => (
                    <div
                      key={column.propertyId ?? "default"}
                      className="structureVariantColumn"
                    >
                      {column.label && (
                        <span className="structureVariantLabel structureVariantColumnLabel">
                          {column.label}
                        </span>
                      )}
                      {column.cells.map((cell) => {
                        const choose = () => {
                          if (!column.propertyId) return;
                          setCanvasCell(cell.key);
                          setPropertyScope("parent");
                          setPreview({
                            activePropertyId: cell.preview.activePropertyId,
                            options: cell.preview.options,
                            booleans: cell.preview.booleans,
                          });
                        };
                        const insertionPreview = (layout?: {
                          structureId: string;
                        }) =>
                          layout
                            ? layoutInsertionPreview(layout.structureId)
                            : cell.preview;
                        const report = (failure: unknown) =>
                          notify.error(
                            failure instanceof Error
                              ? failure.message
                              : String(failure),
                          );
                        return (
                          <div
                            key={cell.key}
                            className="structureVariantOption"
                            data-selected={cell.isActive || undefined}
                          >
                            {cell.label && (
                              <span className="structureVariantLabel">
                                {cell.label}
                              </span>
                            )}
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
                              preview={cell.preview}
                              structures={structureCandidates(
                                catalog,
                                structure.conceptId,
                              )}
                              taxonomy={taxonomy}
                              selectedElementId={
                                cell.isActive ? selectedElementId : null
                              }
                              onSelectElement={(id) => {
                                choose();
                                selectElement(id);
                              }}
                              onInsertStructure={
                                editing
                                  ? (targetId, index, expected, layout) => {
                                      try {
                                        requireCurrentStructure();
                                        const id = insertStructure({
                                          structureId:
                                            layout?.structureId ??
                                            structure.conceptId,
                                          targetId,
                                          index,
                                          expected,
                                          preview: insertionPreview(layout),
                                        });
                                        if (layout)
                                          selectElement(`${layout.path}/${id}`);
                                        choose();
                                      } catch (failure) {
                                        report(failure);
                                      }
                                    }
                                  : undefined
                              }
                              onInsert={
                                editing
                                  ? (kind, index, expected, layout) => {
                                      try {
                                        requireCurrentStructure();
                                        const id = insert({
                                          structureId:
                                            layout?.structureId ??
                                            structure.conceptId,
                                          kind,
                                          index,
                                          expected,
                                          preview: insertionPreview(layout),
                                        });
                                        if (layout)
                                          selectElement(`${layout.path}/${id}`);
                                        choose();
                                      } catch (failure) {
                                        report(failure);
                                      }
                                    }
                                  : undefined
                              }
                              onInsertLayout={
                                editing
                                  ? (index, expected, layout) => {
                                      try {
                                        requireCurrentStructure();
                                        const id = insertLayout({
                                          structureId:
                                            layout?.structureId ??
                                            structure.conceptId,
                                          index,
                                          expected,
                                          preview: insertionPreview(layout),
                                        });
                                        if (layout)
                                          selectElement(`${layout.path}/${id}`);
                                        choose();
                                      } catch (failure) {
                                        report(failure);
                                      }
                                    }
                                  : undefined
                              }
                            />
                          </div>
                        );
                      })}
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
          </div>
          {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
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
            label={`Structure settings for ${structure.name}`}
            className="structureEditorPanel"
          >
            <div className="structurePanelSections">
              {authoredStructure && (
                <StructureProperties
                  key={authoredStructure.conceptId}
                  editor={structureEditor(authoredStructure)}
                  addOptionRequest={addOptionRequest}
                  taxonomy={taxonomy}
                  preview={preview}
                  showIndentationLevel={structureHasIndentation(
                    authoredStructure,
                    catalog,
                  )}
                  isReadOnly={!editing}
                  onPreview={(patch) => {
                    setPropertyScope("parent");
                    setPreview(patch);
                  }}
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
              {inspectorPath && inspectorSource && (
                <StructureProperties
                  key={inspectorPath}
                  label={`${inspectorSource.name} properties`}
                  editor={structureEditor(inspectorSource)}
                  taxonomy={taxonomy}
                  preview={inspectorPreview}
                  isReadOnly={!editing}
                  onPreview={setInspectorPreview}
                  report={notify.error}
                  onUndo={(before, after) =>
                    restoreEditor({
                      structureId: inspectorSource.conceptId,
                      before,
                      after,
                    })
                  }
                  onChange={(editor, nextTaxonomy) =>
                    updateEditor({
                      structureId: inspectorSource.conceptId,
                      editor,
                      taxonomy: nextTaxonomy,
                    })
                  }
                />
              )}
              <Accordion
                size="M"
                density="spacious"
                defaultExpandedKeys={["appearance"]}
              >
                <AccordionItem id="appearance">
                  <AccordionItemTitle>Appearance</AccordionItemTitle>
                  <AccordionItemPanel>
                    {selectedElement &&
                    !isLeaf(selectedElement) &&
                    !selectedLayer?.layout ? (
                      <div className="structureEditorFields">
                        <Text>
                          {
                            catalog.find(
                              (source) =>
                                source.conceptId ===
                                selectedElement.structureId,
                            )?.name
                          }
                        </Text>
                        <p>
                          Settings, tokens and sizing rules are inherited from
                          the source Structure.
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
                            structureId:
                              selectedLayer?.owner.conceptId ??
                              structure.conceptId,
                            elementId: selectedElement.id,
                            optionId: parentVariant?.option
                              ? parentVariant.option.id
                              : inspectorVariant?.option &&
                                  !inspectorVariant.isDefault
                                ? inspectorVariant.option.id
                                : undefined,
                            ...(parentVariant &&
                              inspectorPath &&
                              authoredStructure && {
                                configuration: {
                                  rootId: authoredStructure.conceptId,
                                  path: inspectorPath,
                                },
                              }),
                            ...changes,
                          });
                        }}
                      />
                    ) : (
                      <StructureEditorPanel
                        embedded
                        key={inspectorStructure!.conceptId}
                        structure={inspectorStructure!}
                        references={references}
                        layout={inspectorLayout}
                        isReadOnly={!editing}
                        report={notify.error}
                        onRename={
                          selectedLayer?.layout
                            ? (name) => {
                                const current = requireCurrentInspector();
                                rename({ id: current.conceptId, name });
                              }
                            : undefined
                        }
                        onChange={(changes) => {
                          const frame = stage.current;
                          const sample = natural.current;
                          const current = requireCurrentInspector();
                          if (
                            parentVariant?.option &&
                            inspectorPath &&
                            authoredStructure
                          ) {
                            const root = requireCurrentStructure();
                            editOptionBindings({
                              target: {
                                structureId: root.conceptId,
                                path: inspectorPath.slice(1).split("/"),
                              },
                              valueId: parentVariant.option.id,
                              changes,
                              layout: inspectorLayout,
                            });
                            return;
                          }
                          if (
                            inspectorVariant?.option &&
                            !inspectorVariant.isDefault
                          ) {
                            editOptionBindings({
                              target: {
                                structureId: current.conceptId,
                                path: [],
                              },
                              valueId: inspectorVariant.option.id,
                              changes,
                              layout: inspectorLayout,
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
                            inspectorLayout,
                            inspectorPreview.indentationLevel,
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
                            layout:
                              current.conceptId !== authoredStructure?.conceptId
                                ? inspectorLayout
                                : {
                                    availableWidth: frame.clientWidth,
                                    availableHeight: frame.clientHeight,
                                    naturalWidth: invalidNatural
                                      ? null
                                      : rect.width,
                                    naturalHeight: invalidNatural
                                      ? null
                                      : rect.height,
                                  },
                          });
                        }}
                      />
                    )}
                  </AccordionItemPanel>
                </AccordionItem>
              </Accordion>
            </div>
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

// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Checkbox,
  CheckboxGroup,
  PickerItem,
  Text,
  TextField,
} from "@react-spectrum/s2";
import Delete from "@react-spectrum/s2/icons/Delete";
import { useState } from "react";
import { useAtom, useAtomValue, useStore } from "jotai";
import { DesignMetadataPanel } from "../../panels/design/DesignMetadataPanel";
import {
  DesignEditorPanel,
  DesignValueDisplay,
} from "../../panels/design/DesignEditorPanel";
import { DesignProperties } from "../../panels/design/DesignProperties";
import { Picker } from "../../components/fields/Picker";
import { IconSamplePicker } from "../../components/fields/IconSamplePicker";
import { SideLabelRow } from "../../components/fields/SideLabelRow";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { StyleSample } from "../../components/styles/StyleSample";
import { StyleAppearanceFields } from "../../panels/styles/StyleAppearanceFields";
import { useNotify } from "../../components/notifications/notificationContext";
import {
  stylesDocumentAtom,
  selectedStyleIdAtom,
  stylePreviewAtom,
  styleSampleTextAtom,
  styleSampleIconsAtom,
  stylePreviewArtifactsAtom,
  stylePreviewContextsStateAtom,
  saveStyleAtom,
  renameStyleAtom,
  editStylePropertiesAtom,
} from "../../features/styles/state";
import {
  styleName,
  styleVariants,
  type StyleRow,
} from "../../features/styles/generation";
import type { StyleAppearance, StyleRecipe } from "../../features/styles/model";
import {
  styleVariantLabel,
  stylePreviewFamily,
  stylePreviewColors,
} from "../../features/styles/preview";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { authoringSourceSnapshotAtom } from "../../features/edit-session/state";
import { browserModeContextAtom } from "../../features/tokens/browserState";
import { tokenModePairs } from "../../features/tokens/browserModel";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { editModeAtom } from "../../state/view/editMode";
import type { VariantProperty } from "../../features/option-groups/model";
import {
  styleIconChoices,
  styleSampleIcon,
} from "../../features/styles/iconPreview";
import { ruleAppliesTo } from "../../features/logic/applicability";
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  stylePropertiesEditor,
  stylePropertyOperations,
  stylePreviewOptions,
} from "../../features/styles/variants";
import "./Styles.css";

export function StyleDesignView({
  permutations = false,
}: {
  permutations?: boolean;
}) {
  const selected = useAtomValue(selectedStyleIdAtom),
    document = useAtomValue(stylesDocumentAtom);
  const recipe = document.recipes.find((recipe) => recipe.id === selected);
  return recipe ? (
    <StyleDesignContent
      key={recipe.id}
      recipe={recipe}
      permutations={permutations}
    />
  ) : (
    <div className="stylesEmpty">
      <Text>Select a style</Text>
    </div>
  );
}
function StyleDesignContent({
  recipe,
  permutations,
}: {
  recipe: StyleRecipe;
  permutations: boolean;
}) {
  const taxonomy = useAtomValue(taxonomyDocumentAtom),
    source = useAtomValue(authoringSourceSnapshotAtom);
  const artifacts = useAtomValue(stylePreviewArtifactsAtom),
    contexts = useAtomValue(stylePreviewContextsStateAtom);
  const mode = useAtomValue(browserModeContextAtom),
    selection = Object.fromEntries(tokenModePairs(mode.key));
  const [preview, setPreview] = useAtom(stylePreviewAtom);
  const [sampleText, setSampleText] = useAtom(styleSampleTextAtom);
  const [sampleIcons, setSampleIcons] = useAtom(styleSampleIconsAtom);
  const surface = useAtomValue(elementsSurfaceStyleAtom),
    editing = useAtomValue(editModeAtom);
  const store = useStore(),
    notify = useNotify();
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const name = styleName(recipe, taxonomy);
  const report = (operation: () => void) => {
    try {
      operation();
    } catch (failure) {
      notify.error(failure);
    }
  };
  const save = (next: StyleRecipe) =>
    report(() => store.set(saveStyleAtom, next));
  const variants = recipe.options.filter(
    (option): option is VariantProperty => option.kind === "variant",
  );
  const previewOptions = stylePreviewOptions(recipe, preview.options);
  const selectedOptions = variants.map(
    (property) => previewOptions[property.id],
  );
  const active = variants.find((property) => property.id === activePropertyId);
  const activeOption = active && previewOptions[active.id];
  const differenceId =
    activeOption &&
    (activeOption !== active?.defaultOptionId ||
      recipe.differences[activeOption])
      ? activeOption
      : undefined;
  const previewOutputId = recipe.applications.some((application) =>
    application.outputIds.includes(preview.outputId ?? ""),
  )
    ? preview.outputId
    : undefined;
  const variant = styleVariants(recipe).find(
    (variant) =>
      JSON.stringify(variant.optionIds) === JSON.stringify(selectedOptions),
  );
  const appearance = variant?.appearance ?? recipe.appearance;
  const previewFamilyId = stylePreviewFamily(
    appearance.color,
    preview.familyId,
  );
  const changeAppearance = (difference: Partial<StyleAppearance>) =>
    save(
      differenceId
        ? {
            ...recipe,
            differences: {
              ...recipe.differences,
              [differenceId]: {
                ...recipe.differences[differenceId],
                ...difference,
              },
            },
          }
        : { ...recipe, appearance: { ...recipe.appearance, ...difference } },
    );
  const context = contexts.contexts.find((context) =>
    Object.entries(context.selection).every(
      ([axis, id]) => selection[axis] === id,
    ),
  );
  const references = context?.references ?? [];
  const rows = artifacts.rows.filter(
    (row) => row.recipeId === recipe.id && row.modeKey === mode.key,
  );
  const colors = stylePreviewColors(rows, appearance.color, {
    optionIds: selectedOptions,
    outputId: previewOutputId,
    familyId: previewFamilyId,
    permutations,
  });
  const sampleRows = (color: StyleRow) => {
    const applicable = rows.filter(
      (row) =>
        JSON.stringify(row.optionIds) === JSON.stringify(color.optionIds) &&
        (!row.familyId || row.familyId === color.familyId) &&
        (row.property !== "color" || row.outputId === color.outputId),
    );
    const indices = applicable.filter((row) => row.property === "lineHeight");
    const index = indices.some((row) => row.scaleIndex === preview.scaleIndex)
      ? preview.scaleIndex
      : indices[0]?.scaleIndex;
    return applicable.filter(
      (row) => row.property !== "lineHeight" || row.scaleIndex === index,
    );
  };
  const publications = new Set(
    (source.styles?.publications ?? [])
      .filter((row) => row.recipeId === recipe.id)
      .flatMap((row) => Object.values(row.rows)),
  );
  const usedIn =
    source.components?.components.filter((component) =>
      component.assignments.some(
        (assignment) => assignment.$ref && publications.has(assignment.$ref),
      ),
    ) ?? [];
  const rules =
    source.rules?.filter((rule) => rule.type === "conditional") ?? [];
  const sampleIcon = styleSampleIcon(
    recipe,
    sampleIcons[recipe.id] ?? source.styles?.examples[recipe.id]?.icon,
  );
  const outputLabel = (classification: StyleRow["classification"]) =>
    Object.values(classification)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((id) =>
        termLabel(taxonomy.terms.find((term) => term.id === id)?.value ?? id),
      )
      .join(" + ");
  return (
    <div
      className={`stylesWork${permutations ? " stylesPermutations" : ""}`}
      data-component="StyleDesignView"
    >
      <DesignMetadataPanel
        label="Style metadata"
        name={name}
        onRename={(name) => store.set(renameStyleAtom, { id: recipe.id, name })}
        usedIn={
          usedIn
            .map((component) => component.declaration.displayName)
            .join(", ") || "None"
        }
        isReadOnly={!editing}
        report={notify.error}
        generation={
          <div className="structureEditorFields">
            {editing && (
              <Picker
                size="S"
                label="Interaction rule"
                selectedKey={null}
                onSelectionChange={(id) => {
                  const rule = rules.find((rule) => rule.id === id);
                  if (
                    rule &&
                    !recipe.applications.some(
                      (application) => application.ruleId === id,
                    )
                  )
                    save({
                      ...recipe,
                      applications: [
                        ...recipe.applications,
                        {
                          id: crypto.randomUUID(),
                          ruleId: rule.id,
                          outputIds: [],
                        },
                      ],
                    });
                }}
              >
                {rules
                  .filter((rule) => ruleAppliesTo(rule, "color"))
                  .filter(
                    (rule) =>
                      !recipe.applications.some(
                        (application) => application.ruleId === rule.id,
                      ),
                  )
                  .map((rule) => (
                    <PickerItem key={rule.id} id={rule.id}>
                      {rule.name}
                    </PickerItem>
                  ))}
              </Picker>
            )}
            {recipe.applications.map((application) => {
              const rule = rules.find((rule) => rule.id === application.ruleId);
              return (
                <div key={application.id} className="structureEditorFields">
                  <CheckboxGroup
                    label={rule?.name ?? "Unavailable rule"}
                    value={application.outputIds}
                    isReadOnly={!editing}
                    onChange={(outputIds) =>
                      save({
                        ...recipe,
                        applications: recipe.applications.map((entry) =>
                          entry.id === application.id
                            ? { ...entry, outputIds }
                            : entry,
                        ),
                      })
                    }
                  >
                    {(rule?.outputs ?? []).map((output) => (
                      <Checkbox key={output.id} value={output.id}>
                        {outputLabel(output.classification)}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                  {editing && (
                    <ActionButton
                      size="S"
                      aria-label={`Remove ${rule?.name ?? "rule"}`}
                      onPress={() =>
                        save({
                          ...recipe,
                          applications: recipe.applications.filter(
                            (entry) => entry.id !== application.id,
                          ),
                        })
                      }
                    >
                      <Delete />
                    </ActionButton>
                  )}
                </div>
              );
            })}
          </div>
        }
      />
      <div
        className="stylesCanvas"
        style={surface}
        aria-label={`${name} ${permutations ? "permutations" : "preview"}`}
      >
        {contexts.error && <p role="alert">{contexts.error}</p>}
        {artifacts.issues
          .filter((issue) => !issue.recipeId || issue.recipeId === recipe.id)
          .map((issue) => (
            <p role="alert" key={issue.message}>
              {issue.message}
            </p>
          ))}
        {colors.map((color) => (
          <figure key={color.token.uuid}>
            {styleVariantLabel(recipe, color.optionIds) && (
              <figcaption>
                {styleVariantLabel(recipe, color.optionIds)}
              </figcaption>
            )}
            <StyleSample
              recipe={recipe}
              rows={sampleRows(color)}
              surface={String(surface.backgroundColor)}
              gamut={source.colorSystem.settings.colorOutput.authoringGamut}
              icon={sampleIcon}
              label={color.name}
              sampleText={sampleText}
              large
            />
          </figure>
        ))}
      </div>
      {!permutations && (
        <DesignEditorPanel label="Style properties and appearance">
          <DesignProperties
            namingScope="styles"
            previewControls={
              appearance.color.kind === "families" && (
                <Picker
                  size="S"
                  label="Color"
                  selectedKey={previewFamilyId ?? null}
                  onSelectionChange={(id) => {
                    if (typeof id === "string")
                      setPreview({ ...preview, familyId: id });
                  }}
                >
                  {appearance.color.familyIds.map((id) => (
                    <PickerItem key={id} id={id}>
                      {source.colorSystem.scales.find(
                        (scale) => scale.id === id,
                      )?.name ?? "Unavailable family"}
                    </PickerItem>
                  ))}
                </Picker>
              )
            }
            editor={stylePropertiesEditor(recipe)}
            operations={stylePropertyOperations}
            supportedKinds={["variant"]}
            taxonomy={taxonomy}
            preview={{
              activePropertyId,
              options: previewOptions,
              booleans: {},
              indentationLevel: 0,
            }}
            isReadOnly={!editing}
            report={notify.error}
            onPreview={(patch) => {
              if (patch.activePropertyId !== undefined)
                setActivePropertyId(patch.activePropertyId);
              if (patch.options)
                setPreview({ ...preview, options: patch.options });
            }}
            onChange={(editor, nextTaxonomy) => {
              const before = stylePropertiesEditor(recipe);
              const removedProperty = before.properties.find(
                (property) =>
                  !editor.properties.some((entry) => entry.id === property.id),
              );
              const removedOption = before.properties
                .flatMap((property) =>
                  property.kind === "variant" ? property.options : [],
                )
                .find(
                  (option) =>
                    !editor.properties.some(
                      (property) =>
                        property.kind === "variant" &&
                        property.options.some(
                          (entry) => entry.id === option.id,
                        ),
                    ),
                );
              const input = {
                recipeId: recipe.id,
                editor,
                taxonomy: nextTaxonomy,
              };
              if (removedProperty || removedOption) {
                notify.remove({
                  kind: removedProperty ? "styleProperty" : "styleOption",
                  noun: (removedProperty ?? removedOption)!.name,
                  run: (store) => {
                    store.set(editStylePropertiesAtom, input);
                    return before;
                  },
                  undo: (editor) =>
                    store.set(editStylePropertiesAtom, {
                      recipeId: recipe.id,
                      editor,
                    }),
                });
              } else store.set(editStylePropertiesAtom, input);
            }}
          />
          <div className="structureAppearanceLoose">
            {recipe.kind === "icon" && (
              <IconSamplePicker
                selectedIcon={sampleIcon}
                allowedIcons={styleIconChoices(recipe)}
                size="S"
                onChange={(icon) =>
                  setSampleIcons({ ...sampleIcons, [recipe.id]: icon })
                }
              />
            )}
            {recipe.kind === "text" && (
              <SideLabelRow label="Sample text" size="S" labelWidth="auto">
                {(labelId) => (
                  <TextField
                    aria-labelledby={labelId}
                    size="S"
                    value={sampleText}
                    onChange={setSampleText}
                    styles={style({ width: "full", minWidth: 0 })}
                  />
                )}
              </SideLabelRow>
            )}
            <DesignValueDisplay
              value={preview.display}
              onChange={(display) => setPreview({ ...preview, display })}
            />
          </div>
          <Accordion
            size="S"
            density="spacious"
            defaultExpandedKeys={["appearance"]}
          >
            <AccordionItem id="appearance">
              <AccordionItemTitle>Appearance</AccordionItemTitle>
              <AccordionItemPanel>
                <div className="structureEditorFields">
                  <Picker
                    size="S"
                    label="Preview state"
                    selectedKey={previewOutputId ?? "base"}
                    onSelectionChange={(id) => {
                      if (typeof id === "string")
                        setPreview({
                          ...preview,
                          outputId: id === "base" ? undefined : id,
                        });
                    }}
                  >
                    <PickerItem id="base">Default</PickerItem>
                    {recipe.applications
                      .flatMap((application) =>
                        rules
                          .filter((rule) => rule.id === application.ruleId)
                          .flatMap((rule) =>
                            (rule.outputs ?? []).filter((output) =>
                              application.outputIds.includes(output.id),
                            ),
                          ),
                      )
                      .map((output) => (
                        <PickerItem key={output.id} id={output.id}>
                          {outputLabel(output.classification)}
                        </PickerItem>
                      ))}
                  </Picker>
                  {recipe.kind === "text" && appearance.lineHeight && (
                    <Picker
                      label="Text size index"
                      selectedKey={String(
                        preview.scaleIndex ??
                          references.find(
                            (reference) =>
                              reference.metricId ===
                              appearance.lineHeight?.metricId,
                          )?.index ??
                          "",
                      )}
                      onSelectionChange={(id) => {
                        if (typeof id === "string")
                          setPreview({ ...preview, scaleIndex: Number(id) });
                      }}
                    >
                      {references
                        .filter(
                          (reference) =>
                            reference.metricId ===
                              appearance.lineHeight?.metricId &&
                            reference.index !== undefined,
                        )
                        .map((reference) => (
                          <PickerItem
                            key={reference.id}
                            id={String(reference.index)}
                          >
                            {String(reference.index)}
                          </PickerItem>
                        ))}
                    </Picker>
                  )}
                  {editing &&
                    differenceId &&
                    recipe.differences[differenceId] && (
                      <ActionButton
                        onPress={() =>
                          save({
                            ...recipe,
                            differences: Object.fromEntries(
                              Object.entries(recipe.differences).filter(
                                ([id]) => id !== differenceId,
                              ),
                            ),
                          })
                        }
                      >
                        Use base appearance
                      </ActionButton>
                    )}
                  <StyleAppearanceFields
                    taxonomy={taxonomy}
                    kind={recipe.kind}
                    value={appearance}
                    references={references}
                    families={source.colorSystem.scales.map((scale) => ({
                      id: scale.id,
                      name: scale.name,
                    }))}
                    display={preview.display}
                    isReadOnly={!editing}
                    modeSets={source.modeSets}
                    modeSelection={selection}
                    onChange={changeAppearance}
                  />
                </div>
              </AccordionItemPanel>
            </AccordionItem>
          </Accordion>
        </DesignEditorPanel>
      )}
    </div>
  );
}

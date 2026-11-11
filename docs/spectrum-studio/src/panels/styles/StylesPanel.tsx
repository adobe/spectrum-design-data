// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemTitle,
  AccordionItemPanel,
  ActionButton,
  Button,
  DialogTrigger,
  ListView,
  ListViewItem,
  Popover,
  Text,
  TextField,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { Dialog } from "react-aria-components";
import { useState } from "react";
import { useAtom, useAtomValue, useStore } from "jotai";
import {
  STYLE_KINDS,
  STYLE_LABELS,
  type StyleKind,
} from "../../features/styles/model";
import {
  stylesDocumentAtom,
  selectedStyleIdAtom,
  createStyleAtom,
  removeStyleAtom,
  restoreStyleAtom,
  stylePreviewArtifactsAtom,
  styleContextsStateAtom,
  styleSampleTextAtom,
} from "../../features/styles/state";
import { styleName } from "../../features/styles/generation";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { editModeAtom } from "../../state/view/editMode";
import { useNotify } from "../../components/notifications/notificationContext";
import { PreviewListItem } from "../../components/PreviewListItem";
import { StyleSample } from "../../components/styles/StyleSample";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { colorSystemDocumentAtom } from "../../features/color-system/state";
import { browserModeContextAtom } from "../../features/tokens/browserState";
import { popoverDialogStyles } from "../../components/popoverLayout";
import { canonicalTokenModeKey } from "../../features/tokens/browserModel";
import { isSpectrumIconName } from "../../features/icons/spectrumIconNames.generated";
import "../../views/styles/Styles.css";

export function StylesPanel() {
  const document = useAtomValue(stylesDocumentAtom),
    taxonomy = useAtomValue(taxonomyDocumentAtom);
  const artifacts = useAtomValue(stylePreviewArtifactsAtom),
    contexts = useAtomValue(styleContextsStateAtom);
  const [selected, select] = useAtom(selectedStyleIdAtom);
  const editing = useAtomValue(editModeAtom),
    store = useStore(),
    notify = useNotify();
  const surface = useAtomValue(elementsSurfaceStyleAtom),
    colors = useAtomValue(colorSystemDocumentAtom);
  const mode = useAtomValue(browserModeContextAtom);
  const sampleText = useAtomValue(styleSampleTextAtom);
  const [adding, setAdding] = useState<StyleKind | null>(null),
    [name, setName] = useState("");
  return (
    <div className="stylesLibrary" data-component="StylesPanel">
      <Accordion allowsMultipleExpanded defaultExpandedKeys={[...STYLE_KINDS]}>
        {STYLE_KINDS.map((kind) => (
          <AccordionItem key={kind} id={kind}>
            <AccordionItemHeader>
              <AccordionItemTitle>{STYLE_LABELS[kind]}</AccordionItemTitle>
              {editing && (
                <DialogTrigger
                  isOpen={adding === kind}
                  onOpenChange={(open) => {
                    setAdding(open ? kind : null);
                    setName("");
                  }}
                >
                  <ActionButton
                    isQuiet
                    size="S"
                    aria-label={`Add ${kind} style`}
                  >
                    <Add />
                  </ActionButton>
                  <Popover size="S">
                    <Dialog
                      aria-label={`Add ${kind} style`}
                      className={popoverDialogStyles}
                    >
                      <form
                        className="stylesFields"
                        onSubmit={(event) => {
                          event.preventDefault();
                          try {
                            if (contexts.error) throw new Error(contexts.error);
                            const context = contexts.contexts.find(
                              (context) =>
                                canonicalTokenModeKey(context.selection) ===
                                mode.key,
                            );
                            const color = context?.references.find(
                              (reference) => reference.property === "color",
                            );
                            store.set(createStyleAtom, {
                              name,
                              recipe: {
                                kind,
                                classification: {},
                                appearance: {
                                  color: {
                                    kind: "single",
                                    binding: color
                                      ? { $ref: color.id }
                                      : { value: "#000000" },
                                  },
                                  ...(kind === "text" && {
                                    fontFamily: { value: "sans-serif" },
                                    fontWeight: { value: 400 },
                                  }),
                                  ...(kind === "border" && {
                                    borderWidth: { value: 1 },
                                  }),
                                },
                                options: [],
                                differences: {},
                                applications: [],
                              },
                            });
                            setAdding(null);
                            setName("");
                          } catch (failure) {
                            notify.error(failure);
                          }
                        }}
                      >
                        <TextField
                          label="Name"
                          value={name}
                          onChange={setName}
                          isRequired
                        />
                        <Button type="submit" variant="primary">
                          Add style
                        </Button>
                      </form>
                    </Dialog>
                  </Popover>
                </DialogTrigger>
              )}
            </AccordionItemHeader>
            <AccordionItemPanel>
              <ListView
                UNSAFE_className="previewList"
                aria-label={STYLE_LABELS[kind]}
                selectionMode="single"
                selectionStyle="highlight"
                isQuiet
                overflowMode="wrap"
                selectedKeys={selected ? [selected] : []}
                onSelectionChange={(keys) => {
                  if (keys !== "all")
                    select([...keys].length ? String([...keys][0]) : null);
                }}
              >
                {document.recipes
                  .filter((recipe) => recipe.kind === kind)
                  .map((recipe) => {
                    const label = styleName(recipe, taxonomy);
                    const rows = artifacts.rows.filter(
                      (row) =>
                        row.recipeId === recipe.id &&
                        row.modeKey === mode.key &&
                        !row.outputId &&
                        row.optionIds.every((id) =>
                          recipe.options.some(
                            (option) =>
                              option.kind === "variant" &&
                              option.defaultOptionId === id,
                          ),
                        ),
                    );
                    const family = rows.find(
                      (row) => row.property === "color",
                    )?.familyId;
                    const icon = document.examples[recipe.id]?.icon;
                    return (
                      <ListViewItem
                        key={recipe.id}
                        id={recipe.id}
                        textValue={label}
                      >
                        <PreviewListItem
                          inset
                          label={label}
                          preview={
                            <span className="styleThumbnail" style={surface}>
                              <StyleSample
                                recipe={recipe}
                                label={label}
                                sampleText={sampleText}
                                rows={rows.filter(
                                  (row) =>
                                    !row.familyId || row.familyId === family,
                                )}
                                surface={String(surface.backgroundColor)}
                                gamut={
                                  colors.settings.colorOutput.authoringGamut
                                }
                                icon={
                                  isSpectrumIconName(icon) ? icon : undefined
                                }
                              />
                            </span>
                          }
                          actions={
                            editing && (
                              <ActionButton
                                isQuiet
                                size="S"
                                aria-label={`Delete ${label}`}
                                onPress={() =>
                                  notify.remove({
                                    kind: "style",
                                    noun: label,
                                    run: (store) =>
                                      store.set(removeStyleAtom, recipe.id),
                                    undo: (removed) => {
                                      if (removed)
                                        store.set(restoreStyleAtom, removed);
                                    },
                                  })
                                }
                              >
                                <Delete />
                              </ActionButton>
                            )
                          }
                        />
                      </ListViewItem>
                    );
                  })}
              </ListView>
              {!document.recipes.some((recipe) => recipe.kind === kind) && (
                <Text>No styles</Text>
              )}
            </AccordionItemPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

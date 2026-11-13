// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  ActionButtonGroup,
  Button,
  ComboBox,
  ComboBoxItem,
  DialogTrigger,
  Heading,
  ListView,
  ListViewItem,
  Popover,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Edit from "@react-spectrum/s2/icons/Edit";
import { Dialog } from "react-aria-components";
import { useAtomValue, useStore } from "jotai";
import { useMemo, useState } from "react";
import {
  addColorRoleAtom,
  removeColorRoleAtom,
  restoreColorRoleAtom,
  setColorRoleScaleAtom,
  stylesDocumentAtom,
} from "../../features/styles/state";
import type { StyleColorRole } from "../../features/styles/model";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { ORDERED_CATEGORY_IDS } from "../../features/taxonomy/orderedVocabulary";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { resolvedColorSystemDocumentAtom } from "../../features/color-system/state";
import {
  ColorScalePicker,
  colorScaleGradient,
} from "../../components/color-picker/ColorScalePicker";
import { editModeAtom } from "../../state/view/editMode";
import { useNotify } from "../../components/notifications/notificationContext";
import { popoverDialogStyles } from "../../components/popoverLayout";

const bodyStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
  width: "full",
  boxSizing: "border-box",
  minWidth: 0,
});
const headingStyles = style({ margin: 0 });
const panelStyles = { padding: "0", margin: "0" };

/** The accordion item that lists Registry roles and their color scales. */
export function ColorRolesAccordionItem() {
  const document = useAtomValue(stylesDocumentAtom),
    taxonomy = useAtomValue(taxonomyDocumentAtom),
    colors = useAtomValue(resolvedColorSystemDocumentAtom),
    editing = useAtomValue(editModeAtom),
    store = useStore(),
    notify = useNotify();
  const terms = useMemo(
    () =>
      new Map(
        taxonomy.terms
          .filter((term) => term.categoryId === ORDERED_CATEGORY_IDS.role)
          .map((term) => [term.id, term]),
      ),
    [taxonomy.terms],
  );
  const scales = useMemo(
    () =>
      new Map(
        colors.scales.map((scale) => [
          scale.id,
          colorScaleGradient(scale, colors.settings.colorOutput),
        ]),
      ),
    [colors.scales, colors.settings.colorOutput],
  );
  const label = (role: StyleColorRole) => {
    const term = terms.get(role.roleTermId);
    return term ? termLabel(term.value) : "Unavailable role";
  };
  const unused = [...terms.values()].filter(
    (term) => !document.colorRoles.some((role) => role.roleTermId === term.id),
  );
  return (
    <AccordionItem id="color-roles" UNSAFE_style={{ borderTopWidth: 0 }}>
      <AccordionItemHeader>
        <AccordionItemTitle>Color roles</AccordionItemTitle>
        {editing && (
          <AddColorRole
            terms={unused.map((term) => ({
              id: term.id,
              label: termLabel(term.value),
            }))}
            colors={colors}
            onAdd={(input) =>
              notify.added("colorRole", () =>
                store.set(addColorRoleAtom, input),
              ) !== undefined
            }
          />
        )}
      </AccordionItemHeader>
      <AccordionItemPanel UNSAFE_style={panelStyles}>
        {document.colorRoles.length ? (
          <ListView
            aria-label="Color roles"
            isQuiet
            UNSAFE_className="colorRolesList"
            UNSAFE_style={{ height: "auto", maxHeight: "fit-content" }}
          >
            {document.colorRoles.map((role) => {
              const name = label(role);
              const gradient = scales.get(role.scaleId);
              return (
                <ListViewItem key={role.id} id={role.id} textValue={name}>
                  <span
                    className="colorRoleSwatch"
                    data-testid="color-role-gradient"
                    style={gradient ? { background: gradient } : undefined}
                    aria-hidden="true"
                  />
                  <Text slot="label">{name}</Text>
                  {!gradient && (
                    <Text slot="description">Unavailable scale</Text>
                  )}
                  {editing && (
                    <ActionButtonGroup>
                      <DialogTrigger>
                        <ActionButton aria-label={`Edit ${name}`}>
                          <Edit />
                        </ActionButton>
                        <Popover placement="end" padding="none" size="S">
                          <Dialog
                            aria-label={`Edit ${name}`}
                            className={`${popoverDialogStyles} ${bodyStyles}`}
                          >
                            <Heading
                              level={4}
                              slot="title"
                              UNSAFE_className={String(headingStyles)}
                            >
                              {name}
                            </Heading>
                            <ColorScalePicker
                              label="Color scale"
                              labelPosition="top"
                              document={colors}
                              selectedKey={role.scaleId}
                              onSelectionChange={(scaleId) =>
                                notify.edit(() =>
                                  store.set(setColorRoleScaleAtom, {
                                    id: role.id,
                                    scaleId,
                                  }),
                                )
                              }
                            />
                          </Dialog>
                        </Popover>
                      </DialogTrigger>
                      <ActionButton
                        aria-label={`Delete ${name}`}
                        onPress={() =>
                          notify.remove({
                            kind: "colorRole",
                            noun: name,
                            run: (target) =>
                              target.set(removeColorRoleAtom, role.id),
                            undo: (removed) => {
                              if (removed)
                                store.set(restoreColorRoleAtom, removed);
                            },
                          })
                        }
                      >
                        <Delete />
                      </ActionButton>
                    </ActionButtonGroup>
                  )}
                </ListViewItem>
              );
            })}
          </ListView>
        ) : (
          <Text UNSAFE_className="colorRolesEmpty">No color roles</Text>
        )}
      </AccordionItemPanel>
    </AccordionItem>
  );
}

function AddColorRole({
  terms,
  colors,
  onAdd,
}: {
  terms: { id: string; label: string }[];
  colors: Parameters<typeof ColorScalePicker>[0]["document"];
  onAdd: (input: {
    roleTermId?: string;
    name?: string;
    scaleId: string;
  }) => boolean;
}) {
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [termId, setTermId] = useState<string | null>(null),
    [scaleId, setScaleId] = useState("");
  const selectedScale = scaleId || colors.scales[0]?.id || "";
  const reset = (next: boolean) => {
    setOpen(next);
    setInput("");
    setTermId(null);
    setScaleId("");
  };
  return (
    <DialogTrigger isOpen={open} onOpenChange={reset}>
      <ActionButton size="M" isQuiet aria-label="Add color role">
        <Add />
      </ActionButton>
      <Popover padding="none" size="S">
        <Dialog
          aria-label="Add color role"
          className={`${popoverDialogStyles} ${bodyStyles}`}
        >
          <form
            className="stylesFields"
            onSubmit={(event) => {
              event.preventDefault();
              const chosen = terms.find(
                (term) => term.id === termId && term.label === input,
              );
              if (
                onAdd(
                  chosen
                    ? { roleTermId: chosen.id, scaleId: selectedScale }
                    : { name: input, scaleId: selectedScale },
                )
              )
                reset(false);
            }}
          >
            <ComboBox
              label="Role"
              inputValue={input}
              selectedKey={termId}
              defaultItems={terms}
              allowsCustomValue
              isRequired
              styles={style({ width: "full", minWidth: 0 })}
              onInputChange={setInput}
              onSelectionChange={(id) =>
                setTermId(typeof id === "string" ? id : null)
              }
            >
              {(term) => (
                <ComboBoxItem id={term.id} textValue={term.label}>
                  {term.label}
                </ComboBoxItem>
              )}
            </ComboBox>
            <ColorScalePicker
              label="Color scale"
              labelPosition="top"
              document={colors}
              selectedKey={selectedScale}
              onSelectionChange={setScaleId}
            />
            <Button type="submit" variant="primary">
              Add color role
            </Button>
          </form>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

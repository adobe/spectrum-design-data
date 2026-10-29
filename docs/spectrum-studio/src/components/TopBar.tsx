// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Button, Image, Picker, PickerItem, Text, TextField, SearchField, ToggleButton, Tooltip, TooltipTrigger, type TextFieldRef } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Search from '@react-spectrum/s2/icons/Search';
import { CategoryIcon } from "./CategoryIcon";
import Edit from "@react-spectrum/s2/icons/Edit";
import Saturation from "@react-spectrum/s2/icons/Saturation";
import appLogo from "../assets/Adobe_logo.svg";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useLayoutEffect, useRef, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { modeSetsAtom } from "../features/modes/state";
import { enterEditModeAtom } from "../features/edit-session/state";
import { editModeAtom } from "../state/view/editMode";
import { EditablePicker } from "./editable";
import { EditModeActions } from "./EditModeActions";
import { applyPendingModeParameterAtom, pendingModeParameterAtom } from "../features/modes/selection";
import { BRANCH_NAME, VERSION } from "../state/view/editMode"
import { appColorSchemeAtom } from "../features/modes/capabilities";
import { spectrumChromeClassName } from "../utils/spectrumChrome";

const branchStyles = style({ font: "detail", color: "neutral-subdued" });

const PLATFORM_OPTIONS = [
  { id: "platform-0", label: "Foundations" },
  { id: "platform-1", label: "React" },
  { id: "platform-2", label: "Web Components" },
  { id: "platform-3", label: "iOS" },
  { id: "platform-4", label: "Android" },
  { id: "platform-5", label: "Drover" },
  { id: "platform-6", label: "QT" },
];

export function TopBar() {
  const modeSets = useAtomValue(modeSetsAtom);
  const [colorScheme, setColorScheme] = useAtom(appColorSchemeAtom);
  const isEditMode = useAtomValue(editModeAtom);
  const enterEditMode = useSetAtom(enterEditModeAtom);
  const pendingEdit = useAtomValue(pendingModeParameterAtom);
  const clearPending = useSetAtom(pendingModeParameterAtom);
  const applyPending = useSetAtom(applyPendingModeParameterAtom);
  const [destinationId, setDestinationId] = useState("");
  const [newModeName, setNewModeName] = useState("");
  const destinationSet = modeSets.find((modeSet) => modeSet.id === pendingEdit?.modeSetId);
  const [platformId, setPlatformId] = useState(PLATFORM_OPTIONS[0].id);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchFieldRef = useRef<TextFieldRef>(null);

  useLayoutEffect(() => {
    if (isSearchVisible) searchFieldRef.current?.focus();
  }, [isSearchVisible]);

  return (
    <header
      data-component="TopBar"
      className={style({
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gridTemplateRows: "auto",
        columnGap: 24,
        alignItems: "center",
        justifyContent: "stretch",
        backgroundColor: "layer-1",
        overflowX: "auto",
        paddingTop: 12,
        paddingEnd: 12,
        paddingBottom: 12,
        paddingStart: 12,
      })}
    >
      <div
        className={style({
          display: "flex",
          flexGrow: 1,
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "nowrap",
          columnGap: 12,
          rowGap: 8,
        })}
      >
        <div className={style({ display: "flex", flexDirection: "row", alignItems: "center", columnGap: 8, paddingStart: 8})} style={{width: '200px'}} >
          <Image
            src={appLogo}
            alt="App icon"
            styles={style({
              width: 24,
              height: 24,
              flexShrink: 0,
              backgroundColor: "transparent",
            })}
          />
          <h1 className={style({ font: "heading-xs", margin: 0 })}>Spectrum Studio</h1>
        </div>

        <div className={style({ display: "flex", flexDirection: "row", alignItems: "center", columnGap: 24})} >
          <EditablePicker
            isQuiet
            aria-label="Platform"
            label={<CategoryIcon category="platforms" />}
            labelPosition="side"
            layout="flex"
            selectedKey={platformId}
            onSelectionChange={(key) => setPlatformId(String(key))}
            displayValue={PLATFORM_OPTIONS.find((platform) => platform.id === platformId)?.label ?? ""}
            isReadOnly={isEditMode}
            UNSAFE_style={{ alignItems: "center" }}
          >
            {PLATFORM_OPTIONS.map((platform) => (
              <PickerItem key={platform.id} id={platform.id}>{platform.label}</PickerItem>
            ))}
          </EditablePicker>
          <Picker
            isQuiet
            aria-label="Theme"
            label={<CategoryIcon category="themes" />}
            labelPosition="side"
            defaultSelectedKey="theme-1"
            UNSAFE_style={{ alignItems: "center" }}
          >
            <PickerItem id="theme-1">Spectrum 2</PickerItem>
            <PickerItem id="theme-2">Aether</PickerItem>
            <PickerItem id="theme-3">Express</PickerItem>
          </Picker>
          <span className={branchStyles}>{ (isEditMode ? `${BRANCH_NAME}` : `${VERSION}`)}</span>
        </div>
      </div>

      <div
        className={style({
          display: "flex",
          flexGrow: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "end",
          flexWrap: "nowrap",
          columnGap: 8,
          rowGap: 8,
        })}
      >
        {isSearchVisible ? (
          <SearchField ref={searchFieldRef} aria-label="Search design data" placeholder="Search design data..." styles={style({ width: 160, flexShrink: 0 })} onBlur={() => setIsSearchVisible(false)} />
        ) : (
          <ActionButton isQuiet aria-label="Search" onPress={() => setIsSearchVisible(true)}>
            <Search />
          </ActionButton>
        )}

        <ActionButton isQuiet aria-label="Documentation" onPress={() => window.open('https://opensource.adobe.com/spectrum-design-data/', '_blank')}>
          Docs
        </ActionButton>
        <ActionButton isQuiet aria-label="Documentation" onPress={() => window.open('https://spectrum.adobe.com', '_blank')}>
          Spectrum
        </ActionButton>

        {isEditMode ? <EditModeActions /> : (
          <>
            <ActionButton onPress={() => enterEditMode()}>
              <Edit />
              <Text>Edit</Text>
            </ActionButton>
          </>
        )}
        <TooltipTrigger>
          <ToggleButton isQuiet aria-label="Dark app appearance" isSelected={colorScheme === "dark"}
            onChange={(dark) => setColorScheme(dark ? "dark" : "light")}>
            <Saturation />
          </ToggleButton>
          <Tooltip>Change app appearance</Tooltip>
        </TooltipTrigger>
      </div>
      <ModalOverlay isOpen={pendingEdit !== null} onOpenChange={(open) => { if (!open) clearPending(null); }}>
        <Modal>
          <Dialog aria-label="Choose mode for parameter edit" className={`${spectrumChromeClassName(colorScheme)} ${style({ display: "flex", flexDirection: "column", gap: 16, padding: 16, width: 320 })}`}>
            <h2>Apply adaptive edit</h2>
            <Text>The adaptive preview is temporary. Choose where this edit should be saved.</Text>
            <Picker label="Apply to mode" selectedKey={destinationId} onSelectionChange={(key) => setDestinationId(String(key))}>
              {destinationSet?.modes.filter((mode) => mode.id !== destinationSet.defaultModeId).map((mode) =>
                <PickerItem id={mode.id} key={mode.id}>{mode.name}</PickerItem>)}
              <PickerItem id="new">New mode</PickerItem>
            </Picker>
            {destinationId === "new" && <TextField label="Mode name" value={newModeName} onChange={setNewModeName} />}
            <div className={style({ display: "flex", gap: 8 })}>
              <Button variant="secondary" onPress={() => clearPending(null)}>Dismiss</Button>
              <Button variant="accent" isDisabled={!destinationId || (destinationId === "new" && !newModeName.trim())} onPress={() => {
                applyPending(destinationId === "new" ? { name: newModeName } : { modeId: destinationId });
                setDestinationId("");
                setNewModeName("");
              }}>Apply edit</Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </header>
  );
}

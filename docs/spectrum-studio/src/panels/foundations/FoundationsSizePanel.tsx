// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemTitle,
  AccordionItemPanel,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { FoundationModeSettings } from "./FoundationModeSettings";
import { FoundationParameterSettings } from "./FoundationParameterSettings";
import {
  addSizeScaleAtom,
  generatedSizeAtom,
  isSizeScaleNameTaken,
  removeSizeScaleAtom,
  restoreSizeScaleAtom,
  sizeDocumentAtom,
  updateSizeScaleAtom,
} from "../../features/size/state";
import {
  DimensionFoundationPanel,
  type DimensionFoundationBinding,
} from "./DimensionFoundationPanel";

const sizeFoundation: DimensionFoundationBinding = {
  noun: "size",
  documentAtom: sizeDocumentAtom,
  generatedAtom: generatedSizeAtom,
  addScaleAtom: addSizeScaleAtom,
  updateScaleAtom: updateSizeScaleAtom,
  removeScaleAtom: removeSizeScaleAtom,
  restoreScaleAtom: restoreSizeScaleAtom,
  isNameTaken: isSizeScaleNameTaken,
};

export function FoundationsSizePanel() {
  const systemSettings = (
    <AccordionItem id="system-settings">
      <AccordionItemTitle>System settings</AccordionItemTitle>
      <AccordionItemPanel UNSAFE_className={String(style({ padding: 0 }))}>
        <div className={style({ padding: 8 })}>
          <FoundationParameterSettings foundation="size" />
        </div>
      </AccordionItemPanel>
    </AccordionItem>
  );
  return (
    <>
      <FoundationModeSettings foundation="size" before={systemSettings} />
      <DimensionFoundationPanel
        foundation={sizeFoundation}
        componentName="FoundationsSizePanel"
      />
    </>
  );
}

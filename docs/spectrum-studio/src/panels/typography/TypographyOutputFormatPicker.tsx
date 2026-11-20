// Copyright 2026 Adobe. All rights reserved.
import { PickerItem } from "@react-spectrum/s2";
import { useAtomValue, useSetAtom } from "jotai";
import { EditablePicker } from "../../components/editable";
import { useNotify } from "../../components/notifications/notificationContext";
import {
  typographyDocumentAtom,
  updateTypographyAtom,
} from "../../features/typography/state";
import {
  isTypographyUnit,
  TYPOGRAPHY_UNITS,
} from "../../features/typography/units";

/** Typography output unit picker. Shared by the Typography panel and the Settings page. */
export function TypographyOutputFormatPicker() {
  const notify = useNotify();
  const unit = useAtomValue(typographyDocumentAtom).outputUnit;
  const update = useSetAtom(updateTypographyAtom);
  return (
    <EditablePicker
      label="Output format"
      selectedKey={unit}
      displayValue={unit}
      onSelectionChange={(key) => {
        if (!isTypographyUnit(key)) return;
        try {
          update({ outputUnit: key });
        } catch (failure) {
          notify.error(
            failure instanceof Error ? failure.message : String(failure),
          );
        }
      }}
    >
      {TYPOGRAPHY_UNITS.map((value) => (
        <PickerItem id={value} key={value}>
          {value}
        </PickerItem>
      ))}
    </EditablePicker>
  );
}

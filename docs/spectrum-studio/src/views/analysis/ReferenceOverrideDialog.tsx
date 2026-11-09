// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Heading,
} from "@react-spectrum/s2";
import { Checkbox } from "@react-spectrum/s2/Checkbox";

export function ReferenceOverrideDialog({
  count,
  onApply,
  onClose,
}: {
  count: number;
  onApply: () => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  return (
    <Dialog size="M">
      <Heading slot="title">
        Bulk edit {count} {count === 1 ? "token" : "tokens"}
      </Heading>
      <Content>
        <Checkbox
          isSelected={checked}
          onChange={setChecked}
          isDisabled={applying}
        >
          Apply design-data value as override
        </Checkbox>
        <p>
          This will create individual override values to match the expected
          design-data values.
        </p>
        {error && (
          <p role="alert" className="analysisError">
            {error}
          </p>
        )}
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onClose} isDisabled={applying}>
          Cancel
        </Button>
        <Button
          variant="accent"
          isDisabled={!checked || count === 0 || applying}
          onPress={() => {
            setApplying(true);
            try {
              onApply();
              onClose();
            } catch (failure) {
              setError(
                failure instanceof Error ? failure.message : String(failure),
              );
              setApplying(false);
            }
          }}
        >
          Apply overrides
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}

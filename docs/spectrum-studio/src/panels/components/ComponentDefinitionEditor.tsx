// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useId, useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Form,
  Heading,
  LabeledValue,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import { v4 as uuid } from "uuid";
import {
  componentKey,
  createComponent,
  type ComponentRecord,
} from "../../features/components/model";

export function ComponentDefinitionEditor({
  component,
  initialName = "",
  initialCategory = "controls",
  catalogId,
  onApply,
  onCancel,
  onDirtyChange,
}: {
  component?: ComponentRecord;
  initialName?: string;
  initialCategory?: string;
  catalogId?: string;
  onApply: (component: ComponentRecord) => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [created] = useState(
    () =>
      component ?? {
        ...createComponent({
          $id: `urn:leonardo:component:${uuid()}`,
          name: componentKey(initialName),
          displayName: initialName,
          meta: { category: initialCategory, documentationUrl: "" },
        }),
        ...(catalogId && { catalogId }),
      },
  );
  const record = component ?? created;
  const original = {
    name: record.declaration.displayName,
    description: record.declaration.description ?? "",
    category: record.declaration.meta.category,
    documentationUrl: record.declaration.meta.documentationUrl,
  };
  const source = JSON.stringify([record.id, record.declaration.name, original]);
  const [state, setState] = useState({ source, draft: original });
  if (state.source !== source) setState({ source, draft: original });
  const draft = state.source === source ? state.draft : original;
  const [error, setError] = useState("");
  const formId = useId();
  const key = componentKey(draft.name);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const update = (patch: Partial<typeof draft>) => {
    setState({ source, draft: { ...draft, ...patch } });
    setError("");
  };
  const cancel = () => {
    setState({ source, draft: original });
    setError("");
    onCancel?.();
  };
  const submit = () => {
    try {
      if (!key)
        throw new Error("Enter a display name with letters or numbers.");
      onApply({
        ...record,
        declaration: {
          ...record.declaration,
          name: key,
          displayName: draft.name,
          description: draft.description,
          meta: {
            ...record.declaration.meta,
            category: draft.category,
            documentationUrl: draft.documentationUrl,
          },
        },
      });
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  const fields = (
    <Form
      id={formId}
      aria-label="Component definition"
      UNSAFE_className="componentForm"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- Focus follows the user's Add or Edit component action. */}
      <TextField
        label="Display name"
        value={draft.name}
        autoFocus={!component}
        isRequired
        onChange={(name) => update({ name })}
      />
      <LabeledValue label="Machine name" value={key || "Not available"} />
      {component && key !== component.declaration.name && (
        <p>
          Apply changes will update the machine name from{" "}
          {component.declaration.name} to {key || "a valid name"}.
        </p>
      )}
      <TextArea
        label="Description"
        value={draft.description}
        onChange={(description) => update({ description })}
      />
      <TextField
        label="Category"
        value={draft.category}
        onChange={(category) => update({ category })}
        isRequired
      />
      <TextField
        label="Documentation URI"
        value={draft.documentationUrl}
        onChange={(documentationUrl) => update({ documentationUrl })}
        isRequired
      />
      <LabeledValue label="Document URI" value={record.declaration.$id} />
      {component && dirty && (
        <p role="status">
          You have unapplied changes. Apply this form before saving the
          application.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {component && (
        <ButtonGroup>
          <Button variant="secondary" onPress={cancel}>
            Cancel changes
          </Button>
          <Button type="submit" variant="primary">
            Apply changes
          </Button>
        </ButtonGroup>
      )}
    </Form>
  );
  return component ? (
    fields
  ) : (
    <DialogContainer onDismiss={cancel}>
      <Dialog size="L">
        <Heading slot="title">
          {initialName ? `Configure ${initialName}` : "Add component"}
        </Heading>
        <Content>{fields}</Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={cancel}>
            Cancel changes
          </Button>
          <Button variant="primary" type="submit" form={formId}>
            Add component
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
}

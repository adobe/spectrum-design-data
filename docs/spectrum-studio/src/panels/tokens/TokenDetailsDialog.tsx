// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Heading,
  InlineAlert,
  PickerItem,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import { Picker } from "../../components/fields/Picker";
import {
  canBulkEditValue,
  parseBrowserTokenValue,
  tokenValueText,
  type BrowserToken,
  type BrowserTokenPatch,
} from "../../features/tokens/browserModel";
import { useAtomValue } from "jotai";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import {
  projectClassification,
  type Classification,
} from "../../features/taxonomy/model";
import {
  CLASSIFICATION_REVIEW_CONTEXT,
  CLASSIFICATION_REVIEW_LABEL,
} from "../../features/taxonomy/reviewPresentation";

export interface TokenDetailsDialogProps {
  tokens: BrowserToken[];
  bulk: boolean;
  isEditing: boolean;
  modeLabel: string;
  savedIds: Set<string>;
  onSave: (patch: BrowserTokenPatch) => void;
  onClose: () => void;
  onDeleteAlias?: (id: string) => void;
  classificationIssues?: readonly string[];
}

export function TokenDetailsDialog({
  tokens,
  bulk,
  isEditing,
  modeLabel,
  savedIds,
  onSave,
  onClose,
  onDeleteAlias,
  classificationIssues,
}: TokenDetailsDialogProps) {
  const token = tokens[0];
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const [classification, setClassification] = useState<Classification>(
    token?.projection?.classification ?? {},
  );
  const [classificationChanged, setClassificationChanged] = useState(false);
  const [description, setDescription] = useState(token?.description ?? "");
  const [value, setValue] = useState(
    bulk ? "" : token ? tokenValueText(token) : "",
  );
  const [status, setStatus] = useState(
    bulk ? "unchanged" : (token?.status ?? "draft"),
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState<BrowserTokenPatch | null>(null);
  if (!token) return null;
  const editable =
    isEditing &&
    tokens.every(
      (item) => item.status !== "released" && !item.semantic && !item.alias,
    );
  const newlyDeprecated = tokens.filter((item) => item.status !== "deprecated");
  const savedCount = newlyDeprecated.filter((item) =>
    savedIds.has(item.id),
  ).length;
  const unsavedCount = newlyDeprecated.length - savedCount;

  function commit(patch: BrowserTokenPatch) {
    try {
      onSave(patch);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to save token changes.",
      );
      setPending(null);
    }
  }

  function save() {
    try {
      const patch: BrowserTokenPatch = {};
      if (!bulk) {
        if (classificationChanged) patch.classification = classification;
        if (description !== token.description) patch.description = description;
      }
      if (
        canBulkEditValue(tokens) &&
        (bulk ? value.trim() !== "" : value !== tokenValueText(token))
      )
        patch.value = parseBrowserTokenValue(token, value);
      if (status === "draft" || status === "deprecated") patch.status = status;
      if (patch.status === "deprecated" && newlyDeprecated.length)
        setPending(patch);
      else commit(patch);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Invalid value.");
    }
  }

  return (
    <DialogContainer onDismiss={onClose}>
      <Dialog size="L">
        <Heading slot="title">
          {pending
            ? "Deprecate tokens?"
            : bulk
              ? `Bulk edit ${tokens.length} tokens`
              : token.name}
        </Heading>
        <Content>
          {pending ? (
            <div>
              <p>
                {savedCount} of {savedIds.size} saved tokens (
                {savedIds.size
                  ? ((savedCount / savedIds.size) * 100).toFixed(1)
                  : "0.0"}
                %) will be deprecated.
              </p>
              {unsavedCount > 0 && (
                <p>
                  {unsavedCount} additional unsaved tokens will be deprecated.
                </p>
              )}
              <p>Dependency impact is not yet available.</p>
            </div>
          ) : (
            <div className="tokenDetailsFields">
              {classificationIssues?.length ? (
                <InlineAlert variant="notice">
                  <Heading>{CLASSIFICATION_REVIEW_LABEL}</Heading>
                  <Content>
                    {CLASSIFICATION_REVIEW_CONTEXT} You can still edit and save.
                    Export standard-compliant taxonomy stays blocked until every
                    classification passes this review.
                  </Content>
                </InlineAlert>
              ) : null}
              {classificationIssues?.length ? (
                <section aria-label="Classification review details">
                  <h3>Why this needs review</h3>
                  <ul>
                    {[...new Set(classificationIssues)].map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                  <p>
                    For shared definitions, open Registry, choose Taxonomy, then
                    select the category named above. Expand Migration review for
                    the full list. Export taxonomy compatibility packet
                    downloads the original data and detailed review without
                    clearing warnings.
                  </p>
                </section>
              ) : null}
              {!bulk && (
                <>
                  <TextField label="Name" value={token.name} isReadOnly />
                  {token.projection?.issues.length ? (
                    <p role="status">{token.projection.issues.join(" ")}</p>
                  ) : null}
                  {token.semantic ? (
                    <p>
                      This semantic token is generated by its Structure and
                      T-shirt sizing rule. Edit its foundation source, Medium
                      anchor or rule offsets; direct variant overrides are not
                      supported yet.
                    </p>
                  ) : (
                    token.taxonomySource?.governed && (
                      <p>
                        Names, types and steps come from the foundation.
                        Registry order and inclusion control their presentation.
                      </p>
                    )
                  )}
                  {token.alias && (
                    <p>
                      This compatibility alias references{" "}
                      {token.alias.targetName}. Its value follows that token;
                      you can delete the alias in edit mode.
                    </p>
                  )}
                  {!token.alias &&
                    !token.taxonomySource?.governed &&
                    taxonomy.order
                      .map(
                        (id) =>
                          taxonomy.categories.find(
                            (category) => category.id === id,
                          )!,
                      )
                      .filter((category) =>
                        category.scopes.includes(
                          token.type as
                            | "colors"
                            | "typography"
                            | "spacing"
                            | "size"
                            | "radius",
                        ),
                      )
                      .map((category) => {
                        const assigned = classification[category.id];
                        const references = Array.isArray(assigned)
                          ? assigned
                          : assigned
                            ? [assigned]
                            : [];
                        const terms = taxonomy.terms.filter(
                          (term) => term.categoryId === category.id,
                        );
                        return (
                          <div key={category.id}>
                            {references.map((termId, index) => (
                              <div key={`${termId}:${index}`}>
                                <span>
                                  {String(
                                    terms.find((term) => term.id === termId)
                                      ?.value ?? termId,
                                  )}
                                </span>
                                {editable && (
                                  <Button
                                    variant="secondary"
                                    onPress={() => {
                                      const next = { ...classification };
                                      if (
                                        category.cardinality === "one" ||
                                        references.length === 1
                                      )
                                        delete next[category.id];
                                      else
                                        next[category.id] = references.filter(
                                          (_, itemIndex) => index !== itemIndex,
                                        );
                                      setClassification(next);
                                      setClassificationChanged(true);
                                    }}
                                  >
                                    Remove {category.name} term {index + 1}
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Picker
                              label={category.name}
                              selectedKey={
                                category.cardinality === "one"
                                  ? (references[0] ?? "unset")
                                  : "unset"
                              }
                              isDisabled={!editable}
                              onSelectionChange={(key) => {
                                if (key === "unset") return;
                                setClassification({
                                  ...classification,
                                  [category.id]:
                                    category.cardinality === "one"
                                      ? String(key)
                                      : [
                                          ...references.filter(
                                            (id) => id !== key,
                                          ),
                                          String(key),
                                        ],
                                });
                                setClassificationChanged(true);
                              }}
                            >
                              <PickerItem id="unset">
                                {category.cardinality === "one"
                                  ? "Select a registered term"
                                  : "Append a registered term"}
                              </PickerItem>
                              {terms.map((term) => (
                                <PickerItem key={term.id} id={term.id}>
                                  {String(term.value)}
                                </PickerItem>
                              ))}
                            </Picker>
                          </div>
                        );
                      })}
                  {classificationChanged && (
                    <p>
                      Projected name:{" "}
                      {
                        projectClassification(
                          taxonomy,
                          classification,
                          token.type as
                            | "colors"
                            | "typography"
                            | "spacing"
                            | "size"
                            | "radius",
                        ).name
                      }
                    </p>
                  )}
                  <TextArea
                    label="Description"
                    value={description}
                    onChange={setDescription}
                    isReadOnly={!editable}
                  />
                </>
              )}
              <TextField
                label={bulk ? "Replacement value" : "Value"}
                value={value}
                onChange={setValue}
                isReadOnly={!editable || !canBulkEditValue(tokens)}
              />
              <Picker
                label="Status"
                selectedKey={status}
                onSelectionChange={(key) => setStatus(String(key))}
                isDisabled={!editable}
              >
                {bulk && <PickerItem id="unchanged">Unchanged</PickerItem>}
                <PickerItem id="draft">Draft</PickerItem>
                <PickerItem id="deprecated">Deprecated</PickerItem>
                {token.status === "released" && (
                  <PickerItem id="released">Released</PickerItem>
                )}
              </Picker>
              <p className="tokenEditScope">
                Value scope:{" "}
                {tokens.every((token) => token.dataVis?.static)
                  ? "All modes (Static)"
                  : tokens.some((token) => token.dataVis?.static)
                    ? `Static colors: all modes. Other colors: ${modeLabel}`
                    : modeLabel}
              </p>
              {!bulk && (
                <dl className="tokenDetailsFacts">
                  <dt>Type</dt>
                  <dd>{token.type}</dd>
                  <dt>Source</dt>
                  <dd>{token.groupLabel}</dd>
                  <dt>Generated name</dt>
                  <dd>{token.generatedName}</dd>
                  <dt>Generated value</dt>
                  <dd>
                    {tokenValueText({
                      value: token.generatedValue,
                      unit: token.unit,
                    })}
                  </dd>
                  <dt>Alias</dt>
                  <dd>
                    {token.alias
                      ? `${token.alias.targetName} (${token.alias.$ref})`
                      : token.semantic
                        ? "$ref" in token.semantic.token
                          ? `${token.semantic.target.name} (${token.semantic.token.$ref})`
                          : "Not assigned - generated literal"
                        : "Not assigned"}
                  </dd>
                  <dt>Value origin</dt>
                  <dd>
                    {token.semantic
                      ? "Generated semantic token"
                      : token.paletteColorId
                        ? "Authored in Palette"
                        : token.valueOverridden
                          ? "Manual override"
                          : token.dataVis?.static
                            ? "Captured Static color"
                            : "Generated"}
                  </dd>
                  <dt>Override state</dt>
                  <dd>{token.stale ? "Out of date" : "Current"}</dd>
                  {token.semantic && (
                    <>
                      <dt>Structure</dt>
                      <dd>{token.semantic.structureName}</dd>
                      <dt>Requested / actual mapping</dt>
                      <dd>
                        {token.semantic.mapping.requested} /{" "}
                        {token.semantic.mapping.actual}
                      </dd>
                      <dt>Source token</dt>
                      <dd>{token.semantic.target.name}</dd>
                      <dt>Generation rules</dt>
                      <dd>{token.semantic.ruleIds.join(", ")}</dd>
                      <dt>Output context</dt>
                      <dd>{JSON.stringify(token.semantic.context)}</dd>
                      <dt>Output UUID</dt>
                      <dd>{token.semantic.token.uuid}</dd>
                    </>
                  )}
                </dl>
              )}
              {token.semantic?.mapping.warning && (
                <p role="status">{token.semantic.mapping.warning}</p>
              )}
              {token.semantic && !("$ref" in token.semantic.token) && (
                <div>
                  <h3>Exact generated literal</h3>
                  <pre>
                    {JSON.stringify(token.semantic.token.value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          {error && (
            <p className="tokenDialogError" role="alert">
              {error}
            </p>
          )}
        </Content>
        <ButtonGroup>
          <Button
            variant="secondary"
            onPress={() => (pending ? setPending(null) : onClose())}
          >
            {pending || editable ? "Cancel" : "Close"}
          </Button>
          {editable && (
            <Button
              variant="primary"
              onPress={() => (pending ? commit(pending) : save())}
            >
              {pending ? "Deprecate" : "Save"}
            </Button>
          )}
          {isEditing && token.alias && onDeleteAlias && (
            <Button
              variant="negative"
              onPress={() => {
                try {
                  onDeleteAlias(token.alias!.id);
                  onClose();
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : String(failure),
                  );
                }
              }}
            >
              Delete alias
            </Button>
          )}
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
}

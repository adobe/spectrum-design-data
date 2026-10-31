// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState } from "react";
import { useNotify } from "../../components/notifications/notificationContext";
import {
  ActionButton,
  AlertDialog,
  Badge,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Header,
  Heading,
  PickerItem,
  Tag,
  TagGroup,
  Text,
  TextArea,
} from "@react-spectrum/s2";
import Link from "@react-spectrum/s2/icons/Link";
import Briefcase from "@react-spectrum/s2/icons/Briefcase";
import Add from "@react-spectrum/s2/icons/Add";
import ArrowRight from "@react-spectrum/s2/icons/ChevronRight";
import { ValuePreview } from "../../components/value-preview/ValuePreview";
import { TokenNameTag } from "../../components/tokens/TokenNameTag";
import { Picker } from "../../components/fields/Picker";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import { ModeSetPicker } from "../../components/ModeSetControl";
import { sourceValuePreview } from "../../features/tokens/valuePreview";
import {
  canonicalTokenModeKey,
  tokenValueText,
  type BrowserToken,
  type BrowserTokenEdits,
} from "../../features/tokens/browserModel";
import {
  compatibleTokenTypes,
  modePairs,
} from "../../features/tokens/tokenAssignments";
import type { CanonicalAliasRow } from "../../features/tokens/aliasTargets";
import type { ModeSet } from "../../features/modes/model";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import {
  createDialogDraft,
  dialogClassification,
  resolveDialogTokens,
  type TokenDialogDraft,
} from "../../features/tokens/dialogModel";
import type { ColorOutputSettings } from "../../features/color-system/outputSettings";
import { TokenValueField } from "./TokenValueField";
import { ClassificationTerms } from "./ClassificationTerms";
import { inspectorStyles as styles } from "./tokenInspectorStyles";
import {
  modePreviewSurface,
  type ElementsSurfaceStyle,
} from "../../features/color-system/previewSurface";
import type { ColorSystemDocument } from "../../features/color-system/model";
import { modesForSelection } from "../../features/modes/combinations";

export interface TokenInspectorProps {
  token: BrowserToken;
  rows: CanonicalAliasRow[];
  edits: BrowserTokenEdits;
  taxonomy: TaxonomyDocument;
  modeSets: ModeSet[];
  modeKey: string;
  isEditing: boolean;
  releasedIds: ReadonlySet<string>;
  settings: ColorOutputSettings;
  colorSystem: ColorSystemDocument;
  aliases: BrowserToken[];
  components: { id: string; label: string; count: number }[];
  usageError?: string;
  onSave: (draft: TokenDialogDraft) => void;
  onClose: () => void;
  onOpenToken: (id: string) => void;
  onOpenComponent: (id: string) => void;
  issues?: readonly string[];
}

function TokenPreview({
  token,
  showValue = true,
  opacitySurface,
}: {
  token: BrowserToken;
  showValue?: boolean;
  opacitySurface?: ElementsSurfaceStyle;
}) {
  const color = token.type === "colors" && !token.validationError;
  const opacity = token.type === "opacity" && !token.validationError;
  const value = showValue && (
    <div className={styles.previewValue}>
      {token.referenceId ? (
        <span className={styles.reference}>
          <Link />
          <TokenNameTag name={token.referenceName ?? token.referenceId} />
          <span>({tokenValueText(token)})</span>
        </span>
      ) : (
        <span className={styles.reference}>{tokenValueText(token)}</span>
      )}
    </div>
  );
  return (
    <div
      className={`${styles.preview}${!color && !opacity ? ` ${styles.previewSurface}` : ""}`}
      data-color={color || undefined}
      data-token-preview={opacity ? "opacity" : color ? "color" : "other"}
      style={color ? { backgroundColor: String(token.value) } : undefined}
    >
      {opacity ? (
        <ValuePreview
          preview={sourceValuePreview(token)}
          label={token.name}
          fillSurface
          opacitySurface={opacitySurface}
        >
          {value}
        </ValuePreview>
      ) : (
        !color && (
          <ValuePreview
            preview={sourceValuePreview(token)}
            label={token.name}
            large
          />
        )
      )}
      {!opacity && value}
    </div>
  );
}

export function TokenInspector(props: TokenInspectorProps) {
  const notify = useNotify();
  const { rows, edits, taxonomy, isEditing, token: original } = props;
  const [draft, setDraft] = useState(() =>
    createDialogDraft(original, props.modeKey),
  );
  const [error, setError] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const [aliasOpen, setAliasOpen] = useState(false);
  const [aliasClassification, setAliasClassification] = useState({});
  const [aliasError, setAliasError] = useState("");
  const [replacementPreview, setReplacementPreview] = useState<string>();
  const changed = useMemo(
    () =>
      JSON.stringify(draft) !==
      JSON.stringify({
        ...createDialogDraft(original, props.modeKey),
        modeKey: draft.modeKey,
      }),
    [draft, original, props.modeKey],
  );
  const tokens = useMemo(
    () => resolveDialogTokens(rows, edits, taxonomy, draft.modeKey, draft),
    [rows, edits, taxonomy, draft],
  );
  const token = tokens.find((item) => item.id === original.id) ?? original;
  const editable = isEditing && !original.alias;
  const deprecated = draft.deprecated;
  const released = props.releasedIds.has(token.id);
  const status = deprecated ? "Deprecated" : released ? "Released" : "Draft";
  const version = deprecated
    ? token.lifecycle?.deprecatedIn
    : released
      ? token.lifecycle?.introduced
      : undefined;
  const generated =
    !token.manual &&
    !token.paletteColorId &&
    !token.dataVis?.static &&
    !token.alias;
  const projection = dialogClassification(
    token,
    draft.classification,
    taxonomy,
  );
  const selected = Object.fromEntries(modePairs(draft.modeKey));
  const opacitySurface = useMemo(
    () =>
      original.type === "opacity"
        ? modePreviewSurface(
            props.colorSystem,
            modesForSelection(
              props.modeSets,
              Object.fromEntries(
                props.modeSets.map((set) => [
                  set.id,
                  Object.fromEntries(modePairs(draft.modeKey))[set.id] ??
                    set.defaultModeId,
                ]),
              ),
            ),
            props.modeSets,
          )
        : undefined,
    [original.type, props.colorSystem, props.modeSets, draft.modeKey],
  );
  const applicableIds = new Set(
    rows
      .filter((row) => row.token.id === token.id)
      .flatMap((row) => modePairs(row.context).map(([id]) => id)),
  );
  const modeSets = props.modeSets.filter(
    (set) => applicableIds.has(set.id) && set.modes.length > 1,
  );
  const replacement = tokens.find(
    (item) => item.id === (replacementPreview ?? draft.replacementIds[0]),
  );
  const replacements = tokens.filter(
    (item) =>
      item.id !== token.id && !item.alias && compatibleTokenTypes(token, item),
  );
  const aliases = [
    ...new Map(
      [
        ...tokens.filter(
          (item) => item.id !== token.id && item.referenceId === token.id,
        ),
        ...props.aliases.filter((item) => item.alias),
      ].map((item) => [item.id, item]),
    ).values(),
  ];
  function navigate(action: () => void) {
    if (changed) setPendingNavigation(() => action);
    else action();
  }
  function save() {
    try {
      props.onSave(draft);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      return false;
    }
  }
  function resetValue() {
    const row = rows.find(
      (item) =>
        item.token.id === token.id &&
        modePairs(item.context).every(
          ([axis, mode]) => selected[axis] === mode,
        ),
    );
    const key = row?.context ?? draft.modeKey;
    setDraft({ ...draft, assignments: { ...draft.assignments, [key]: null } });
  }
  return (
    <>
      <DialogContainer onDismiss={() => navigate(props.onClose)}>
        <Dialog size="L" isKeyboardDismissDisabled={!!pendingNavigation}>
          <Heading slot="title">
            {projection.issues.length ? token.name : projection.name}
          </Heading>
          <Header>
            <Badge
              variant={
                deprecated ? "negative" : released ? "informative" : "neutral"
              }
              fillStyle="subtle"
            >
              {status}
              {version ? ` v${version}` : ""}
            </Badge>
          </Header>
          <Content>
            <div className={styles.root} data-component="TokenInspector">
              <div className={styles.wrap}>
                {modeSets.map((set) => (
                  <ModeSetPicker
                    key={set.id}
                    modeSet={set}
                    selectedKey={selected[set.id] ?? set.defaultModeId}
                    onSelectionChange={(id) =>
                      setDraft({
                        ...draft,
                        modeKey: canonicalTokenModeKey({
                          ...selected,
                          [set.id]: id,
                        }),
                      })
                    }
                  />
                ))}
              </div>
              <div
                className={
                  deprecated && replacement
                    ? styles.comparison
                    : editable && !deprecated
                      ? styles.editing
                      : styles.values
                }
                data-editing={(editable && !deprecated) || undefined}
                data-comparison={(deprecated && !!replacement) || undefined}
              >
                <TokenPreview
                  token={token}
                  showValue={!editable || deprecated}
                  opacitySurface={opacitySurface}
                />
                {deprecated && replacement && (
                  <>
                    <span className={styles.arrow} aria-label="Replaced by">
                      <ArrowRight />
                    </span>
                    <TokenPreview
                      token={replacement}
                      opacitySurface={opacitySurface}
                    />
                  </>
                )}
                {editable && !deprecated && (
                  <TokenValueField
                    key={draft.modeKey}
                    token={token}
                    tokens={tokens}
                    settings={props.settings}
                    generated={generated}
                    onChange={(assignment) => {
                      const context =
                        rows.find(
                          (row) =>
                            row.token.id === token.id &&
                            modePairs(row.context).every(
                              ([axis, mode]) => selected[axis] === mode,
                            ),
                        )?.context ?? draft.modeKey;
                      setDraft({
                        ...draft,
                        assignments: {
                          ...draft.assignments,
                          [context]: assignment,
                        },
                      });
                    }}
                    onReset={resetValue}
                  />
                )}
              </div>
              {token.validationError && (
                <p role="alert">{token.validationError}</p>
              )}
              {editable && (
                <>
                  <section className={styles.stack} aria-label="Classification">
                    <Text>Classification</Text>
                    <ClassificationTerms
                      taxonomy={taxonomy}
                      scope={
                        token.semantic || token.classificationScope
                          ? "structures"
                          : token.type === "motion"
                            ? "size"
                            : token.type
                      }
                      value={draft.classification ?? projection.classification}
                      onChange={(classification) =>
                        setDraft({ ...draft, classification })
                      }
                    />
                    {generated && (
                      <div
                        className={
                          draft.classification ? styles.warning : styles.help
                        }
                      >
                        {draft.classification ? (
                          <>
                            Classification overrides formula-generated
                            classification.
                            <ActionButton
                              isQuiet
                              onPress={() =>
                                setDraft({
                                  ...draft,
                                  classification: undefined,
                                })
                              }
                            >
                              Reset classification
                            </ActionButton>
                          </>
                        ) : (
                          "Classification generated by formula"
                        )}
                      </div>
                    )}
                  </section>
                  <Picker
                    label="Lifecycle status"
                    labelPosition="top"
                    selectedKey={deprecated ? "deprecated" : "active"}
                    onSelectionChange={(key) =>
                      setDraft({ ...draft, deprecated: key === "deprecated" })
                    }
                  >
                    <PickerItem id="active">
                      {released ? "Released" : "Draft"}
                    </PickerItem>
                    <PickerItem id="deprecated">Deprecated</PickerItem>
                  </Picker>
                </>
              )}
              {deprecated && (
                <section
                  className={styles.deprecation}
                  aria-label="Deprecation"
                >
                  {editable ? (
                    <>
                      <TextArea
                        label="Deprecation comment"
                        value={draft.deprecatedComment}
                        onChange={(deprecatedComment) =>
                          setDraft({ ...draft, deprecatedComment })
                        }
                        isRequired={draft.replacementIds.length > 1}
                      />
                      <div className={styles.stack}>
                        <TokenComboBox
                          label="Replacement token"
                          selectedKey={null}
                          options={replacements
                            .filter(
                              (item) => !draft.replacementIds.includes(item.id),
                            )
                            .map((item) => ({
                              id: item.id,
                              name: item.name,
                              kind: "token" as const,
                              displayValue: tokenValueText(item),
                              error: item.validationError,
                            }))}
                          onChange={(id) => {
                            if (id)
                              setDraft({
                                ...draft,
                                replacementIds: [...draft.replacementIds, id],
                              });
                          }}
                        />
                        {!draft.replacementIds.length && <Text>None</Text>}
                        <TagGroup
                          aria-label="Replacement tokens"
                          onAction={(id) => setReplacementPreview(String(id))}
                          onRemove={(ids) => {
                            setDraft({
                              ...draft,
                              replacementIds: draft.replacementIds.filter(
                                (id) => !ids.has(id),
                              ),
                            });
                            setReplacementPreview(undefined);
                          }}
                        >
                          {draft.replacementIds.map((id) => (
                            <Tag id={id} key={id}>
                              {tokens.find((item) => item.id === id)?.name ??
                                id}
                            </Tag>
                          ))}
                        </TagGroup>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{draft.deprecatedComment}</p>
                      <TagGroup
                        aria-label="Replacement tokens"
                        onAction={(id) => setReplacementPreview(String(id))}
                      >
                        {draft.replacementIds.map((id) => (
                          <Tag key={id} id={id}>
                            {tokens.find((item) => item.id === id)?.name ?? id}
                          </Tag>
                        ))}
                      </TagGroup>
                    </>
                  )}
                  {replacement && replacement.value !== token.value && (
                    <p className={styles.warning} role="status">
                      Values are not the same
                    </p>
                  )}
                </section>
              )}
              {editable ? (
                <TextArea
                  label="Description"
                  value={draft.description}
                  onChange={(description) =>
                    setDraft({ ...draft, description })
                  }
                />
              ) : (
                draft.description && (
                  <p className={styles.description}>{draft.description}</p>
                )
              )}
              <section className={styles.stack} aria-label="Aliases">
                <Text>Aliases ({aliases.length + draft.aliases.length})</Text>
                <TagGroup
                  aria-label="Aliases"
                  size="S"
                  onAction={(id) =>
                    navigate(() => props.onOpenToken(String(id)))
                  }
                >
                  {aliases.map((item) => (
                    <Tag key={item.id} id={item.id} textValue={item.name}>
                      <Link />
                      <Text>{item.name}</Text>
                    </Tag>
                  ))}
                </TagGroup>
                {draft.aliases.map((alias) => (
                  <Text key={alias.id}>
                    {
                      dialogClassification(
                        token,
                        alias.classification,
                        taxonomy,
                      ).name
                    }{" "}
                    (Draft)
                  </Text>
                ))}
                {editable && !deprecated && (
                  <ActionButton onPress={() => setAliasOpen(true)}>
                    <Add />
                    <Text>Create new alias</Text>
                  </ActionButton>
                )}
              </section>
              <section
                className={styles.stack}
                aria-label="Components using this token"
              >
                <Text>
                  Components using this token
                  {props.usageError ? "" : ` (${props.components.length})`}
                </Text>
                {props.usageError && <p role="status">{props.usageError}</p>}
                <TagGroup
                  aria-label="Components using this token"
                  size="S"
                  onAction={(id) =>
                    navigate(() => props.onOpenComponent(String(id)))
                  }
                >
                  {props.components.map((item) => (
                    <Tag
                      key={item.id}
                      id={item.id}
                      textValue={`${item.label} (${item.count})`}
                    >
                      <Briefcase />
                      <Text>
                        {item.label} ({item.count})
                      </Text>
                    </Tag>
                  ))}
                </TagGroup>
              </section>
              {error && (
                <p className={styles.warning} role="alert">
                  {error}
                </p>
              )}
              {editable && !!projection.issues.length && (
                <p role="status">{projection.issues.join(" ")}</p>
              )}
              {!!props.issues?.length && (
                <div role="status">{props.issues.join(" ")}</div>
              )}
            </div>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={props.onClose}>
              {editable ? "Cancel" : "Close"}
            </Button>
            {editable && (
              <Button
                variant="accent"
                onPress={() => {
                  if (save()) props.onClose();
                }}
              >
                Save
              </Button>
            )}
          </ButtonGroup>
        </Dialog>
      </DialogContainer>
      <DialogContainer onDismiss={() => setAliasOpen(false)}>
        {aliasOpen && (
          <Dialog size="M">
            <Heading slot="title">Create new alias</Heading>
            <Content>
              <div className={styles.stack}>
                <Text>Classification</Text>
                <ClassificationTerms
                  value={aliasClassification}
                  taxonomy={taxonomy}
                  scope={
                    token.semantic || token.classificationScope
                      ? "structures"
                      : token.type === "motion"
                        ? "size"
                        : token.type
                  }
                  onChange={setAliasClassification}
                />
                <Text>References {token.name} in all supported modes.</Text>
                {aliasError && <p role="alert">{aliasError}</p>}
              </div>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setAliasOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                onPress={() => {
                  const projection = dialogClassification(
                    token,
                    aliasClassification,
                    taxonomy,
                  );
                  if (projection.issues.length) {
                    setAliasError(projection.issues.join(" "));
                    return;
                  }
                  setDraft({
                    ...draft,
                    aliases: [
                      ...draft.aliases,
                      {
                        id: crypto.randomUUID(),
                        classification: aliasClassification,
                      },
                    ],
                  });
                  setAliasOpen(false);
                  setAliasClassification({});
                  setAliasError("");
                }}
              >
                Create alias
              </Button>
            </ButtonGroup>
          </Dialog>
        )}
      </DialogContainer>
      <DialogContainer onDismiss={() => setPendingNavigation(null)}>
        {pendingNavigation && (
          <AlertDialog
            title="Discard unapplied changes"
            variant="warning"
            primaryActionLabel="Discard"
            cancelLabel="Keep editing"
            onPrimaryAction={() => {
              const action = pendingNavigation;
              setPendingNavigation(null);
              notify.quietly(action);
            }}
          >
            Your token changes have not been saved. Discard them to continue.
          </AlertDialog>
        )}
      </DialogContainer>
    </>
  );
}

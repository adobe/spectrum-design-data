// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Heading,
  InlineAlert,
  PickerItem,
  ProgressBar,
  SelectBox,
  SelectBoxGroup,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import { Picker } from "../../components/fields/Picker";
import { TokenNameTag } from "../../components/tokens/TokenNameTag";
import { useNotify } from "../../components/notifications/notificationContext";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { browserTokensAtom } from "../../features/tokens/browserState";
import {
  NEW_TOKEN_TYPES,
  newTokenPreview,
  newTokenSteps,
  type NewTokenAnswers,
  type NewTokenQuestion,
  type NewTokenTier,
  type NewTokenType,
} from "../../features/tokens/creationFlow";
import { createNewTokenAtom } from "../../features/tokens/dialogState";
import { tokenPanelRegistry } from "../../features/tokens/view/tokenPanelRegistry";

/** Term lists longer than this use a picker instead of select boxes. */
const BOX_LIMIT = 6;

const TIERS: { id: NewTokenTier; label: string; description: string }[] = [
  {
    id: "primitive",
    label: "Primitive",
    description: "A palette color or a step on a scale.",
  },
  {
    id: "semantic",
    label: "Semantic",
    description: "A token for a shared purpose or reusable structure.",
  },
  {
    id: "component",
    label: "Component",
    description: "A token for a specific component.",
  },
];

export interface AddTokenDialogProps {
  onCreated: (id: string) => void;
  /** Prefilled answers; the walk-through then opens at the review step. */
  initialAnswers?: NewTokenAnswers;
}

/** Step-by-step walk-through for a new draft token. Render inside a DialogContainer. */
export function AddTokenDialog({
  onCreated,
  initialAnswers,
}: AddTokenDialogProps) {
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const existing = useAtomValue(browserTokensAtom);
  const create = useSetAtom(createNewTokenAtom);
  const notify = useNotify();
  const [answers, setAnswers] = useState<NewTokenAnswers>(
    initialAnswers ?? { terms: {} },
  );
  const [index, setIndex] = useState(() =>
    initialAnswers ? newTokenSteps(taxonomy, initialAnswers).length - 1 : 0,
  );
  const steps = useMemo(
    () => newTokenSteps(taxonomy, answers),
    [taxonomy, answers],
  );
  // Freezes the review once created so the closing dialog doesn't flag its own token as a duplicate.
  const [createdId, setCreatedId] = useState<string>();
  const preview = useMemo(
    () =>
      newTokenPreview(
        taxonomy,
        answers,
        existing.filter((token) => token.id !== createdId),
      ),
    [taxonomy, answers, existing, createdId],
  );
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = step.kind === "review";
  const canContinue =
    (step.kind === "tier" && !!answers.tier) ||
    (step.kind === "type" && !!answers.type) ||
    step.kind === "category";
  const canCreate = !preview.duplicate && !preview.issues.length;

  return (
    <Dialog size="M">
      {({ close }) => (
        <>
          <Heading slot="title">Add token</Heading>
          <Content>
            <div
              className={style({
                display: "flex",
                flexDirection: "column",
                gap: 16,
              })}
            >
              <ProgressBar
                label={`Step ${index + 1} of ${steps.length}`}
                value={index + 1}
                maxValue={steps.length}
                styles={style({ width: "full" })}
              />
              {step.kind === "tier" && (
                <SelectBoxGroup
                  aria-label="What kind of token is this?"
                  orientation="horizontal"
                  selectedKeys={answers.tier ? [answers.tier] : []}
                  onSelectionChange={(keys) => {
                    const tier = [...keys][0] as NewTokenTier | undefined;
                    if (tier) setAnswers({ ...answers, tier, terms: {} });
                  }}
                >
                  {TIERS.map((tier) => (
                    <SelectBox
                      key={tier.id}
                      id={tier.id}
                      textValue={tier.label}
                    >
                      <Text slot="label">{tier.label}</Text>
                      <Text slot="description">{tier.description}</Text>
                    </SelectBox>
                  ))}
                </SelectBoxGroup>
              )}
              {step.kind === "type" && (
                <SelectBoxGroup
                  aria-label="What type of value does it hold?"
                  selectedKeys={answers.type ? [answers.type] : []}
                  onSelectionChange={(keys) => {
                    const type = [...keys][0] as NewTokenType | undefined;
                    if (type) setAnswers({ ...answers, type, terms: {} });
                  }}
                >
                  {NEW_TOKEN_TYPES.map((type) => {
                    const definition = tokenPanelRegistry[type];
                    return (
                      <SelectBox
                        key={type}
                        id={type}
                        textValue={definition.label}
                      >
                        {definition.icon}
                        <Text slot="label">{definition.label}</Text>
                      </SelectBox>
                    );
                  })}
                </SelectBoxGroup>
              )}
              {step.kind === "category" && (
                <TermQuestion
                  question={step}
                  value={answers.terms[step.category.id]}
                  onChange={(termId) =>
                    setAnswers({
                      ...answers,
                      terms: { ...answers.terms, [step.category.id]: termId },
                    })
                  }
                />
              )}
              {step.kind !== "tier" && step.kind !== "type" && (
                <NamePreview name={preview.name} />
              )}
              {isLast && preview.duplicate && (
                <InlineAlert variant="negative">
                  <Heading>This token already exists</Heading>
                  <Content>Change an answer to make the name unique.</Content>
                </InlineAlert>
              )}
              {isLast && !preview.duplicate && preview.issues.length > 0 && (
                <InlineAlert variant="notice">
                  <Heading>Not ready yet</Heading>
                  <Content>{preview.issues.join(" ")}</Content>
                </InlineAlert>
              )}
              {isLast && canCreate && <Text>You'll set its value next.</Text>}
            </div>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            {index > 0 && (
              <Button variant="secondary" onPress={() => setIndex(index - 1)}>
                Back
              </Button>
            )}
            {step.kind === "category" && (
              <Button
                variant="secondary"
                onPress={() => {
                  const terms = { ...answers.terms };
                  delete terms[step.category.id];
                  setAnswers({ ...answers, terms });
                  setIndex(index + 1);
                }}
              >
                Skip
              </Button>
            )}
            {isLast ? (
              <Button
                variant="accent"
                isDisabled={!canCreate}
                onPress={() => {
                  const id = notify.added("token", () => create({ answers }));
                  if (!id) return;
                  setCreatedId(id);
                  close();
                  onCreated(id);
                }}
              >
                Create
              </Button>
            ) : (
              <Button
                variant="accent"
                isDisabled={!canContinue}
                onPress={() => setIndex(index + 1)}
              >
                Next
              </Button>
            )}
          </ButtonGroup>
        </>
      )}
    </Dialog>
  );
}

function TermQuestion({
  question,
  value,
  onChange,
}: {
  question: NewTokenQuestion;
  value: string | undefined;
  onChange: (termId: string) => void;
}) {
  const label = `Choose a ${question.category.name.toLowerCase()}`;
  if (question.terms.length > BOX_LIMIT)
    return (
      <Picker
        label={label}
        labelPosition="top"
        description={question.category.description || undefined}
        placeholder="Choose one"
        selectedKey={value ?? null}
        onSelectionChange={(key) => key != null && onChange(String(key))}
        styles={style({ width: "full" })}
      >
        {question.terms.map((term) => (
          <PickerItem
            key={term.id}
            id={term.id}
            textValue={termLabel(term.value)}
          >
            {termLabel(term.value)}
          </PickerItem>
        ))}
      </Picker>
    );
  return (
    <div
      className={style({ display: "flex", flexDirection: "column", gap: 8 })}
    >
      <Text>{label}</Text>
      <SelectBoxGroup
        aria-label={label}
        orientation="horizontal"
        selectedKeys={value ? [value] : []}
        onSelectionChange={(keys) => {
          const termId = [...keys][0];
          if (termId != null) onChange(String(termId));
        }}
      >
        {question.terms.map((term) => (
          <SelectBox
            key={term.id}
            id={term.id}
            textValue={termLabel(term.value)}
          >
            <Text slot="label">{termLabel(term.value)}</Text>
          </SelectBox>
        ))}
      </SelectBoxGroup>
    </div>
  );
}

function NamePreview({ name }: { name: string }) {
  return (
    <div
      role="status"
      className={style({ display: "flex", alignItems: "center", gap: 8 })}
    >
      <Text>Name:</Text>
      {name ? (
        <TokenNameTag name={name} />
      ) : (
        <Text>Answer a question to see it.</Text>
      )}
    </div>
  );
}

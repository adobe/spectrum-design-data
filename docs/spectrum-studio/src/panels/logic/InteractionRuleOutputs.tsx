// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Tag, TagGroup, Text } from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import type { ConditionalRule } from "../../features/logic/model";
import type { ConditionSource } from "../../features/logic/conditional";

export function InteractionRuleOutputs({
  rule,
  sources,
  onChange,
}: {
  rule: ConditionalRule;
  sources: readonly ConditionSource[];
  onChange: (rule: ConditionalRule) => void;
}) {
  const options = sources
    .filter((source) => source.kind === "taxonomy")
    .flatMap((source) =>
      source.values.map((value) => ({
        id: value.id,
        kind: "preset" as const,
        name: `${source.label}: ${value.label}`,
        displayValue: value.label,
        categoryId: source.id,
      })),
    );
  return (
    <section aria-label="Supported interaction outputs">
      <h3>Supported outputs</h3>
      {(rule.outputs ?? []).map((output, index) => {
        const selected = options.filter((option) => {
          const value = output.classification[option.categoryId];
          return Array.isArray(value)
            ? value.includes(option.id)
            : value === option.id;
        });
        return (
          <div key={output.id}>
            <TokenComboBox
              label={`Output ${index + 1}`}
              options={options}
              selectedKey={null}
              onChange={(id) => {
                const option = options.find((option) => option.id === id);
                if (option)
                  onChange({
                    ...rule,
                    outputs: rule.outputs!.map((entry) =>
                      entry.id === output.id
                        ? {
                            ...entry,
                            classification: {
                              ...entry.classification,
                              [option.categoryId]: option.id,
                            },
                          }
                        : entry,
                    ),
                  });
              }}
            />
            <TagGroup
              aria-label={`Output ${index + 1} terms`}
              onRemove={(keys) => {
                const classification = { ...output.classification };
                for (const option of selected)
                  if (keys.has(option.id))
                    delete classification[option.categoryId];
                onChange({
                  ...rule,
                  outputs: rule.outputs!.map((entry) =>
                    entry.id === output.id
                      ? { ...entry, classification }
                      : entry,
                  ),
                });
              }}
            >
              {selected.map((option) => (
                <Tag key={option.id} id={option.id}>
                  {option.name}
                </Tag>
              ))}
            </TagGroup>
            <ActionButton
              aria-label={`Delete output ${index + 1}`}
              onPress={() =>
                onChange({
                  ...rule,
                  outputs: rule.outputs!.filter(
                    (entry) => entry.id !== output.id,
                  ),
                })
              }
            >
              <Delete />
            </ActionButton>
          </div>
        );
      })}
      <ActionButton
        onPress={() =>
          onChange({
            ...rule,
            outputs: [
              ...(rule.outputs ?? []),
              { id: crypto.randomUUID(), classification: {} },
            ],
          })
        }
      >
        <Add />
        <Text>Add output</Text>
      </ActionButton>
    </section>
  );
}

// Copyright 2026 Adobe. All rights reserved.
import { useAtom } from "jotai";
import { Picker, PickerItem, Text } from "@react-spectrum/s2";
import { TOKEN_TIERS } from "../../features/tokens/tier";
import {
  TAXONOMY_TOKEN_TYPES,
  TAXONOMY_TOKEN_TYPE_LABELS,
} from "../../features/taxonomy/model";
import {
  REGISTRY_FILTER_ALL,
  nextRegistryFilterSelection,
  registryFilterKeys,
} from "../../features/taxonomy/registryFilters";
import { registryFiltersAtom } from "../../state/view/registryFilters";

const TIER_LABELS = {
  primitive: "Primitive",
  semantic: "Semantic",
  component: "Component",
} as const;

function FilterPicker<T extends string>({
  label,
  options,
  labels,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  onChange: (selected: T[]) => void;
}) {
  const keys = registryFilterKeys(options, selected);
  const summary = keys.includes(REGISTRY_FILTER_ALL)
    ? "All"
    : !selected.length
      ? "None"
      : options
          .filter((option) => selected.includes(option))
          .map((option) => labels[option])
          .join(", ");
  return (
    <Picker
      label={label}
      labelPosition="side"
      selectionMode="multiple"
      value={keys}
      renderValue={() => <Text>{summary}</Text>}
      onChange={(next) =>
        onChange(
          nextRegistryFilterSelection(options, selected, next.map(String)),
        )
      }
    >
      <PickerItem id={REGISTRY_FILTER_ALL}>All</PickerItem>
      {options.map((option) => (
        <PickerItem key={option} id={option}>
          {labels[option]}
        </PickerItem>
      ))}
    </Picker>
  );
}

export function RegistryFilters() {
  const [filters, setFilters] = useAtom(registryFiltersAtom);
  return (
    <div className="registryFilters">
      <FilterPicker
        label="Token tier"
        options={TOKEN_TIERS}
        labels={TIER_LABELS}
        selected={filters.tiers}
        onChange={(tiers) => setFilters((current) => ({ ...current, tiers }))}
      />
      <FilterPicker
        label="Token type"
        options={TAXONOMY_TOKEN_TYPES}
        labels={TAXONOMY_TOKEN_TYPE_LABELS}
        selected={filters.types}
        onChange={(types) => setFilters((current) => ({ ...current, types }))}
      />
    </div>
  );
}

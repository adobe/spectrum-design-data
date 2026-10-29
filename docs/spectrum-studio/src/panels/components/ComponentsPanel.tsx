// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Heading,
  ListView,
  ListViewItem,
  SearchField,
  Text,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import "./ComponentsPanel.css";

export type ComponentCatalogEntry = {
  id: string;
  name: string;
  group: string;
  configured: boolean;
};
const titleStyles = style({ font: "title-sm" });
const listStyles = style({ width: "full", minWidth: 0 });

export function ComponentsPanel({
  catalog,
  selected,
  editable,
  search,
  onSearch,
  onSelect,
  onAdd,
}: {
  catalog: readonly ComponentCatalogEntry[];
  selected: string | null;
  editable: boolean;
  search: string;
  onSearch: (search: string) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const groups = new Map<string, ComponentCatalogEntry[]>();
  for (const entry of catalog) {
    if (!entry.name.toLowerCase().includes(search.trim().toLowerCase()))
      continue;
    const group = groups.get(entry.group) ?? [];
    group.push(entry);
    groups.set(entry.group, group);
  }
  return (
    <aside className="componentList" aria-label="Component catalog">
      <Heading level={2}>Components</Heading>
      <SearchField label="Find components" value={search} onChange={onSearch} />
      {editable && (
        <ActionButton onPress={onAdd}>
          <Add />
          <Text>Add component</Text>
        </ActionButton>
      )}
      <div className="componentCatalogGroups">
        {[...groups].map(([group, entries]) => (
          <section className="componentCatalogGroup" key={group}>
            <Heading level={3} styles={titleStyles}>
              {group.replace(/^./, (letter) => letter.toUpperCase())}
            </Heading>
            <ListView
              aria-label={`${group} components`}
              items={entries}
              selectionMode="single"
              selectionStyle="highlight"
              isQuiet
              styles={listStyles}
              selectedKeys={
                entries.some((entry) => entry.id === selected) && selected
                  ? [selected]
                  : []
              }
              onSelectionChange={(keys) => {
                if (keys !== "all") {
                  const id = [...keys][0];
                  if (typeof id === "string") onSelect(id);
                }
              }}
            >
              {(entry) => (
                <ListViewItem id={entry.id} textValue={entry.name}>
                  <Text slot="label">{entry.name}</Text>
                  {!entry.configured && (
                    <Text slot="description">No component data</Text>
                  )}
                </ListViewItem>
              )}
            </ListView>
          </section>
        ))}
        {!groups.size && (
          <Text>
            {search
              ? "No components match your search."
              : "Add a component to begin."}
          </Text>
        )}
      </div>
    </aside>
  );
}

---
title: "Table"
source_url: https://s2.spectrum.corp.adobe.com/page/table/
last_updated: 2026-02-02
category: components/containers
component_type: container
status: published
tags:

- components-containers
  related\_components:
- standard-panel
- alert-banner
  parent\_category: containers

---

# Table

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Table](https://opensource.adobe.com/spectrum-css/?path=/docs/components-table--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Table]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/table--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [TableView](https://react-spectrum.adobe.com/s2/index.html?path=/docs/tableview--docs)                                                                                                |

## Anatomy

```
table
- column header
- label
- sort icon
- column divider
- row
- cell
- label
- row divider
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                                          | Default value | Description                                   |
| ---------- | ---------------------------------------------- | ------------- | --------------------------------------------- |
| size       | s / m / l m                                    | Controls      | the density of table rows.                    |
| hideHeader | boolean                                        | false         | If true, the table header is hidden.          |
| header     | object – Configuration for the table header    | row.          |                                               |
| density    | compact / regular / spacious regular           | –             |                                               |
| isQuiet    | boolean                                        | false         | If true, the table uses a quiet visual style. |
| isSortable | boolean                                        | false         | If true, table columns can be sorted.         |
| columns    | array – An array of column definitions for the | table.        |                                               |
| rows       | array – An array of row data for the           | table.        |                                               |

## External links

Tables organize and display structured information in rows and columns. They support scanning, sorting, comparing, and interacting with large amounts of data. Use when multiple data points need to be reviewed or acted on in one place.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

"Tables come in three sizes: small, medium, and large. Size affects the overall scale, including font size and spacing. Medium is the default. Use large for high-visibility tables or when readability is critical. Use small in constrained spaces or when the table is secondary to other content."

If true, the table header is hidden.

Configuration for the table header row.

"Tables come in three densities: compact, regular, and spacious. Density controls vertical spacing while keeping font sizes consistent—compact rows have tighter padding, spacious rows have more breathing room. Regular is the default for most use cases. Use compact when fitting more data in a limited viewport is critical (e.g., dashboards, data-heavy admin panels). Use spacious when scannability and visual comfort are priorities (e.g., transaction histories, settings tables with minimal data)."

Use a standard table when a table is the main focus of an experience. Quiet tables are for when a table is meant to be supplementary, subtle, or lightweight.

If true, table columns can be sorted.

An array of column definitions for the table.

An array of row data for the table.

Column dividers help organize table content and aid users in parsing related data. You can apply dividers selectively to group related columns—for example, separating user information from action columns, or grouping metadata fields together. Use dividers sparingly to avoid visual clutter.

All tables have a hover state regardless of if actions or selections can be made. This aids the user in viewing content in a single row.

Similar to a paragraph of text, textual data should be start-aligned within a table (left-aligned in LTR languages, right-aligned in RTL languages). Never use center alignment.

"Numerical data should generally be right-aligned for ease of scanning and comparing. This alignment typically does NOT reverse in RTL languages because:"

"Exception: Use start-alignment (left in LTR, right in RTL) when numbers are arbitrary identifiers, known as "nominal numbers," which can't be compared or combined arithmetically (e.g., ZIP codes, IP addresses, phone numbers). These behave like text."

Column headers follow the alignment of their data.

All content should be centered vertically within the row to offer the right visual balance.

Tables use row dividers, hover states, and selection highlighting to help users track data. Zebra striping adds visual noise without improving usability.

Column dividers are optional decorations that can help organize table content and create groups of data. Only use these when necessary, and don't add them to every column.

When there are gaps in the data, use an en dash (–) to represent null or not applicable (N/A) values.

## States

All tables have a hover state regardless of if actions or selections can be made. This aids the user in viewing content in a single row.

Column headers follow the alignment of their data.

All content should be centered vertically within the row to offer the right visual balance.

When there are gaps in the data, use an en dash (–) to represent null or not applicable (N/A) values.

## Behaviors

All tables have a hover state regardless of if actions or selections can be made. This aids the user in viewing content in a single row.

Column headers follow the alignment of their data.

All content should be centered vertically within the row to offer the right visual balance.

When there are gaps in the data, use an en dash (–) to represent null or not applicable (N/A) values.

## Usage guidelines

Column headers follow the alignment of their data.

All content should be centered vertically within the row to offer the right visual balance.

When there are gaps in the data, use an en dash (–) to represent null or not applicable (N/A) values.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date               | Number | Notes                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| November 19, 2025  | 1.1.0  | New guidelines were added to this page.                     |
| September 15, 2025 | 1.0.0  | This component was added to the Spectrum 2 guidelines site. |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Standard panel](/page/standard-panel/)
* [Alert banner](/page/alert-banner/)

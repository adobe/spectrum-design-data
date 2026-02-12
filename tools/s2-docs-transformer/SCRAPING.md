# Cursor-Based S2 Documentation Scraper

This is a simplified approach to scraping S2 docs using Cursor's browser MCP tools directly.

## How It Works

Instead of running a separate Node.js script, you can ask Cursor to scrape components for you using the browser MCP integration. Cursor already has access to your authenticated browser session.

## Usage

Just ask Cursor to scrape specific components or all components:

### Scrape a Single Component

```
"Can you scrape the Action Button component from S2 docs and save it to ~/Spectrum/s2-internal-docs/components/actions/action-button.md?"
```

### Scrape Multiple Components

```
"Can you scrape all Action components from S2 docs (Action bar, Action button, Action group, etc.)?"
```

### Scrape All Components

```
"Can you scrape all components from S2 docs and organize them by category?"
```

## What Cursor Will Do

1. Navigate to the component page using browser MCP
2. Extract the page snapshot
3. Parse the content into structured markdown
4. Save to the appropriate category folder
5. Format with proper headings, tables, and lists

## Advantages

* ✅ Uses your existing authenticated browser session
* ✅ No additional setup or dependencies required
* ✅ Can run one component at a time or in batches
* ✅ Cursor handles all the parsing and formatting
* ✅ Can customize the output format on the fly

## Components to Scrape

### Actions (9 components)

* Action bar: `/page/action-bar/`
* Action button: `/page/action-button/`
* Action group: `/page/action-group/`
* Button: `/page/button/` ✅ (already scraped)
* Button group: `/page/button-group/`
* Close button: `/page/close-button/`
* Link: `/page/link/`
* List view: `/page/list-view/`
* Menu: `/page/menu/`

### Other Categories

Ask Cursor to explore each category to find all available components.

## Tips

* Scrape components as you need them (on-demand)
* Or do a bulk scrape and have all docs available
* Update docs periodically by re-scraping changed components
* Reference docs in Cursor using `@~/Spectrum/s2-internal-docs/`

## Example Output

See `~/Spectrum/s2-internal-docs/components/actions/button.md` for an example of the formatted output.

# Creating Pull Requests from the Plugin

This guide explains how to create pull requests directly from the Component Options Editor Figma plugin to the `adobe/spectrum-design-data` repository.

## Prerequisites

* Figma Desktop or Browser
* GitHub account with access to create PRs
* Component Options Editor plugin installed

## Setup

### 1. Create GitHub Personal Access Token

You need a GitHub Personal Access Token (PAT) with repository write permissions to create pull requests.

1. Visit [GitHub Token Settings](https://github.com/settings/tokens/new?scopes=repo\&description=Component%20Options%20Editor%20Plugin)
2. **Token name:** "Component Options Editor Plugin" (or any descriptive name)
3. **Expiration:** Choose an appropriate expiration period
4. **Scopes:** Select **repo** (Full control of private repositories)
   * This includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
5. Click **Generate token**
6. **Copy the token immediately** (you won't be able to see it again!)
   * Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Authenticate in Plugin

1. Open the Component Options Editor plugin in Figma
2. Click on the **GitHub PR** tab
3. Paste your Personal Access Token in the password field
4. The plugin will automatically validate and store your token
5. You should see "✓ Connected to GitHub" when successful

## Creating a Pull Request

### Step 1: Create or Edit Component Schema

1. Use the **Component Options** tab to define your component schema:
   * Component name
   * Category
   * Documentation URL
   * Component options (size, variant, boolean properties, etc.)

2. Ensure all validation passes:
   * No red error indicators
   * All required fields filled
   * Valid option configurations

### Step 2: Initiate PR Creation

1. Switch to the **GitHub PR** tab
2. Click **Create Pull Request**
3. A dialog will appear asking for a component description

### Step 3: Enter Component Description

The component description is **required** for the official JSON Schema format. It should explain:

* What the component does
* When to use it
* Key behaviors or characteristics

**Example descriptions:**

* "Buttons allow users to perform an action or to navigate to another page. They have multiple styles for various needs."
* "Checkboxes allow users to select multiple items from a list of individual items, or to mark one individual item as selected."

### Step 4: Wait for PR Creation

The plugin will:

1. Convert your simplified schema to official JSON Schema format
2. Detect if this is a new component or an update
3. Generate an appropriate changeset file
4. Create a new branch with a unique name
5. Commit the schema file and changeset
6. Create a pull request

This typically takes 5-10 seconds depending on network speed.

### Step 5: View Your PR

Once created, you'll see a success message with:

* PR number
* Direct link to the pull request on GitHub

Click the link to view your PR, where you can:

* See the full diff
* Request reviews
* Respond to feedback
* Merge when approved

## What Gets Created

### Files in the PR

1. **Component Schema** (`packages/component-schemas/schemas/components/{component-name}.json`)
   * Official JSON Schema format
   * Includes all properties, types, and metadata
   * Follows Spectrum Design Data conventions

2. **Changeset** (`.changeset/{random}-{timestamp}.md`)
   * Version bump directive (`minor` for new, `patch` for updates)
   * Descriptive commit message
   * Follows changesets conventions

### PR Details

* **Title:** `feat(component-schemas): add {Component Name} component schema` (for new) or `fix(component-schemas): update {Component Name} component schema` (for updates)
* **Branch:** `component-schema/{component-name}-{timestamp}`
* **Base:** `main`
* **Description:** Includes summary, changes, and component details

## Security

### Token Storage

* Your PAT is stored in Figma's encrypted client storage
* Isolated per user - other users can't access your token
* Only accessible to this plugin
* Never transmitted except to GitHub API

### Token Permissions

The plugin only needs `repo` scope to:

* Read repository contents (check if schema exists)
* Create branches
* Commit files
* Create pull requests

### Revoking Access

To disconnect and remove your stored token:

1. Go to the **GitHub PR** tab
2. Click **Disconnect**
3. Your token is immediately deleted from storage

To revoke the token entirely:

1. Visit [GitHub Token Settings](https://github.com/settings/tokens)
2. Find your "Component Options Editor Plugin" token
3. Click **Delete** or **Revoke**

## Troubleshooting

### "Invalid GitHub token"

**Causes:**

* Token was copied incorrectly (missing characters)
* Token has expired
* Token was revoked

**Solutions:**

* Create a new token and paste the complete value
* Ensure you copy the entire token including `ghp_` prefix
* Check token hasn't expired in GitHub settings

### "Permission denied"

**Causes:**

* Token doesn't have `repo` scope
* You don't have write access to the repository

**Solutions:**

* Recreate token with `repo` scope selected
* If you're not a collaborator on `adobe/spectrum-design-data`, you'll need to fork the repo first (this feature doesn't support forks yet)

### "Unable to create PR"

**Causes:**

* Branch with same name already exists
* PR for this component already open
* Network connectivity issues

**Solutions:**

* Check if a PR for this component already exists
* Wait a moment and try again (creates new unique branch)
* Check your internet connection

### "Network request failed"

**Causes:**

* No internet connection
* GitHub API is down
* Corporate firewall blocking GitHub API

**Solutions:**

* Check internet connection
* Try again in a few moments
* Check [GitHub Status](https://www.githubstatus.com/)

### Validation Errors Before PR Creation

If the plugin prevents PR creation:

* Check the **Component Options** tab for red error indicators
* Ensure component name is not empty
* Ensure category is selected
* Ensure documentation URL is valid
* Fix any option-specific validation errors

## Best Practices

### Component Descriptions

Write clear, concise descriptions that:

* Start with what the component does
* Explain when to use it
* Are 1-3 sentences long
* Follow Spectrum documentation style

### Testing Changes

Before creating a PR:

1. Review your schema in the **Preview** tab
2. Check the **JSON Editor** tab for correct format
3. Verify all options are correct
4. Ensure category and documentation URL are accurate

### PR Management

After creating a PR:

* Request reviews from team members
* Respond to feedback promptly
* Update the PR if changes are requested (create a new branch for updates)
* Link to related issues if applicable

## Examples

### Example 1: New Button Component

**Input:**

* Title: "Button"
* Category: "actions"
* Documentation URL: "<https://spectrum.adobe.com/page/button/>"
* Options: size, variant, isDisabled
* Description: "Buttons allow users to perform an action or to navigate to another page."

**Output:**

* Branch: `component-schema/button-1706123456789`
* PR: `feat(component-schemas): add Button component schema`
* Files: `packages/component-schemas/schemas/components/button.json`, `.changeset/a7b8c9d-1706123456789.md`

### Example 2: Update Existing Checkbox

**Input:**

* Title: "Checkbox"
* Updates: Added new `isIndeterminate` option
* Description: "Checkboxes allow users to select multiple items from a list. Added support for indeterminate state."

**Output:**

* Branch: `component-schema/checkbox-1706123456790`
* PR: `fix(component-schemas): update Checkbox component schema`
* Changeset: patch version bump

## Support

For issues or questions:

* [GitHub Issues](https://github.com/adobe/spectrum-design-data/issues)
* Spectrum Design System team

## Related Documentation

* [Component Options Editor README](../README.md)
* [Schema Compatibility](../SCHEMA_COMPATIBILITY.md)
* [Component Schema Converter](../../../packages/component-schema-converter/README.md)
* [Changesets Documentation](https://github.com/changesets/changesets)

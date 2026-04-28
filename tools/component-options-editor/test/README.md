# Lit-Code Editable Test

This test page helps debug `lit-code` editable mode behavior.

## Running the Test

1. **Start a local server** (required for ES modules):

   ```bash
   # Option 1: Using Python
   cd test
   python3 -m http.server 8000

   # Option 2: Using Node.js
   npx http-server -p 8000

   # Option 3: Using PHP
   php -S localhost:8000
   ```

2. **Open in browser**:
   ```
   http://localhost:8000/lit-code-test.html
   ```

## What to Test

### Test 1: Basic Editable Editor

* **Try editing** the JSON in the editor
* **Watch the event log** to see which events fire
* **Click "Set New Value"** to test programmatic updates
* **Click "Get Value"** to read current content

**Questions to answer**:

* Which events fire when you type? (`@update`, `@change`, `@input`)
* What is in `event.detail`?
* Does `editor.code` property update automatically?
* Can you edit while programmatic updates happen?

### Test 2: Reactive Updates

* **Start typing** in the editor
* **Click "External Update"** while editing
* **Does the editor reset?** Or does it stay editable?
* **Try "Start Auto-Update"** - can you still edit?

**Questions to answer**:

* Does setting `editor.code` interrupt user typing?
* Do we need a flag to skip updates during editing?
* Is there a better way to detect user editing?

## Expected Findings

This test will help us understand:

1. ✅ The correct event to listen for (`@update` vs `@change` vs `@input`)
2. ✅ How to prevent external updates from blocking user input
3. ✅ Whether we need the `isUserEditing` flag
4. ✅ If there's a built-in way to handle this in `lit-code`

## Next Steps

Once you understand the behavior, we can:

1. Apply the correct pattern to the plugin
2. Document any lit-code quirks/limitations
3. Decide if we stick with textarea or can use lit-code successfully

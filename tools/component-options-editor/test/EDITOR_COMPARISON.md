# Code Editor Component Comparison

## Options for JSON Editor in Figma Plugin

### 1. **CodeMirror** ⭐ RECOMMENDED

**Pros:**

* ✅ Lightweight (\~200KB minified)
* ✅ Excellent event handling (`on('change')`)
* ✅ Reliable editing (no cursor jumping issues)
* ✅ Great JSON support
* ✅ Works perfectly in iframes
* ✅ Mature, well-maintained
* ✅ Good documentation

**Cons:**

* ⚠️ Requires separate CSS file
* ⚠️ Slightly more setup than lit-code

**Bundle Size:** \~200KB (vs lit-code \~50KB but unreliable)

**Test:** `http://localhost:8000/codemirror-test.html`

***

### 2. **Monaco Editor** (VS Code)

**Pros:**

* ✅ Most powerful (IntelliSense, autocomplete, etc.)
* ✅ Best syntax highlighting
* ✅ Excellent performance

**Cons:**

* ❌ Very large (\~2MB+)
* ❌ Overkill for JSON editing
* ❌ Complex setup

**Bundle Size:** \~2MB+ (too large for plugin)

***

### 3. **Ace Editor**

**Pros:**

* ✅ Good features
* ✅ Medium size

**Cons:**

* ⚠️ Larger than CodeMirror (\~500KB)
* ⚠️ Less popular than CodeMirror

**Bundle Size:** \~500KB

***

### 4. **lit-code** (Current)

**Pros:**

* ✅ Small (\~50KB)
* ✅ Lit-based (matches our stack)
* ✅ Simple API

**Cons:**

* ❌ **Editable mode unreliable** (cursor issues, can't type)
* ❌ Poor event handling
* ❌ Reactive updates break editing
* ❌ Not well-maintained

**Bundle Size:** \~50KB (but doesn't work!)

***

### 5. **Simple Textarea** (Current fallback)

**Pros:**

* ✅ Zero dependencies
* ✅ Always works
* ✅ Fast

**Cons:**

* ❌ No syntax highlighting
* ❌ No line numbers
* ❌ Basic editing experience

**Bundle Size:** 0KB

***

## Recommendation: **CodeMirror**

**Why CodeMirror?**

1. **Reliable** - No editing issues like lit-code
2. **Right size** - 200KB is acceptable for a plugin
3. **Proven** - Used by many major projects
4. **Good events** - `on('change')` works perfectly
5. **JSON mode** - Built-in support

**Implementation:**

```javascript
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/json/json';
import 'codemirror/lib/codemirror.css';

const editor = CodeMirror.fromTextArea(textarea, {
    mode: {name: 'javascript', json: true},
    lineNumbers: true,
    theme: 'material'
});

editor.on('change', (cm) => {
    const value = cm.getValue();
    // Validate and update
});
```

**Bundle Impact:** +200KB (total \~1.7MB, still acceptable)

***

## Next Steps

1. ✅ Test CodeMirror in browser (`codemirror-test.html`)
2. ✅ Compare editing experience vs lit-code
3. ✅ If CodeMirror works well, integrate into plugin
4. ✅ Remove lit-code dependency

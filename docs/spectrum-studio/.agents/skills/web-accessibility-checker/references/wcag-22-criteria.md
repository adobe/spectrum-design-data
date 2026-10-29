# WCAG 2.2 Success Criteria Reference

This document provides a comprehensive reference for all WCAG 2.2 success criteria, organized by the four POUR principles. The focus is on Level A and AA criteria, which are required for European Accessibility Act (EAA) compliance.

**WCAG 2.2 Overview:**
- Published: October 5, 2023
- Adds 9 new success criteria to WCAG 2.1
- Backward compatible with WCAG 2.0 and 2.1
- EAA requirement: Level AA compliance

---

## 1. Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

### 1.1 Text Alternatives

Provide text alternatives for non-text content.

#### 1.1.1 Non-text Content (Level A)

**Requirement:** All non-text content has a text alternative that serves the equivalent purpose.

**Applies to:**
- Images
- Form image buttons
- Image map areas
- Icons and graphics
- Charts and diagrams
- Audio and video (provide description)

**Testing:**
- Check all `<img>` tags have `alt` attributes
- Verify alt text is meaningful (not "image123.jpg")
- Decorative images use `alt=""`
- Complex images (charts) have longer descriptions (`aria-describedby`, `longdesc`, or adjacent text)
- Form image buttons have descriptive `alt` text
- Icon fonts have accessible labels (`aria-label` or visually-hidden text)

**Common failures:**
- Missing `alt` attribute entirely
- Generic alt text like "image", "photo", "icon"
- Filename as alt text
- Alt text that doesn't convey image purpose
- Decorative images with descriptive alt text (creates noise)

**How to fix:**
```html
<!-- Bad -->
<img src="product.jpg">
<img src="logo.png" alt="logo.png">
<img src="decorative-line.svg" alt="decorative line">

<!-- Good -->
<img src="product.jpg" alt="Blue ceramic coffee mug with white handle">
<img src="logo.png" alt="Acme Corporation">
<img src="decorative-line.svg" alt="">
```

---

### 1.2 Time-based Media

Provide alternatives for time-based media (audio/video).

#### 1.2.1 Audio-only and Video-only (Prerecorded) (Level A)

**Requirement:**
- **Audio-only:** Provide a text transcript
- **Video-only:** Provide either a text transcript or audio description

**Testing:**
- Verify podcasts have transcripts
- Video-only content (silent animations) has text alternative or audio track
- Transcript includes all meaningful audio information (speech, sounds, speaker identification)

#### 1.2.2 Captions (Prerecorded) (Level A)

**Requirement:** Provide synchronized captions for all prerecorded video with audio.

**Testing:**
- All videos have captions
- Captions are synchronized with audio
- Captions include dialogue and important sounds (e.g., "[door slams]", "[music playing]")
- Captions identify speakers when not obvious

**Exception:** Media is clearly labeled as an alternative for text (e.g., sign language video accompanying an article).

#### 1.2.3 Audio Description or Media Alternative (Prerecorded) (Level A)

**Requirement:** Provide audio description or full text alternative for prerecorded video.

**Testing:**
- Video has audio description track, OR
- Text transcript includes visual information (actions, scene changes, on-screen text)

#### 1.2.4 Captions (Live) (Level AA)

**Requirement:** Provide synchronized captions for all live audio content in video.

**Applies to:**
- Live webinars
- Live streams
- Video conferences
- Live broadcasts

**Testing:**
- Live video has real-time captions (may be automatic with review)

#### 1.2.5 Audio Description (Prerecorded) (Level AA)

**Requirement:** Provide audio description for all prerecorded video content.

**Testing:**
- Video has audio description track describing visual information during natural pauses
- If no natural pauses exist, extended audio description is used (pausing video to insert descriptions)

**Note:** This is stricter than 1.2.3 (which allows text alternative instead).

---

### 1.3 Adaptable

Create content that can be presented in different ways without losing information or structure.

#### 1.3.1 Info and Relationships (Level A)

**Requirement:** Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.

**Applies to:**
- Headings (use `<h1>`-`<h6>`, not just styling)
- Lists (use `<ul>`, `<ol>`, `<dl>`)
- Tables (use `<table>`, `<th>`, proper headers)
- Form labels (use `<label>` or `aria-labelledby`)
- Regions and landmarks (`<nav>`, `<main>`, `<aside>`, or ARIA roles)
- Visual groupings (use `<fieldset>` for related form controls)

**Testing:**
- Turn off CSS - structure still makes sense
- Screen reader correctly identifies headings, lists, tables
- Form fields have programmatically associated labels
- Related form controls are grouped (e.g., radio buttons in `<fieldset>`)

**Common failures:**
- Using `<div class="heading">` instead of `<h2>`
- Using `<br>` for list items instead of `<li>`
- Data tables without `<th>` headers or `scope` attributes
- Form labels not associated with inputs
- Visual columns created with CSS but not marked up as tables

**How to fix:**
```html
<!-- Bad -->
<div class="heading">Section Title</div>
<div>• Item 1</div>
<div>• Item 2</div>

<!-- Good -->
<h2>Section Title</h2>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<!-- Bad -->
<div>Email:</div>
<input type="email">

<!-- Good -->
<label for="email">Email:</label>
<input type="email" id="email">
```

#### 1.3.2 Meaningful Sequence (Level A)

**Requirement:** When the sequence of content affects its meaning, the correct reading sequence can be programmatically determined.

**Testing:**
- Disable CSS and verify content order makes sense
- Tab through page - focus order follows logical reading order
- Screen reader reading order matches visual order
- Multi-column layouts read in correct sequence

**Common failures:**
- CSS positioning changes visual order from DOM order
- Tab order jumps around page illogically
- Sidebar content appears before main content in DOM

#### 1.3.3 Sensory Characteristics (Level A)

**Requirement:** Instructions don't rely solely on sensory characteristics like shape, size, visual location, orientation, or sound.

**Testing:**
- Instructions don't say "click the round button" without also identifying it by label
- Don't say "see the box on the right" without other identification
- Don't rely on "click the red link" - identify by text too

**How to fix:**
```html
<!-- Bad -->
<p>Click the green button on the right to continue</p>

<!-- Good -->
<p>Click the "Continue" button to proceed</p>
<!-- or -->
<p>Click the green "Continue" button on the right to proceed</p>
```

#### 1.3.4 Orientation (Level AA)

**Requirement:** Content does not restrict its view and operation to a single display orientation (portrait or landscape) unless a specific orientation is essential.

**Testing:**
- Rotate device - content adapts to portrait and landscape
- No orientation lock unless essential (e.g., piano app, bank check scanning)

**Exception:** Essential orientations (depositing a check, playing a piano, projector slide display).

#### 1.3.5 Identify Input Purpose (Level AA)

**Requirement:** The purpose of input fields that collect user information can be programmatically determined.

**Testing:**
- Common input fields use `autocomplete` attribute with appropriate values
- Enables browsers and assistive technologies to auto-fill data

**Required fields:**
- Name, email, telephone, address, credit card, etc.

**How to fix:**
```html
<input type="email" name="email" autocomplete="email">
<input type="tel" name="phone" autocomplete="tel">
<input type="text" name="given-name" autocomplete="given-name">
<input type="text" name="family-name" autocomplete="family-name">
<input type="text" name="address-line1" autocomplete="address-line1">
```

---

### 1.4 Distinguishable

Make it easier for users to see and hear content.

#### 1.4.1 Use of Color (Level A)

**Requirement:** Color is not the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.

**Testing:**
- Required form fields not indicated by red asterisk alone (also use "required" label)
- Links not distinguished only by color (also use underline or bold)
- Chart data not differentiated only by color (also use patterns, labels, or shapes)
- Error states not shown only by red border (also use icon or text)

**How to fix:**
```html
<!-- Bad -->
<label style="color: red">Email</label>
<input type="email">

<!-- Good -->
<label>Email <span class="required">(required)</span></label>
<input type="email" aria-required="true">
```

#### 1.4.2 Audio Control (Level A)

**Requirement:** If audio plays automatically for more than 3 seconds, provide a mechanism to pause, stop, or control volume.

**Testing:**
- Auto-playing audio has pause/stop button
- Auto-playing audio has volume control
- Or: audio stops within 3 seconds

#### 1.4.3 Contrast (Minimum) (Level AA) ⭐ MOST COMMON FAILURE

**Requirement:**
- **Normal text:** 4.5:1 contrast ratio
- **Large text (≥18pt or ≥14pt bold):** 3:1 contrast ratio
- **Exceptions:** Logos, decorative text, inactive UI components

**Testing:**
- Use contrast checker tool (e.g., WebAIM Contrast Checker)
- Check text on all backgrounds (including hover states)
- Check placeholder text in form fields
- Check text on images/gradients

**Common failures:**
- Light gray text on white background (#999 on #FFF = 2.8:1 ❌)
- Gray placeholder text (#AAA on #FFF = 2.3:1 ❌)
- Text on images without sufficient contrast
- Hover states that reduce contrast

**How to fix:**
```css
/* Bad - 3.1:1 contrast */
.footer-link { color: #767676; background: #FFFFFF; }

/* Good - 4.6:1 contrast */
.footer-link { color: #595959; background: #FFFFFF; }

/* Good - Large text with 3.3:1 contrast */
.hero-title {
  font-size: 24px;
  font-weight: bold;
  color: #777777;
  background: #FFFFFF;
}
```

**Quick reference:**
- #000 on #FFF: 21:1 ✅
- #333 on #FFF: 12.6:1 ✅
- #595959 on #FFF: 4.6:1 ✅ (normal text)
- #767676 on #FFF: 3.1:1 ❌ (normal text), ✅ (large text)
- #999 on #FFF: 2.8:1 ❌

#### 1.4.4 Resize Text (Level AA)

**Requirement:** Text can be resized up to 200% without loss of content or functionality (except captions and images of text).

**Testing:**
- Zoom browser to 200%
- Verify no horizontal scrolling on desktop
- Verify no content is cut off or hidden
- Verify all functionality still works

**Common failures:**
- Fixed-width containers cause horizontal scrolling
- Text truncated without ellipsis or wrapping
- Overlapping content at 200% zoom

#### 1.4.5 Images of Text (Level AA)

**Requirement:** Use actual text rather than images of text, except where customization is essential (logos, branding).

**Testing:**
- Avoid images containing text when possible
- If text in images is necessary, ensure it's for branding/logos only
- Provide actual text alternative

**Exception:** Customizable by user, essential (logos, screenshots of software).

#### 1.4.10 Reflow (Level AA) ⭐

**Requirement:** Content reflows to fit 320px width (equivalent to 400% zoom) without requiring 2D scrolling.

**Testing:**
- Set viewport to 320px wide (or zoom to 400%)
- Verify vertical scrolling only (no horizontal scrolling)
- Verify no content hidden or cut off
- Test on actual mobile device

**Exception:** Content requiring 2D layout (data tables, maps, diagrams, presentations).

**Common failures:**
- Fixed-width layouts don't reflow
- Content overflows container
- Horizontal scrolling required to read text

**How to fix:**
```css
/* Bad */
.container { width: 1200px; }

/* Good */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 20px;
}
```

#### 1.4.11 Non-text Contrast (Level AA) ⭐

**Requirement:** Visual presentation of UI components and graphical objects has 3:1 contrast ratio against adjacent colors.

**Applies to:**
- Form field borders
- Button borders/backgrounds
- Focus indicators
- Custom checkboxes/radio buttons
- Icons conveying information
- Charts and graphs

**Exception:** Inactive/disabled components, no appearance change required.

**Testing:**
- Check form input borders against background (3:1 minimum)
- Check button outlines against background
- Check focus indicators against background
- Check graphical elements (chart bars, pie slices) against each other

**Common failures:**
- Light gray input borders on white background (#DDD on #FFF = 1.3:1 ❌)
- Subtle focus indicators (#EEE on #FFF = 1.2:1 ❌)
- Inactive appearance for active buttons

**How to fix:**
```css
/* Bad - 1.3:1 contrast */
input {
  border: 1px solid #DDD;
  background: #FFF;
}

/* Good - 3.1:1 contrast */
input {
  border: 1px solid #767676;
  background: #FFF;
}

/* Good focus indicator - 4.5:1 contrast */
button:focus {
  outline: 2px solid #0066CC;
  background: #FFF;
}
```

#### 1.4.12 Text Spacing (Level AA)

**Requirement:** Content must not lose information or functionality when users override text spacing to:
- Line height: 1.5× font size
- Paragraph spacing: 2× font size
- Letter spacing: 0.12× font size
- Word spacing: 0.16× font size

**Testing:**
- Apply text spacing bookmarklet or browser extension
- Verify no content is clipped
- Verify no overlapping text
- Verify all functionality works

**Common failures:**
- Fixed-height containers clip text when line-height increases
- Tooltips/modals don't resize
- Text overflows fixed-width containers

**How to fix:**
```css
/* Bad */
.card { height: 200px; }

/* Good */
.card { min-height: 200px; }
```

#### 1.4.13 Content on Hover or Focus (Level AA)

**Requirement:** When additional content appears on hover or focus (tooltips, dropdowns), it must be:
1. **Dismissible** - Can close without moving pointer/focus (usually Escape key)
2. **Hoverable** - Pointer can move to the additional content
3. **Persistent** - Content stays visible until dismissed, unfocused, or user moves pointer away

**Testing:**
- Hover over trigger - verify tooltip appears
- Press Escape - verify tooltip dismisses without moving focus
- Move pointer to tooltip content - verify it stays visible
- Tab away - verify tooltip dismisses

**Exception:** Content controlled by user agent (browser tooltip on `title` attribute).

**How to fix:**
```javascript
// Tooltip must:
// 1. Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && tooltipOpen) closeTooltip();
});

// 2. Allow hovering over tooltip itself
tooltip.addEventListener('mouseenter', keepTooltipOpen);

// 3. Stay open until user dismisses or moves away
// (Don't auto-dismiss after timeout)
```

---

## 2. Operable

User interface components and navigation must be operable.

### 2.1 Keyboard Accessible

Make all functionality available from a keyboard.

#### 2.1.1 Keyboard (Level A)

**Requirement:** All functionality is operable through a keyboard interface.

**Testing:**
- Tab through entire page
- All interactive elements reachable (links, buttons, form fields, dropdowns, modals)
- All functionality works (submit forms, open menus, close dialogs)
- Custom widgets (sliders, carousels) have keyboard controls

**Common failures:**
- `div` or `span` used as buttons without keyboard handling
- Mouse-only events (`onmouseover` without `onfocus`)
- Custom widgets without keyboard support

**How to fix:**
```html
<!-- Bad -->
<div onclick="doAction()">Click me</div>

<!-- Good -->
<button onclick="doAction()">Click me</button>
<!-- or -->
<div role="button" tabindex="0"
     onclick="doAction()"
     onkeydown="if(event.key==='Enter')doAction()">
  Click me
</div>
```

#### 2.1.2 No Keyboard Trap (Level A)

**Requirement:** Keyboard focus can move away from any component using only keyboard.

**Testing:**
- Tab through page - focus never gets stuck
- Can exit modals/dialogs with keyboard (Escape or Tab to close button)
- Can exit embedded content (iframes, widgets)

**Common failures:**
- Modal dialog with no way to close via keyboard
- Custom widget traps focus
- Infinite tab loop

#### 2.1.4 Character Key Shortcuts (Level A) - NEW in WCAG 2.1

**Requirement:** If single character key shortcuts exist, provide a way to turn off, remap, or make active only on focus.

**Testing:**
- Pressing single keys (like "S" for search) doesn't trigger unexpectedly
- Shortcuts can be disabled or remapped
- Or: shortcuts only work when component has focus

**Why:** Prevents accidental activation for voice input users.

---

### 2.2 Enough Time

Provide users enough time to read and use content.

#### 2.2.1 Timing Adjustable (Level A)

**Requirement:** For time limits, provide options to turn off, adjust, or extend before time expires.

**Exception:** Real-time events (auctions), essential time limits, time limits >20 hours.

#### 2.2.2 Pause, Stop, Hide (Level A)

**Requirement:** For moving, blinking, scrolling, or auto-updating content:
- **Moving/blinking (>5 seconds):** Provide pause/stop/hide control
- **Auto-updating:** Provide pause/stop/hide control or frequency control

**Applies to:**
- Carousels/sliders
- Auto-scrolling news tickers
- Auto-refreshing content
- Animations

**Exception:** Essential animations (loading indicators).

---

### 2.3 Seizures and Physical Reactions

Do not design content that causes seizures or physical reactions.

#### 2.3.1 Three Flashes or Below Threshold (Level A)

**Requirement:** Pages do not contain anything that flashes more than three times per second.

**Testing:**
- Verify animations don't flash rapidly
- Verify videos don't contain flashing content
- Check transitions and effects

---

### 2.4 Navigable

Provide ways to help users navigate, find content, and determine where they are.

#### 2.4.1 Bypass Blocks (Level A)

**Requirement:** Provide a way to bypass repeated blocks of content (headers, navigation).

**Testing:**
- "Skip to main content" link at top of page
- Proper heading structure for screen reader navigation
- ARIA landmarks (`<main>`, `<nav>`, `<aside>`)

**How to fix:**
```html
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <nav>...</nav>
  <main id="main">...</main>
</body>
```

#### 2.4.2 Page Titled (Level A)

**Requirement:** Web pages have descriptive titles that describe topic or purpose.

**Testing:**
- Every page has unique, descriptive `<title>`
- Title describes page content/purpose
- Title is concise

**How to fix:**
```html
<!-- Bad -->
<title>Page</title>
<title>Acme Corp</title>

<!-- Good -->
<title>About Us - Acme Corporation</title>
<title>Shopping Cart (3 items) - Acme Store</title>
```

#### 2.4.3 Focus Order (Level A)

**Requirement:** Focusable components receive focus in an order that preserves meaning and operability.

**Testing:**
- Tab through page - order makes sense
- Focus order matches reading order
- No unexpected jumps

**Common failures:**
- CSS positioning changes visual order from DOM order
- Modal opens but focus stays on background
- Tab order skips important elements

#### 2.4.4 Link Purpose (In Context) (Level A)

**Requirement:** The purpose of each link can be determined from link text alone or from link text plus programmatically determined context.

**Testing:**
- Link text describes destination
- Avoid generic "click here", "read more", "learn more" without context
- If generic text used, ensure surrounding context is programmatically associated

**How to fix:**
```html
<!-- Bad -->
<a href="/products">Click here</a>

<!-- Good -->
<a href="/products">View our products</a>

<!-- Acceptable with context -->
<h2>Annual Report 2024</h2>
<p>Our financial results... <a href="/report-2024.pdf">Read more</a></p>
```

#### 2.4.5 Multiple Ways (Level AA)

**Requirement:** Provide more than one way to locate pages within a website.

**Examples:**
- Site map + search
- Navigation menu + sitemap
- Navigation menu + breadcrumbs
- Search + related links

**Exception:** Web pages that are part of a process (checkout flow).

#### 2.4.6 Headings and Labels (Level AA)

**Requirement:** Headings and labels describe topic or purpose.

**Testing:**
- Headings clearly describe section content
- Form labels clearly describe input purpose
- Labels are not ambiguous

**How to fix:**
```html
<!-- Bad -->
<h2>Details</h2>
<label>Enter:</label>

<!-- Good -->
<h2>Shipping Details</h2>
<label>Enter your email address:</label>
```

#### 2.4.7 Focus Visible (Level AA) ⭐

**Requirement:** Keyboard focus indicator is visible for all focusable elements.

**Testing:**
- Tab through page - always see where focus is
- Focus indicator has sufficient contrast (3:1 minimum per SC 1.4.11)
- Focus indicator is not hidden by CSS

**Common failures:**
- `outline: none` without custom focus style
- Focus indicator blends into background
- Focus indicator too subtle

**How to fix:**
```css
/* Bad */
button:focus { outline: none; }

/* Good - visible focus indicator */
button:focus {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

/* Better - high contrast focus */
button:focus {
  outline: 3px solid #000;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #FFF, 0 0 0 5px #000;
}
```

#### 2.4.11 Focus Not Obscured (Minimum) (Level AA) - NEW in WCAG 2.2

**Requirement:** When a component receives keyboard focus, it is not entirely hidden by author-created content.

**Testing:**
- Tab through page - focused element is at least partially visible
- Sticky headers/footers don't completely cover focused elements
- Modals/popups don't hide focus

**How to fix:**
- Use `scroll-margin` or `scroll-padding` to account for sticky headers
- Ensure modals trap focus within visible area
- Use `element.scrollIntoView()` with appropriate options

```css
/* Account for sticky header */
:focus {
  scroll-margin-top: 100px; /* Height of sticky header */
}
```

---

### 2.5 Input Modalities

Make it easier for users to operate functionality through various inputs beyond keyboard.

#### 2.5.1 Pointer Gestures (Level A) - NEW in WCAG 2.1

**Requirement:** Functionality requiring multi-point or path-based gestures can also be operated with a single pointer without path-based movement.

**Examples:**
- Pinch-to-zoom has zoom buttons
- Two-finger scroll has scrollbar
- Swipe to delete has delete button
- Drawing signature has alternative input

**Exception:** Multi-point or path gesture is essential.

#### 2.5.2 Pointer Cancellation (Level A) - NEW in WCAG 2.1

**Requirement:** For single-pointer functionality, use "up-event" not "down-event", or allow abort/undo.

**Why:** Prevents accidental activation. Users can move pointer away before releasing.

**Testing:**
- Click/tap actions complete on mouse up, not mouse down
- User can drag pointer away to cancel action

#### 2.5.3 Label in Name (Level A) - NEW in WCAG 2.1

**Requirement:** For UI components with labels, the accessible name contains the visible label text.

**Testing:**
- Visible button text matches `aria-label` or accessible name
- Voice control users can activate by saying visible label

**How to fix:**
```html
<!-- Bad - visible text doesn't match accessible name -->
<button aria-label="Submit form">Send</button>

<!-- Good - accessible name includes visible text -->
<button aria-label="Send message">Send</button>
<!-- Better - no aria-label needed -->
<button>Send</button>
```

#### 2.5.4 Motion Actuation (Level A) - NEW in WCAG 2.1

**Requirement:** Functionality triggered by device motion (shaking, tilting) can also be operated by UI components, and motion can be disabled.

**Examples:**
- Shake to undo has undo button
- Tilt to steer has arrow controls
- Motion can be disabled in settings

**Exception:** Motion is essential (pedometer).

#### 2.5.5 Target Size (Minimum) (Level AA) - NEW in WCAG 2.2 ⭐

**Requirement:** Interactive targets are at least 24×24 CSS pixels.

**Exceptions:**
- **Spacing:** Target is smaller but has sufficient spacing (24px of space around it)
- **Inline:** Target is in a sentence or block of text
- **User agent controlled:** Browser default controls
- **Essential:** Size is essential to functionality

**Testing:**
- Measure button/link click areas (include padding)
- Mobile tap targets at least 24×24px
- Icon buttons at least 24×24px

**Common failures:**
- Icon-only buttons <24px
- Mobile navigation links with small tap areas
- Close buttons in modals <24px

**How to fix:**
```css
/* Bad - 16×16px target */
.icon-button {
  width: 16px;
  height: 16px;
}

/* Good - 24×24px minimum with padding */
.icon-button {
  width: 16px;
  height: 16px;
  padding: 4px; /* Total: 24×24px */
}

/* Better - 44×44px (AAA) */
.icon-button {
  width: 16px;
  height: 16px;
  padding: 14px; /* Total: 44×44px */
}
```

#### 2.5.7 Dragging Movements (Level AA) - NEW in WCAG 2.2 ⭐

**Requirement:** Functionality that requires dragging has a single-pointer alternative without dragging.

**Examples:**
- Slider has +/- buttons or input field
- Sortable list has up/down buttons
- Drag-and-drop file upload has file picker button
- Drawing tool has alternative input method

**Exception:** Dragging is essential (signature pad, freehand drawing app).

**Testing:**
- All drag operations have alternative (buttons, keyboard, form inputs)

**How to fix:**
```html
<!-- Slider with dragging alternative -->
<label for="volume">Volume:</label>
<input type="range" id="volume" min="0" max="100" value="50">
<button onclick="decrementVolume()">-</button>
<button onclick="incrementVolume()">+</button>

<!-- Sortable list with buttons -->
<ul>
  <li>
    Item 1
    <button aria-label="Move up">↑</button>
    <button aria-label="Move down">↓</button>
  </li>
</ul>
```

#### 2.5.8 Target Size (Enhanced) (Level AAA)

**Note:** This is Level AAA (not required for EAA). Requires 44×44 CSS pixels. Only mention if user specifically asks about AAA.

---

## 3. Understandable

Information and the operation of user interface must be understandable.

### 3.1 Readable

Make text content readable and understandable.

#### 3.1.1 Language of Page (Level A)

**Requirement:** The default human language of each page can be programmatically determined.

**Testing:**
- `<html>` tag has `lang` attribute
- Language code is valid (e.g., "en", "fr", "de")

**How to fix:**
```html
<!DOCTYPE html>
<html lang="en">
```

#### 3.1.2 Language of Parts (Level AA)

**Requirement:** Language of each passage or phrase can be programmatically determined.

**Testing:**
- Foreign language phrases have `lang` attribute
- Ensures screen readers pronounce correctly

**How to fix:**
```html
<p>The French phrase <span lang="fr">c'est la vie</span> means "that's life".</p>
```

---

### 3.2 Predictable

Make pages appear and operate in predictable ways.

#### 3.2.1 On Focus (Level A)

**Requirement:** When a component receives focus, it does not initiate a context change.

**Testing:**
- Tabbing to field doesn't auto-submit form
- Focusing link doesn't navigate away
- Focusing element doesn't open modal

#### 3.2.2 On Input (Level A)

**Requirement:** Changing the setting of a UI component does not automatically cause a context change unless the user has been advised beforehand.

**Testing:**
- Selecting dropdown option doesn't auto-submit
- Entering text doesn't navigate away
- If auto-submit exists, user is warned

**How to fix:**
```html
<!-- Bad - auto-submits on change -->
<select onchange="this.form.submit()">

<!-- Good - requires explicit submit -->
<select name="country">
  <option>Select country...</option>
</select>
<button type="submit">Continue</button>

<!-- Acceptable - user warned -->
<label>
  Select country (form will auto-submit):
  <select onchange="this.form.submit()">
</select>
```

#### 3.2.3 Consistent Navigation (Level AA)

**Requirement:** Navigation mechanisms that are repeated on multiple pages occur in the same relative order, unless user initiates change.

**Testing:**
- Header navigation in same order on all pages
- Footer links in same order
- Sidebar menu consistent

#### 3.2.4 Consistent Identification (Level AA)

**Requirement:** Components with the same functionality are identified consistently.

**Testing:**
- Search button labeled "Search" on all pages (not "Find" on some)
- Icons for same functions are consistent
- Help links use same text/icon

#### 3.2.6 Consistent Help (Level A) - NEW in WCAG 2.2 ⭐

**Requirement:** If help mechanisms (contact links, chatbots, phone numbers) appear on multiple pages, they appear in the same relative order.

**Testing:**
- Help link in header appears in same position on all pages
- Contact info in footer has consistent order
- Live chat button in consistent location

**Why:** Helps users with cognitive disabilities find help.

**How to fix:**
```html
<!-- Page 1 footer -->
<footer>
  <a href="/contact">Contact Us</a>
  <a href="/faq">FAQ</a>
  <a href="/support">Support</a>
</footer>

<!-- Page 2 footer - SAME order -->
<footer>
  <a href="/contact">Contact Us</a>
  <a href="/faq">FAQ</a>
  <a href="/support">Support</a>
</footer>
```

---

### 3.3 Input Assistance

Help users avoid and correct mistakes.

#### 3.3.1 Error Identification (Level A)

**Requirement:** If input error is automatically detected, the item in error is identified and described to user in text.

**Testing:**
- Form validation errors are shown in text
- Error messages identify which field has error
- Errors visible without color alone
- Screen reader announces errors

**How to fix:**
```html
<label for="email">Email</label>
<input type="email" id="email" aria-invalid="true" aria-describedby="email-error">
<span id="email-error" class="error">Please enter a valid email address</span>
```

#### 3.3.2 Labels or Instructions (Level A)

**Requirement:** Labels or instructions are provided when content requires user input.

**Testing:**
- All form fields have labels
- Required fields are indicated
- Format requirements are explained (e.g., "MM/DD/YYYY")
- Instructions appear before fields

**How to fix:**
```html
<label for="phone">
  Phone number
  <span class="required">(required)</span>
  <span class="hint">Format: (123) 456-7890</span>
</label>
<input type="tel" id="phone" aria-required="true">
```

#### 3.3.3 Error Suggestion (Level AA)

**Requirement:** If input error is detected and suggestions are known, provide suggestions to user (unless it would jeopardize security/purpose).

**Testing:**
- Error messages include how to fix
- Suggestions provided when possible

**How to fix:**
```html
<!-- Bad -->
<span class="error">Invalid email</span>

<!-- Good -->
<span class="error">Email must include @ symbol. Example: user@example.com</span>
```

#### 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)

**Requirement:** For legal/financial transactions or data submission, provide one of:
- Reversible (can undo)
- Checked (data is validated)
- Confirmed (review/confirm page before submission)

**Testing:**
- E-commerce has order review page before purchase
- Form data is validated before submission
- Important actions have confirmation dialog

#### 3.3.7 Redundant Entry (Level A) - NEW in WCAG 2.2 ⭐

**Requirement:** Information previously entered in the same process is auto-populated or available to select.

**Examples:**
- Shipping address pre-filled in billing address
- Previously entered email auto-suggested
- "Same as shipping address" checkbox

**Exceptions:**
- Re-entry is essential (password confirmation)
- Security required (re-enter password)
- Previous info no longer valid

**How to fix:**
```html
<!-- Checkout form -->
<fieldset>
  <legend>Billing Address</legend>
  <label>
    <input type="checkbox" id="same-as-shipping" onchange="copyShippingAddress()">
    Same as shipping address
  </label>
  <!-- OR auto-populate fields from shipping -->
</fieldset>

<!-- Search: show previous searches -->
<input type="search" list="recent-searches">
<datalist id="recent-searches">
  <option value="Previous search 1">
  <option value="Previous search 2">
</datalist>
```

#### 3.3.8 Accessible Authentication (Minimum) (Level AA) - NEW in WCAG 2.2 ⭐

**Requirement:** Authentication does not require cognitive function tests (memorizing, transcribing, solving puzzles) unless:
- Alternative method provided
- Mechanism to assist (password manager, copy-paste)
- Object recognition (select images of cats, not text entry)

**Testing:**
- Password fields allow paste
- Password managers work (no disabled autocomplete)
- CAPTCHAs not text-based or have alternative
- No memory tests ("What was your first pet's name?")

**Allowed:**
- Email/SMS magic links
- Biometric authentication
- Password managers
- Copy-paste passwords
- Object recognition ("Select images with traffic lights")

**Not allowed:**
- Blocking paste in password fields
- Text-based CAPTCHAs without alternative
- Math problems without alternative
- Remembering characters from password ("Enter 3rd and 5th character")

**How to fix:**
```html
<!-- Bad - blocks paste -->
<input type="password" onpaste="return false">

<!-- Good - allows paste and password managers -->
<input type="password" autocomplete="current-password">

<!-- Bad CAPTCHA - text transcription -->
<img src="captcha.png" alt="Enter the text shown">
<input type="text" placeholder="Enter CAPTCHA">

<!-- Good alternative - reCAPTCHA or hCaptcha with checkbox option -->
<div class="h-captcha" data-sitekey="..."></div>
```

#### 3.3.9 Accessible Authentication (Enhanced) (Level AAA) - NEW in WCAG 2.2

**Note:** Level AAA (not required for EAA). Even stricter than 3.3.8 - no object recognition tests either. Only mention if user asks about AAA.

---

## 4. Robust

Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.

### 4.1 Compatible

Maximize compatibility with current and future user agents, including assistive technologies.

#### 4.1.1 Parsing (Level A) - OBSOLETE in WCAG 2.2

**Note:** This criterion was removed in WCAG 2.2 as browsers now handle invalid HTML gracefully. Mention only if user asks about it specifically. Still good practice to use valid HTML.

#### 4.1.2 Name, Role, Value (Level A)

**Requirement:** For all UI components, the name and role can be programmatically determined; states, properties, and values can be set and notified to assistive technologies.

**Applies to:**
- Custom widgets (tabs, accordions, dialogs)
- Form controls
- Interactive elements

**Testing:**
- Use semantic HTML when possible (`<button>`, `<input>`, `<select>`)
- Custom widgets have appropriate ARIA roles
- ARIA attributes used correctly (`aria-expanded`, `aria-checked`, `aria-label`)
- Dynamic content updates announced (`aria-live`)

**How to fix:**
```html
<!-- Bad - non-semantic with no ARIA -->
<div onclick="toggle()">Expand</div>
<div id="content" style="display:none">...</div>

<!-- Good - semantic HTML -->
<button onclick="toggle()" aria-expanded="false" aria-controls="content">
  Expand
</button>
<div id="content" hidden>...</div>

<!-- Good - custom widget with ARIA -->
<div role="tab" aria-selected="true" aria-controls="panel1" tabindex="0">
  Tab 1
</div>
<div role="tabpanel" id="panel1">...</div>
```

#### 4.1.3 Status Messages (Level AA) - NEW in WCAG 2.1

**Requirement:** Status messages can be programmatically determined through role or properties, enabling announcement by assistive technologies without receiving focus.

**Applies to:**
- Success messages ("Item added to cart")
- Error messages (form validation)
- Progress updates ("Loading...")
- Search results ("5 results found")

**Testing:**
- Use `aria-live` regions for dynamic updates
- Messages announced without focus change
- Status changes communicated to screen readers

**How to fix:**
```html
<!-- Success message -->
<div role="status" aria-live="polite">
  Item added to cart
</div>

<!-- Error message -->
<div role="alert" aria-live="assertive">
  Please correct the errors below
</div>

<!-- Search results -->
<div role="status" aria-live="polite" aria-atomic="true">
  Found 5 results for "accessibility"
</div>

<!-- Progress -->
<div role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">
  60% complete
</div>
```

---

## Summary: WCAG 2.2 New Criteria

Nine new success criteria added in WCAG 2.2:

**Level A:**
- 2.4.11 Focus Not Obscured (Minimum) - Focus not entirely hidden
- 2.5.7 Dragging Movements - MOVED TO AA (listed under AA above)
- 3.2.6 Consistent Help - Help in same order across pages
- 3.3.7 Redundant Entry - Don't make users re-enter information

**Level AA:**
- 2.4.12 Focus Not Obscured (Enhanced) - Focus not even partially hidden
- 2.5.7 Dragging Movements - Single-pointer alternative to dragging
- 3.3.8 Accessible Authentication (Minimum) - Password managers work, no cognitive tests
- 2.5.5 Target Size (Minimum) - 24×24 pixels minimum

**Level AAA:**
- 2.4.13 Focus Appearance - High visibility focus indicator
- 2.5.8 Target Size (Enhanced) - 44×44 pixels (was 2.5.5 in 2.1)
- 3.3.9 Accessible Authentication (Enhanced) - No cognitive tests at all

---

## Quick Reference: Most Common Failures

Based on automated and manual audits, these are the most frequently failed AA criteria:

1. **1.4.3 Contrast (Minimum)** - Insufficient color contrast
2. **2.4.7 Focus Visible** - Missing or invisible focus indicators
3. **1.1.1 Non-text Content** - Missing alt text
4. **3.3.2 Labels or Instructions** - Missing form labels
5. **1.4.11 Non-text Contrast** - UI component contrast too low
6. **2.5.5 Target Size (Minimum)** - Interactive targets too small
7. **1.4.10 Reflow** - Horizontal scrolling at 320px width
8. **3.3.8 Accessible Authentication** - Password paste blocked
9. **1.3.1 Info and Relationships** - Non-semantic HTML
10. **2.5.7 Dragging Movements** - No alternative to drag-and-drop

Focus automated and manual testing on these criteria for maximum impact.

---

**Reference:** [WCAG 2.2 Official Documentation](https://www.w3.org/WAI/WCAG22/quickref/)

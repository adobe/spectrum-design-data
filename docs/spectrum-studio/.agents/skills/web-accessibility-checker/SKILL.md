---
name: web-accessibility-checker
description: Review websites for accessibility compliance with WCAG 2.2 Level AA and EU EAA requirements. Use when user asks to check, audit, review, or assess website accessibility, WCAG compliance, or EU accessibility standards. Identifies violations, provides remediation guidance, and generates compliance reports.
---

# Web Accessibility Checker Skill

## Quick Start

The European Accessibility Act (EAA) requires WCAG 2.2 Level AA compliance for organizations doing business in the EU (10+ employees, €2M+ revenue). This skill helps you audit websites for compliance through a three-step process:

1. **Automated scan** - Run mechanical checks for common issues
2. **Manual checks** - Test keyboard navigation, screen readers, and UX patterns
3. **Report generation** - Create structured compliance reports

**Important:** Automated tools catch only ~30-40% of accessibility issues. Manual testing is essential for true compliance.

## Testing Workflow

### Step 1: Automated Testing

Run the automated checker to identify mechanical violations:

```bash
python scripts/automated_checks.py <target-url>
```

The script checks for:
- Color contrast ratios (WCAG 2.2 SC 1.4.3, 1.4.11)
- Missing alt text (SC 1.1.1)
- Form labels (SC 3.3.2)
- Heading hierarchy (SC 1.3.1, 2.4.6)
- ARIA attributes (SC 4.1.2)
- Keyboard navigation issues (SC 2.1.1)
- Link text quality (SC 2.4.4)
- HTML validation (SC 4.1.1)

**Output:** JSON file with violations categorized by WCAG level (A, AA, AAA) and success criterion.

**Note:** Focus on Level A and AA violations. AAA is beyond EAA requirements and often not achievable for all content.

### Step 2: Manual Testing

Automated tools miss 60-70% of issues. Perform these critical manual checks:

**Keyboard Navigation (15-20 minutes):**
1. Tab through all interactive elements (links, buttons, form fields)
2. Verify focus indicators are clearly visible (SC 2.4.7)
3. Check for logical tab order (SC 2.4.3)
4. Ensure no keyboard traps (SC 2.1.2)
5. Test skip links work (SC 2.4.1)

**Visual Testing:**
1. Disable CSS and verify logical reading order (SC 1.3.2)
2. Zoom to 200% - check text reflows without horizontal scrolling (SC 1.4.4, 1.4.10)
3. Zoom to 400% - verify no content is clipped or hidden (SC 1.4.10)
4. Spot-check color contrast for edge cases like hover states (SC 1.4.3)

**Form Testing:**
1. Trigger validation errors - verify messages are clear and programmatically associated (SC 3.3.1, 3.3.3)
2. Check form instructions appear before fields (SC 3.3.2)
3. Verify autocomplete works for common fields (SC 1.3.5, 3.3.7)
4. Test password managers can fill authentication forms (SC 3.3.8)

**Interactive Component Testing:**
1. Verify UI components have 3:1 contrast with adjacent colors (SC 1.4.11)
2. Check interactive targets are at least 24×24 CSS pixels (SC 2.5.5)
3. For drag operations, verify single-pointer alternatives exist (SC 2.5.7)
4. Test hover/focus content is hoverable, dismissible, and persistent (SC 1.4.13)

**Screen Reader Spot Check (if time permits):**
1. Test with NVDA (Windows), JAWS (Windows), or VoiceOver (macOS)
2. Verify page landmarks are announced (SC 1.3.1)
3. Check form errors are read aloud (SC 3.3.1)
4. Verify image alt text is meaningful (SC 1.1.1)

For complete manual testing procedures, reference `references/manual-testing-checklist.md`.

### Step 3: Report Generation

Generate a structured compliance report:

```bash
python scripts/generate_report.py violations.json
```

The report includes:
- **Executive summary** - Pass/fail counts by level (A, AA, AAA)
- **Violations by POUR principle** - Grouped thematically, not by page location
- **Detailed findings** - Each violation shows:
  - Success criterion number (e.g., "WCAG 2.2 SC 1.4.3")
  - Severity (Critical, High, Medium, Low)
  - Location (URL, selector, line number)
  - Description (what's wrong)
  - Remediation steps (how to fix it)
  - Link to WCAG documentation
- **Testing methodology** - Tools used, pages tested, date
- **Next steps** - Prioritized remediation recommendations

## The Four POUR Principles

WCAG 2.2 is organized around four principles that make content accessible:

### Perceivable
Information and UI components must be presentable to users in ways they can perceive. This includes text alternatives for non-text content, captions for audio/video, adaptable content that can be presented in different ways, and content that's distinguishable (sufficient color contrast, resizable text, no information conveyed by color alone).

### Operable
UI components and navigation must be operable. Content must be keyboard accessible, users need enough time to read and interact, nothing should cause seizures, navigation must be clear and consistent, and multiple input modalities should be supported (mouse, keyboard, touch, voice).

### Understandable
Information and UI operation must be understandable. Text must be readable, pages must behave in predictable ways, and users should get help with input errors (clear labels, error messages, suggestions).

### Robust
Content must be robust enough to work with current and future assistive technologies. This primarily means valid HTML, proper ARIA usage, and compatibility with screen readers and other assistive technologies.

For detailed success criteria under each principle, reference `references/wcag-22-criteria.md`.

## Critical Level AA Requirements

These are the most commonly failed AA criteria that audits must catch:

**WCAG 2.1 AA Criteria (still required in 2.2):**

- **1.4.3 Contrast (Minimum):** Text must have 4.5:1 contrast ratio (3:1 for large text ≥18pt or ≥14pt bold). Don't just report "insufficient contrast" - specify actual ratio and required ratio. Example: "Text '#666' on '#fff' has 3.2:1 contrast, needs 4.5:1"

- **1.4.10 Reflow:** Content reflows without horizontal scrolling at 320px width (equivalent to 400% zoom). No 2D scrolling required to read content.

- **1.4.11 Non-text Contrast:** UI components and graphical objects must have 3:1 contrast with adjacent colors. This includes form field borders, button outlines, focus indicators, chart elements.

- **1.4.12 Text Spacing:** Content must support user text spacing adjustments (line height 1.5×, paragraph spacing 2×, letter spacing 0.12×, word spacing 0.16×) without loss of content or functionality.

- **1.4.13 Content on Hover or Focus:** If hovering or focusing triggers additional content (tooltips, dropdowns), it must be:
  - Hoverable (pointer can move to the revealed content)
  - Dismissible (can close without moving focus, usually Escape key)
  - Persistent (stays visible until user dismisses or focus moves)

- **2.4.7 Focus Visible:** Keyboard focus indicators must be clearly visible for all interactive elements. Default browser focus styles are acceptable but custom focus styles must have 3:1 contrast.

**New WCAG 2.2 AA Criteria (added October 2023):**

- **2.5.5 Target Size (Minimum):** Interactive targets must be at least 24×24 CSS pixels, with exceptions for inline links, user-controlled sizes, and essential spacing. This is less strict than AAA's 44×44 requirement.

- **2.5.7 Dragging Movements:** If functionality uses dragging (sliders, sortable lists, drawing), provide a single-pointer alternative (buttons, keyboard controls). Exception: dragging is essential (signature drawing).

- **2.5.8 Target Size (Enhanced) [AAA, not required]:** 44×44 CSS pixels. Mention only if user specifically asks about AAA.

- **3.2.6 Consistent Help:** If help mechanisms appear on multiple pages (contact links, chatbots, phone numbers), they must appear in the same relative order. Helps users with cognitive disabilities.

- **3.3.7 Redundant Entry:** Information previously entered in the same process should be auto-populated or available to select. Examples: shipping address pre-filled in billing, previous search terms available. Exceptions: re-entry is essential (password confirmation) or security-required.

- **3.3.8 Accessible Authentication (Minimum):** Don't require cognitive function tests for authentication. Password managers must work, or provide alternatives like:
  - Email/SMS magic links
  - Biometric authentication
  - Copy-paste support for passwords
  - Object recognition (not text entry or puzzles)

**Common Mistakes:**
- Invisible focus indicators or focus indicators with <3:1 contrast
- Buttons/links smaller than 24×24 pixels on mobile
- Form fields requiring re-entry of email or phone (violates 3.3.7)
- Password fields that block paste (violates 3.3.8)
- Help links in footer on page 1 but header on page 2 (violates 3.2.6)

## Report Format

Structure all accessibility reports consistently:

```markdown
# Accessibility Audit Report

**Website:** [URL]
**Date:** [ISO date]
**Auditor:** [Name/Tool]

## Executive Summary

- **Total issues:** 47 (12 critical, 23 high, 8 medium, 4 low)
- **Level A compliance:** FAIL (8 issues)
- **Level AA compliance:** FAIL (39 issues)
- **Overall EAA compliance:** FAIL

**Verdict:** This website does not meet WCAG 2.2 Level AA requirements and is not EAA-compliant.

## Violations by Principle

### Perceivable (18 issues)

#### SC 1.1.1 Non-text Content (Level A) - CRITICAL
**Issue:** 12 images missing alt text
**Location:**
- `/products` - 8 product images (`.product-card img`)
- `/about` - 4 team photos (`.team-member img`)

**Impact:** Screen reader users cannot understand image content.

**Remediation:**
```html
<!-- Before -->
<img src="product.jpg">

<!-- After -->
<img src="product.jpg" alt="Blue ceramic coffee mug with white handle">
```

For decorative images, use `alt=""` not omit the attribute entirely.

**Reference:** [WCAG 2.2 SC 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)

---

#### SC 1.4.3 Contrast (Minimum) (Level AA) - HIGH
**Issue:** Link text has insufficient contrast
**Location:** `/homepage` - Footer links
**Measured contrast:** 3.1:1 (text #7A7A7A on #FFFFFF)
**Required contrast:** 4.5:1

**Impact:** Users with low vision or color blindness cannot read links.

**Remediation:**
```css
/* Before */
footer a { color: #7A7A7A; }

/* After - darkened to meet 4.5:1 */
footer a { color: #595959; }
```

Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify.

**Reference:** [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

---

[Continue for all Perceivable violations...]

### Operable (15 issues)

[List violations: keyboard access, focus visible, target size, dragging alternatives, etc.]

### Understandable (10 issues)

[List violations: form labels, error messages, consistent help, redundant entry, authentication]

### Robust (4 issues)

[List violations: HTML validation, ARIA usage, name-role-value]

## Testing Methodology

**Automated Testing:**
- Tool: axe-core 4.8.0 via Selenium
- Pages tested: 15 (all main user journeys)
- Date: 2025-10-23

**Manual Testing:**
- Keyboard navigation: Full audit of homepage, product listing, checkout
- Screen reader: Spot checks with NVDA on Windows
- Zoom testing: All pages tested at 200% and 400%
- Form testing: Contact form, login, checkout flow

**Standards:**
- WCAG 2.2 Level AA
- EN 301 549 (European standard)
- European Accessibility Act (EAA) requirements

## Next Steps (Prioritized)

### Phase 1: Critical Issues (1-2 weeks)
1. Add alt text to all images (SC 1.1.1) - 12 issues
2. Fix color contrast on links and buttons (SC 1.4.3) - 8 issues
3. Add visible focus indicators (SC 2.4.7) - 6 issues

### Phase 2: High Priority (2-4 weeks)
4. Add form labels and error messages (SC 3.3.2, 3.3.1) - 15 issues
5. Increase button/link target sizes to 24×24px (SC 2.5.5) - 9 issues
6. Fix heading hierarchy (SC 1.3.1) - 5 issues

### Phase 3: Medium Priority (1-2 months)
7. Implement reflow for mobile (SC 1.4.10) - 4 issues
8. Add keyboard alternatives to drag operations (SC 2.5.7) - 2 issues
9. Enable autocomplete on forms (SC 3.3.7) - 3 issues

### Phase 4: Polish (Ongoing)
10. Fix HTML validation errors (SC 4.1.1) - 4 issues
11. Review ARIA usage (SC 4.1.2) - 3 issues

**Estimated total remediation time:** 8-12 weeks with 1 FTE developer

**Recommended re-audit:** After Phase 2 completion (approximately 6 weeks)
```

## Important Notes

1. **Automated tools are incomplete:** Automated scanners catch 30-40% of issues. Manual testing is required for EAA compliance. Don't rely solely on scripts.

2. **Focus on A and AA:** Level AAA is optional and often unachievable for all content types (e.g., AAA contrast requires 7:1 ratio, difficult for branded colors). EAA requires only Level AA.

3. **WCAG 2.2, not 2.1:** The skill references WCAG 2.2 (published October 2023), which includes 9 new success criteria. Ensure audits check 2.2 requirements, not just 2.1.

4. **EAA deadline is June 28, 2025:** Organizations need time to remediate. If auditing in 2025, emphasize urgency.

5. **Microenterprises are exempt:** Companies with <10 employees AND <€2M revenue are exempt from EAA. All others doing business in EU must comply.

6. **When in doubt, reference detailed guidance:** If you're unsure how to test a criterion or what counts as a violation, load the detailed WCAG criteria reference before making a determination.

7. **Be specific in error reports:** Don't say "contrast insufficient." Say "Text '#666' on '#fff' has 3.2:1 contrast, needs 4.5:1 (WCAG 2.2 SC 1.4.3)." Include actual values and remediation code examples.

8. **Prioritize by impact, not by count:** 1 broken keyboard navigation issue (affects 15% of users completely) is more critical than 20 missing alt texts on decorative images.

## When to Use References

Load reference documentation on-demand to avoid unnecessary token usage:

**Load `references/wcag-22-criteria.md` when:**
- User asks about a specific success criterion (e.g., "What is SC 2.5.5?")
- You need detailed testing procedures for a criterion
- You need clarification on what counts as a pass/fail
- You're unsure which WCAG level a requirement belongs to
- User asks for complete WCAG 2.2 criteria list

**Load `references/manual-testing-checklist.md` when:**
- Performing or explaining manual accessibility testing
- User asks "how do I test keyboard navigation?"
- User needs screen reader testing guidance
- You need step-by-step testing workflows

**Load `references/eaa-requirements.md` when:**
- User asks about EU compliance or European Accessibility Act
- User asks about deadlines (June 28, 2025)
- User asks who must comply with EAA
- User asks about penalties for non-compliance
- User asks about relationship between EAA, EN 301 549, and WCAG

## Typical User Interactions

**Example 1: Quick audit request**
```
User: "Check https://example.com for accessibility issues"
Assistant:
1. Run automated_checks.py on the URL
2. Perform quick keyboard tab test and zoom check
3. Generate report with violations grouped by POUR principle
4. Summarize critical issues and recommended next steps
```

**Example 2: Specific criterion question**
```
User: "Does this site meet SC 1.4.3?"
Assistant:
1. Load references/wcag-22-criteria.md to get SC 1.4.3 details
2. Run contrast checker on the provided URL
3. Report specific contrast ratios for text elements
4. Provide pass/fail verdict with evidence
```

**Example 3: EAA compliance question**
```
User: "Do we need to comply with EAA? We're a UK company."
Assistant:
1. Load references/eaa-requirements.md
2. Ask about employee count and revenue
3. Ask if they do business in EU (sell to EU customers, have EU users)
4. Provide compliance determination and deadline
```

**Example 4: Manual testing guidance**
```
User: "How do I test keyboard navigation?"
Assistant:
1. Load references/manual-testing-checklist.md
2. Provide step-by-step keyboard testing workflow
3. Explain what to look for (focus indicators, tab order, traps)
4. Suggest testing tools if helpful
```

## Success Criteria

The skill is working correctly if:

1. ✅ Automated checks return violations with success criterion numbers and severity
2. ✅ Reports are grouped by POUR principle, not just page location
3. ✅ Each violation includes specific remediation steps with code examples
4. ✅ Reports distinguish between Level A, AA, and AAA (focusing on A/AA)
5. ✅ Manual testing checklist covers keyboard, zoom, screen reader, forms
6. ✅ EAA context is provided (who must comply, deadlines, relationship to WCAG)
7. ✅ References are loaded on-demand, not preemptively
8. ✅ Error messages are specific: "Text '#666' on '#fff' has 3.2:1, needs 4.5:1" not "fix contrast"

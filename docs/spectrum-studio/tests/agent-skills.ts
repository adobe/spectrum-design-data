// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import {
  COLOR_SKILL_NAME,
  INDEX_SKILL_NAME,
  type GeneratedSkill,
} from "../src/features/design-data/agentSkills";
import {
  agentSkillsArchive,
  agentSkillsAtom,
  generateAgentSkills,
  skillSystemFromSnapshot,
} from "../src/features/design-data/agentSkillsState";
import { crc32 } from "../src/features/design-data/zipArchive";
import {
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../src/features/edit-session/state";
import {
  INTERACTION_COLORS_RULE_ID,
  type ConditionalRule,
} from "../src/features/logic/model";
import { availableSwitcherView } from "../src/state/view/viewSwitcher";
import { editModeAtom } from "../src/state/view/editMode";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { setTermDescriptionAtom } from "../src/features/taxonomy/editing";

type Snapshot = ReturnType<typeof createDefaultSnapshot>;
function roleTerm(snapshot: Snapshot, value: string) {
  const roleTermIds = new Set(
    snapshot.styles!.colorRoles.map((role) => role.roleTermId),
  );
  const term = snapshot.taxonomy!.terms.find(
    (item) => item.value === value && roleTermIds.has(item.id),
  );
  assert.ok(term, `missing role term ${value}`);
  return term;
}

const generate = (snapshot = createDefaultSnapshot()) =>
  generateAgentSkills(skillSystemFromSnapshot(snapshot));
const color = (skills: GeneratedSkill[]) =>
  skills.find((skill) => skill.name === COLOR_SKILL_NAME)!;
function section(markdown: string, heading: string) {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const end = markdown.indexOf("\n## ", start + 1);
  return markdown.slice(start, end === -1 ? undefined : end);
}
function interactionRule(snapshot: Snapshot) {
  return snapshot.rules!.find(
    (rule) => rule.id === INTERACTION_COLORS_RULE_ID,
  ) as ConditionalRule;
}

// Determinism and file layout.
const baseline = generate();
assert.deepEqual(
  baseline.map((skill) => skill.path),
  [`${INDEX_SKILL_NAME}/SKILL.md`, `${COLOR_SKILL_NAME}/SKILL.md`],
);
assert.deepEqual(generate(), baseline);
const colorSkill = color(baseline);
assert.match(
  colorSkill.markdown,
  /^---\nname: spectrum-color\ndescription: "[^"\n]+"\nmetadata:\n {2}generator: spectrum-studio\n {2}generator-version: "1"\n {2}fingerprint: [0-9a-f]{16}\n---\n\n# Spectrum color\n/,
);
assert.ok(colorSkill.markdown.endsWith("\n"));
assert.doesNotMatch(colorSkill.markdown, /\b20\d\d-\d\d-\d\d\b/);
for (const heading of [
  "Purpose",
  "How color steps work",
  "Choosing a color",
  "Color roles",
  "Interaction states",
  "Modes and user settings",
  "Don't",
  "Looking up values",
])
  section(colorSkill.markdown, heading);

// The eval package's sample skill is the real output for the shipped defaults.
const sample = readFileSync(
  new URL(
    "../../../tools/design-data-mcp-eval/skills/spectrum-color/SKILL.md",
    import.meta.url,
  ),
  "utf8",
);
if (sample !== colorSkill.markdown) {
  console.log(`CURRENT_SKILL_START\n${colorSkill.markdown}CURRENT_SKILL_END`);
  assert.fail(
    "tools/design-data-mcp-eval/skills/spectrum-color/SKILL.md is out of date; replace it with the output above.",
  );
}
assert.match(
  section(colorSkill.markdown, "Color roles"),
  /\*\*Accent\*\*: .+ Uses the .+ scale, steps [\d, ]+\. Token names follow `accent-\{step\}`\./,
);
assert.match(
  section(colorSkill.markdown, "Interaction states"),
  /When Color scheme is Dark, the state token moves 1 step lower than the resting token, on the same scale\./,
);
assert.match(
  section(colorSkill.markdown, "Interaction states"),
  /Creates state tokens for: Hover, Focus\./,
);
assert.match(
  section(colorSkill.markdown, "Modes and user settings"),
  /\*\*Color scheme\*\*: .+ Options: Light \(default\), Dark/,
);
const index = baseline[0];
assert.match(
  index.markdown,
  /\[spectrum-color\]\(\.\.\/spectrum-color\/SKILL\.md\): Choose Spectrum color tokens/,
);

// Skills are about intent: no color values, units or tool-specific language.
// Contrast ratios are allowed because they decide how a step can be used.
for (const skill of baseline) {
  assert.doesNotMatch(skill.markdown, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(skill.markdown, /\d+(?:\.\d+)?\s*(?:px|rem|%)/i);
  assert.doesNotMatch(
    skill.markdown,
    /\b(?:code|css|figma|html|react|hex|px|rgb|oklch)\b/i,
  );
}

// Authored order of independent lists doesn't change the output.
const reordered = createDefaultSnapshot();
reordered.styles!.colorRoles.reverse();
reordered.rules!.reverse();
assert.deepEqual(generate(reordered), baseline);

// Changing a rule changes only the states guidance.
const offset = createDefaultSnapshot();
interactionRule(offset).branches[0].then.offset = -2;
const offsetSkill = color(generate(offset));
assert.notEqual(offsetSkill.fingerprint, colorSkill.fingerprint);
assert.match(
  section(offsetSkill.markdown, "Interaction states"),
  /moves 2 steps lower/,
);
for (const heading of ["Color roles", "Modes and user settings"])
  assert.equal(
    section(offsetSkill.markdown, heading),
    section(colorSkill.markdown, heading),
  );

// Re-pointing a role changes only that role's guidance.
const rescaled = createDefaultSnapshot();
const accentTermId = roleTerm(rescaled, "accent").id;
const accent = rescaled.styles!.colorRoles.find(
  (role) => role.roleTermId === accentTermId,
)!;
const gray = rescaled.colorSystem.scales.find(
  (scale) => scale.id === "scale-gray",
)!;
accent.scaleId = gray.id;
const rescaledSkill = color(generate(rescaled));
const roleLine = (markdown: string, role: string) =>
  section(markdown, "Color roles")
    .split("\n")
    .find((line) => line.startsWith(`- **${role}**`));
assert.match(
  roleLine(rescaledSkill.markdown, "Accent")!,
  new RegExp(`Uses the ${gray.name} scale`),
);
assert.equal(
  roleLine(rescaledSkill.markdown, "Positive"),
  roleLine(colorSkill.markdown, "Positive"),
);
assert.equal(
  section(rescaledSkill.markdown, "Interaction states"),
  section(colorSkill.markdown, "Interaction states"),
);

// Missing intent is reported, never invented; authored intent is used.
const undescribed = createDefaultSnapshot();
roleTerm(undescribed, "positive").description = "";
assert.ok(
  color(generate(undescribed)).diagnostics.some(
    (diagnostic) => diagnostic.subject === "Color role “Positive”",
  ),
);
const described = createDefaultSnapshot();
const positiveTerm = roleTerm(described, "positive");
positiveTerm.description = "Success and completed actions";
described.taxonomy!.categories.find(
  (category) => category.id === positiveTerm.categoryId,
)!.description = "This category needs addressed";
const describedSkill = color(generate(described));
assert.match(
  roleLine(describedSkill.markdown, "Positive")!,
  /^- \*\*Positive\*\*: Success and completed actions\. Uses/,
);
assert.ok(
  !describedSkill.diagnostics.some(
    (diagnostic) => diagnostic.subject === "Color role “Positive”",
  ),
);
assert.doesNotMatch(describedSkill.markdown, /needs addressed/i);
assert.ok(
  describedSkill.diagnostics.some(
    (diagnostic) => diagnostic.subject === "Registry category “Color role”",
  ),
);
for (const diagnostic of colorSkill.diagnostics)
  assert.ok(diagnostic.message && diagnostic.fix, diagnostic.subject);

// A promise about step order is only made when the data supports it.
assert.match(colorSkill.markdown, /A higher step means more contrast/);
const unordered = createDefaultSnapshot();
const contrasts = unordered.colorSystem.contrasts;
[contrasts[0].value, contrasts[1].value] = [
  contrasts[1].value,
  contrasts[0].value,
];
for (const scale of unordered.colorSystem.scales) delete scale.customContrasts;
const unorderedSkill = color(generate(unordered));
assert.doesNotMatch(
  unorderedSkill.markdown,
  /A higher step means more contrast/,
);
assert.ok(
  unorderedSkill.diagnostics.some((diagnostic) =>
    diagnostic.message.startsWith("A higher step does not always"),
  ),
);

// Contrast guidance follows the step ratios, names exceptions and holds in every mode.
section(colorSkill.markdown, "Contrast and use");
function setContrasts(
  snapshot: Snapshot,
  value: number,
  { shared = true, gray = true } = {},
) {
  if (shared)
    for (const step of snapshot.colorSystem.contrasts) {
      step.value = value;
      delete step.oppositeValue;
    }
  for (const scale of snapshot.colorSystem.scales)
    if (gray || scale.id !== "scale-gray")
      for (const step of scale.customContrasts?.steps ?? []) {
        step.value = value;
        delete step.oppositeValue;
      }
  snapshot.colorSystem.settings.polarityCompensation = 0;
}
const stepLine = (markdown: string, index: number) =>
  section(markdown, "Contrast by step")
    .split("\n")
    .find((line) => line.startsWith(`- **${index}** on `));
const allText = createDefaultSnapshot();
setContrasts(allText, 5);
const allTextSkill = color(generate(allText)).markdown;
assert.equal(
  stepLine(allTextSkill, 600),
  "- **600** on every scale: safe for text (lowest 5:1).",
);
assert.match(
  section(allTextSkill, "Contrast by step"),
  /Step 25 and higher is safe for text on every scale\./,
);
const allDecorative = createDefaultSnapshot();
setContrasts(allDecorative, 2);
assert.equal(
  stepLine(color(generate(allDecorative)).markdown, 600),
  "- **600** on every scale: for decoration or exempt uses only (lowest 2:1).",
);
const grayException = createDefaultSnapshot();
setContrasts(grayException, 5);
setContrasts(grayException, 3.84, { shared: false });
const grayName = grayException.colorSystem.scales.find(
  (scale) => scale.id === "scale-gray",
)!.name;
assert.equal(
  stepLine(color(generate(grayException)).markdown, 600),
  `- **600** on every scale except ${grayName}: safe for text (lowest 5:1). \`${grayName}-600\`: for interface elements and graphics, not body text (lowest 3.8:1).`,
);
const lowered = createDefaultSnapshot();
setContrasts(lowered, 5);
for (const set of lowered.modeSets)
  for (const mode of set.modes)
    if (mode.foundations.color?.contrastMultiplier !== undefined)
      mode.foundations.color.contrastMultiplier = 0.5;
assert.equal(
  stepLine(color(generate(lowered)).markdown, 600),
  "- **600** on every scale: for interface elements and graphics, not body text (lowest 3:1).",
);

// The Styles description field edits the role's Registry term.
const editing = createStore();
editing.set(editModeAtom, true);
const termsBefore = editing.get(taxonomyDocumentAtom).terms;
const notice = termsBefore.find(
  (term) => term.id === roleTerm(createDefaultSnapshot(), "notice").id,
)!;
editing.set(setTermDescriptionAtom, {
  termId: notice.id,
  description: "Warnings that need attention",
});
const termsAfter = editing.get(taxonomyDocumentAtom).terms;
assert.equal(
  termsAfter.find((term) => term.id === notice.id)!.description,
  "Warnings that need attention",
);
assert.deepEqual(
  termsAfter.filter((term) => term.id !== notice.id),
  termsBefore.filter((term) => term.id !== notice.id),
);
const unchanged = editing.get(taxonomyDocumentAtom);
editing.set(setTermDescriptionAtom, {
  termId: notice.id,
  description: "Warnings that need attention",
});
assert.equal(editing.get(taxonomyDocumentAtom), unchanged);
assert.throws(() =>
  editing.set(setTermDescriptionAtom, { termId: "missing", description: "" }),
);

// Skills describe the saved baseline, not unsaved edits.
const store = createStore();
assert.deepEqual(store.get(agentSkillsAtom), baseline);
store.set(editSessionSnapshotAtom, offset);
assert.equal(
  color(store.get(agentSkillsAtom)).fingerprint,
  offsetSkill.fingerprint,
);

// The download is a valid stored zip with one SKILL.md per skill.
assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
const archive = agentSkillsArchive(baseline);
assert.deepEqual(agentSkillsArchive(baseline), archive);
const view = new DataView(archive.buffer);
const endOffset = archive.length - 22;
assert.equal(view.getUint32(endOffset, true), 0x06054b50);
assert.equal(view.getUint16(endOffset + 10, true), baseline.length);
let central = view.getUint32(endOffset + 16, true);
const decoder = new TextDecoder();
for (const skill of baseline) {
  assert.equal(view.getUint32(central, true), 0x02014b50);
  const nameLength = view.getUint16(central + 28, true);
  const local = view.getUint32(central + 42, true);
  assert.equal(
    decoder.decode(archive.subarray(central + 46, central + 46 + nameLength)),
    skill.path,
  );
  const size = view.getUint32(local + 18, true);
  const data = archive.subarray(
    local + 30 + nameLength,
    local + 30 + nameLength + size,
  );
  assert.equal(decoder.decode(data), skill.markdown);
  assert.equal(view.getUint32(local + 14, true), crc32(data));
  central += 46 + nameLength;
}

// The Skills view is only offered where a page supplies it.
assert.equal(availableSwitcherView("skills", true), "skills");
assert.equal(availableSwitcherView("skills", false), "elements");
assert.equal(availableSwitcherView("code", false), "code");

console.log(
  `agent skills: ${baseline.length} skills, ${colorSkill.diagnostics.length} color diagnostics`,
);

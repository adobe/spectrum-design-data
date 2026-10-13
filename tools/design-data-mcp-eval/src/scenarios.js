// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
const content = "https://spectrum.adobe.com/content/";
const layout = "https://spectrum.adobe.com/foundations/layout-and-structure/";
const type = "https://spectrum.adobe.com/foundations/typography/";
const button = "https://spectrum.adobe.com/components/button";
const guideline = (id, url, facts) => ({
  tool: "design-data-guideline",
  arguments: { id },
  source: url,
  facts,
});
const component = (facts) => ({
  tool: "design-data-component",
  arguments: { id: "button" },
  facts,
});

export const scenarios = [
  {
    id: "error-recovery",
    question:
      'Critique "Oops! Something broke." for a failed upload. Do not invent its cause. What should the message explain?',
    grounding: [
      guideline("writing-for-errors", `${content}writing-for-errors`, [
        "what happened",
        "what the cause",
        "resolve it",
      ]),
    ],
    answerFacts: [
      "what (happened|went wrong)",
      "(cause|reason)",
      "(recover|resolv|retry|try again|next step)",
    ],
    forbiddenClaims: ["the upload failed because your (internet|network)"],
    citations: [`${content}writing-for-errors`],
    review:
      "Explains missing cause/recovery context without inventing a diagnosis; gives actionable copy only where supported.",
  },
  {
    id: "avoid-unnecessary-errors",
    question:
      "Should I let someone submit an empty required description and then show an error? Explain Spectrum guidance.",
    grounding: [
      guideline("writing-for-errors", `${content}writing-for-errors`, [
        "avoid showing a message whenever possible",
        "disabled states",
      ]),
    ],
    answerFacts: ["(prevent|avoid)", "(disabled|validation)"],
    citations: [`${content}writing-for-errors`],
    review:
      "Applies prevention guidance appropriately rather than claiming every form must disable submission.",
  },
  {
    id: "empathetic-error-tone",
    question:
      "A save operation failed and the user may have lost work. How should our tone change? Cite guidance; do not assume the work is recoverable.",
    grounding: [
      guideline("voice-and-tone", `${content}voice-and-tone`, [
        "acknowledge and account",
        "concerned and empathetic",
      ]),
    ],
    answerFacts: ["(empathetic|empathy)", "(support|reassur)"],
    forbiddenClaims: ["your work (is|has been) (safe|saved|recovered)"],
    citations: [`${content}voice-and-tone`],
    review: "Acknowledges emotions without unsupported promises.",
  },
  {
    id: "concise-voice",
    question:
      'Review this UI copy: "Embark on an incredible creative journey by initiating your export!" What changes fit Spectrum voice?',
    grounding: [
      guideline("voice-and-tone", `${content}voice-and-tone`, [
        "concise and simple",
        "unnecessary decoration",
      ]),
    ],
    answerFacts: ["(concise|simple|brief)", "export"],
    citations: [`${content}voice-and-tone`],
    review:
      "Provides a usable shorter alternative; does not confuse stable voice principles with context-sensitive tone.",
  },
  {
    id: "container-emphasis",
    question:
      "Should every card in a product comparison use a drop shadow? Explain container emphasis.",
    grounding: [
      guideline("containers", `${layout}containers`, [
        "emphasized containers should be used sparingly",
      ]),
    ],
    answerFacts: ["(sparingly|selectiv|restraint)", "(shadow|emphas)"],
    citations: [`${layout}containers`],
    review:
      "Uses emphasis selectively without inventing a universal shadow token.",
  },
  {
    id: "container-separation",
    question:
      "What documented choices separate containers without using a drop shadow?",
    grounding: [
      guideline("containers", `${layout}containers`, [
        "background color",
        "without a fill",
        "spacing",
      ]),
    ],
    answerFacts: ["background", "border", "spacing", "(without|no) (a )?fill"],
    citations: [`${layout}containers`],
    review:
      "Preserves border-without-fill guidance and distinguishes spacing from a visible border.",
  },
  {
    id: "heading-weight-exception",
    question:
      "Which is the usual heaviest heading weight, and can Adobe Express use Black? Include legibility restrictions.",
    grounding: [
      guideline("typography-system", `${type}typography-system`, [
        "recommends extrabold",
        "product-specific branding",
        "18 px or larger",
      ]),
    ],
    answerFacts: [
      "extra\\s?bold",
      "black",
      "(heading|branding)",
      "18\\s*(px|pixels)",
    ],
    forbiddenClaims: ["black (is|must be) always forbidden"],
    citations: [`${type}typography-system`],
    review:
      "Black is a limited branding exception reserved for heading styles at 18px or larger, not the general default.",
  },
  {
    id: "typography-underline",
    question:
      "Can I underline a warning sentence just for emphasis? What does Spectrum recommend?",
    grounding: [
      guideline("typography-system", `${type}typography-system`, [
        "underline is used only for text links",
        "never be used as a mechanism for adding emphasis",
      ]),
    ],
    answerFacts: ["(link|links)", "(not|never|avoid)"],
    citations: [`${type}typography-system`],
    review:
      "Rejects underline-as-emphasis; distinguishes semantic emphasis from arbitrary styling.",
  },
  {
    id: "button-pending-delay",
    question:
      "When should a submit button show pending feedback? What happens to extra clicks during the delay?",
    grounding: [
      component([
        "delay of 1 second",
        "additional clicks do not result in repeated submissions",
      ]),
    ],
    answerFacts: [
      "(1|one)\\s*(second|s\\b)",
      "(repeat|duplicate|additional clicks)",
    ],
    citations: [button],
    review:
      "Keeps the one-second delay and prevents repeated submissions during it.",
  },
  {
    id: "button-long-progress",
    question:
      "A determinate export takes 30 seconds. Is button pending the right progress presentation?",
    grounding: [
      component([
        "5 seconds or less",
        "progress bar or progress circle outside of the button",
      ]),
    ],
    answerFacts: [
      "(5|five)\\s*seconds",
      "(outside|external)",
      "(progress bar|progress circle)",
    ],
    citations: [button],
    review:
      "Uses external progress for longer/determinate actions; preserves the short indeterminate pending restriction.",
  },
  {
    id: "unsupported-quantum-protocol",
    question:
      "What exact quantum-encryption key rotation protocol does Spectrum require? Cite its specification or explain the limitation.",
    grounding: [],
    expectAbstention: true,
    answerFacts: [
      "(not (documented|specified|available)|no (guidance|specification)|cannot|can.t|does not (specify|document)|doesn.t (specify|document))",
    ],
    forbiddenClaims: [
      "spectrum requires (aes|rsa|qkd|a \\d+|key rotation every)",
    ],
    citations: [],
    review:
      "Clearly reports lack of retrieved support. A missing invented slug is not proof that the whole corpus lacks semantic coverage.",
  },
  {
    id: "button-cursor-conflict",
    question:
      "Should every interactive Spectrum button use a pointer cursor, including native platforms? Check the button guidance for conflicts and do not silently choose one rule.",
    grounding: [
      component([
        "default arrow cursor",
        "href property",
        "pointer cursor for all interactive components",
      ]),
    ],
    answerFacts: [
      "(conflict|contradict|inconsisten|tension)",
      "(href|web)",
      "(arrow|default)",
    ],
    citations: [button],
    review:
      "Surfaces currently conflicting merged guidance and the web href exception. If the source is reconciled, review/update this scenario.",
  },
  {
    id: "container-token-lookup",
    question:
      "What spacing token is used for internal padding in the documented medium-card container example? Look up its canonical value; do not generalize that example to every card.",
    grounding: [
      guideline("containers", `${layout}containers`, [
        "spacing-300 for internal padding",
      ]),
      {
        tool: "design-data-query",
        arguments: { filter: "property=spacing" },
        facts: ['"value":"16px"', '"scaleindex":300'],
      },
    ],
    answerFacts: ["spacing-300", "16", "(example|medium)"],
    citations: [`${layout}containers`],
    review:
      "Actually queries spacing tokens and selects raw.name.scaleIndex=300; cites the card example and avoids a universal padding rule. Neither property-only resolve nor the query filter supports the legacy spacing-300 name or scaleIndex filtering.",
  },
];

export function normalize(text) {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

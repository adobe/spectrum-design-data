---
title: Writing for readability
category: designing
source_url: https://main--spectrum-hub--adobe.aem.live/content/language-and-inclusivity/writing-for-readability
last_updated: '2026-09-04'
status: published
tags:
  - writing
  - readability
  - plain language
  - localization
  - internationalization
  - UX writing
  - jargon
  - passive voice
  - active voice
  - dyslexia accessibility
  - Flesch-Kincaid
hub_path: /content/language-and-inclusivity/writing-for-readability
---

# Writing for readability

## Write for a 6th-grade reading level

Writing for a 6th-grade reading level on the Flesch-Kincaid readability scale includes more people, not just those with disabilities that affect comprehension. Write with short sentences. Avoid adverbs and adjectives. Use simple verb tenses (past, present, future) and active voice. The Hemingway app is a useful tool for checking readability; Adobe Design’s Content Strategy team also uses Readable. Preferred Avoid Why We exported the file. Now you can open it in Illustrator.This file has been exported successfully to be opened in one of our other awesome products, Adobe Illustrator. Sentence length: 2 sentences at 4 and 7 words vs. 1 sentence at 18 words. “Exported” is simple past tense. “Has been exported” is past perfect tense. “Can open” is active voice. “To be opened” is passive voice. “Successfully” is an unnecessary adverb. “Awesome” is an unnecessary adjective. Flesch-Kincaid grade level: 4.8 vs. 13.1 (Readability scores from Readable) People using screen readers can hear 25 syllables per second, while folks at a 6th-grade reading level can read 3 words per second. Use this to estimate the amount of time it would take someone to read a piece of text.

### Choose words consciously

Most common nouns and actions have synonyms that can add unnecessary complexity. Use words that would be at a 6th-grade reading level. Preferred Avoid BuyPurchaseHelpAssistAboutApproximatelyLikeSuch as

## Write universally

Imagine that you are having a friendly conversation with your audience to provide them with helpful information. Using jargon, internal-only, or corporate language in UX writing assumes that people outside of an organization know what it means — even when people internally may not even know what it means. Avoid internal language and jargon. If you have to use it, explain the point in clear language and provide in-line context on first reference. Avoid idioms, especially those with roots intended to belittle non-native English speakers, such as “long time no see.” Don’t rely on symbols or emoji since these rely on cultural references, making them inherently exclusive. Emoji also don’t translate well, so avoiding them will save you time and effort in having to write separate strings for localization.

### Avoid internal jargon without explaining what it means

Put yourself in the mindset of someone who's new to our products, and new to the industry where our products are used. Do they understand the jargon we use every day? Are we giving enough context for them to understand? Preferred Avoid Creative Cloud FilesCC FilesXD cloud documents, a new way to collaborate on any deviceIntroducing XD cloud docs!Please accept the Terms of Service before continuing.There was a RAISE without a handler.

### Avoid colloquial language and slang

Slang and colloquialisms don’t make sense to all generations. Avoid ageism by using plain, clear language. Preferred Avoid Select any that applyChoose whatever blows your hair backAgree to terms and conditionsIt be like that sometimesLearn moreGet the deetz

## Organize your writing for comprehension

Keep the following in mind when you’re writing, to help the greatest number of people understand what you write.

### Layout

Left-align running text (this will be mirrored along with the UI for right-to-left languages). Full justification of text creates text rivers, or alignment of spaces that creates running gaps through the text. This makes text especially difficult for readers with dyslexia. Avoid switching alignments in a single view. Have line lengths at a maximum of 50-75 characters. Use one column per page.

### Grammar and mechanics

Use sentence case. Sentence case is easier to read and is more natural and approachable. Never use all caps except for an acronym. Use camel case for hashtags to help screen readers parse the words correctly (e.g., “#CamelCase”).

### Interactions

Avoid “clear” and ”reset” actions on forms. Someone could select these by accident and erase a lot of painstaking work. Let people save forms so that they can leave and come back. Provide keywords before or inside links.

### Localization

Explain branded or technical terms before using them. When using an uncommon abbreviation or acronym, write out the full term on first use and follow it with the shortened version in parentheses. You can also use &#x3C;abbr> or &#x3C;acronym> in HTML. Avoid using homonyms (e.g., “bow before the king” vs. “put a bow on it”), or make their meaning clear via context.

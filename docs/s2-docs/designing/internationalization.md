---
title: Internationalization
category: designing
source_url: https://preview.spectrum.adobe.com/foundations/inclusivity/internationalization
last_updated: '2026-09-03'
status: published
tags:
  - international design
  - localization
  - text expansion
  - globalization
  - cultural differences
  - iconography
  - metaphors
  - user interface localization
hub_path: /foundations/inclusivity/internationalization
---

# Internationalization

## Introduction

There are roughly 200 countries and 6500 spoken languages in the world. Culture is deeply rooted in our thinking patterns, and it affects how users interact with and benefit from digital experiences. International design is a complex challenge that goes beyond translation. Acknowledging cultural characteristics and differences is the first step to create richer, world-ready digital experiences. Here, you'll find recommendations and guardrails for how to start creating user experiences that are scalable globally, and concepts to better understand how varied our user landscape is. Designing for a global audience is not an exact science, but by acknowledging the following issues, we take an important first step to develop more empathy towards our international users and build globally relevant user interfaces. For questions, feel free to reach out to the International Design team to collaborate and make our products equally effective in all regions. International Design Wiki

## Introduction

There are roughly 200 countries and 6500 spoken languages in the world. Culture is deeply rooted in our thinking patterns, and it affects how users interact with and benefit from digital experiences. International design is a complex challenge that goes beyond translation. Acknowledging cultural characteristics and differences is the first step to create richer, world-ready digital experiences. Here, you'll find recommendations and guardrails for how to start creating user experiences that are scalable globally, and concepts to better understand how varied our user landscape is. Designing for a global audience is not an exact science, but by acknowledging the following issues, we take an important first step to develop more empathy towards our international users and build globally relevant user interfaces.

## Localization and text expansion

One of the biggest challenges of designing for a global audience is to create interfaces that can efficiently adapt to different languages that have different writing and reading systems, different grammar rules, different typographic convention, and translating content leads to textual content that can differ drastically in length. When translating content to different languages, the length of the translated text is likely going to be very different — sometimes up to 300% longer than the original one. Text expansion is one of the main challenges of designing effective global user interfaces. IBM Globalization Guidelines reported an interesting correlation between the number of characters in a text field and the amount of text expansion. These experimental values clearly indicate that shorter text fields are more susceptible to text expansion, and these values can help us predict the effect on our user interfaces. To read further, visit W3's Internationalization article. CharactersMax. estimated expansionLikely mapping to:Up to 10300%Buttons, pickers, tabs11 to 20200%Labels, input fields21 to 30180%Large headers31 to 50160%Small headers, tooltips51 to 70140%Short paragraphs70+130%Longer paragraphsImage: Image illustrating the content from the table, using a button and a tooltip as examples. Buttons have a max estimated horizontal expansion of 300% from 4 characters in English, like &quot;View&quot;, and tooltips have a max estimated horizontal expansion of 200% from 9 characters in English, like "Copy link". (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_1d7852e427ceb2de7f6308ed0fd120597e663f962.png?width=750&format=png&optimize=medium)Image: Image illustrating the content from the table, using a page title as an example. Page titles have a max estimated horizontal expansion of 300% from 36 characters in English, like "Build your photography skills, fast." (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_1c0b3ea402d014a947dae364b455a46b8056e68be.png?width=750&format=png&optimize=medium)

### Localization-ready design

Localized content and text expansion have a substantial impact on how user interfaces look and perform across different countries. It’s vital to create layouts that can efficiently flow with the textual content of different length and nature.

## Iconography and metaphors

There are a few things to keep in mind in terms of how visual metaphors are being perceived differently country by country. To learn more, visit the Icon fundamentals page.

### Correct or incorrect

Checkmarks and “X” glyphs are commonly used in Western cultures to represent affirmation. However, in some countries such as Japan, these symbols are mostly used to indicate that something is not correct. At the same time, in Japan the “O” mark is the common way to express positive feedback to an action instead. Image: Illustration of 3 icons in a row: an X, a checkmark, and a circle. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_12d0cf1fe74f85d7d17b2af895a4aed7696b89c69.png?width=750&format=png&optimize=medium)

### Artifacts

We often use icons to represent real life objects that are familiar to the human eye and use everyday. However, some of these objects take different shapes in different countries. A common example is the mailbox icon; familiar to North American users, it doesn’t translate well for users in other countries. Image: Illustration comparing two mailbox icon designs: one style of mailbox that is common in North America, and one style of mailbox that is common in Japan. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_153d879b21104a4f0c1d78509f59fce19f7de76e7.png?width=750&format=png&optimize=medium)

### Hands and animals

Hands gestures are, generally speaking, tricky to use. Even gestures that we frequently use such as thumbs up and thumbs down can be perceived in an offensive way in certain countries. Animals can lead to misunderstandings as well. An example is the owl, which is a symbol of wisdom in the United States, carries the opposite meaning in some Asian countries. Image: Two illustrations of owls, side by side in a comparison. One owl is wearing a North American style graduation or scholar's cap and meant to be shown as wise. The other owl is not wearing anything but has a thought bubble over its head, with a question mark in the bubble, meant to show that it is confused or doesn't know anything. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_13986caaebb1d7a6f5abca190d740e3b1376b67ed.png?width=750&format=png&optimize=medium)

### Embedded text

As a rule of thumb, embedding text within icons, illustrations, and images can potentially lead to headaches when the content needs to be localized, as the content is not easy to translate and as the icons are not meant to adapt to text expansion. As a workaround, it’s reasonable to use lines instead of real text. Image: 5 different icons of speech bubbles, all including a different representation of a language. Examples include characters in Japanese, Hindi, English, Simplified Chinese, and 4 lines representing a block of text. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_171d2c319579ea3381785da55935509291389acf7.png?width=750&format=png&optimize=medium)

## Imagery

As imagery is closely related to society, culture, beliefs, religion, and political values, it’s extremely important to be careful and intentional about picking pictures for each region or even country.

### People and portraits

It’s important to pick models who are dressed appropriately for the region. Editing of portraits also differs with facial manipulation and skin smoothing being popular in many Asian countries such as China and Korea. The amount of skin shown can also be considered too suggestive in some cultures. Similarly, political, inspirational figures that are celebrated and extremely popular in the United States are likely to be unknown in some regions. Image: Semi-abstract illustration of ethnically diverse men and women wearing modest clothing. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_145b54e6902c0dcde5b0a130c5038e032c13a8c98.png?width=750&format=png&optimize=medium)

### Religion and politics

In general, it’s best practice to avoid religious symbolism, hand gestures, and political imagery, as regions may perceive them differently. Image: Tibetan monk wearing a red robe walking across a bridge covered with multicolor prayer flags. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_136dd5563938c3103ef68fb95063e79458395957e.png?width=750&format=png&optimize=medium)Photos of Tibetan monks are perceived in Western cultures as deeply spiritual. In China, on the other hand, Tibetan Buddhist monasteries are a symbol of a long religious and political dispute.

### Seasonal content

Seasonal content is greatly different country by country, and photography should reflect it accordingly. For example, there is a variety of celebrations, such as Thanksgiving, that are not meaningful in Asian countries, or interpreted in different ways. Image: Two images of people holding gifts of red roses and a small box of chocolates with a pink bow. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_1134eeec03a90a25ba3ee8f9399e660b6a01548a8.png?width=750&format=png&optimize=medium)Valentine’s day in Japan is quite unique from a western standpoint. The common roles are reversed and it’s the women who present gifts to significant others, usually chocolate or sweets.

### Traditions and manners

It’s often said that the best way to experience a country is to learn and respect its customs. Similarly, when choosing imagery across different cultures, we need to be respectful and aware of different traditions and manners across different regions, and act accordingly. Image: Person laying on their back on a bench in the sun with their feet in the air showing the soles of their feet. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_1de505324ce29dc46aa5a19334b24302dc1e47497.png?width=750&format=png&optimize=medium)Pictures like this one would likely represent “relaxation” in the United States, but are inappropriate in countries like Thailand, where you are not supposed to show the soles of your feet.

## Colors

As mentioned in the Inclusive Design page, it’s important to not refer to objects by color, as users across countries perceive colors in different ways. Similarly, colors are perceived differently around the globe and carry different emotional, political, and cultural meanings.

### The meaning of color is rooted in culture

Let’s consider an example: the design for a finance application. To display how certain stock options are performing, designers from the United States or Europe would likely use the color green to depict good performance and red to display stocks performing poorly. On the other hand, surprisingly, designers in China or Japan would likely take an opposite approach, and reverse the usage of these two colors. While in the United States and most western countries the color red is often associated with the idea of error or danger. However, in eastern countries the color is tied to the concept of good luck and happiness. White is a color tied to the concept of purity in western countries, but can be seen as a mourning color in countries like China. In Japan, purple is a color that expresses luxury and financial success, while in Italian popular culture is seen as a color that attracts bad luck. The list goes on. Image: Images showing how color has different semantic meaning in different countries. Top image of stock exchange monitor using green for negative values, and red for positive values. Bottom image showing a color swatch of red, labeled with the United States' sentiment of passion, excitement, danger, loss, and error, and China's sentiment of happiness, good fortune, and prosperity. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_14b70207acfebccd41df8f0b43da2c2a63ff61ef7.png?width=750&format=png&optimize=medium)

### Best practices

In general, no color can be assumed to have a consistent meaning across cultures. When approaching the design of user interfaces for a global audience, colors should not be the only indicator of a specific status or use case. It's always better to integrate with textual or other visual clues. When designing promotional content, capturing the right tone and emotions from the local audience is key, and colors can have a big impact. It’s important to research specific markets from a cultural standpoint to choose the right creative decision. Image: Radial diagram showing colors and their meaning across different cultures. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_1a4a8e0a8e957f8a8b5e8e2b9e581e7d7d67a8c1b.png?width=750&format=png&optimize=medium)

## Typography

Adobe Clean is our standard system typeface. Developed specifically for Adobe's brand identity and user interface design, it provides extensive language support. Please refer to the Typography page for an in-depth overview of our typography system.

### Readability across languages

Languages like Chinese, Japanese, and Thai use characters that are visually complex compared to the Latin ones. The peculiar nature of these writing systems has an impact on the character size, which is usually slightly bigger than western typography. To ensure good readability, it’s important to adjust the line-height value of paragraphs to create some extra breathing room between lines, and when necessary, increase interline spacing between characters. Similarly to text expansion, these differences can have an impact on the width and height of localized paragraphs. Image: A lowercase Latin letter 'a' shown alongside a Chinese/Japanese character, in gray on a light background, illustrating the visual comparison between Latin and CJK typography. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_1199e568655abe578125f9a7bb4fe837e3465c1aa.png?width=750&format=png&optimize=medium)

### Content volume expectation

Different cultures have varying expectations around volume of content. Japanese users generally prefer larger amounts of content and greater detail compared to North Americans, so content-heavy interface designers should consider the volume of content expected by these users. We recommend a modular design that allows for additional content. This is both for usability and user satisfaction of our products.

### Emphasis

Using bold and italics to emphasize words or phrases is common in Western typography, but for certain languages it might not be the right way of highlighting content. For example, languages like Chinese, Korean, and Japanese do not commonly rely on italicization because they lack oblique faces, and use alternatives like emphasis dots. Image: Alt text: "Two text examples in gray showing emphasis techniques: the English phrase 'I love New York' with 'New York' in italics, and a Japanese phrase with '東京' (Tokyo) in bold to show emphasis, illustrating how emphasis differs across scripts. (source: https://preview.spectrum.adobe.com/foundations/inclusivity/media_13229469b62ab31c7eb9039425c647c5c9d024eee.png?width=750&format=png&optimize=medium)

## Resources

International Design Wiki Digital Experience Globalization: World Readiness International Product Management International Design Research W3C Internationalization

## Resources

W3C Internationalization

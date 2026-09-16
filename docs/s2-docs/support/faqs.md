---
title: FAQs
category: support
source_url: https://main--spectrum-hub--adobe.aem.live/support/faqs
last_updated: '2026-09-04'
status: published
tags:
  - web
  - desktop
  - mobile
  - Figma
  - release notes
  - migration plan
  - engineering collaboration
hub_path: /support/faqs
---

# FAQs

## What is Spectrum 2?

Spectrum 2 is a significant version update — for both design and engineering — of the Spectrum design system . For more information, view the Introduction page.

## When can I start to use Spectrum 2?

The first phase of Spectrum 2 has been focused on the web. If you are working on a product built for a web implementation, you can start using Spectrum 2 today. Remember to work closely with your engineering partners to ensure a smooth implementation. As we progress, we're committed to extending Spectrum 2 to include desktop and mobile platforms with ongoing workshops and to ensure a comprehensive update to our design system.

## What about Spectrum 2 for desktop or mobile platforms?

Though Spectrum has always made cross-platform design a priority, most emerging products at Adobe have been web-first in recent years. That said, Adobe Design has been collectively working on the future of desktop and mobile. One of the central goals of Spectrum 2 is to make sure that it feels "at home." Both professional desktop and mobile tools have a unique set of requirements, and each will get the attention they require. On mobile, that work now has a home on the Spectrum team: Spectrum iOS and Spectrum Android exist as dedicated implementations of Spectrum 2. Neither is complete, but both are actively building, and we continue to expand their scope as the mobile design language matures. On desktop, we've been partnering with desktop teams and preparing their implementations for Spectrum 2 by using Spectrum's design data. We continue to expand the scope of our partnership as we build out Spectrum 2 and the toolchain to support it.

## Tips for designers

### Review the Spectrum 2 documentation

Make sure to regularly review design documentation to keep up-to-date with releases. Familiarize yourself with the changes to components, patterns, styles, and usage guidelines. And most importantly, read the release notes (posted in #spectrum-bulletin ) which explain what’s changed and why.

### Perform an UI audit

Conduct an audit of your existing UI components and patterns, specifically identifying the elements that need updating in order to align to Spectrum 2. Evaluate the design of the overall layouts, interaction patterns, and the level of consistency with the new guidelines.

### Create a transition or migration plan

Partner with your implementation team to develop a plan that outlines the order and priority of updating the components and foundations (such as color and styling). Prioritize the most frequently used components, then create a transition plan that breaks the implementation down into manageable phases. For example, you could start with core components that are used in multiple areas of your product (like buttons). Given that iterative migration plans are most successful, you should expect S1 and S2 design languages to live side-by-side in the same UIs for some period of time. As long as a full migration plan is committed, temporarily mixing design languages is acceptable.

### Apply Spectrum 2 and replace outdated components

Review the Spectrum 2 Figma libraries and update your components, typography, and icons, among the other changes. As you update your designs, please work with your implementation team on a migration plan. Especially pay attention to components that have changed between Spectrum 1 and Spectrum 2.. Note any custom components in the UI and work with your engineering team to replace any hard-coded values with a semantic alias.

### Collaborate with engineers

Depending on your product’s implementation, there may be differences between what’s in Figma and code. Work closely with your engineering partners to ensure a smooth implementation of the updated UI. Communicate any changes or updates clearly, provide them with necessary resources, components, or patterns, and address any questions or concerns they may have.

### Collaborate with content strategists

Work closely with your content strategy partners to ensure that messaging, voice, and tone are being holistically incorporated into interface updates. Work together to create experiences that support your users and communicate clearly about any design updates.

## Tips for engineers

Review our Developer overview page for detailed information about developing with Spectrum 2.

### Breaking changes ahead

The update to Spectrum 2 may cause breaking changes. Changes will include updates to colors, renamed tokens in the gray system, updates to corner rounding, and increased padding.

### Modify custom component implementations

Identify components in your code base that are customized or not using a standard framework implementation, as those will need manual updating to align with Spectrum 2. If you have custom components, be sure to replace hard-coded values with the appropriate semantic alias. Work with your designers to align custom or product-specific components with the Spectrum 2 design language.

### Review the Spectrum 2 documentation

Make sure to regularly review documentation to keep up-to-date and monitor releases of your Spectrum implementation. Familiarize yourself with the changes to components, patterns, styles, and usage guidelines. If you author custom components that utilize design data (tokens), it may be helpful to read the release notes (posted in #spectrum-bulletin ) which explain what’s changed and why. Especially pay attention to changes in naming conventions, variables, and overall structure. If you build product UI, monitor the release notes for the implementation your product uses and make sure to update to the latest version at regular intervals. Release announcements for implementations are posted in their respective Slack channels. A full list of channels is available on the Contact page.

### Review your existing code base

Review your existing code base to ensure you’re using the latest version of a Spectrum implementation. Identify any dependencies that might be affected by the changes, and evaluate if your code is heavily customizing Spectrum components. If so, you may experience breaking changes that need to be reviewed. For more details about your implementation, view our Developer overview page. Carve out time to plan for the update and create a migration plan. We recommend breaking down the update process into planned, manageable tasks in order to avoid a need to react to massive changes all at once. Prioritize areas of the code base that directly impact the UI, as well as the code that customizes, overrides, or otherwise changes Spectrum defaults.

### Collaborate with your designers

Work with your design partners to develop a plan for testing visual changes, to ensure they align with updated designs that use Spectrum 2.

## Tips for product managers

### Breaking changes ahead

The update to Spectrum 2 may cause breaking changes. Please plan ahead with your team to prepare.

### Define a project timeline and an implementation roadmap

Work with both your design and engineering teams to define a project timeline and break down the migration process. Coordinate and align the efforts of both teams to ensure smooth coordination and avoid disruptions in the development workflow. Set realistic deadlines and milestones to track progress and manage expectations. Reach out to the Spectrum team for help working on a plan.

### Review the Spectrum 2 documentation

Make sure to regularly review documentation to keep up-to-date with releases. Read the release notes (posted in #spectrum-bulletin ) which explain what’s changed and why.

### Test and validate

Collaborate with your development or QE team to create a testing plan to validate Spectrum 2. Ensure that Spectrum 2 functions as intended and delivers the desired experience. Address any issues or bugs and coordinate with your design and development teams to implement necessary fixes.

### Facilitate cross-functional collaboration

Encourage collaboration and open communication between your team’s designers and engineers. Create an environment where your team can discuss challenges, exchange ideas, and share knowledge. Arrange regular meetings or workshops to facilitate cross-functional collaboration, allowing teammates to align on their understanding of Spectrum 2 and have the space to clarify any questions or concerns.

## Tips for other roles

### Attend Spectrum shareouts and trainings

Participate in the shareouts and training sessions being organized by the Spectrum team to familiarize yourself with Spectrum 2. These will help you understand the updated design principles, guidelines, and components. And, you’ll learn how to use new design assets, style guides, and tools that apply to your area of focus.

### Review existing assets that use Spectrum

Review your current marketing materials, banners, or social media graphics to identify design elements that need updating (for example, if your product uses screenshots of UI in your marketing materials or home screens). Take note of any iconography, colors, or imagery that may conflict with Spectrum 2. Apply the Spectrum 2 components across all relevant channels to maintain consistency.

### Review the Spectrum 2 documentation

Read through this website to understand the changes coming to components, patterns, styles, and usage guidelines. Follow the release notes (posted in #spectrum-bulletin ) for updates .

### Provide feedback

When collaborating with your design team and product leaders throughout the transition process, share insights from your perspective to help refine Spectrum 2 or report any inconsistencies you may come across. Learn about how to reach out .

## Where can I find Spectrum 2 components and styles in Figma?

The Spectrum team manages Spectrum 2 components and styles as Figma libraries. These are available on the Resources page.

## Who should I reach out to if I have questions?

For general inquiries, post in #spectrum-general or email the Spectrum team . For specific inquiries, view the Contact page for more information on how to get in touch.

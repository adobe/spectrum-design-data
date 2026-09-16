---
title: Developer overview
category: developing
source_url: https://main--spectrum-hub--adobe.aem.live/support/developer-overview
last_updated: '2026-09-04'
status: published
tags:
  - Spectrum 2
  - React Spectrum
  - Spectrum Web Components
  - migration
  - upgrade migration tool
  - Spectrum tokens
  - iOS
  - Android
hub_path: /support/developer-overview
---

# Developer overview

## I work on a web-based product. How will I integrate Spectrum 2 into my application?

Spectrum 2 is available for web-based Spectrum implementations before other platforms like desktop or mobile. There are two primary implementations of Spectrum for web: React Spectrum (RSP) and Spectrum Web Components (SWC). Both of these implementations currently support Spectrum 2 in some form.

### React Spectrum (RSP)

Spectrum 2 for React Spectrum is now Generally Available. Over 70 components matching the Spectrum 2 Figma designs are now production-ready and available in the new @react-spectrum/s2 package. The Spectrum 2 package supports both new projects and those already on React Spectrum v3, with the ability to migrate portions of an application independently. Migration support is available through the upgrade migration tool as well as documentation on the website. See our guides to learn how to use Spectrum tokens via the style macros and ways to build using AI agents . React Spectrum components are built on React Aria Components and Spectrum Tokens , and will continue to be added incrementally as designs become available. For a full list of currently available components, see the Status section of the Spectrum 2 for React Spectrum page. Visit the React Spectrum website for component documentation, examples, latest updates, and release information. Join #react-spectrum and #rsp-announcements on Slack for announcements and support.

### Spectrum Web Components (SWC)

Spectrum Web Components is migrating components to full Spectrum 2 fidelity, meaning components are being rebuilt to look and behave like the Spectrum 2 designs, through a new version of the library and package. Gen1 components ship as versions 1.x, and Gen2 components ship as versions starting at 2.x—so the package version is the simplest way to know which generation you're on. The migration strategy A core principle is that Gen1 and Gen2 components can coexist, so the migration strategy is flexible to meet each team's needs. SWC's first step toward full-fidelity Spectrum 2 was called Spectrum 2 Foundations and is currently available for all Gen1 components. This theme updates the colors, corner radii, and icons of its components to provide the Spectrum 2 look and feel, while supporting backward compatibility with the Spectrum 1 and Express themes. This allowed teams to update closer to Spectrum 2 without introducing breaking changes. Gen2 is the next step in the migration path. These components are being rebuilt from the ground up so components are more stable and flexible, and fully match the Spectrum 2 designs. While these components have some breaking changes, they fully match Spectrum 2 design intent. How to stay up to date All major announcements about Gen2 component availability and releases are made through the project's Slack channels ( #swc-announcements and #spectrum-web-components ). You can track the progress of these migrations by viewing the roadmap . Additional details about Gen1 and Gen2 are available in the project's documentation .

## I work on a desktop product. How will I integrate Spectrum 2 into my application?

The first phase of Spectrum 2 has been focused on the web. Though Spectrum has always made cross-platform design a priority, the majority of emerging products at Adobe have been web-first in recent years. As such, we’re not ready to share any detailed plans for updates to desktop component libraries such as Qt or Drover. Learn more about desktop and mobile platforms in the FAQs .

## I work on a mobile product. How will I integrate Spectrum 2 into my application?

Mobile support for Spectrum 2 is currently in progress on both Spectrum iOS and Spectrum Android .

### iOS

Spectrum iOS is a Swift-based implementation of Spectrum, offering native components for both UIKit and SwiftUI products. Design and engineering artifacts are versioned together—the Figma library and Swift Package are always in sync—so what you see in Figma is what's available to ship. The team shipped 1.0 and has continued building. Available components include Button, Menu, Picker, Pop-Up Button, Switch, Toggle Button, and Toast, with full Dynamic Type support for typography. The library is actively growing, with more components on the way. Try it on a device The Spectrum iOS Catalog app is the best way to explore what's available—see components in context, feel the interactions, and learn about each component's features and options. Open this link on an iOS device to join: Join the Catalog App on TestFlight Resources Spectrum iOS GitHub Repository Spectrum iOS Figma For questions or to engage with the team, reach out in #spectrum-ios .

### Android

Spectrum Android is a Kotlin-based implementation of Spectrum, offering native components for Jetpack Compose products. Design and engineering artifacts are versioned together - the Figma library and the Gradle artifacts are always in sync - so what you see in Figma is what's available to ship. As of April 2026, the team is fully staffed with 3 engineers and 1 designer, and is actively building the foundational layers and components for Android in parallel. The first release, Token SDK 1.0, is planned for early June and will ship with Color and Typography tokens so teams can easily consume and use them. Component SDK 1.0 will follow in the subsequent months, bringing the foundational components, Iconography, and accessibility support for building Spectrum experiences on Android. The library is actively growing, with more on the way. Try it on a device The Spectrum Android Catalog app is the best way to explore what's available, see components in context, feel the interactions, and learn about each component's features and options. To join the waitlist, subscribe to the GRP-GCP-0873-READONLY IAM group. You'll receive an invite to preview and download pre-release and release builds via Firebase App Distribution as the library progresses. Resources Spectrum Android Tokens GitHub Repository Spectrum Android Components GitHub Repository For questions or to engage with the team, reach out in #spectrum-android .

## What if my tech stack has no implementation? How can I adopt Spectrum 2 on a new platform?

If your team is building a new implementation of Spectrum components, or is using an implementation not mentioned above, please reach out to us in #spectrum-general .

## My team has some slight changes on top of Spectrum 1. How will that affect us in Spectrum 2?

If your team uses design data (like design tokens or CSS custom properties) in any customizations or overrides in your project, you’ll want to keep track of updates to the implementation or design data resource you’re using and plan for time to verify any breaking changes. The best way to make your current code base ready for the future is to avoid using direct, hard-coded values (e.g., HEX or RGB values) or global tokens (e.g., gray-300). Instead, replace these with more semantic aliases (e.g., negative-border-color-default). The Spectrum Token Visualizer tool is helpful for looking up aliases by the global token they reference. The Spectrum Engineering teams are working on other tools to help with this process — like linters, deprecation warnings, data visualizers, and improved documentation — to help ensure your team makes the best use of the available data. If you’re concerned about the customizations your team made in Spectrum 1 and how Spectrum 2 might impact them, please contact the team for the implementation you’re using through their Slack channel. A full list of Slack channels is available on the Contact page. If you have any questions about what token to use for a particular use case or ideas for improved tooling, please reach out through #spectrum-tokens .

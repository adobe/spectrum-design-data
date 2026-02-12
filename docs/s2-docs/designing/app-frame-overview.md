---
title: "App frame"
source_url: https://s2.spectrum.corp.adobe.com/page/app-frame-overview/
last_updated: 2026-02-02
category: designing
status: published
tags:

- designing
  related\_components:
- containers
- s2-app-frame-header-browsing-context

---

# App frame

## Resources

### Design

* **Figma**: S2 Web

## External links

The app frame is the core navigation direction for Spectrum 2. It’s designed as a flexible framework that’s readily adaptable to specific product needs while still creating a shared, predictable experience across products.

The app frame needs to be opinionated without being restrictive. It directly accounts for the needs of future Spectrum 2 products, and is also flexible enough to be readily adaptable across varying product segment needs.

A cohesive, consistent app frame reinforces Adobe’s brand and helps users feel comfortable and familiar with our products. Predictable navigation across products is also imperative for Adobe to support users working across multiple applications — and helps people more readily learn how to use new products.

The app frame is the main stage to showcase the Spectrum 2 style, and it reflects the core foundations and principles of the design system. It works readily with all other design system resources, is committed to complying with WCAG standards, and holds the highest standards for globalization support.

Spectrum offers a high-level direction as well as a definition of which parts can be flexible and which parts need to be highly predictable. Product teams are then empowered to apply this direction in ways that make the most sense for their use cases and users.

Zones are the general areas into which certain types of actions should go. They’re not specific to components.

This is a general area that contains global actions, such as view actions (e.g., layout and zoom options) and supplemental features (e.g., AI Assistants). Actions here can be shown in different ways, such as using part of the content area to show actions in the header, or in a dedicated side rail. There is no single visual representation of how actions should look in this area.

This area is reserved for transient actions that are contextual to content on the page (e.g., an action bar).

Parts of the anatomy have defined rules and behaviors. The terms used here to describe the anatomy of the app framework are for internal alignment only, and are not representative of how these parts of the app frame should be described to end users.

In the S2 app frame, gradients are only used as backgrounds in content areas — they are not used in the header (A) and navigational areas (B). This allows for greater flexibility between pages where gradients may be calling attention to different kinds of content.

"There are two variants of the side navigation state control: hamburger and panel. They should never be used at the same time."

Interacting with this icon in the header will either fully expand and collapse, or partially collapse, the panel.

When hovering on the panel icon, the icon will show an animated preview of what action would be done upon interaction (either expanding or collapsing). This animation offers more context about what to expect. The placement of the panel icon is at the bottom of the app frame side navigation panel.

To activate or deactivate the TAB, select the 9-grid icon. Once clicked on, the TAB will appear above the header. On a screen reader, if there is an alert banner present, then the visual placement from top to bottom would be alert banner, TAB, then header.

The placement and appearance of the TAB icon may differ across Adobe products. Not all products will utilize the TAB. The currently supported products are Adobe Home, Firefly, Express, Photoshop, Lightroom, and Acrobat.

For products that use the TAB, the side navigation state control (panel icon) will be at the bottom of the side navigation. For mobile experiences, the side navigation state control (hamburger icon) and product switcher will be in the header.

The following are some common terms used at Adobe for describing the core UI elements that make up the app frame, along with some notable usage considerations. Consider this as a starting point for you to take and develop into working language that may need to be more contextual for your product. Work with your Content Strategy partners to adapt it to your needs.

The word “content” is general in theory but specific in application. In general, it’s a catch-all word for something that is contained in a designated space, and communicates meaning or intention. Specific to the context of the app frame, it describes that what goes into this area is at the discretion of a given situation or user experience.

"This is a commonly used internal term, but is not recommended for describing the interface to an end user. This is because it relies upon a visual metaphor to mimic an analog concept: something that “sinks” into a UI plane, like a water well sinks into the surface of the ground."

"Internal jargon is important and we want to be aligned across teams, but we also need to be careful about using internal terms, externally. By “user-facing term,” we mean that user to be the “end user”: the person who encounters the UI of an Adobe experience."

"In general, if you’re creating resources for internal usage (such as design guidelines or specs), you can safely use internal jargon. If you’re creating actual product UI, you will need to ensure that you’re using the appropriate terms that will help your user best understand and navigate the interface. Use the following steps to decide on terms:"

What's the context — the workflow or scenario — for where a term will appear? That will help you determine who you’re speaking to, with what language.

"Different deliverables will each have their own audience. For example:"

Are you creating something for internal builders (designers, engineers, anyone creating products) at Adobe? Or are you creating something for an external user?

Be specific about who you’re speaking to. If you're speaking to an internal audience looking at design direction for how to build UI, that’s a different audience from the users who will ultimately work with the UI.

Will the term appear as a UI string (such as the title of a panel)? Would it appear as a label in an image that shows the anatomy of different parts of the component?

The main focus for most users is on the content — the information being shown, and the actions to select from — rather than where or the means by which the action is contained.

This app framework intentionally uses the anatomy term “content area” to describe the main information or main focus in a given view, because it’s a flexible area that’s contextual to the main view of a given place in a user’s workflow.

"To create more inclusive products, describe parts of the UI in terms of function (what something does, or what something is) rather than appearance or position (such as relative direction: left, right, top, bottom)."

Describe the actions or items available.

Avoid describing where to find specific items or actions in relation to UI construction.

The word panel is acceptable as a user-facing term only when there is no other way to describe the interface.

"The word rail is acceptable to use as internal jargon, but it should never be used as a user-facing term. This is because the word is about how something looks: a long, straight divider, like a slide rule or a railroad track."

Show more options

Describe the action to take on the UI.

Hide navigation rail

Don’t describe the UI itself.

"“Show” and “hide” are the preferred terms to use to describe the open/close actions on the side navigation. This is for several reasons:"

As you’re designing the UI content of your app frame using this framework, follow the Spectrum content standards for all UI text and labels.

All templates

"Most of the components that will go into your app frame design have their own associated content standards:"

## Framework principles

Zones are the general areas into which certain types of actions should go. They’re not specific to components.

This area is reserved for transient actions that are contextual to content on the page (e.g., an action bar).

"There are two variants of the side navigation state control: hamburger and panel. They should never be used at the same time."

Interacting with this icon in the header will either fully expand and collapse, or partially collapse, the panel.

What's the context — the workflow or scenario — for where a term will appear? That will help you determine who you’re speaking to, with what language.

"Different deliverables will each have their own audience. For example:"

Describe the actions or items available.

Avoid describing where to find specific items or actions in relation to UI construction.

The word panel is acceptable as a user-facing term only when there is no other way to describe the interface.

Show more options

Describe the action to take on the UI.

Hide navigation rail

Don’t describe the UI itself.

"“Show” and “hide” are the preferred terms to use to describe the open/close actions on the side navigation. This is for several reasons:"

As you’re designing the UI content of your app frame using this framework, follow the Spectrum content standards for all UI text and labels.

All templates

"Most of the components that will go into your app frame design have their own associated content standards:"

## What’s here, and what’s to come

Zones are the general areas into which certain types of actions should go. They’re not specific to components.

This area is reserved for transient actions that are contextual to content on the page (e.g., an action bar).

"There are two variants of the side navigation state control: hamburger and panel. They should never be used at the same time."

Interacting with this icon in the header will either fully expand and collapse, or partially collapse, the panel.

What's the context — the workflow or scenario — for where a term will appear? That will help you determine who you’re speaking to, with what language.

"Different deliverables will each have their own audience. For example:"

Describe the actions or items available.

Avoid describing where to find specific items or actions in relation to UI construction.

The word panel is acceptable as a user-facing term only when there is no other way to describe the interface.

Show more options

Describe the action to take on the UI.

Hide navigation rail

Don’t describe the UI itself.

"“Show” and “hide” are the preferred terms to use to describe the open/close actions on the side navigation. This is for several reasons:"

As you’re designing the UI content of your app frame using this framework, follow the Spectrum content standards for all UI text and labels.

All templates

"Most of the components that will go into your app frame design have their own associated content standards:"

## App frame construction

Zones are the general areas into which certain types of actions should go. They’re not specific to components.

This area is reserved for transient actions that are contextual to content on the page (e.g., an action bar).

"There are two variants of the side navigation state control: hamburger and panel. They should never be used at the same time."

Interacting with this icon in the header will either fully expand and collapse, or partially collapse, the panel.

What's the context — the workflow or scenario — for where a term will appear? That will help you determine who you’re speaking to, with what language.

"Different deliverables will each have their own audience. For example:"

Describe the actions or items available.

Avoid describing where to find specific items or actions in relation to UI construction.

The word panel is acceptable as a user-facing term only when there is no other way to describe the interface.

Show more options

Describe the action to take on the UI.

Hide navigation rail

Don’t describe the UI itself.

"“Show” and “hide” are the preferred terms to use to describe the open/close actions on the side navigation. This is for several reasons:"

As you’re designing the UI content of your app frame using this framework, follow the Spectrum content standards for all UI text and labels.

All templates

"Most of the components that will go into your app frame design have their own associated content standards:"

## Side navigation state control

"There are two variants of the side navigation state control: hamburger and panel. They should never be used at the same time."

Interacting with this icon in the header will either fully expand and collapse, or partially collapse, the panel.

What's the context — the workflow or scenario — for where a term will appear? That will help you determine who you’re speaking to, with what language.

"Different deliverables will each have their own audience. For example:"

Describe the actions or items available.

Avoid describing where to find specific items or actions in relation to UI construction.

The word panel is acceptable as a user-facing term only when there is no other way to describe the interface.

Show more options

Describe the action to take on the UI.

Hide navigation rail

Don’t describe the UI itself.

"“Show” and “hide” are the preferred terms to use to describe the open/close actions on the side navigation. This is for several reasons:"

As you’re designing the UI content of your app frame using this framework, follow the Spectrum content standards for all UI text and labels.

All templates

"Most of the components that will go into your app frame design have their own associated content standards:"

## App frame variants: Top App Bar (TAB)

## Terminology and content standards

What's the context — the workflow or scenario — for where a term will appear? That will help you determine who you’re speaking to, with what language.

"Different deliverables will each have their own audience. For example:"

Describe the actions or items available.

Avoid describing where to find specific items or actions in relation to UI construction.

The word panel is acceptable as a user-facing term only when there is no other way to describe the interface.

Show more options

Describe the action to take on the UI.

Hide navigation rail

Don’t describe the UI itself.

"“Show” and “hide” are the preferred terms to use to describe the open/close actions on the side navigation. This is for several reasons:"

As you’re designing the UI content of your app frame using this framework, follow the Spectrum content standards for all UI text and labels.

All templates

"Most of the components that will go into your app frame design have their own associated content standards:"

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date              | Number | Notes                                                                                                                                                                          |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| November 19, 2025 | 2.0.0  | Images converted to light mode. Updated guidance to match latest design decisions. Added new sections: • Side navigation state control • App frame variants: Top App Bar (TAB) |
| February 10, 2025 | 1.1.0  | Updated side navigation state control to behave as a button, and use the same icon (hamburger menu) for all side navigation states.                                            |
| December 10, 2024 | 1.0.0  | This framework was added to the Spectrum 2 guidelines site.                                                                                                                    |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Containers](/page/containers/)
* [Browsing context: Header](/page/s2-app-frame-header-browsing-context/)

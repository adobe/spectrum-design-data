# Spectrum Design System: Naming and definition writing guide

**Page ID:** [`3698590`](https://github.com/adobe/spectrum-design-data/commit/3698590244) | **Version:** 5

***

**Naming and terminology management is crucial in a design system, and it requires strategic thinking in order to scale well.**
In addition to the many platforms that make up Spectrum — and each with their own syntax and language conventions — the design system’s language decisions also impact the end users of Adobe products. Many component names make their way directly into product UI strings or Help articles (such as “button,” “panel,” or “tab”).
**This guide will walk you through how to make intentional and thoughtful names for things:**

* Understand the relationship between concepts and language
* Write clear definitions of concepts, to help you create strong language decisions
* Use the best practices for naming our multi-platform design system
  **After reviewing this guide, you should be able to put the following into practice:**
* Identifying and aligning on concepts by writing strong definitions
* Deciding if a concept is best communicated through a word or a short phrase (descriptive language)
* Understanding how terms, names, and descriptive language coexist, across platforms

### The following is how we consider **words**, **terms**, **names**, and **concepts**, from a methodology of terminology management. We use this framework when describing, categorizing, and communicating about *things within the knowledge domain of the Spectrum Design System*.

#### **Word**

The fundamental building blocks of a language. In English, a word can have many meanings, or a single meaning. ####
Examples:

* The word “Run” has many meanings: you can run for office, run a marathon, run a program on your computer, and so on.
* The word “Serendipity” has a single meaning: “Something happens, by chance, in a happy or lucky way.”

#### **Term**

A word or phrase with a precise meaning, in a specific domain. A domain can be a context, subject, industry, or organization. ####
Examples:

* “Heavy metal,” “Rap,” and “Punk” are all musical (domain) terms for particular styles of music.
* “Hypertension” is a medical (domain) term for a blood pressure condition.
* “Button” is an interface design (domain) term for a visual element that represents a potential user action.
  Many of the words that we use to label and describe our work and outputs, here at Adobe, are *terms*. Most of these terms are *common nouns.*

#### **Name**

A word or words that identify something or someone, to distinguish one thing or person from another. ####
Examples:

* People: “Shantanu Narayen”
* Places: “San Jose, California”
* Organizations: “Adobe”
* Specific things: “Spectrum 2”
  Almost all names are *proper nouns.*

#### **Concept**

An idea, meaning, or “abstract thing.”  ####
Words, terms, and names are all tools (linguistic labels) for communicating a concept (mental construct).
For example: The word “Dog” represents the concept of *a domesticated canine animal that comes in many shapes, sizes, and colors, and can be found in many places on Earth*. This exact same concept can also be expressed by different words in different languages (“Perro” in Spanish, “Chien” in French, “Inu” in Japanese).
Without a clear definition of a concept, it’s difficult to confidently assign it a word, term, or name. That’s why **writing definitions** is a crucial practice when trying to create a shared understanding of language.
You can’t accurately or responsibly making a naming decision if the following isn’t clear about the thing you are trying to describe:

* What it is
* How it is, or isn’t different from everything else in the domain (our domain = the Spectrum Design System)
* If it even needs a word to describe it, or if the concept could be conveyed another way (such as a short phrase, a visual, a sound, etc.)
  The practice of writing definitions will help you figure out *all of the above*!

### **How to write strong definitions**

*Adapted from* [*Adobe Terms*](https://docs.terms.adobe.com/1f31a0c5f/p/29d9f3-metadata/b/161203), *the documentation for Adobe’s terminology management database.*
A **definition** is a succinct, clear statement, usually in the form of one or two sentences, that describes the **meaning** of a term. A definition should answer the question. “what is it?” Strong definitions specify the essential features of a concept, so that someone can readily tell both *what the concept is* and *how it differs from other concepts*.
The best practice when writing definitions is to start with an “anchor” word or short phrase that helps set context for the class or category of things that the concept belongs to. Often, this is anchor is a superordinate (having a higher-level order or category, within a system of classification) word to the concept you’re trying to describe.
Example of a strong definition:
**Pants**
An **article of clothing** that **sits on the waist or hips and covers the body** **below the torso, and covering both legs**.
In this case:

* **article of clothing** is the superordinate: it’s a short phrase that both describes and gives context to the broader classification that the concept belongs to.
* **sits on the waist or hips and covers the body** is the core of the definition: it explains what it is and how it differs, at a high level from other concepts that are in the superordinate (“articles of clothing”).
* **below the torso, and covering both legs** are additional essential characteristics that describe how this concept is different from related concepts.
  Here’s some additional examples of strong (and not-so-strong) definitions:
  \|                                                                                              A strong definition                                                                                             |                  A not-so-strong defintion                  |
  \|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
  \|                                        An **identifier** is a name used to uniquely identify a variable, function, class, module, or any other user-identified term.                                         |   An **identifier** is a name that identifies something.    |
  \|               A **font pack** is a collection of fonts intended for a specific purpose. Each font pack has its own unique name that describes a recommended usage or intention for the fonts.                |             A **font pack** is a pack of fonts.             |
  |A **personal exploration file** is a space in Figma to author and store designs, prototypes, and in-progress thoughts. The contents of this file may or may not be used in final assets for the design system.|A **personal exploration file** is a place to put your ideas.|

### **Don't be afraid to use descriptive language instead of trying to find "the right word"**

###

“Descriptive language” is a short phrase that can explain a concept. This is really useful when a concept is either complex or highly context-dependent, and it can’t be readily explained in a couple of words. *Hint: most concepts with Spectrum are complex and/or highly context dependent!* If you’re struggling to come up with a clear name for something, or the words that you’re choosing don’t feel “right,” that’s a signal that your concept is too complex for a one- or two-word term. It’s absolutely OK to use descriptive language to communicate that concept instead.
Ideas for names will usually emerge from the way that you naturally and descriptively talk about your concept. If you’re still developing your concept (its definition is not clear yet), you should still be able to describe it in a short phrase or sentence.
For example, when we were creating a set of terms to describe Spectrum’s user customization and adaptive UI offerings, we realized that the concepts were very complex, and they were also highly dependent on a need to communicate intended usage or a way to do something. There was no way we could holistically communicate information about product, audience, scaling, and size all within a name of 1-2 words, so we opted to use short phrases instead.

### **Use industry-, platform-, or framework-standard language whenever possible**

For Spectrum, we have a balance of items that are influenced by:

1. Industry precedents (e.g., a “button”)
2. Competitive product spaces (e.g., a “canvas”)
3. Adobe-specific concepts (e.g., a “self-healing brush”)
   If we don’t need to invent a new name for something that already exists and is widely understood in the industry, we shouldn’t. We should also defer to OS-level naming precedents whenever possible. This is especially important in native frameworks: for example, Apple describes Swift as a “Framework,” so Spectrum should also be referring to it as a “Framework.” Refer to content created by the governing body (such as help articles, technical documentation, or marketing content) to validate their preferred language.

### **Remember that Spectrum is a multi-platform design system**

In a multi-platform design system, like Spectrum:

* More than one platform is supported, and the implementation on the platforms can be different.
* All UI code and components don’t have to be shared across platforms.
* Some things — but not all things — need to look and function the same, across all platforms.
* Each platform that constitutes the design system follows a core set of principles and general directions, and uses those to inform decisions and actions at the implementation level.
* Things need to *feel* the same across platforms. But not everything needs to *look* the same across platforms.
* **We aim for shared terminology by default, but deviation** **(different** **terminology) can be acceptable.**
  While we try to have “a shared language” across platforms, different terminology for platform-specific concepts is expected. Try to cross-reference between platforms when it would be helpful (for example: designers can tend to work across multiple implementations).

### **Stick with objective (rather than subjective) names**

It’s very difficult to assign semantic names — which tend to be subjective — to things that have an intended usage. Sticking with objective naming (for example, “medium size”) creates less risk of confusion or misinterpretation.
For example, naming an offering according to its intended audience (such as “Marketing” or “Pro”) isn’t going to be sustainable over time. If we are speaking to a particular audience, the name of that audience will need to align with the Adobe audience segmentations — and those are constantly evolving, along with the business.

### **Name for the action, rather than how something looks**

Whenever possible, name things in order to communicate **what the thing does** (the action or the task that is/can be accomplished by a user), rather than **how the thing looks or behaves** (the way or appearance of how the action or task is accomplished). Another way to think about this is that we describe the *goal* that something accomplishes, rather than the *means*.
For example:

* We named one of input/selection components a “picker” — rather than a “dropdown” — because the focus is on the action being taken, rather than the behavior of how the action takes place.
* We describe a menu as “opening” rather than “disclosing menu options” because “disclosing” is technical jargon for the same behavior. Most end users of Adobe UI would likely describe this interaction as “opening” a menu.

### **Avoid metaphorical names**

Fanciful or metaphorical names for concepts (for example, “Spark” or “Liquid Glass”) are used for specific strategic reasons. 99% of the time, Spectrum won’t need these kinds of names for the design system offerings.
Metaphorical naming in particular makes it challenging for a name to stand on its own, since your audience likely won’t be able to understand the meaning without additional context (*more* *language)*. Don’t use this approach just be unique or trendy; if there’s already a straightforward and commonplace word for what you’re trying to describe, use it.

### **Plan for governance**

Understand that naming decisions will need to be revisited. Language requires governance and planning for change management as the design system evolves over time; a past decision may no longer apply because of new information. It’s OK (and expected) to re-name things — but you will do less of it if you invest more time in naming up front.

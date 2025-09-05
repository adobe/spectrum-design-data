# Virtual Assistant Context: Spectrum Design Data Evolution

## Project Overview

**Repository**: `adobe/spectrum-tokens` (evolving to `spectrum-design-data`)
**Primary Developer**: Garth DB (solo developer with manager oversight)
**Current Date**: August 29, 2025
**Project Phase**: Post-onsite planning and GitHub project setup

## Strategic Context

### Evolution from Spectrum Tokens to Spectrum Design Data

- **Current State**: Static design tokens for Spectrum Design System
- **Future Vision**: Universal, design system agnostic platform for design data
- **Approach**: Pragmatic, adoption-focused evolution (not revolutionary change)
- **Key Constraint**: Voluntary adoption - cannot force implementation teams

### Recent On-site Outcomes (August 2025)

Major strategic on-site meeting resulted in concrete priorities and governance model. Key outcomes:

- **Governance startup** became immediate priority (due Sept 5, 2025)
- **Token system optimization** prioritized over expansion
- **Schema-first approach** chosen over Rust-first
- **Platform autonomy** emphasized over enforcement
- **Collaborative workflows** over waterfall processes

## Current Technical Architecture

### Consumption Patterns

- **Spectrum CSS**: Consumes `src/` files via Style Dictionary
- **React Spectrum**: Consumes `dist/variables.json` (want to move to `src/`)
- **Drover**: Consumes `dist/drover.json` (legacy format)
- **Tokens Studio**: Feeds into `main` branch (continues unchanged)

### Build System Issues

- Current Style Dictionary setup requires `style-dictionary-sets` package
- Complex custom transforms just to handle `sets` structure
- Plan: Replace with simple Node.js build scripts
- Maintain 100% backward compatibility

### Beta Branch Strategy

- All experimental work happens in `beta` branch
- Main branch continues normal Tokens Studio workflow
- Beta releases: 13.16.0-beta.x format
- No breaking changes for existing consumers

## GitHub Project Structure

### Repository: `adobe/spectrum-tokens`

- **Issues**: Epic-based organization with child issues
- **Milestones**: Time-based with realistic estimates
- **Labels**: Minimal set (epic, beta-branch, build-system)
- **Discussions**: Existing RFC process for data structure changes

### Milestones (All marked as estimates)

1. **Governance Startup (Est.)** - Due: Sept 5, 2025 (URGENT)
2. **September Share-out (Est.)** - Due: Sept 30, 2025
3. **Beta M1: Build System Enhancement (Est.)** - Due: Oct 15, 2025
4. **Beta M2: Enhanced Metadata (Est.)** - Due: Dec 15, 2025
5. **Q4 2025: Foundation Work (Est.)** - Due: Dec 31, 2025
6. **Q1 2026: Tooling & Workflow (Est.)** - Due: Mar 31, 2026

### Epic Issues (Priority Order)

#### URGENT (Next 6 days)

- **Epic #599**: Governance Startup - Due Sept 5th
  - **Issue #606**: Create governance wiki page
  - **Issue #607**: Draft and post Slack announcement
  - **Status**: CRITICAL - only 6 days remaining
  - **Deliverables**: Wiki page, Slack announcement, monthly meetings

#### September Priority

- **Epic #600**: September On-site Share-out
  - **Purpose**: Present on-site outcomes to Spectrum Organization
  - **Format**: Huddle or Show & Tell presentation
  - **Deliverables**: Presentation deck, recording, wiki documentation

#### Foundation Work (Q4 2025)

- **Epic #603**: Schema & Data Organization Improvements
  - **Priority**: CRITICAL - blocks most other work
  - **Purpose**: Enable extensibility, metadata, multi-platform governance
  - **Dependencies**: Governance process established

- **Epic #604**: Token System Optimization & Trunk Definition
  - **Priority**: HIGH - addresses customer pain points
  - **Purpose**: Define stable core vs. platform-specific tokens
  - **Approach**: Semantic focus, optimization not reduction

- **Epic #596**: Replace Style Dictionary Build System
  - **Priority**: MEDIUM - technical foundation
  - **Purpose**: Simple Node.js scripts, lifecycle metadata
  - **Constraint**: 100% backward compatibility

#### Strategic & Advanced (Q1 2026)

- **Epic #601**: Multi-platform Spectrum Proposal (RFC)
  - **Purpose**: Formalize multi-platform vision
  - **Dependencies**: Governance established, schema defined

- **Epic #605**: Authoring Workflow Transition
  - **Purpose**: Move from Token Studio to schema-based authoring
  - **Dependencies**: Schema improvements, governance process

- **Epic #602**: System Changes Project Planning
  - **Purpose**: Detailed implementation plans and Jira integration
  - **Dependencies**: Multi-platform RFC approved

### Dependencies & Sequencing

```
Governance (#599) → Schema (#603) → Trunk Definition (#604) → Authoring Workflow (#605)
                                 ↘ Build System (#596)
                                 ↘ Multi-platform RFC (#601)
```

## Key Stakeholders & Teams

### Internal Teams

- **Spectrum CSS Team**: Open source, uses Style Dictionary
- **React Spectrum Team**: Uses variables.json, potential to switch to src/
- **Drover Team**: Uses legacy drover.json format
- **iOS Team**: Platform-specific needs, autonomy focus
- **Design Team**: Token authoring, Figma integration

### Communication Channels

- **spectrum-implementations Slack**: Primary coordination channel
- **GitHub Discussions**: RFC process for data structure changes
- **Wiki**: https://wiki.corp.adobe.com/display/AdobeDesign/ (governance documentation)

## Technical Priorities (From On-site)

### Schema Requirements

- Support platform-specific extensions and overrides
- Rich metadata (lifecycle, taxonomy, relationships)
- Versioning and change tracking
- Clear governance contracts
- Automated validation and tooling

### Token System Optimization

- Define "trunk" (core) vs. "leaves" (platform-specific)
- Semantic token focus for cross-component reuse
- Address customer pain points: discoverability, naming, complexity
- Multi-platform support (web, iOS, Android, desktop)

### Authoring Workflow

- Move away from Token Studio limitations
- Schema-based validation and feedback
- Collaborative review processes
- Figma integration for variable publishing
- Platform-specific output generation

## Governance Model (Establishing)

### Structure

- Monthly standing meetings (cadence adjustable)
- Stewards/points of contact for each platform
- RFC process for major changes
- Collaborative decision-making (not announcements)

### Roles

- **Foundational Team**: Core system maintenance
- **Platform Stewards**: iOS, web, Android, desktop representatives
- **Contributors**: Design and engineering participants
- **Approvers**: Decision-making authority per platform

### Communication

- **Wiki**: Central documentation and charter
- **Slack**: Day-to-day coordination
- **GitHub**: Technical RFCs and issue tracking
- **Meetings**: Regular alignment and planning

## Current Challenges & Constraints

### Adoption Challenges

- Cannot force implementation teams to adopt changes
- Teams have existing workflows and dependencies
- Sprint-based development favors quick fixes over process
- Cultural resistance to structured, rule-based systems

### Technical Constraints

- Must maintain 100% backward compatibility
- Tokens Studio integration must continue seamlessly
- Multiple consumption patterns must be supported
- Platform teams have unique requirements and naming conventions

### Resource Constraints

- Primarily solo developer (Garth) with manager oversight
- Limited direct engineering support from implementation teams
- Need to balance vision work with ongoing operational needs
- Timeline pressures from leadership and partner expectations

## Success Metrics

### Immediate (Sept 2025)

- Governance process established and operational
- On-site outcomes communicated to organization
- Stakeholder alignment on multi-platform approach

### Short-term (Q4 2025)

- Schema improvements enable platform extensibility
- Token system optimization reduces customer pain points
- Build system replacement improves maintainability

### Medium-term (Q1 2026)

- Schema-based authoring workflow operational
- Platform teams can extend core system autonomously
- Collaborative processes reduce fragmentation

### Long-term Vision

- Universal design data platform (design system agnostic)
- Voluntary adoption by other design systems
- Potential enterprise product offering
- Open source leadership in design system infrastructure

## AI Integration Context

### GitHub Structure Optimized for AI

- **Rich metadata** in every issue for AI parsing
- **Consistent labeling** for AI categorization
- **Clear dependencies** between epics and issues
- **Progress tracking** that AI can understand and report
- **Cross-references** for relationship mapping

### Query Patterns for AI

- **Status queries**: "What's the status of governance startup?"
- **Dependency queries**: "What blocks the authoring workflow?"
- **Timeline queries**: "What's due in September?"
- **Context queries**: "What are the key constraints for platform teams?"
- **Priority queries**: "What should I work on next?"

### Key Search Terms

- **Areas**: governance, schema, tokens, authoring, build-system, platform-extensibility
- **Priorities**: urgent, critical, high, medium, low
- **Stakeholders**: spectrum-css, react-spectrum, ios-team, design-team
- **Phases**: governance-startup, foundation-work, tooling-workflow
- **Dependencies**: backward-compatibility, voluntary-adoption, platform-autonomy

## Current Action Items (As of Aug 29, 2025)

### Immediate (Next 6 days)

1. **Create governance wiki page** (Issue #606)
2. **Draft Slack announcement** for spectrum-implementations (Issue #607)
3. **Set up monthly meetings** and stakeholder identification

### September

1. **Prepare on-site share-out** presentation
2. **Begin schema requirements** gathering
3. **Start build system** planning (Epic #596)

### Q4 2025

1. **Schema improvements** implementation
2. **Token system optimization** and trunk definition
3. **Platform partner** collaboration and validation

This document serves as comprehensive context for AI-powered assistance with the Spectrum Design Data evolution project. All information is current as of August 29, 2025, and should be updated as the project progresses.

# European Accessibility Act (EAA) Requirements

Comprehensive guide to EAA compliance requirements, deadlines, and relationship to WCAG 2.2.

---

## What is the European Accessibility Act (EAA)?

The **European Accessibility Act** (Directive (EU) 2019/882) is EU legislation requiring certain products and services to be accessible to people with disabilities.

**Key facts:**
- Adopted: April 17, 2019
- Transposition deadline: June 28, 2022 (EU member states had to implement into national law)
- **Compliance deadline: June 28, 2025** ← CRITICAL DATE
- Applies to: Products and services placed on market after June 28, 2025
- Enforcement: National authorities in each EU member state

---

## Who Must Comply?

### Covered Organizations

EAA applies to **economic operators** (businesses) that provide certain products or services to consumers in the EU:

#### Size Requirements
- **10+ employees**, OR
- **Annual turnover or balance sheet ≥ €2 million**

**Exemption:** Microenterprises (<10 employees AND <€2M revenue) are exempt.

#### Geographic Scope
- Companies **operating in the EU** (selling to EU consumers)
- Includes non-EU companies if they serve EU market
- All 27 EU member states + likely EEA (Norway, Iceland, Liechtenstein)

**Important:** UK companies selling to EU customers must comply. Brexit doesn't exempt from EAA.

### Covered Products and Services

EAA applies to **specific categories**, not all digital products:

#### Digital Services (Relevant to Web Accessibility)
1. **E-commerce** - Online shops, marketplaces
2. **Banking services** - Online banking, mobile banking apps
3. **E-books** - Digital publications
4. **Websites and mobile applications** for services listed in EAA
5. **Consumer-facing digital services**

#### Other Covered Items (Less relevant to web)
- Computers and operating systems
- Smartphones and tablets
- ATMs, ticketing machines, check-in machines
- E-readers
- Telecommunication services (phone, VoIP)
- Audio-visual media services
- Transport services (air, bus, rail, waterborne)

### Who Is Exempt?

- **Microenterprises:** <10 employees AND <€2M revenue
- **Disproportionate burden:** Can claim exemption if compliance would cause "disproportionate burden" (heavy documentation required)
- **Fundamental alteration:** If accessibility would fundamentally alter product/service
- **Pre-existing content:** Content created before June 28, 2025 (but must be updated if substantially modified)

**Note:** Exemptions require justification and documentation. Cannot simply claim exemption without proof.

---

## What Are the Accessibility Requirements?

EAA references **EN 301 549**, the European standard for ICT accessibility, which incorporates **WCAG 2.1 Level AA**.

### Technical Standard: EN 301 549

**EN 301 549 v3.2.1** (March 2021) is the harmonized European standard for ICT product and service accessibility.

**Key sections:**
- **Section 9:** Web content (incorporates WCAG 2.1 Level AA)
- **Section 10:** Non-web documents
- **Section 11:** Software (including mobile apps)
- **Section 12:** Documentation and support

### WCAG Compliance

**EAA requirement = WCAG 2.1 Level AA minimum**

**However:** Best practice is **WCAG 2.2 Level AA** because:
1. WCAG 2.2 is backward compatible with WCAG 2.1
2. WCAG 2.2 adds 9 new success criteria (all improvements, no conflicts)
3. EN 301 549 will likely update to WCAG 2.2 in next revision
4. Many EU member states already reference WCAG 2.2 in national laws
5. Future-proofing compliance

**Official position (as of 2024):**
- Minimum: WCAG 2.1 Level AA (via EN 301 549 v3.2.1)
- Recommended: WCAG 2.2 Level AA
- Level AAA: Not required, only recommended for specific contexts

### What Must Be Accessible?

For websites and mobile apps:

1. **Content:**
   - Text alternatives for non-text content
   - Captions and audio descriptions for multimedia
   - Proper heading structure
   - Sufficient color contrast
   - Resizable text without loss of functionality

2. **Functionality:**
   - Keyboard accessible
   - Sufficient time to read/interact
   - No seizure-inducing content
   - Navigable structure
   - Predictable behavior

3. **Forms and Input:**
   - Labeled form fields
   - Error identification and suggestions
   - Help text and instructions
   - Error prevention for important transactions

4. **Compatibility:**
   - Valid HTML
   - Compatibility with assistive technologies (screen readers, voice control)
   - Proper use of ARIA when semantic HTML insufficient

5. **Mobile Specific:**
   - Touch target sizes (24×24 CSS pixels minimum)
   - Alternatives to complex gestures
   - Support for portrait and landscape orientation
   - Reflow at 320px width

---

## Timeline and Deadlines

### Key Dates

| Date | Event |
|------|-------|
| **April 17, 2019** | EAA adopted by EU |
| **June 28, 2022** | Member states must transpose into national law |
| **June 28, 2025** | **COMPLIANCE DEADLINE** - Products/services on market must comply |
| **June 28, 2030** | Self-service terminals (ATMs, kiosks) compliance deadline (extended) |

### What "June 28, 2025" Means

- **New products/services** launched after this date must be accessible from day one
- **Existing products/services** must be brought into compliance by this date
- No grandfather clause for existing products in scope
- **Recommendation:** Start compliance work in 2024, complete by Q1 2025 to allow buffer time

### Urgency for 2025

If you're reading this in 2024-2025:

**Immediate priorities:**
1. Determine if EAA applies to your organization (employees, revenue, EU sales)
2. Audit current accessibility state (automated + manual testing)
3. Create remediation roadmap with timelines
4. Allocate budget and resources
5. Begin fixing critical issues (keyboard access, alt text, contrast, forms)
6. Plan for re-audit before June 2025

**Realistic timeline:**
- Small site (10-20 pages): 2-3 months to remediate
- Medium site (50-100 pages): 4-6 months to remediate
- Large site (100+ pages or complex functionality): 6-12 months to remediate
- Enterprise site or platform: 12-18 months to remediate

**Start now if you haven't already.** June 28, 2025 is a hard deadline.

---

## Enforcement and Penalties

### How EAA Is Enforced

EAA is enforced at **national level** by member states:
- Each EU country designates national enforcement authority
- Enforcement varies by country (different fines, procedures, complaint processes)
- Penalties determined by national law, not EAA directly

### Potential Penalties

While specific penalties vary by member state, expect:

**Financial penalties:**
- Fines for non-compliance (varies by country, can be substantial)
- Daily fines until compliance achieved
- Legal costs if sued by users or advocacy groups

**Business consequences:**
- Product/service removal from market until compliant
- Reputational damage
- Loss of customer trust
- Exclusion from public procurement
- Legal liability for discrimination

**Examples from member states:**
- **Germany:** Fines up to €100,000+ for serious violations
- **France:** Fines up to 4% of annual turnover under certain circumstances
- **Italy:** Fines ranging from €5,000 to €50,000+ depending on severity

### Complaint Process

Users can file complaints:
1. User encounters inaccessible product/service
2. User files complaint with national authority or company
3. Investigation by enforcement authority
4. Company given opportunity to remediate
5. If non-compliant: penalties, forced remediation, product removal

### Litigation Risk

Beyond regulatory enforcement:
- **Civil lawsuits:** Individuals or groups can sue for discrimination
- **Class actions:** Multiple users collectively sue
- **Advocacy organization complaints:** NGOs advocating for disability rights may file complaints

**Bottom line:** Cost of compliance << Cost of non-compliance + penalties + litigation + reputation damage

---

## Relationship Between EAA, WCAG, and Other Standards

### Standard Hierarchy

```
European Accessibility Act (EAA)
  ↓ references
EN 301 549 v3.2.1 (European ICT Accessibility Standard)
  ↓ incorporates
WCAG 2.1 Level AA (W3C Web Content Accessibility Guidelines)
  ↓ updated to
WCAG 2.2 Level AA (Recommended for future-proofing)
```

### Other Related Legislation

#### Web Accessibility Directive (WAD)
- Directive (EU) 2016/2102
- Applies to: **Public sector** websites and mobile apps
- Requirement: WCAG 2.1 Level AA
- Deadline: Already in effect (2018-2020)
- Different from EAA: WAD = public sector, EAA = private sector

#### ADA (United States)
- Americans with Disabilities Act
- Not EU law, but relevant for global companies
- Requirement: Generally interpreted as WCAG 2.1 Level AA
- Enforcement: DOJ, private lawsuits (very active)
- If serving both US and EU: Compliance with WCAG 2.2 AA satisfies both

#### UK Equality Act 2010
- UK law (post-Brexit)
- Requirement: Reasonable adjustments, generally WCAG 2.1 AA
- Applies to UK businesses
- Separate from EAA but similar requirements

#### AODA (Canada - Ontario)
- Accessibility for Ontarians with Disabilities Act
- Requirement: WCAG 2.0 Level AA (updating to 2.1)
- Applies to Ontario businesses

### Global Compliance Strategy

If operating globally:
- **Implement WCAG 2.2 Level AA** as baseline
- Satisfies: EAA, WAD, ADA, UK Equality Act, AODA, and most other jurisdictions
- Future-proof: WCAG 2.2 is latest standard
- Simplifies: Single standard easier than tracking multiple requirements

---

## Steps to Achieve EAA Compliance

### 1. Determine Applicability (1 week)

**Questions to answer:**
- Do we have ≥10 employees OR ≥€2M revenue?
- Do we provide products/services to EU consumers?
- Are our products/services in EAA scope (e-commerce, banking, e-books, etc.)?
- Can we claim microenterprise exemption?

**If YES to first 3 questions and NO to exemption → EAA applies to you.**

### 2. Conduct Accessibility Audit (2-4 weeks)

**Automated testing:**
- Run tools like axe DevTools, WAVE, or automated scripts
- Identifies ~30-40% of issues
- Quick way to find common problems

**Manual testing:**
- Keyboard navigation
- Screen reader testing
- Zoom and reflow testing
- Form interaction testing
- Color contrast verification

**Deliverable:** Accessibility audit report with categorized violations

### 3. Prioritize and Plan Remediation (1-2 weeks)

**Categorize issues:**
- **Critical:** Complete blockers (keyboard traps, unlabeled forms, missing alt text on key images)
- **High:** Major barriers (insufficient contrast, missing focus indicators, inaccessible modals)
- **Medium:** Partial barriers (generic link text, minor contrast issues, missing autocomplete)
- **Low:** Minor issues (heading structure improvements, language attributes)

**Create roadmap:**
- Phase 1: Critical issues (weeks 1-4)
- Phase 2: High priority (weeks 5-10)
- Phase 3: Medium priority (weeks 11-16)
- Phase 4: Low priority and polish (weeks 17-20)

### 4. Implement Fixes (2-6 months depending on scope)

**Development priorities:**
- Fix code (HTML, CSS, JavaScript)
- Add ARIA where semantic HTML insufficient
- Provide text alternatives (alt text, captions, transcripts)
- Improve color contrast
- Implement keyboard support
- Test as you go

**Resources needed:**
- Front-end developers (most issues are front-end)
- UX designers (for redesigns if needed)
- Content editors (for alt text, captions)
- QA testers (for validation)
- Accessibility specialist (consultant or hire)

### 5. Re-Audit and Validate (2-4 weeks)

**Internal validation:**
- Re-run automated tests
- Re-test manually
- Test with real assistive technologies
- User testing with people with disabilities (highly recommended)

**External validation (optional but recommended):**
- Third-party accessibility audit
- WCAG 2.2 Level AA conformance testing
- Certification (not required but valuable)

### 6. Maintain Compliance (Ongoing)

**Establish processes:**
- Accessibility checklist for new features
- Automated testing in CI/CD pipeline
- Regular manual audits (quarterly or bi-annually)
- Training for developers, designers, content creators
- Accessibility champions within teams

**Monitor for regressions:**
- New features can introduce new issues
- Design system updates may affect accessibility
- Third-party components may not be accessible

---

## Claiming Exemptions (Use Carefully)

### Disproportionate Burden

You may claim **disproportionate burden** if compliance would impose an excessive organizational or financial burden.

**Criteria:**
- Size and resources of organization
- Estimated costs of compliance
- Estimated benefits of compliance
- Frequency of use of product/service

**Requirements if claiming:**
- **Document** the assessment in detail
- Provide **partial compliance** where possible
- Provide **alternative means** of access (e.g., phone support if web not accessible)
- Reassess periodically (burden may decrease over time)

**Warning:** Disproportionate burden is **not a blanket exemption**. Must be justified case-by-case and documented. Enforcement authorities will scrutinize these claims.

### Fundamental Alteration

Claim if accessibility would **fundamentally alter** the nature of the product/service.

**Example:** Accessibility requirement for a visual art app to describe paintings to blind users might fundamentally alter the service.

**Requirements:**
- Document why it's a fundamental alteration
- Provide alternatives where possible
- This is a narrow exception, rarely applicable to standard websites/apps

### Microenterprise Exemption

**Automatic exemption if:**
- **<10 employees**, AND
- **<€2M annual turnover or balance sheet**

**Recommendation:** Even if exempt, implement accessibility best practices:
1. You may grow beyond exemption threshold
2. Accessibility improves UX for all users
3. Opens market to people with disabilities (~15% of population)
4. May be required by customers (B2B contracts)

---

## Documentation and Conformance Statements

### Accessibility Statement (Recommended)

While not strictly required by EAA, **accessibility statements** are best practice and may be required by some national implementations.

**Include:**
- Commitment to accessibility
- Standard met (WCAG 2.2 Level AA)
- Known issues and workarounds
- Contact method for accessibility feedback
- Date of last audit
- Complaints process

**Example:**
```markdown
# Accessibility Statement

[Company Name] is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status
The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to improve accessibility for people with disabilities. This website is **partially conformant** with WCAG 2.2 Level AA. Partially conformant means that some parts of the content do not fully conform to the accessibility standard.

## Known Issues
We are aware of the following accessibility issues and are working to address them:
- [Issue 1]: [Description and expected resolution date]
- [Issue 2]: [Description and expected resolution date]

## Feedback
We welcome your feedback on the accessibility of [website]. Please contact us:
- Email: accessibility@example.com
- Phone: +XX XXX XXXX

We aim to respond to accessibility feedback within 5 business days.

## Enforcement Procedure
If you are not satisfied with our response, you may contact [National Enforcement Authority].

Last updated: [Date]
```

### Voluntary Product Accessibility Template (VPAT)

**VPAT** (now called "Accessibility Conformance Report") is standardized format for documenting accessibility conformance.

**Sections:**
- Product information
- WCAG 2.x conformance (Level A, AA, AAA)
- Success criteria met/partially met/not met
- Explanations and remediation plans

**Use cases:**
- Required for US government procurement (Section 508)
- Requested by large enterprise customers
- Demonstrates due diligence
- Useful for B2B sales

**Not required by EAA, but valuable for compliance documentation.**

---

## Resources and Tools

### Official EAA Resources
- **EU EAA Directive:** https://eur-lex.europa.eu/eli/dir/2019/882/oj
- **European Commission EAA Page:** https://ec.europa.eu/social/main.jsp?catId=1202
- **EN 301 549 Standard:** https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf

### WCAG Resources
- **WCAG 2.2 Quick Reference:** https://www.w3.org/WAI/WCAG22/quickref/
- **WCAG 2.2 Understanding Docs:** https://www.w3.org/WAI/WCAG22/Understanding/
- **How to Meet WCAG:** https://www.w3.org/WAI/WCAG22/quickref/

### Testing Tools
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **NVDA Screen Reader:** https://www.nvaccess.org/

### Organizations and Consultants
- **W3C Web Accessibility Initiative (WAI):** https://www.w3.org/WAI/
- **WebAIM:** https://webaim.org/
- **Deque Systems:** https://www.deque.com/
- **TPGi (The Paciello Group):** https://www.tpgi.com/

---

## Summary Checklist

- [ ] Determine if EAA applies to your organization
- [ ] Identify products/services in scope
- [ ] Conduct accessibility audit (automated + manual)
- [ ] Create remediation roadmap with timeline to June 2025
- [ ] Allocate budget and resources
- [ ] Implement fixes targeting WCAG 2.2 Level AA
- [ ] Re-audit and validate compliance
- [ ] Document conformance (accessibility statement, VPAT if needed)
- [ ] Establish ongoing accessibility maintenance processes
- [ ] Train team on accessibility best practices
- [ ] Monitor enforcement developments in member states
- [ ] Consider user testing with people with disabilities

**Remember:** EAA compliance deadline is June 28, 2025. Start now if you're in scope and haven't begun. The cost and time required should not be underestimated.

---

**Last updated:** 2024 (informational purposes - verify current requirements with legal counsel and national authorities)

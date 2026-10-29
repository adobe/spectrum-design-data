#!/usr/bin/env python3
"""
Accessibility Report Generator
Generates formatted accessibility reports from axe-core violations JSON

Usage:
    python generate_report.py violations.json [--output report.md] [--format markdown|html]
"""

import argparse
import json
import sys
from datetime import datetime
from typing import Dict, List, Any


class ReportGenerator:
    """Generate formatted accessibility compliance reports"""

    def __init__(self, violations_file: str):
        with open(violations_file, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

    def generate_markdown(self) -> str:
        """Generate a markdown-formatted accessibility report"""
        report = []

        # Header
        report.append("# Accessibility Audit Report\n")
        report.append(f"**Website:** {self.data.get('url', 'N/A')}\n")
        report.append(f"**Date:** {self.data.get('timestamp', 'N/A')}\n")
        report.append(f"**Tool:** {self.data.get('tool', 'axe-core')}\n")
        report.append("\n---\n")

        # Executive Summary
        report.append(self._generate_executive_summary())

        # Violations by Principle
        report.append("\n## Violations by POUR Principle\n")
        report.append(self._generate_violations_by_principle())

        # Testing Methodology
        report.append("\n## Testing Methodology\n")
        report.append(self._generate_methodology())

        # Next Steps
        report.append("\n## Next Steps (Prioritized)\n")
        report.append(self._generate_next_steps())

        return '\n'.join(report)

    def _generate_executive_summary(self) -> str:
        """Generate executive summary section"""
        summary = self.data.get('summary', {})
        total = summary.get('total_violations', 0)
        level_a = summary.get('level_a_violations', 0)
        level_aa = summary.get('level_aa_violations', 0)
        level_aaa = summary.get('level_aaa_violations', 0)
        eaa_compliant = summary.get('eaa_compliant', False)

        # Count severity
        violations_all = self.data.get('violations', {}).get('all', [])
        critical = sum(1 for v in violations_all if v.get('severity') == 'CRITICAL')
        high = sum(1 for v in violations_all if v.get('severity') == 'HIGH')
        medium = sum(1 for v in violations_all if v.get('severity') == 'MEDIUM')
        low = sum(1 for v in violations_all if v.get('severity') == 'LOW')

        lines = [
            "## Executive Summary\n",
            f"- **Total issues:** {total} ({critical} critical, {high} high, {medium} medium, {low} low)",
            f"- **Level A compliance:** {'✓ PASS' if level_a == 0 else f'✗ FAIL ({level_a} issues)'}",
            f"- **Level AA compliance:** {'✓ PASS' if level_aa == 0 else f'✗ FAIL ({level_aa} issues)'}",
            f"- **Overall EAA compliance:** {'✓ PASS' if eaa_compliant else '✗ FAIL'}\n"
        ]

        if not eaa_compliant:
            lines.append(
                "**Verdict:** This website does not meet WCAG 2.2 Level AA requirements "
                "and is not compliant with the European Accessibility Act.\n"
            )
        else:
            lines.append(
                "**Verdict:** This website meets WCAG 2.2 Level AA requirements "
                "based on automated testing. Manual testing is still required for full EAA compliance.\n"
            )

        return '\n'.join(lines)

    def _generate_violations_by_principle(self) -> str:
        """Generate violations organized by POUR principle"""
        lines = []
        violations_by_principle = self.data.get('violations', {}).get('by_principle', {})

        principles = [
            ('Perceivable', violations_by_principle.get('Perceivable', [])),
            ('Operable', violations_by_principle.get('Operable', [])),
            ('Understandable', violations_by_principle.get('Understandable', [])),
            ('Robust', violations_by_principle.get('Robust', []))
        ]

        for principle_name, principle_violations in principles:
            if not principle_violations:
                lines.append(f"### {principle_name} (0 issues)\n")
                lines.append("✓ No violations found in this category.\n")
                continue

            lines.append(f"### {principle_name} ({len(principle_violations)} issues)\n")

            for violation in principle_violations:
                lines.append(self._format_violation(violation))

        return '\n'.join(lines)

    def _format_violation(self, violation: Dict[str, Any]) -> str:
        """Format a single violation with all details"""
        lines = []

        # Header with success criterion
        wcag_level = violation.get('wcag_level', 'Unknown')
        severity = violation.get('severity', 'MEDIUM')
        description = violation.get('description', 'No description')
        help_text = violation.get('help', 'No help available')
        help_url = violation.get('helpUrl', '')

        lines.append(f"#### {help_text} (Level {wcag_level}) - {severity}\n")

        # Issue description
        lines.append(f"**Issue:** {description}\n")

        # Impact
        impact = violation.get('impact', 'moderate')
        lines.append(f"**Impact:** {impact.capitalize()}\n")

        # Affected nodes
        nodes = violation.get('nodes', [])
        if nodes:
            lines.append(f"**Affected elements:** {len(nodes)} instance(s)\n")
            lines.append("**Locations:**")

            # Show up to 5 examples
            for i, node in enumerate(nodes[:5], 1):
                target = node.get('target', ['unknown'])
                html = node.get('html', 'N/A')
                failure_summary = node.get('failureSummary', '')

                lines.append(f"\n{i}. Selector: `{target[0] if target else 'unknown'}`")
                lines.append(f"   ```html\n   {html}\n   ```")

                if failure_summary:
                    lines.append(f"   {failure_summary}")

            if len(nodes) > 5:
                lines.append(f"\n...and {len(nodes) - 5} more instance(s)")

        # Remediation guidance
        lines.append("\n**How to fix:**")

        # Get specific remediation from nodes
        if nodes and nodes[0].get('any'):
            for check in nodes[0]['any']:
                message = check.get('message', '')
                if message:
                    lines.append(f"- {message}")
        elif nodes and nodes[0].get('all'):
            for check in nodes[0]['all']:
                message = check.get('message', '')
                if message:
                    lines.append(f"- {message}")
        else:
            lines.append(f"- {description}")

        # Reference link
        if help_url:
            lines.append(f"\n**Reference:** [{help_text}]({help_url})")

        lines.append("\n---\n")

        return '\n'.join(lines)

    def _generate_methodology(self) -> str:
        """Generate testing methodology section"""
        lines = [
            "**Automated Testing:**",
            f"- Tool: {self.data.get('tool', 'axe-core')}",
            "- Standard: WCAG 2.2 Level A and AA",
            f"- URL tested: {self.data.get('url', 'N/A')}",
            f"- Date: {self.data.get('timestamp', 'N/A')}",
            "",
            "**Manual Testing:**",
            "- ⚠️ Automated testing only catches ~30-40% of accessibility issues",
            "- Manual keyboard navigation testing: Required",
            "- Screen reader testing: Recommended",
            "- Zoom/reflow testing: Required",
            "- Form interaction testing: Required",
            "",
            "**Standards:**",
            "- WCAG 2.2 Level AA (European Accessibility Act requirement)",
            "- EN 301 549 (European standard)",
            "- European Accessibility Act (EAA) compliance deadline: June 28, 2025",
            ""
        ]
        return '\n'.join(lines)

    def _generate_next_steps(self) -> str:
        """Generate prioritized next steps"""
        violations_all = self.data.get('violations', {}).get('all', [])

        # Categorize by severity
        critical = [v for v in violations_all if v.get('severity') == 'CRITICAL']
        high = [v for v in violations_all if v.get('severity') == 'HIGH']
        medium = [v for v in violations_all if v.get('severity') == 'MEDIUM']
        low = [v for v in violations_all if v.get('severity') == 'LOW']

        lines = []

        if critical:
            lines.append("### Phase 1: Critical Issues (Immediate - 1-2 weeks)\n")
            for i, violation in enumerate(critical[:5], 1):
                node_count = len(violation.get('nodes', []))
                lines.append(
                    f"{i}. {violation.get('help', 'Fix issue')} - {node_count} instance(s)"
                )
            lines.append("")

        if high:
            lines.append("### Phase 2: High Priority (2-4 weeks)\n")
            for i, violation in enumerate(high[:5], 1):
                node_count = len(violation.get('nodes', []))
                lines.append(
                    f"{i}. {violation.get('help', 'Fix issue')} - {node_count} instance(s)"
                )
            lines.append("")

        if medium:
            lines.append("### Phase 3: Medium Priority (1-2 months)\n")
            for i, violation in enumerate(medium[:5], 1):
                node_count = len(violation.get('nodes', []))
                lines.append(
                    f"{i}. {violation.get('help', 'Fix issue')} - {node_count} instance(s)"
                )
            lines.append("")

        if low:
            lines.append("### Phase 4: Low Priority (Ongoing)\n")
            for i, violation in enumerate(low[:3], 1):
                node_count = len(violation.get('nodes', []))
                lines.append(
                    f"{i}. {violation.get('help', 'Fix issue')} - {node_count} instance(s)"
                )
            lines.append("")

        # Recommendations
        lines.append("### Recommendations\n")
        lines.append("1. **Start with critical issues** - These have the highest impact on users")
        lines.append("2. **Perform manual testing** - Automated tools miss 60-70% of issues")
        lines.append("3. **Test with real users** - Include users with disabilities in testing")
        lines.append("4. **Establish ongoing monitoring** - Run automated checks on every deploy")
        lines.append("5. **Train development team** - Prevent future accessibility issues")
        lines.append(f"6. **EAA deadline** - Compliance required by June 28, 2025")
        lines.append("")
        lines.append(
            "**Recommended re-audit:** After fixing critical and high priority issues "
            "(approximately 6-8 weeks)\n"
        )

        return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(
        description='Generate accessibility compliance report from violations JSON'
    )
    parser.add_argument(
        'violations_file',
        help='Path to violations JSON file from automated_checks.py'
    )
    parser.add_argument(
        '--output', '-o',
        default='accessibility_report.md',
        help='Output report file (default: accessibility_report.md)'
    )
    parser.add_argument(
        '--format', '-f',
        choices=['markdown', 'md'],
        default='markdown',
        help='Report format (default: markdown)'
    )

    args = parser.parse_args()

    try:
        generator = ReportGenerator(args.violations_file)
        report = generator.generate_markdown()

        # Write report
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"✓ Report generated: {args.output}", file=sys.stderr)

    except FileNotFoundError:
        print(f"Error: Violations file not found: {args.violations_file}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in violations file: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

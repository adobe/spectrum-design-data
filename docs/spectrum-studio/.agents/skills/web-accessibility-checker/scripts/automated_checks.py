#!/usr/bin/env python3
"""
Automated Web Accessibility Checker
Uses axe-core via Selenium to run WCAG 2.2 Level A/AA automated tests

Usage:
    python automated_checks.py <url> [--output violations.json]

Requirements:
    pip install selenium axe-selenium-python webdriver-manager
"""

import argparse
import json
import sys
from datetime import datetime
from typing import Dict, List, Any

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from webdriver_manager.chrome import ChromeDriverManager
    from axe_selenium_python import Axe
except ImportError as e:
    print(f"Error: Missing required package: {e}", file=sys.stderr)
    print("\nInstall dependencies with:", file=sys.stderr)
    print("  pip install selenium axe-selenium-python webdriver-manager", file=sys.stderr)
    sys.exit(1)


class AccessibilityChecker:
    """Automated accessibility checker using axe-core"""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver = None

    def setup_driver(self):
        """Initialize Chrome WebDriver with appropriate options"""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.set_window_size(1920, 1080)

    def check_url(self, url: str) -> Dict[str, Any]:
        """
        Run axe-core accessibility checks on the given URL

        Args:
            url: The URL to check

        Returns:
            Dictionary with violations, passes, and metadata
        """
        if not self.driver:
            self.setup_driver()

        print(f"Loading {url}...", file=sys.stderr)
        self.driver.get(url)

        # Run axe-core with WCAG 2.2 Level A and AA rules
        axe = Axe(self.driver)

        # Inject and run axe with WCAG 2.2 Level A/AA tags
        print("Running accessibility checks...", file=sys.stderr)
        axe.inject()
        results = axe.run(options={
            'runOnly': {
                'type': 'tag',
                'values': ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
            }
        })

        # Enhance violations with additional metadata
        enhanced_results = self._enhance_results(results, url)

        return enhanced_results

    def _enhance_results(self, results: Dict, url: str) -> Dict[str, Any]:
        """
        Enhance axe results with additional categorization and metadata

        Args:
            results: Raw axe-core results
            url: The tested URL

        Returns:
            Enhanced results dictionary
        """
        violations = results.get('violations', [])
        passes = results.get('passes', [])

        # Categorize violations by WCAG level
        level_a_violations = []
        level_aa_violations = []
        level_aaa_violations = []

        # Categorize by POUR principle
        perceivable = []
        operable = []
        understandable = []
        robust = []

        for violation in violations:
            # Determine WCAG level from tags
            tags = violation.get('tags', [])
            wcag_level = self._get_wcag_level(tags)
            violation['wcag_level'] = wcag_level

            # Add severity mapping
            impact = violation.get('impact', 'moderate')
            violation['severity'] = self._map_severity(impact)

            # Categorize by level
            if wcag_level == 'A':
                level_a_violations.append(violation)
            elif wcag_level == 'AA':
                level_aa_violations.append(violation)
            elif wcag_level == 'AAA':
                level_aaa_violations.append(violation)

            # Categorize by POUR principle based on success criterion
            principle = self._get_pour_principle(violation.get('id', ''))
            violation['pour_principle'] = principle

            if principle == 'Perceivable':
                perceivable.append(violation)
            elif principle == 'Operable':
                operable.append(violation)
            elif principle == 'Understandable':
                understandable.append(violation)
            elif principle == 'Robust':
                robust.append(violation)

        # Build enhanced results
        enhanced = {
            'url': url,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'tool': 'axe-core',
            'summary': {
                'total_violations': len(violations),
                'level_a_violations': len(level_a_violations),
                'level_aa_violations': len(level_aa_violations),
                'level_aaa_violations': len(level_aaa_violations),
                'total_passes': len(passes),
                'eaa_compliant': len(level_a_violations) == 0 and len(level_aa_violations) == 0
            },
            'violations': {
                'all': violations,
                'by_level': {
                    'A': level_a_violations,
                    'AA': level_aa_violations,
                    'AAA': level_aaa_violations
                },
                'by_principle': {
                    'Perceivable': perceivable,
                    'Operable': operable,
                    'Understandable': understandable,
                    'Robust': robust
                }
            },
            'passes': passes
        }

        return enhanced

    def _get_wcag_level(self, tags: List[str]) -> str:
        """Determine WCAG level from axe tags"""
        if 'wcag2a' in tags or 'wcag21a' in tags:
            return 'A'
        elif 'wcag2aa' in tags or 'wcag21aa' in tags or 'wcag22aa' in tags:
            return 'AA'
        elif 'wcag2aaa' in tags or 'wcag21aaa' in tags:
            return 'AAA'
        return 'Unknown'

    def _map_severity(self, impact: str) -> str:
        """Map axe impact to severity level"""
        mapping = {
            'critical': 'CRITICAL',
            'serious': 'HIGH',
            'moderate': 'MEDIUM',
            'minor': 'LOW'
        }
        return mapping.get(impact, 'MEDIUM')

    def _get_pour_principle(self, rule_id: str) -> str:
        """
        Determine POUR principle from axe rule ID
        This is a heuristic mapping based on common axe rule naming
        """
        # Perceivable (1.x success criteria)
        perceivable_rules = [
            'image-alt', 'input-image-alt', 'area-alt', 'object-alt',
            'video-caption', 'audio-caption', 'video-description',
            'color-contrast', 'color-contrast-enhanced',
            'aria-hidden-body', 'aria-text',
            'heading-order', 'p-as-heading',
            'meta-viewport', 'meta-viewport-large'
        ]

        # Operable (2.x success criteria)
        operable_rules = [
            'accesskeys', 'tabindex', 'focus-order-semantics',
            'bypass', 'skip-link',
            'link-in-text-block', 'link-name',
            'button-name', 'frame-title',
            'meta-refresh', 'meta-refresh-no-exceptions',
            'scrollable-region-focusable'
        ]

        # Understandable (3.x success criteria)
        understandable_rules = [
            'html-lang-valid', 'html-has-lang', 'valid-lang',
            'label', 'label-title-only', 'label-content-name-mismatch',
            'form-field-multiple-labels',
            'autocomplete-valid', 'input-button-name'
        ]

        # Robust (4.x success criteria)
        robust_rules = [
            'aria-valid-attr', 'aria-valid-attr-value',
            'aria-allowed-attr', 'aria-required-attr',
            'aria-required-children', 'aria-required-parent',
            'aria-roles', 'aria-allowed-role',
            'duplicate-id', 'duplicate-id-active', 'duplicate-id-aria',
            'list', 'listitem', 'definition-list', 'dlitem'
        ]

        if any(rule in rule_id for rule in perceivable_rules):
            return 'Perceivable'
        elif any(rule in rule_id for rule in operable_rules):
            return 'Operable'
        elif any(rule in rule_id for rule in understandable_rules):
            return 'Understandable'
        elif any(rule in rule_id for rule in robust_rules):
            return 'Robust'
        else:
            # Default categorization by SC number if present in help URL
            return 'Unknown'

    def cleanup(self):
        """Close the WebDriver"""
        if self.driver:
            self.driver.quit()


def main():
    parser = argparse.ArgumentParser(
        description='Run automated accessibility checks on a website using axe-core'
    )
    parser.add_argument('url', help='URL to check for accessibility issues')
    parser.add_argument(
        '--output', '-o',
        default='violations.json',
        help='Output JSON file (default: violations.json)'
    )
    parser.add_argument(
        '--no-headless',
        action='store_true',
        help='Run browser in visible mode (for debugging)'
    )

    args = parser.parse_args()

    checker = AccessibilityChecker(headless=not args.no_headless)

    try:
        results = checker.check_url(args.url)

        # Write results to file
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        # Print summary to stderr
        print(f"\n✓ Accessibility check complete", file=sys.stderr)
        print(f"  URL: {results['url']}", file=sys.stderr)
        print(f"  Total violations: {results['summary']['total_violations']}", file=sys.stderr)
        print(f"    Level A: {results['summary']['level_a_violations']}", file=sys.stderr)
        print(f"    Level AA: {results['summary']['level_aa_violations']}", file=sys.stderr)
        print(f"    Level AAA: {results['summary']['level_aaa_violations']}", file=sys.stderr)
        print(f"  EAA Compliant: {'✓ YES' if results['summary']['eaa_compliant'] else '✗ NO'}", file=sys.stderr)
        print(f"\nResults written to: {args.output}", file=sys.stderr)

        # Exit with error code if violations found
        sys.exit(0 if results['summary']['eaa_compliant'] else 1)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        checker.cleanup()


if __name__ == '__main__':
    main()

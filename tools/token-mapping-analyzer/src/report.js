// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Generate a structured gap analysis report from decomposition results.
 */
export function generateReport(results) {
  const report = {
    summary: buildSummary(results),
    byFile: buildByFile(results),
    registryGaps: buildRegistryGaps(results),
    structuralGaps: buildStructuralGaps(results),
    roundtripFailures: buildRoundtripFailures(results),
    unmatchedSegments: buildUnmatchedInventory(results),
    confidenceBreakdown: buildConfidenceBreakdown(results),
  };

  return report;
}

function buildSummary(results) {
  const active = results.filter((r) => !r.deprecated && !r.private);
  const deprecated = results.filter((r) => r.deprecated);
  const priv = results.filter((r) => r.private);

  return {
    total: results.length,
    active: active.length,
    deprecated: deprecated.length,
    private: priv.length,
    activeByConfidence: countByConfidence(active),
    roundtripRate: {
      active: percentage(
        active.filter((r) => r.roundtrips).length,
        active.length,
      ),
      all: percentage(
        results.filter((r) => r.roundtrips).length,
        results.length,
      ),
    },
  };
}

function buildByFile(results) {
  const byFile = {};
  for (const r of results) {
    if (!byFile[r.sourceFile]) {
      byFile[r.sourceFile] = {
        total: 0,
        active: 0,
        deprecated: 0,
        private: 0,
        byConfidence: {},
      };
    }
    const f = byFile[r.sourceFile];
    f.total++;
    if (r.deprecated) f.deprecated++;
    else if (r.private) f.private++;
    else f.active++;
  }

  // Add confidence breakdown for active tokens per file
  for (const r of results) {
    if (r.deprecated || r.private) continue;
    const f = byFile[r.sourceFile];
    f.byConfidence[r.confidence] = (f.byConfidence[r.confidence] || 0) + 1;
  }

  return byFile;
}

function buildRegistryGaps(results) {
  // Find segments that were assigned to fields but whose values aren't in registries
  // We detect this from unmatched segments and from warnings
  const gapsByField = {};
  const unmatchedValues = {};

  for (const r of results) {
    if (r.deprecated || r.private) continue;

    for (const detail of r.matchDetails) {
      if (detail.field === null) {
        const seg = detail.segment;
        unmatchedValues[seg] = (unmatchedValues[seg] || 0) + 1;
      }
    }

    // Collect gap types
    for (const gap of r.gaps) {
      if (gap.type === "unmatched-segment") {
        const seg = gap.value;
        if (!gapsByField.unclassified) gapsByField.unclassified = {};
        gapsByField.unclassified[seg] =
          (gapsByField.unclassified[seg] || 0) + 1;
      }
    }
  }

  return {
    unmatchedValueFrequency: sortByCount(unmatchedValues),
    byField: gapsByField,
  };
}

function buildStructuralGaps(results) {
  const gapCategories = {};

  for (const r of results) {
    if (r.deprecated || r.private) continue;

    for (const gap of r.gaps) {
      if (!gapCategories[gap.type]) {
        gapCategories[gap.type] = {
          description: gap.description,
          count: 0,
          examples: [],
        };
      }
      gapCategories[gap.type].count++;
      if (gapCategories[gap.type].examples.length < 10) {
        gapCategories[gap.type].examples.push({
          token: r.tokenName,
          value: gap.value,
        });
      }
    }
  }

  return gapCategories;
}

function buildRoundtripFailures(results) {
  const failures = results
    .filter((r) => !r.deprecated && !r.private && !r.roundtrips)
    .map((r) => ({
      token: r.tokenName,
      serialized: r.serialized,
      nameObject: r.nameObject,
      confidence: r.confidence,
    }));

  return {
    count: failures.length,
    rate: percentage(
      failures.length,
      results.filter((r) => !r.deprecated && !r.private).length,
    ),
    failures: failures.slice(0, 100), // cap at 100 examples
    totalAvailable: failures.length,
  };
}

function buildUnmatchedInventory(results) {
  const inventory = {};

  for (const r of results) {
    if (r.deprecated || r.private) continue;
    for (const u of r.unmatchedSegments) {
      const seg = u.segment;
      if (!inventory[seg]) {
        inventory[seg] = { count: 0, tokens: [] };
      }
      inventory[seg].count++;
      if (inventory[seg].tokens.length < 5) {
        inventory[seg].tokens.push(r.tokenName);
      }
    }
  }

  // Sort by frequency
  return Object.entries(inventory)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([segment, data]) => ({ segment, ...data }));
}

function buildConfidenceBreakdown(results) {
  const active = results.filter((r) => !r.deprecated && !r.private);
  const byConfidence = {};

  for (const conf of ["HIGH", "MEDIUM", "LOW", "FAIL"]) {
    const tokens = active.filter((r) => r.confidence === conf);
    byConfidence[conf] = {
      count: tokens.length,
      percentage: percentage(tokens.length, active.length),
      examples: tokens.slice(0, 5).map((r) => ({
        token: r.tokenName,
        nameObject: r.nameObject,
        file: r.sourceFile,
      })),
    };
  }

  return byConfidence;
}

function countByConfidence(results) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, FAIL: 0 };
  for (const r of results) {
    counts[r.confidence] = (counts[r.confidence] || 0) + 1;
  }
  return counts;
}

function percentage(numerator, denominator) {
  if (denominator === 0) return "0.00%";
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function sortByCount(obj) {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b - a)
    .map(([value, count]) => ({ value, count }));
}

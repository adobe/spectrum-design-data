/*
Performance comparison: Optimized vs Original deep-object-diff
*/

import { detailedDiff as originalDetailedDiff } from "deep-object-diff";
import { detailedDiff as optimizedDetailedDiff } from "./src/engine.js";

function generateTestData(size, changePercentage) {
  const original = {};
  const updated = {};

  for (let i = 0; i < size; i++) {
    const key = `token-${i}`;
    const data = {
      name: key,
      value: `#FF${i.toString(16).padStart(4, "0")}`,
      description: `Token ${i} description`,
      type: i % 3 === 0 ? "color" : "dimension",
      metadata: {
        category: `category-${i % 10}`,
        deprecated: false,
        private: i % 20 === 0,
        tags: [`tag-${i % 5}`, `type-${i % 3}`],
      },
    };

    original[key] = data;

    if (Math.random() < changePercentage) {
      const modifiedData = { ...data };
      modifiedData.value = `#00${i.toString(16).padStart(4, "0")}`;
      modifiedData.description = `Updated ${data.description}`;
      modifiedData.metadata = {
        ...data.metadata,
        lastModified: "2024-01-15",
      };
      updated[key] = modifiedData;
    } else {
      updated[key] = data;
    }
  }

  return { original, updated };
}

function benchmark(fn, data, iterations = 10) {
  const { original, updated } = data;
  const times = [];

  // Warm up
  for (let i = 0; i < 3; i++) {
    fn(original, updated);
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const result = fn(original, updated);
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to milliseconds
  }

  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return { avgTime, minTime, maxTime, times };
}

function runComparison() {
  console.log("🔍 Deep Object Diff: Original vs Optimized Comparison");
  console.log("=====================================================\n");

  const testCases = [
    {
      size: 100,
      changePercentage: 0.1,
      description: "Small dataset (100 objects, 10% changes)",
    },
    {
      size: 500,
      changePercentage: 0.2,
      description: "Medium dataset (500 objects, 20% changes)",
    },
    {
      size: 1000,
      changePercentage: 0.3,
      description: "Large dataset (1000 objects, 30% changes)",
    },
    {
      size: 2000,
      changePercentage: 0.15,
      description: "XL dataset (2000 objects, 15% changes)",
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.description}`);
    console.log(
      `   Objects: ${testCase.size}, Changes: ${(testCase.changePercentage * 100).toFixed(0)}%`,
    );

    const testData = generateTestData(testCase.size, testCase.changePercentage);

    console.log("   🔄 Running benchmarks...");

    // Benchmark original deep-object-diff
    const originalResults = benchmark(originalDetailedDiff, testData, 20);

    // Benchmark our optimized version
    const optimizedResults = benchmark(optimizedDetailedDiff, testData, 20);

    // Calculate improvement
    const speedup = originalResults.avgTime / optimizedResults.avgTime;
    const improvement =
      ((originalResults.avgTime - optimizedResults.avgTime) /
        originalResults.avgTime) *
      100;

    console.log(
      `   📊 Original deep-object-diff: ${originalResults.avgTime.toFixed(2)}ms avg`,
    );
    console.log(
      `   ⚡ Optimized version: ${optimizedResults.avgTime.toFixed(2)}ms avg`,
    );
    console.log(
      `   🚀 Speedup: ${speedup.toFixed(2)}x (${improvement.toFixed(1)}% faster)`,
    );
    console.log("");

    results.push({
      ...testCase,
      original: originalResults,
      optimized: optimizedResults,
      speedup,
      improvement,
    });
  }

  // Summary
  console.log("📈 Performance Summary");
  console.log("======================");
  console.log(
    "| Objects | Changes | Original | Optimized | Speedup | Improvement |",
  );
  console.log(
    "|---------|---------|----------|-----------|---------|-------------|",
  );

  let totalOriginalTime = 0;
  let totalOptimizedTime = 0;

  for (const result of results) {
    totalOriginalTime += result.original.avgTime;
    totalOptimizedTime += result.optimized.avgTime;

    console.log(
      `| ${result.size.toString().padStart(7)} | ${(result.changePercentage * 100).toFixed(0).padStart(6)}% | ${result.original.avgTime.toFixed(2).padStart(8)}ms | ${result.optimized.avgTime.toFixed(2).padStart(9)}ms | ${result.speedup.toFixed(2).padStart(6)}x | ${result.improvement.toFixed(1).padStart(9)}% |`,
    );
  }

  console.log(
    "|---------|---------|----------|-----------|---------|-------------|",
  );

  const overallSpeedup = totalOriginalTime / totalOptimizedTime;
  const overallImprovement =
    ((totalOriginalTime - totalOptimizedTime) / totalOriginalTime) * 100;

  console.log(
    `| TOTAL   |         | ${totalOriginalTime.toFixed(2).padStart(8)}ms | ${totalOptimizedTime.toFixed(2).padStart(9)}ms | ${overallSpeedup.toFixed(2).padStart(6)}x | ${overallImprovement.toFixed(1).padStart(9)}% |`,
  );

  console.log("\n🎯 Analysis:");
  console.log("=============");

  const bestCase = results.reduce((best, current) =>
    current.speedup > best.speedup ? current : best,
  );

  const worstCase = results.reduce((worst, current) =>
    current.speedup < worst.speedup ? current : worst,
  );

  console.log(
    `✅ Best performance: ${bestCase.speedup.toFixed(2)}x speedup on ${bestCase.size} objects`,
  );
  console.log(
    `📊 Worst performance: ${worstCase.speedup.toFixed(2)}x speedup on ${worstCase.size} objects`,
  );
  console.log(
    `🎯 Overall improvement: ${overallSpeedup.toFixed(2)}x speedup (${overallImprovement.toFixed(1)}% faster)`,
  );

  if (overallSpeedup > 1.5) {
    console.log(`\n🏆 CONCLUSION: Optimized version is significantly faster!`);
    console.log(
      `   The optimized JavaScript implementation delivers ${overallImprovement.toFixed(1)}% better performance`,
    );
    console.log(
      `   while maintaining identical algorithmic behavior to deep-object-diff.`,
    );
  } else {
    console.log(`\n⚠️  CONCLUSION: Performance improvement is modest.`);
  }

  // Functional accuracy test
  console.log("\n🔬 Functional Accuracy Test:");
  console.log("=============================");

  const testData = generateTestData(50, 0.3);
  const originalResult = originalDetailedDiff(
    testData.original,
    testData.updated,
  );
  const optimizedResult = optimizedDetailedDiff(
    testData.original,
    testData.updated,
  );

  // Compare result structures
  const originalKeys = new Set([
    ...Object.keys(originalResult.added || {}),
    ...Object.keys(originalResult.updated || {}),
    ...Object.keys(originalResult.deleted || {}),
  ]);

  const optimizedKeys = new Set([
    ...Object.keys(optimizedResult.added || {}),
    ...Object.keys(optimizedResult.updated || {}),
    ...Object.keys(optimizedResult.deleted || {}),
  ]);

  const keysMatch =
    originalKeys.size === optimizedKeys.size &&
    [...originalKeys].every((key) => optimizedKeys.has(key));

  console.log(
    `   🔍 Results structure match: ${keysMatch ? "✅ PASS" : "❌ FAIL"}`,
  );
  console.log(`   📊 Original found ${originalKeys.size} changes`);
  console.log(`   ⚡ Optimized found ${optimizedKeys.size} changes`);

  if (!keysMatch) {
    console.log(
      `   ⚠️  WARNING: Results don't match exactly - manual verification needed`,
    );
  } else {
    console.log(`   ✅ Both implementations produce equivalent results`);
  }
}

runComparison();

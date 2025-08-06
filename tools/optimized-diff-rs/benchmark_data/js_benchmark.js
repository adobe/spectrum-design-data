import fs from "fs";
import path from "path";
import { detailedDiff } from "../../optimized-diff/src/engine.js";

const testDir = process.argv[2];
if (!testDir) {
  console.error("Usage: node js_benchmark.js <test_directory>");
  process.exit(1);
}

console.log("📊 JavaScript Performance Benchmark");
console.log("====================================");

const original = JSON.parse(
  fs.readFileSync(path.join(testDir, "original.json"), "utf8"),
);
const updated = JSON.parse(
  fs.readFileSync(path.join(testDir, "updated.json"), "utf8"),
);

const iterations = 10;
let totalTime = 0;

// Warm up
for (let i = 0; i < 3; i++) {
  detailedDiff(original, updated);
}

console.log(`Running ${iterations} iterations...`);

for (let i = 0; i < iterations; i++) {
  const start = process.hrtime.bigint();
  const result = detailedDiff(original, updated);
  const end = process.hrtime.bigint();
  totalTime += Number(end - start);
}

const avgTimeNs = totalTime / iterations;
const avgTimeMs = avgTimeNs / 1_000_000;

console.log(`\n📈 JavaScript Results:`);
console.log(`   Average time: ${avgTimeMs.toFixed(2)}ms`);
console.log(`   Object count: ${Object.keys(original).length}`);

const jsResults = {
  avgTimeMs,
  iterations,
  objectCount: Object.keys(original).length,
};

fs.writeFileSync(
  path.join(testDir, "js_results.json"),
  JSON.stringify(jsResults, null, 2),
);
console.log(`✅ Results saved to js_results.json`);

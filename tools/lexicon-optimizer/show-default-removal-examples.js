#!/usr/bin/env node

console.log('🎯 REMOVING "-default" SUFFIX EXAMPLES');
console.log("=".repeat(60));

// Sample of the 88 tokens that need fixing
const examples = [
  // Color tokens
  "accent-background-color-default",
  "neutral-background-color-default",
  "blue-background-color-default",
  "informative-background-color-default",
  "negative-background-color-default",
  "positive-background-color-default",

  // Icon color tokens
  "icon-color-primary-default",
  "icon-color-blue-primary-default",
  "icon-color-green-primary-default",

  // Layout tokens
  "background-opacity-default",
  "card-minimum-width-default",
  "tree-view-item-to-item-default",

  // Corner radius tokens
  "corner-radius-small-default",
  "corner-radius-medium-default",
  "corner-radius-large-default",

  // Component-specific tokens
  "menu-item-background-color-default",
  "stack-item-selected-background-color-default",
  "tree-view-selected-row-background-default",
];

console.log("\n📝 BEFORE → AFTER TRANSFORMATIONS");
console.log("-".repeat(50));

examples.forEach((token) => {
  const cleaned = token.replace("-default", "");
  console.log(`${token}`);
  console.log(`  → ${cleaned}`);
  console.log("");
});

console.log('💡 BENEFITS OF REMOVING "-default":');
console.log("-".repeat(50));
console.log("✅ Cleaner, more concise naming");
console.log("✅ Default state is implied by absence of modifier");
console.log("✅ Follows design system best practices");
console.log('✅ Eliminates ambiguity about what "default" means');
console.log("✅ Easier to read and understand");
console.log("✅ Consistent with state-based naming patterns");

console.log("\n🎯 IMPLEMENTATION STRATEGY:");
console.log("-".repeat(50));
console.log('1. Find all tokens ending with "-default"');
console.log('2. Remove the "-default" suffix');
console.log("3. Update all references to use new names");
console.log("4. Test that all references work correctly");
console.log("5. Document the new naming convention");

console.log("\n📊 IMPACT:");
console.log("-".repeat(50));
console.log("• 88 token names will be simplified");
console.log("• 180+ value references will need updating");
console.log("• 7 token files will be affected");
console.log("• Significant improvement in clarity and maintainability");

console.log(
  '\n✅ This approach is much cleaner than replacing with "rest" or "base"!',
);

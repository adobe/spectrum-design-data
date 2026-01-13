import * as registry from "@adobe/design-system-registry";

function getAllTerms() {
  const allTerms = [];
  const registryTypes = [
    "sizes",
    "states",
    "variants",
    "anatomyTerms",
    "components",
    "scaleValues",
    "categories",
    "platforms",
    "navigationTerms",
    "tokenTerminology",
    "glossary",
  ];

  registryTypes.forEach((type) => {
    const data = registry[type];
    if (data && data.values) {
      data.values.forEach((term) => {
        allTerms.push({
          ...term,
          registryType: type,
          registryLabel: data.label || type,
        });
      });
    }
  });

  return allTerms;
}

function getEnhancedTerms() {
  return getAllTerms().filter((t) => t.definition);
}

function getStats() {
  const allTerms = getAllTerms();
  const enhancedTerms = getEnhancedTerms();

  return {
    totalTerms: allTerms.length,
    enhancedTerms: enhancedTerms.length,
    registries: 11,
    platforms: registry.platforms?.values?.length || 0,
    lastUpdated: new Date().toISOString(),
  };
}

export default {
  sizes: registry.sizes,
  states: registry.states,
  variants: registry.variants,
  anatomyTerms: registry.anatomyTerms,
  components: registry.components,
  scaleValues: registry.scaleValues,
  categories: registry.categories,
  platforms: registry.platforms,
  navigationTerms: registry.navigationTerms,
  tokenTerminology: registry.tokenTerminology,
  glossary: registry.glossary,

  // Helper functions
  allTerms: getAllTerms(),
  enhancedTerms: getEnhancedTerms(),
  stats: getStats(),
};

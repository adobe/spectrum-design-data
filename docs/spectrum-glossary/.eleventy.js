import * as registry from "@adobe/design-system-registry";

export default async function (eleventyConfig) {
  // Pass through assets
  eleventyConfig.addPassthroughCopy("src/assets");

  // Don't delete API directory on clean builds
  eleventyConfig.setServerOptions({
    watch: ["dist/api/**/*"],
  });

  // Add collections for terms
  eleventyConfig.addCollection("allTerms", function (collectionApi) {
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
  });

  eleventyConfig.addCollection("categories", function (collectionApi) {
    const registryTypes = {
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
    };

    return Object.entries(registryTypes).map(([id, data]) => ({
      id,
      label: data.label || id,
      description: data.description || "",
      terms: data.values || [],
    }));
  });

  // Add filters
  eleventyConfig.addFilter("termById", function (terms, termId) {
    return terms.find((t) => t.id === termId);
  });

  eleventyConfig.addFilter("relatedTerms", function (terms, termIds) {
    if (!termIds || !Array.isArray(termIds)) return [];
    return terms.filter((t) => termIds.includes(t.id));
  });

  eleventyConfig.addFilter("sortByLabel", function (terms) {
    return [...terms].sort((a, b) =>
      (a.label || a.id).localeCompare(b.label || b.id),
    );
  });

  eleventyConfig.addFilter("filterByRegistry", function (terms, registryType) {
    return terms.filter((t) => t.registryType === registryType);
  });

  eleventyConfig.addFilter("hasDefinition", function (terms) {
    return terms.filter((t) => t.definition);
  });

  eleventyConfig.addFilter("limit", function (array, limit) {
    return array.slice(0, limit);
  });

  eleventyConfig.addFilter("truncate", function (text, length) {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + "...";
  });

  // Markdown configuration
  const markdownIt = (await import("markdown-it")).default;
  const markdownItPrism = (await import("markdown-it-prism")).default;
  const md = markdownIt({ html: true }).use(markdownItPrism);
  eleventyConfig.setLibrary("md", md);

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}

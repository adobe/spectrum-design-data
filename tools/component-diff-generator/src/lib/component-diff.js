/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { detailedDiff } from "@adobe/spectrum-diff-core";

/**
 * Analyzes component schema changes and categorizes them as breaking or non-breaking
 * @param {Object} original - Original component schemas
 * @param {Object} updated - Updated component schemas
 * @returns {Object} Categorized diff result
 */
export default function componentDiff(original, updated) {
  const changes = detailedDiff(original, updated);

  // Identify which components were added, deleted, or updated
  const componentChanges = categorizeComponentChanges(
    original,
    updated,
    changes,
  );

  const addedComponents = analyzeAddedComponents(componentChanges.added);
  const deletedComponents = analyzeDeletedComponents(componentChanges.deleted);
  const updatedComponents = analyzeUpdatedComponents(
    componentChanges.updated,
    original,
    updated,
  );

  return formatComponentResult(
    addedComponents,
    deletedComponents,
    updatedComponents,
  );
}

/**
 * Categorizes component-level changes from detailed diff
 * @param {Object} original - Original schemas
 * @param {Object} updated - Updated schemas
 * @param {Object} changes - Detailed diff changes
 * @returns {Object} Component-level categorization
 */
export function categorizeComponentChanges(original, updated, changes) {
  const result = {
    added: {},
    deleted: {},
    updated: {},
  };

  // Find truly new components (only in updated)
  for (const componentName of Object.keys(updated)) {
    if (!original[componentName]) {
      result.added[componentName] = updated[componentName];
    }
  }

  // Find deleted components (only in original)
  for (const componentName of Object.keys(original)) {
    if (!updated[componentName]) {
      result.deleted[componentName] = original[componentName];
    }
  }

  // Find updated components (exist in both but have changes)
  for (const componentName of Object.keys(original)) {
    if (
      updated[componentName] &&
      (changes.added[componentName] ||
        changes.deleted[componentName] ||
        changes.updated[componentName])
    ) {
      // Pass only the component-specific changes
      result.updated[componentName] = {
        added: changes.added[componentName] || {},
        deleted: changes.deleted[componentName] || {},
        updated: changes.updated[componentName] || {},
      };
    }
  }

  return result;
}

/**
 * Analyzes added components (always non-breaking)
 * @param {Object} added - Added components from diff
 * @returns {Object} Categorized added components
 */
export function analyzeAddedComponents(added) {
  const result = {
    breaking: {},
    nonBreaking: {},
  };

  // All new components are non-breaking
  Object.keys(added).forEach((componentName) => {
    result.nonBreaking[componentName] = {
      type: "added",
      schema: added[componentName],
    };
  });

  return result;
}

/**
 * Analyzes deleted components (always breaking)
 * @param {Object} deleted - Deleted components from diff
 * @returns {Object} Categorized deleted components
 */
export function analyzeDeletedComponents(deleted) {
  const result = {
    breaking: {},
    nonBreaking: {},
  };

  // All deleted components are breaking
  Object.keys(deleted).forEach((componentName) => {
    result.breaking[componentName] = {
      type: "deleted",
      schema: deleted[componentName],
    };
  });

  return result;
}

/**
 * Analyzes updated components and determines breaking vs non-breaking changes
 * @param {Object} updatedComponents - Components that have been updated
 * @param {Object} original - Original schemas for context
 * @param {Object} updatedSchemas - Updated schemas for context
 * @returns {Object} Categorized updated components
 */
export function analyzeUpdatedComponents(
  updatedComponents,
  original,
  updatedSchemas,
) {
  const result = {
    breaking: {},
    nonBreaking: {},
  };

  Object.keys(updatedComponents).forEach((componentName) => {
    const componentChanges = updatedComponents[componentName];
    const isBreaking = isComponentChangeBreaking(
      componentChanges,
      original[componentName],
      updatedSchemas[componentName],
    );

    const category = isBreaking ? "breaking" : "nonBreaking";
    result[category][componentName] = {
      type: "updated",
      changes: componentChanges,
      isBreaking,
    };
  });

  return result;
}

/**
 * Determines if a component change is breaking based on JSON Schema rules
 * @param {Object} changes - The specific changes to the component (contains added, deleted, updated)
 * @param {Object} originalSchema - Original component schema
 * @param {Object} updatedSchema - Updated component schema
 * @returns {boolean} True if breaking, false if non-breaking
 */
export function isComponentChangeBreaking(
  changes,
  originalSchema,
  updatedSchema,
) {
  // Check for deleted properties that are truly deleted (not just updated)
  if (changes.deleted && Object.keys(changes.deleted).length > 0) {
    // Special case: check if what appears to be "deleted" is actually just updated
    if (changes.deleted.properties) {
      const deletedProps = Object.keys(changes.deleted.properties);

      for (const prop of deletedProps) {
        // Check if this property still exists in the updated schema
        if (!updatedSchema?.properties?.[prop]) {
          // Property was truly deleted - breaking
          return true;
        } else {
          // Property still exists, but check if we deleted specific values (like enum values)
          const deletedContent = changes.deleted.properties[prop];
          if (
            deletedContent &&
            typeof deletedContent === "object" &&
            Object.keys(deletedContent).length > 0
          ) {
            // If there's actual deleted content, check what was deleted

            // Removing enum values should be breaking
            if (
              deletedContent.enum &&
              Object.keys(deletedContent.enum).length > 0
            ) {
              return true;
            }

            // Removing default values is typically non-breaking (especially default: null)
            if (
              Object.keys(deletedContent).length === 1 &&
              "default" in deletedContent
            ) {
              // Only a default was removed - this is generally non-breaking
              continue;
            }

            // Other property deletions within an existing property may be breaking
            // Add other specific breaking change checks here as needed
          }
        }
      }
    } else {
      // For non-property deletions, consider them breaking
      return true;
    }
  }

  // Check for added required properties (breaking)
  if (changes.added) {
    const addedChanges = changes.added;
    // Check if required fields were added directly to this component
    if (
      addedChanges.required &&
      Object.keys(addedChanges.required).length > 0
    ) {
      return true;
    }
  }

  // For now, let's consider enum restrictions as non-breaking since we're adding values
  // In a real implementation, you'd want to check if enum values were removed

  // Check for title or schema changes (potentially breaking)
  if (changes.updated && Object.keys(changes.updated).length > 0) {
    const updatedChanges = changes.updated;
    // Check if title or $schema fields were updated directly in this component
    if (updatedChanges.title || updatedChanges.$schema) {
      return true;
    }
  }

  // Default to non-breaking for other changes (like adding optional properties or enum values)
  return false;
}

/**
 * Formats the component diff result
 * @param {Object} addedComponents - Added component analysis
 * @param {Object} deletedComponents - Deleted component analysis
 * @param {Object} updatedComponents - Updated component analysis
 * @returns {Object} Formatted result
 */
export function formatComponentResult(
  addedComponents,
  deletedComponents,
  updatedComponents,
) {
  return {
    summary: {
      hasBreakingChanges:
        Object.keys(deletedComponents.breaking).length > 0 ||
        Object.keys(updatedComponents.breaking).length > 0,
      totalComponents: {
        added: Object.keys(addedComponents.nonBreaking).length,
        deleted: Object.keys(deletedComponents.breaking).length,
        updated:
          Object.keys(updatedComponents.breaking).length +
          Object.keys(updatedComponents.nonBreaking).length,
      },
      breakingChanges:
        Object.keys(deletedComponents.breaking).length +
        Object.keys(updatedComponents.breaking).length,
      nonBreakingChanges:
        Object.keys(addedComponents.nonBreaking).length +
        Object.keys(updatedComponents.nonBreaking).length,
    },
    changes: {
      added: addedComponents.nonBreaking,
      deleted: deletedComponents.breaking,
      updated: {
        breaking: updatedComponents.breaking,
        nonBreaking: updatedComponents.nonBreaking,
      },
    },
  };
}

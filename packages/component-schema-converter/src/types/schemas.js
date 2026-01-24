/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * @fileoverview Type definitions for plugin and official schema formats
 */

/**
 * @typedef {'string' | 'boolean' | 'localEnum' | 'systemEnum' | 'size' | 'state' | 'icon' | 'color' | 'dimension'} OptionType
 */

/**
 * @typedef {Object} PluginOption
 * @property {string} title - Option name
 * @property {OptionType} type - Option type
 * @property {Array<string>} [items] - Enum values (for localEnum, systemEnum, size, state)
 * @property {string} [description] - Option description
 * @property {string | boolean | number} [defaultValue] - Default value
 * @property {boolean} [required] - Whether option is required
 */

/**
 * @typedef {Object} PluginMeta
 * @property {string} category - Component category
 * @property {string} documentationUrl - Documentation URL
 */

/**
 * @typedef {Object} PluginComponent
 * @property {string} title - Component title
 * @property {PluginMeta} meta - Component metadata
 * @property {Array<PluginOption>} options - Component options
 */

/**
 * @typedef {Object} SchemaProperty
 * @property {string} [type] - JSON Schema type (string, boolean, number, etc.)
 * @property {Array<string>} [enum] - Enum values
 * @property {string | boolean | number} [default] - Default value
 * @property {string} [$ref] - Reference to another schema
 * @property {string} [description] - Property description
 */

/**
 * @typedef {Object} SchemaMeta
 * @property {string} category - Component category
 * @property {string} documentationUrl - Documentation URL
 */

/**
 * @typedef {Object} OfficialSchema
 * @property {string} $schema - JSON Schema version URL
 * @property {string} $id - Schema ID URL
 * @property {string} title - Component title
 * @property {string} description - Component description
 * @property {SchemaMeta} meta - Component metadata
 * @property {string} type - Should be "object"
 * @property {Object<string, SchemaProperty>} [properties] - Component properties
 * @property {Array<string>} [required] - Required property names
 */

/**
 * @typedef {Object} ConversionOptions
 * @property {string} [description] - Component description (required for plugin→schema)
 * @property {boolean} [includeSchemaMetadata=true] - Include $schema and $id fields
 */

export {};

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
 * @fileoverview TypeScript type definitions for component-schema-converter
 */

export type OptionType =
  | "string"
  | "boolean"
  | "localEnum"
  | "systemEnum"
  | "size"
  | "state"
  | "icon"
  | "color"
  | "dimension";

export interface PluginOption {
  title: string;
  type: OptionType;
  items?: Array<string>;
  description?: string;
  defaultValue?: string | boolean | number;
  required?: boolean;
}

export interface PluginMeta {
  category: string;
  documentationUrl: string;
}

export interface PluginComponent {
  title: string;
  meta: PluginMeta;
  options: Array<PluginOption>;
}

export interface SchemaProperty {
  type?: string;
  enum?: Array<string>;
  default?: string | boolean | number;
  $ref?: string;
  description?: string;
}

export interface SchemaMeta {
  category: string;
  documentationUrl: string;
}

export interface OfficialSchema {
  $schema?: string;
  $id?: string;
  title: string;
  description: string;
  meta: SchemaMeta;
  type: string;
  properties?: Record<string, SchemaProperty>;
  required?: Array<string>;
}

export interface ConversionOptions {
  description?: string;
  includeSchemaMetadata?: boolean;
}

// Converter functions
export function convertPluginToSchema(
  pluginData: PluginComponent,
  options: ConversionOptions,
): OfficialSchema;

export function convertSchemaToPlugin(schema: OfficialSchema): PluginComponent;

// Validation functions
export function validatePluginFormat(data: any): boolean;
export function validateOfficialSchema(schema: any): boolean;
export function validateAgainstJsonSchema(schema: any): boolean;
export function validateConversionRequirements(
  data: any,
  options?: ConversionOptions,
): boolean;
export function getValidCategories(): Array<string>;
export function getValidOptionTypes(): Array<string>;

// Type detection utilities
export function isSizeEnum(values: Array<string>): boolean;
export function isStateEnum(values: Array<string>): boolean;
export function isIconRef(ref: string): boolean;
export function isColorRef(ref: string): boolean;
export function detectOptionType(property: SchemaProperty): OptionType;
export function isValidHexColor(value: string): boolean;
export function getValidSizeValues(): Array<string>;
export function getStateKeywords(): Array<string>;

// Schema generation utilities
export function toKebabCase(title: string): string;
export function generateSchemaId(title: string): string;
export function generateIconRef(): string;
export function generateColorRef(): string;
export function getSchemaBaseUrl(): string;
export const JSON_SCHEMA_VERSION: string;

// Error handling
export class SchemaConversionError extends Error {
  details: {
    field?: string;
    expected?: any;
    received?: any;
    suggestion?: string;
    validationErrors?: Array<any>;
  };
}

export function createMissingFieldError(field: string): SchemaConversionError;
export function createInvalidFieldError(
  field: string,
  expected: any,
  received: any,
  suggestion?: string,
): SchemaConversionError;
export function createInvalidTypeError(
  type: string,
  validTypes: Array<string>,
): SchemaConversionError;
export function createValidationError(
  message: string,
  errors?: Array<any>,
): SchemaConversionError;

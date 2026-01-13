/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

import test from "ava";
import { extractLineColumn } from "./jsonErrorUtils.js";

// Basic functionality
test("extractLineColumn - should return line 1, column 1 for position 0", (t) => {
  const result = extractLineColumn('{"foo": "bar"}', 0);
  t.deepEqual(result, { line: 1, column: 1 });
});

test("extractLineColumn - should handle single line text", (t) => {
  const text = '{"name": "value"}';
  const result = extractLineColumn(text, 8);
  t.deepEqual(result, { line: 1, column: 9 });
});

test("extractLineColumn - should count lines correctly", (t) => {
  const text = '{\n  "foo": "bar"\n}';
  const result = extractLineColumn(text, 12);
  t.deepEqual(result, { line: 2, column: 11 });
});

test("extractLineColumn - should handle position at newline", (t) => {
  const text = "line1\nline2";
  const result = extractLineColumn(text, 5);
  t.deepEqual(result, { line: 1, column: 6 });
});

test("extractLineColumn - should handle position after newline", (t) => {
  const text = "line1\nline2";
  const result = extractLineColumn(text, 6);
  t.deepEqual(result, { line: 2, column: 1 });
});

// Edge cases
test("extractLineColumn - should handle empty string", (t) => {
  const result = extractLineColumn("", 0);
  t.deepEqual(result, { line: 1, column: 1 });
});

test("extractLineColumn - should handle position at end of text", (t) => {
  const text = '{"test": true}';
  const result = extractLineColumn(text, text.length);
  t.deepEqual(result, { line: 1, column: text.length + 1 });
});

test("extractLineColumn - should handle multiple consecutive newlines", (t) => {
  const text = "line1\n\n\nline4";
  const result = extractLineColumn(text, 8);
  t.deepEqual(result, { line: 4, column: 1 });
});

test("extractLineColumn - should handle text with only newlines", (t) => {
  const text = "\n\n\n";
  const result = extractLineColumn(text, 2);
  t.deepEqual(result, { line: 3, column: 1 });
});

test("extractLineColumn - should handle Windows-style line endings (CRLF)", (t) => {
  const text = "line1\r\nline2\r\nline3";
  const result = extractLineColumn(text, 14);
  t.is(result.line, 3);
});

// Real-world JSON scenarios
test("extractLineColumn - should handle formatted JSON with indentation", (t) => {
  const json = `{
  "title": "Button",
  "meta": {
    "category": "actions"
  }
}`;
  const position = json.indexOf('"actions"');
  const result = extractLineColumn(json, position);
  t.is(result.line, 4);
  t.true(result.column > 1);
});

test("extractLineColumn - should handle minified JSON", (t) => {
  const json = '{"title":"Button","meta":{"category":"actions"}}';
  const position = json.indexOf('"actions"');
  const result = extractLineColumn(json, position);
  t.is(result.line, 1);
  t.is(result.column, position + 1);
});

test("extractLineColumn - should handle JSON parse error position", (t) => {
  const json = `{
  "title": "Button",
  "value": undefined
}`;
  const position = json.indexOf("undefined");
  const result = extractLineColumn(json, position);
  t.is(result.line, 3);
  t.true(result.column > 10);
});

test("extractLineColumn - should handle deeply nested JSON", (t) => {
  const json = `{
  "level1": {
    "level2": {
      "level3": {
        "error": here
      }
    }
  }
}`;
  const position = json.indexOf("here");
  const result = extractLineColumn(json, position);
  t.is(result.line, 5);
});

// Performance considerations
test("extractLineColumn - should handle large text efficiently", (t) => {
  const largeJson = "{\n" + '  "item": "value",\n'.repeat(1000) + "}";
  const position = largeJson.length - 10;

  const startTime = performance.now();
  const result = extractLineColumn(largeJson, position);
  const endTime = performance.now();

  t.true(result.line > 1000);
  t.true(endTime - startTime < 10);
});

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

import test from "ava";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import storeOutput from "../src/lib/store-output.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create temporary test directory
const createTempDir = () => {
  const tempDir = path.join(__dirname, "temp-test-output");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

// Helper to clean up test files
const cleanup = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
};

test("storeOutput - creates file with content", (t) => {
  const tempDir = createTempDir();
  const testFile = path.join(tempDir, "test-output.txt");
  const testContent = "This is test content for storeOutput";

  // Call the function
  storeOutput(testFile, testContent);

  // Verify the file was created and has correct content
  t.true(fs.existsSync(testFile));
  const fileContent = fs.readFileSync(testFile, "utf8");
  t.is(fileContent, testContent);

  // Cleanup
  cleanup(testFile);
});

test("storeOutput - creates nested directories", (t) => {
  const tempDir = createTempDir();
  const nestedFile = path.join(tempDir, "nested", "deep", "output.json");
  const testContent = '{"test": "data"}';

  // Call the function
  storeOutput(nestedFile, testContent);

  // Verify the nested directories and file were created
  t.true(fs.existsSync(nestedFile));
  const fileContent = fs.readFileSync(nestedFile, "utf8");
  t.is(fileContent, testContent);

  // Cleanup
  cleanup(nestedFile);
  cleanup(path.join(tempDir, "nested", "deep"));
  cleanup(path.join(tempDir, "nested"));
});

test("storeOutput - overwrites existing file", (t) => {
  const tempDir = createTempDir();
  const testFile = path.join(tempDir, "overwrite-test.txt");
  const originalContent = "Original content";
  const newContent = "New content";

  // Create initial file
  fs.writeFileSync(testFile, originalContent);
  t.is(fs.readFileSync(testFile, "utf8"), originalContent);

  // Overwrite with storeOutput
  storeOutput(testFile, newContent);

  // Verify it was overwritten
  t.true(fs.existsSync(testFile));
  const fileContent = fs.readFileSync(testFile, "utf8");
  t.is(fileContent, newContent);

  // Cleanup
  cleanup(testFile);
});

test("storeOutput - handles invalid paths gracefully", (t) => {
  // Mock console methods to capture error output
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const logs = [];
  const errors = [];

  console.log = (msg) => logs.push(msg);
  console.error = (error) => errors.push(error);

  // Try to write to an invalid path (null device or invalid characters)
  const invalidPath =
    process.platform === "win32" ? "\\0\\invalid" : "/dev/null/invalid";
  const testContent = "test content";

  // This should not throw, but should log errors
  t.notThrows(() => {
    storeOutput(invalidPath, testContent);
  });

  // Verify error was logged
  t.true(logs.some((log) => log.includes("FAILED TO WRITE OUTPUT FILE")));
  t.true(errors.length > 0);

  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

test("storeOutput - handles empty content", (t) => {
  const tempDir = createTempDir();
  const testFile = path.join(tempDir, "empty-test.txt");
  const emptyContent = "";

  // Call the function with empty content
  storeOutput(testFile, emptyContent);

  // Verify the file was created and is empty
  t.true(fs.existsSync(testFile));
  const fileContent = fs.readFileSync(testFile, "utf8");
  t.is(fileContent, emptyContent);

  // Cleanup
  cleanup(testFile);
});

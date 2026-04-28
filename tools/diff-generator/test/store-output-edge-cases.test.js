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

import test from "ava";
import storeOutput from "../src/lib/store-output.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to cleanup test files
function cleanup(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Store Output Edge Case Tests

test("storeOutput - very large file handling", (t) => {
  const testFile = path.join(__dirname, "large-test-output.txt");

  // Create a large string (5MB)
  const largeContent = "A".repeat(5 * 1024 * 1024);

  try {
    storeOutput(testFile, largeContent);

    // Verify file was written correctly
    t.true(fs.existsSync(testFile));
    const fileContent = fs.readFileSync(testFile, "utf8");
    t.is(fileContent.length, largeContent.length);
    t.true(fileContent.startsWith("AAA"));
  } finally {
    cleanup(testFile);
  }
});

test("storeOutput - empty string handling", (t) => {
  const testFile = path.join(__dirname, "empty-test-output.txt");

  try {
    storeOutput(testFile, "");

    // Verify empty file was created
    t.true(fs.existsSync(testFile));
    const fileContent = fs.readFileSync(testFile, "utf8");
    t.is(fileContent, "");
  } finally {
    cleanup(testFile);
  }
});

test("storeOutput - special characters in content", (t) => {
  const testFile = path.join(__dirname, "special-chars-test.txt");

  const specialContent =
    "Unicode: 🎨🚀💫\nNewlines:\n\nTabs:\t\tSpaces:   \nEmoji: 👍🎉\nSymbols: ©®™€$¢£¥";

  try {
    storeOutput(testFile, specialContent);

    // Verify special characters were preserved
    t.true(fs.existsSync(testFile));
    const fileContent = fs.readFileSync(testFile, "utf8");
    t.is(fileContent, specialContent);
    t.true(fileContent.includes("🎨"));
    t.true(fileContent.includes("©®™"));
  } finally {
    cleanup(testFile);
  }
});

test("storeOutput - nested directory creation", (t) => {
  const nestedDir = path.join(__dirname, "test-nested", "deep", "directory");
  const testFile = path.join(nestedDir, "nested-test.txt");
  const testContent = "Nested directory test content";

  try {
    storeOutput(testFile, testContent);

    // Verify nested directories were created
    t.true(fs.existsSync(nestedDir));
    t.true(fs.existsSync(testFile));

    const fileContent = fs.readFileSync(testFile, "utf8");
    t.is(fileContent, testContent);
  } finally {
    cleanup(testFile);
    // Cleanup nested directories
    try {
      fs.rmSync(path.join(__dirname, "test-nested"), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

test("storeOutput - file overwrite behavior", (t) => {
  const testFile = path.join(__dirname, "overwrite-test.txt");
  const originalContent = "Original content";
  const newContent = "New content that replaces original";

  try {
    // Write original content
    storeOutput(testFile, originalContent);
    t.true(fs.existsSync(testFile));

    let fileContent = fs.readFileSync(testFile, "utf8");
    t.is(fileContent, originalContent);

    // Overwrite with new content
    storeOutput(testFile, newContent);

    fileContent = fs.readFileSync(testFile, "utf8");
    t.is(fileContent, newContent);
    t.false(fileContent.includes("Original"));
  } finally {
    cleanup(testFile);
  }
});

test("storeOutput - invalid path characters handling", (t) => {
  // Test platform-specific invalid path handling
  let invalidPath;
  if (process.platform === "win32") {
    // Windows invalid characters
    invalidPath = path.join(__dirname, 'invalid<>:"|?*.txt');
  } else {
    // Unix-like systems - null character is invalid
    invalidPath = path.join(__dirname, "invalid\0file.txt");
  }

  const testContent = "This should not be written";

  // Mock console.error to capture error messages
  const originalConsoleError = console.error;
  let errorMessages = [];
  console.error = (msg) => {
    errorMessages.push(msg);
  };

  try {
    t.throws(
      () => {
        storeOutput(invalidPath, testContent);
      },
      {
        message: /Failed to write output file/,
      },
    );

    // Should have logged error before throwing
    t.true(errorMessages.length > 0);
    t.true(
      errorMessages.some(
        (msg) =>
          typeof msg === "string" &&
          msg.includes("Failed to write output file"),
      ),
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("storeOutput - read-only directory handling", (t) => {
  // Create a directory and make it read-only
  const readOnlyDir = path.join(__dirname, "readonly-test");
  const testFile = path.join(readOnlyDir, "test.txt");

  // Skip this test on Windows as chmod behavior is different
  if (process.platform === "win32") {
    t.pass("Skipping read-only directory test on Windows");
    return;
  }

  try {
    // Create directory
    if (!fs.existsSync(readOnlyDir)) {
      fs.mkdirSync(readOnlyDir);
    }

    // Make directory read-only
    fs.chmodSync(readOnlyDir, 0o444); // Read-only permissions

    const originalConsoleError = console.error;
    let errorLogged = false;
    console.error = (msg) => {
      if (
        typeof msg === "string" &&
        (msg.includes("Permission denied") || msg.includes("Failed to"))
      ) {
        errorLogged = true;
      }
    };

    t.throws(
      () => {
        storeOutput(testFile, "test content");
      },
      {
        message: /Permission denied writing to file/,
      },
    );

    t.true(errorLogged);

    console.error = originalConsoleError;
  } finally {
    // Restore directory permissions for cleanup
    try {
      if (fs.existsSync(readOnlyDir)) {
        fs.chmodSync(readOnlyDir, 0o755);
        fs.rmSync(readOnlyDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

test("storeOutput - concurrent write handling", async (t) => {
  const testFile = path.join(__dirname, "concurrent-test.txt");
  const content1 = "Content from writer 1";
  const content2 = "Content from writer 2";

  try {
    // Attempt concurrent writes
    const promises = [
      new Promise((resolve) => {
        setTimeout(() => {
          try {
            storeOutput(testFile, content1);
            resolve("writer1");
          } catch (error) {
            resolve(`writer1-error: ${error.message}`);
          }
        }, 10);
      }),
      new Promise((resolve) => {
        setTimeout(() => {
          try {
            storeOutput(testFile, content2);
            resolve("writer2");
          } catch (error) {
            resolve(`writer2-error: ${error.message}`);
          }
        }, 20);
      }),
    ];

    const results = await Promise.all(promises);

    // Both should complete (though one will overwrite the other)
    t.true(results.every((result) => result.includes("writer")));

    // File should exist and contain one of the contents
    t.true(fs.existsSync(testFile));
    const finalContent = fs.readFileSync(testFile, "utf8");
    t.true(finalContent === content1 || finalContent === content2);
  } finally {
    cleanup(testFile);
  }
});

test("storeOutput - null and undefined content handling", (t) => {
  const testFile = path.join(__dirname, "null-content-test.txt");

  // Test with null content - should throw error
  t.throws(
    () => {
      storeOutput(testFile, null);
    },
    {
      message: /Failed to write output file.*data.*must be of type string/,
    },
  );

  // Test with undefined content - should throw error
  t.throws(
    () => {
      storeOutput(testFile, undefined);
    },
    {
      message: /Failed to write output file.*data.*must be of type string/,
    },
  );
});

test("storeOutput - very long file paths", (t) => {
  // Create a very long file path to test path length limits
  const longDirName = "a".repeat(100);
  const longFileName = "b".repeat(100) + ".txt";
  const longPath = path.join(__dirname, longDirName, longFileName);
  const testContent = "Long path test content";

  try {
    storeOutput(longPath, testContent);

    // Verify file was created (if path length is supported)
    t.true(fs.existsSync(longPath));
    const fileContent = fs.readFileSync(longPath, "utf8");
    t.is(fileContent, testContent);
  } catch (error) {
    // On some systems, this might fail due to path length limits
    // That's acceptable behavior
    t.true(
      error.message.includes("Failed to write output file") ||
        error.code === "ENAMETOOLONG",
    );
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(longPath)) {
        fs.unlinkSync(longPath);
      }
      const longDir = path.join(__dirname, longDirName);
      if (fs.existsSync(longDir)) {
        fs.rmSync(longDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

test("storeOutput - binary-like content handling", (t) => {
  const testFile = path.join(__dirname, "binary-content-test.txt");

  // Create content that looks like binary but is actually text
  const binaryLikeContent = "\x00\x01\x02\x03\xFF\xFE\xFD\x7F\x80\x81";

  try {
    storeOutput(testFile, binaryLikeContent);

    t.true(fs.existsSync(testFile));
    const fileContent = fs.readFileSync(testFile, "utf8");
    t.is(fileContent, binaryLikeContent);
  } finally {
    cleanup(testFile);
  }
});

test("storeOutput - error enhancement and logging", (t) => {
  // Test the error enhancement functionality that's in the coverage gap
  const originalConsoleError = console.error;
  let loggedErrors = [];
  console.error = (error) => {
    loggedErrors.push(error);
  };

  try {
    // Use an invalid path to trigger error enhancement
    const invalidPath =
      process.platform === "win32"
        ? "\\invalid\\path\\with\\null\x00char.txt"
        : "/dev/null/cannot/create/file.txt";

    t.throws(
      () => {
        storeOutput(invalidPath, "test content");
      },
      {
        message:
          /Cannot create directory.*already exists|Failed to create output directory/,
      },
    );

    // Verify error was logged before throwing
    t.true(loggedErrors.length > 0);
    const errorMessage = loggedErrors[0];
    t.true(typeof errorMessage === "string");
    t.true(
      errorMessage.includes("Cannot create directory") ||
        errorMessage.includes("Failed to"),
    );
    t.true(
      errorMessage.includes("/dev/null") || errorMessage.includes("invalid"),
    );
  } finally {
    console.error = originalConsoleError;
  }
});

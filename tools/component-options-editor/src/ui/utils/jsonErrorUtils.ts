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

/**
 * Extract line and column number from character position in a string
 *
 * Counts newlines before the position to determine line number,
 * and calculates column as the offset from the start of the line.
 *
 * @param text - The full text string
 * @param position - Character position in the string (0-based)
 * @returns Object with 1-based line and column numbers
 *
 * @example
 * extractLineColumn('{\n  "foo": bar\n}', 12)
 * // Returns {line: 2, column: 10} - error is at "bar"
 */
export function extractLineColumn(
  text: string,
  position: number,
): { line: number; column: number } {
  const lines = text.substring(0, position).split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

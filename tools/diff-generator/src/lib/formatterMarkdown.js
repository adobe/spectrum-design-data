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

import { CLIFormatter } from "./formatterCLI.js";

class MarkdownFormatter extends CLIFormatter {
  get hilite() {
    return function (input) {
      return "<code>" + input + "</code>";
    };
  }
  get error() {
    return function (input) {
      return "<strong>" + input + "</strong>";
    };
  }
  get passing() {
    return function (input) {
      return input;
    };
  }
  get neutral() {
    return function (input) {
      return input;
    };
  }

  set log(fnc) {
    this._log = (input) => {
      input = input.replaceAll("$", "");
      input = input.replaceAll(
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/",
        "",
      );
      fnc(input);
    };
  }

  get log() {
    return this._log;
  }

  printSection(
    emojiName,
    title,
    numTokens,
    result,
    func,
    colorOrIndent,
    titleIndent = 0,
  ) {
    this.log("<details open><summary>");
    this.printTitle(emojiName, title, numTokens, titleIndent);
    this.log("</summary>");
    Object.keys(result).forEach((token) => {
      if (typeof colorOrIndent !== "number") {
        func(token, colorOrIndent);
      } else {
        func(result, token, colorOrIndent);
      }
    });
    this.log("</details>");
  }

  indent(text, amount) {
    const space = " "; // this is a unicode em-space character, "&ensp;" works but inflates the output file quite a bit
    const str = `${(space + space).repeat(amount)}${text}<br />`;
    return str.replace(/{|}/g, "");
  }

  printStyleColored(token) {
    this.log(this.indent(this.hilite(token), 1));
  }

  printStyleRenamed(result, token, i) {
    const str =
      this.neutral(result[token]["old-name"] + " -> ") + this.hilite(token);
    this.log(this.indent(str, i));
  }

  printStyleDeprecated(result, token, i) {
    let comment = result[token]["deprecated_comment"];
    this.log(
      this.indent(
        this.hilite(token) +
          (typeof comment === "string" && comment.length
            ? this.neutral(": " + comment)
            : ""),
        i,
      ),
    );
  }

  printStyleUpdated(result, token, i) {
    this.log(this.indent(this.hilite(token), i));
    this.printNestedChanges(result[token]);
  }

  printNewValue(path, value) {
    this.log(
      this.indent(this.neutral(path.replaceAll("sets.", "") + ": " + value), 3),
    );
  }

  printSchemaChange(path, orginal, updated) {
    this.log(
      this.indent(
        this.neutral(
          path.replace("sets.", "").replace("$", "") +
            ": " +
            orginal.split("/").pop() +
            " -> " +
            updated.split("/").pop(),
        ),
        3,
      ),
    );
  }

  printValueChange(path, original, updated) {
    this.log(
      this.indent(
        this.neutral(
          path.replace("sets.", "") + ": " + original + " -> " + updated,
        ),
        3,
      ),
    );
  }
}

let formatter;

if (!formatter) formatter = new MarkdownFormatter();

export default formatter;

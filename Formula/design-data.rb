# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

class DesignData < Formula
  desc "CLI for Adobe Spectrum design data and token tooling"
  homepage "https://github.com/adobe/spectrum-design-data"
  version "0.49.1"
  license "Apache-2.0"

  on_macos do
    on_arm do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.49.1/design-data-darwin-arm64"
      sha256 "18e204aa91c052ec50dfa91244b007e6cea5636f2b214bd5500ea911b33fd4c8"
    end
    on_intel do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.49.1/design-data-darwin-x64"
      sha256 "f0e79237bcef344a3cf08efb74ec5eb7bbc14a1888dc2d17ae5da7e5420fe701"
    end
  end

  def install
    bin.install Dir["design-data-*"].first => "design-data"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/design-data --version")
  end
end

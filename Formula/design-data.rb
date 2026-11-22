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
  version "0.62.0"
  license "Apache-2.0"

  on_macos do
    on_arm do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.62.0/design-data-darwin-arm64"
      sha256 "3394d470eb9c9135f8fb9998c855174f3779259ae09758b9443086bad5d1bc03"
    end
    on_intel do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.62.0/design-data-darwin-x64"
      sha256 "bcbc0f4e2e0cb5ddb00fd7a7915382dd6f7a5e1d38b2a9bd6df36d89788200ba"
    end
  end

  def install
    bin.install Dir["design-data-*"].first => "design-data"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/design-data --version")
  end
end

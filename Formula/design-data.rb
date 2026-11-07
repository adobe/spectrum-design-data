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
  version "0.20.0"
  license "Apache-2.0"

  on_macos do
    on_arm do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.20.0/design-data-darwin-arm64"
      sha256 "8c91687c41c65caf5d559b52214c28601655a3e0dda02710683cf2cc6f6b01cf"
    end
    on_intel do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.20.0/design-data-darwin-x64"
      sha256 "1b1d31e55189e2d3c24a599d9735ff480ca155de0788ddfca20e76da3202fa79"
    end
  end

  def install
    bin.install Dir["design-data-*"].first => "design-data"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/design-data --version")
  end
end

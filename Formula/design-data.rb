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
  version "0.63.5"
  license "Apache-2.0"

  on_macos do
    on_arm do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.63.5/design-data-darwin-arm64"
      sha256 "ed29b6ea9360937201a5b9bbf09efda2d1bc6d71c17c1cb28d8a38408848b69c"
    end
    on_intel do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.63.5/design-data-darwin-x64"
      sha256 "0f973f3665b39ace9483330cd09e5762ba51c479737859b83e65ca66285be036"
    end
  end

  def install
    bin.install Dir["design-data-*"].first => "design-data"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/design-data --version")
  end
end

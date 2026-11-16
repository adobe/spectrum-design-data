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
  version "0.40.0"
  license "Apache-2.0"

  on_macos do
    on_arm do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.40.0/design-data-darwin-arm64"
      sha256 "c16cbac9d5550571af42e31ae9893659b95707e8584d1557c80865443e93f8d8"
    end
    on_intel do
      url "https://github.com/adobe/spectrum-design-data/releases/download/design-data-cli%400.40.0/design-data-darwin-x64"
      sha256 "cc8aa64d20c59ad570e3a044e388b00b5442a5fec4fcc50aab974cf0b39b05b6"
    end
  end

  def install
    bin.install Dir["design-data-*"].first => "design-data"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/design-data --version")
  end
end

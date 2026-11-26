# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

# Blanks the token display labels in a scene: the `token` name string and the `chain` array of
# names, wherever a token record carries them. Geometry, colour, value, relationship and every
# other string are kept.
walk(
  if type == "object" then
    (if (.token | type) == "string" then .token = "" else . end)
    | (if (.chain | type) == "array" then .chain = [] else . end)
  else . end
)

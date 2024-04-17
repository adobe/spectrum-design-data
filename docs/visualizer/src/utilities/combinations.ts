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

function _combinations([head, ...[headTail, ...tailTail]]: any[]): any[] {
  if (!headTail) return head;
  const combined = headTail.reduce((acc: any, x: any) => {
    x = typeof x === "number" ? [x] : x;
    return acc.concat(
      head.map((h: any) => {
        h = typeof h === "number" ? [h] : h;
        return [...h, ...x];
      }),
    );
  }, []);
  return _combinations([combined, ...tailTail]);
}

export function combinations(arrays: any[]): any[] {
  const indexIncrArrays = arrays.map((arr: any) => [
    ...Array(arr.length).keys(),
  ]);
  const indexCombinations = _combinations(indexIncrArrays);
  const valueResults = indexCombinations.map((arr: any) => {
    return arr.map((element: number, index: number) => arrays[index][element]);
  });
  return valueResults;
}

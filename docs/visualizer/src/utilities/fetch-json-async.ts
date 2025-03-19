/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// const http = <T>(request: any): Promise<T> =>
//   new Promise(resolve =>
//     fetch(request)
//       .then(response => response.json())
//       .then(body => resolve(body))
//   );

// export async function fetchJsonAsync(jsonUrl: string) {
//   return http(jsonUrl);
// }

export async function fetchJsonAsync(jsonUrl: string) {
  const response = await fetch(jsonUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  return data;
}

// example usage

// fetchJsonAsync('src/application-graph.json')
// .then(data => console.info(data));

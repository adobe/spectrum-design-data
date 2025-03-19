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

function blobToDataUrl(blob: any) {
  const FR = new FileReader();
  return new Promise((resolve, reject) => {
    FR.onerror = () => {
      FR.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    FR.onload = () => {
      resolve(FR.result);
    };

    FR.readAsDataURL(blob);
  });
}

export async function urlToDataUri(url: string) {
  const image = await fetch(url);
  const blob = await image.blob();
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl as string;
}

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

import { glob } from "glob";
import crypto from "crypto"; // (not the fake money)
import { writeFile, readFile } from "fs/promises";

const files = await glob("src/**/*.json");
console.log(files);

const VALUE = "value";
const UUID = "uuid";
const uuids = [];

// dumb function to check if something is an object
function isObject(a) {
  return (
    !!a &&
    a.constructor &&
    (a.constructor === Object || a.constructor.name === "Object")
  );
}

// find existing uuids
function findUUIDs(json) {
  if (json[UUID]) {
    uuids.push(json[UUID]);
  }

  Object.keys(json).forEach((key) => {
    if (isObject(json[key])) {
      findUUIDs(json[key]);
    }
  });
}

// check for and add uuids
function addUUIDs(json) {
  // if it is in want of uuid, give it one
  if (json[VALUE] && !json[UUID]) {
    while (!json[UUID] || uuids.includes(json[UUID])) {
      json[UUID] = crypto.randomUUID(); // https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid#2117523
    }

    uuids.push(json[UUID]);
  }

  // handle the json's children
  Object.keys(json).forEach((key) => {
    if (isObject(json[key])) {
      addUUIDs(json[key]);
    }
  });
}

// run through the files and find uuids
for (const fileName of files) {
  const fileData = await readFile(fileName, "utf8");
  const fileJSON = JSON.parse(fileData);

  findUUIDs(fileJSON);
}

// run through the files and add uuids
for (const fileName of files) {
  const fileData = await readFile(fileName, "utf8");
  const fileJSON = JSON.parse(fileData);

  const existing = uuids.length;

  addUUIDs(fileJSON);

  await writeFile(fileName, JSON.stringify(fileJSON, null, 2));

  if (uuids.length !== existing) {
    console.log(`  added: ${fileName} ${uuids.length - existing} uuids`);
  } else {
    console.log(`checked: ${fileName}`);
  }
}

console.log(`total: ${uuids.length} uuids`);

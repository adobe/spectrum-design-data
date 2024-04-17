import path from "path";
import { readFile } from "fs/promises";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { glob } from "glob";

const isObject = (a) => {
  return (
    !!a &&
    a.constructor &&
    (a.constructor === Object || a.constructor.name === "Object")
  );
};

const resolveSchemaDefinitions = (schema, ajv) => {
  let result = { ...schema };
  if (Object.hasOwn(result, "$ref")) {
    result = Object.keys(result).reduce((acc, key) => {
      if (key !== "$ref") {
        acc[key] = result[key];
      }
      return acc;
    }, {});
    const newSchema = ajv.getSchema(schema["$ref"])?.schema;
    Object.keys(newSchema).forEach((key) => {
      if (key !== "$schema") {
        result[key] = newSchema[key];
      }
    });
  }

  // handle the json's children
  Object.keys(result).forEach((key) => {
    if (isObject(result[key])) {
      result[key] = resolveSchemaDefinitions(result[key], ajv);
    }
  });
  return result;
};

const readJSON = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const getValidator = async () => {
  const schemaDir = "public/schemas";
  const ajv = new Ajv();
  addFormats(ajv);
  const componentSchema = await readJSON(
    path.join(schemaDir, "component.json"),
  );
  ajv.addMetaSchema(componentSchema);
  const schemaFiles = await glob(`${path.join(schemaDir, "types")}/*.json`);
  for (const schemaFile of schemaFiles) {
    const schema = await readJSON(schemaFile);
    ajv.addSchema(schema);
  }
  for (const keyword of Object.keys(componentSchema.properties)) {
    ajv.addKeyword({
      keyword,
      metaSchema: componentSchema.properties[keyword],
    });
  }
  return ajv;
};

export async function getSortedComponentsData() {
  const schemaDir = "public/schemas";
  const ajv = await getValidator();

  const fileNames = await glob(`${schemaDir}/components/*.json`);
  const allComponentsData = await Promise.all(
    fileNames.map(async (fileName) => {
      const file = await readJSON(fileName);
      // ajv.addSchema(file);
      const validate = ajv.compile(file);
      return {
        slug: path.basename(fileName, ".json"),
        ...resolveSchemaDefinitions(validate.schema, ajv),
      };
    }),
  );
  return allComponentsData.sort((a, b) => {
    if (a.slug > b.slug) {
      return 1;
    } else {
      return -1;
    }
  });
}

export async function getAllComponentSlugs() {
  const schemaDir = "public/schemas";
  const fileNames = await glob(`${schemaDir}/components/*.json`);
  return fileNames.map((fileName) => {
    return {
      params: {
        slug: path.basename(fileName, ".json"),
      },
    };
  });
}

export async function getComponentData(slug) {
  const schemaDir = path.resolve(
    path.join(process.cwd(), "..", "..", "packages", "tokens", "schemas"),
  );
  const file = await readJSON(
    path.join(schemaDir, "components", `${slug}.json`),
  );
  const ajv = await getValidator();
  const validate = ajv.compile(file);
  return {
    slug,
    ...resolveSchemaDefinitions(validate.schema, ajv),
  };
}

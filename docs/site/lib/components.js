import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import path from "path";
import { readFile } from "fs/promises";
import { glob } from "glob";
import { fileURLToPath } from "url";
import { dirname } from "path";

const isObject = (a) => {
  return !!a && a.constructor && (a.constructor === Object || a.constructor.name === "Object");
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

const readJSON = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

// Get the schemas directory from the installed package
const getSchemasDir = () => {
  try {
    // Try to resolve the package
    const packagePath = fileURLToPath(import.meta.resolve("@adobe/spectrum-component-api-schemas"));
    return path.join(dirname(packagePath), "schemas");
  } catch {
    // Fallback to relative path for development
    return path.resolve(process.cwd(), "..", "..", "packages", "component-schemas", "schemas");
  }
};

const getValidator = async () => {
  const schemaDir = "public/schemas";
  const schemasDir = getSchemasDir();

  const ajv = new Ajv();
  addFormats(ajv);

  const componentSchema = await readJSON(path.join(schemaDir, "component.json"));
  ajv.addMetaSchema(componentSchema);

  // Load type schemas from the package
  const typeSchemaFiles = await glob(`${schemasDir}/types/*.json`);
  for (const schemaFile of typeSchemaFiles) {
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

const getSlugFromDocumentationUrl = (documentationUrl) =>
  documentationUrl
    .split("/")
    .filter((part) => part !== "")
    .pop();

export async function getSortedComponentsData() {
  const ajv = await getValidator();
  const schemasDir = getSchemasDir();
  const componentFiles = await glob(`${schemasDir}/components/*.json`);

  const allComponentsData = await Promise.all(
    componentFiles.map(async (filePath) => {
      const schema = await readJSON(filePath);
      if (Object.hasOwn(schema, "meta") && Object.hasOwn(schema.meta, "documentationUrl")) {
        const slug = getSlugFromDocumentationUrl(schema.meta.documentationUrl);
        const validate = ajv.compile(schema);
        return {
          slug,
          ...resolveSchemaDefinitions(validate.schema, ajv),
        };
      }
      return null;
    })
  );

  return allComponentsData
    .filter((data) => data !== null)
    .sort((a, b) => {
      if (a.slug > b.slug) {
        return 1;
      } else {
        return -1;
      }
    });
}

export async function getAllComponentSlugs() {
  const schemasDir = getSchemasDir();
  const componentFiles = await glob(`${schemasDir}/components/*.json`);

  const slugs = await Promise.all(
    componentFiles.map(async (filePath) => {
      const schema = await readJSON(filePath);
      if (Object.hasOwn(schema, "meta") && Object.hasOwn(schema.meta, "documentationUrl")) {
        return getSlugFromDocumentationUrl(schema.meta.documentationUrl);
      }
      return null;
    })
  );

  return slugs
    .filter((slug) => slug !== null)
    .map((slug) => {
      return {
        params: {
          slug,
        },
      };
    });
}

export async function getComponentData(slug) {
  const schemasDir = getSchemasDir();
  const componentFiles = await glob(`${schemasDir}/components/*.json`);

  for (const filePath of componentFiles) {
    const schema = await readJSON(filePath);
    if (
      Object.hasOwn(schema, "meta") &&
      Object.hasOwn(schema.meta, "documentationUrl") &&
      getSlugFromDocumentationUrl(schema.meta.documentationUrl) === slug
    ) {
      const ajv = await getValidator();
      const validate = ajv.compile(schema);
      return {
        slug,
        ...resolveSchemaDefinitions(validate.schema, ajv),
      };
    }
  }

  throw new Error(`Schema not found for slug: ${slug}`);
}

export async function getComponentSchemasVersion() {
  try {
    const packagePath = fileURLToPath(
      import.meta.resolve("@adobe/spectrum-component-api-schemas/package.json")
    );
    const packageJson = await readJSON(packagePath);
    return packageJson.version;
  } catch {
    // Fallback for development
    const packageJsonPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      "packages",
      "component-schemas",
      "package.json"
    );
    const packageJson = await readJSON(packageJsonPath);
    return packageJson.version;
  }
}

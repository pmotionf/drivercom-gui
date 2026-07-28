import { execSync } from "child_process";
import JSON5 from "json5";
import { writeFileSync } from "fs";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const rustInfo = execSync("rustc -vV");
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];
const extension = process.platform === "win32" ? ".exe" : "";

if (!targetTriple) {
  console.error("Failed to determine platform target triple");
  process.exitCode = 1;
  process.exit();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const binaryName = path.resolve(
  __dirname,
  "src-tauri",
  "binaries",
  `drivercom-${targetTriple}${extension}`,
);

try {
  const logConfigInfo = execSync(`${binaryName} log.config.empty`);
  const logConfigSchema = generateZodSchema(JSON5.parse(logConfigInfo), "");
  const logConfigFile = generateFileContent(logConfigSchema, "logConfig");
  writeFileSync(
    "./src-tauri/generated/config/LogConfigType.tsx",
    logConfigFile,
  );

  const configInfo = execSync(`${binaryName} config.empty`);
  const configSchema = generateZodSchema(JSON5.parse(configInfo), "");
  const configFile = generateFileContent(configSchema, "config");
  writeFileSync("./src-tauri/generated/config/ConfigType.tsx", configFile);

  const configTuneInfo = execSync(`${binaryName} config.empty.tune`);
  const configTuneSchema = generateZodSchema(JSON5.parse(configTuneInfo), "");
  const configTuneFile = generateFileContent(configTuneSchema, "configTune");
  writeFileSync("./src-tauri/generated/config/ConfigTune.tsx", configTuneFile);

  const configSystemInfo = execSync(`${binaryName} config.empty.system`);
  const configSystemSchema = generateZodSchema(
    JSON5.parse(configSystemInfo),
    "",
  );
  const configSystemFile = generateFileContent(
    configSystemSchema,
    "configSystem",
  );
  writeFileSync(
    "./src-tauri/generated/config/ConfigSystem.tsx",
    configSystemFile,
  );

  const configCalibrationInfo = execSync(
    `${binaryName} config.empty.calibration`,
  );
  const configCalibrationSchema = generateZodSchema(
    JSON5.parse(configCalibrationInfo),
    "",
  );
  const configCalibrationFile = generateFileContent(
    configCalibrationSchema,
    "configCalibration",
  );
  writeFileSync(
    "./src-tauri/generated/config/ConfigCalibration.tsx",
    configCalibrationFile,
  );
} catch (e) {
  console.error(e);
}

function generateFileContent(schema, typeName) {
  const output = `import * as z from 'zod';

${schema.sub}

export const ${prettierLabel(typeName)}Schema = ${schema.main};

export type ${prettierLabel(typeName)}Type = z.infer<typeof ${prettierLabel(typeName)}Schema>;

export const ${typeName}DefaultValues: ${prettierLabel(typeName)}Type = ${prettierLabel(typeName)}Schema.parse({});
`;
  return output;
}

function generateZodSchema(obj, parentKey) {
  let mainSchemaStr = "z.object({\n";
  let subSchemaStr = "";
  for (const entry of Object.entries(obj)) {
    const key = entry[0];
    const value = entry[1];
    const type = typeof value;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        mainSchemaStr += `${key}: z.array(z.any()).default([]),\n`;
      } else {
        if (typeof value[0] === "object") {
          const schemaType = generateZodSchema(
            value[0],
            parentKey.length > 0
              ? parentKey + "_" + prettierLabel(key)
              : prettierLabel(key),
          );
          if (schemaType.sub.length > 0) {
            subSchemaStr += schemaType.sub;
          }

          const schemaName = `${parentKey.length > 0 ? prettierLabel(parentKey) + "_" : ""}${prettierLabel(key)}_Schema`;
          const typeName = `${parentKey.length > 0 ? prettierLabel(parentKey) : ""}${prettierLabel(key)}Type`;
          subSchemaStr += `export const ${schemaName} = ${schemaType.main}\n`;
          subSchemaStr += `export type ${typeName} = z.infer<typeof ${schemaName}>\n\n`;
          mainSchemaStr += `  ${key}: z.array(${schemaName}).default([]),\n`;
        }
      }
    } else {
      if (type === "number")
        mainSchemaStr += `  ${key}: z.number().default(${value}),\n`;
      else if (type === "boolean")
        mainSchemaStr += `  ${key}: z.boolean().default(${value}),\n`;
      else if (type === "string")
        mainSchemaStr += `  ${key}: z.string().default("${value}"),\n`;
      else if (type === "object") {
        const childSchema = generateZodSchema(
          value,
          parentKey.length > 0
            ? parentKey + "_" + prettierLabel(key)
            : prettierLabel(key),
        );
        if (childSchema.sub.length > 0) {
          subSchemaStr += childSchema.sub;
        }
        const schemaName = `${parentKey.length > 0 ? prettierLabel(parentKey) + "_" : ""}${prettierLabel(key)}_Schema`;
        const typeName = `${parentKey.length > 0 ? prettierLabel(parentKey) : ""}${prettierLabel(key)}Type`;
        subSchemaStr += `export const ${schemaName} = ${childSchema.main}\n`;
        subSchemaStr += `export type ${typeName} = z.infer<typeof ${schemaName}>\n\n`;
        mainSchemaStr += `  ${key}: ${schemaName}.default(${schemaName}.parse({})),\n`;
      } else if (type === null) {
        mainSchemaStr += `  ${key}: z.any().nullable(),\n`;
      }
    }
  }
  mainSchemaStr += "})";
  return {
    main: mainSchemaStr,
    sub: subSchemaStr,
  };
}

function prettierLabel(str) {
  return Array.from(str)
    .map((char, i) => (i === 0 ? char.toUpperCase() : char))
    .join("");
}

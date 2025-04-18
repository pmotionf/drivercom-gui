import { expect } from "jsr:@std/expect";
import { inferSchema, initParser } from "udsv";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";

function parseEnumMapping(
  output: string,
): {
  seriesMapping: string[][];
  enumTypeNames: string[];
  enumCodeMapping: [number, string][][];
} {
  const namedFieldsStr = "named fields:";
  const namedFieldsIndex = output.search(
    new RegExp(namedFieldsStr, "i"),
  );

  const namedFieldKindsStr = "named field kinds:";
  const namedFieldKindsIndex = output.search(
    new RegExp(namedFieldKindsStr, "i"),
  );

  const namedFieldsLine = output.slice(
    namedFieldsIndex + namedFieldsStr.length,
    namedFieldKindsIndex,
  ).trim();
  const namedFieldKindsLines = output.slice(
    namedFieldKindsIndex + namedFieldKindsStr.length,
  ).split("\n");

  const enumMappingsLines = namedFieldKindsLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line[0] == "[");

  const seriesMappings = namedFieldsLine
    .split(",")
    .filter((seriesChunk) => seriesChunk.length > 1)
    .map((e) => {
      return e.split(":");
    });

  const enumTypeNames: string[] = enumMappingsLines.map((line) => {
    const closingBracketIndex = line.indexOf("]");
    return line.slice(1, closingBracketIndex);
  });

  const enumCodeMappings: [number, string][][] = enumMappingsLines.map(
    (line) => {
      const equalsIndex = line.indexOf("=");
      const mappingsString = line.slice(equalsIndex + 1);
      const mappingsList = mappingsString
        .split(",")
        .filter((mappingString) => mappingString.length > 0);
      const mappingsSplitList = mappingsList
        .map((mappingString) => mappingString.split(":"))
        .filter((mappingSplit) => mappingSplit.length == 2);
      return mappingsSplitList.map((mappingSplit) => [
        Number(mappingSplit[0]), // Enum integer code
        mappingSplit[1], // Enum name
      ]);
    },
  );

  return {
    seriesMapping: seriesMappings,
    enumTypeNames: enumTypeNames,
    enumCodeMapping: enumCodeMappings,
  };
}

Deno.test({
  name: "parseEnumMapping",
  fn: () => {
    const outputExample =
      "Named Fields:\nfield a:field\nNamed Field Kinds:\n[field]=0:zero,1:one";
    const testResult = parseEnumMapping(outputExample);

    const seriesMappingsExample = [[
      "field a",
      "field",
    ]];
    expect(testResult.seriesMapping).toEqual(
      seriesMappingsExample,
    );

    const enumTypeNamesExample = ["field"];

    expect(testResult.enumTypeNames).toEqual(
      enumTypeNamesExample,
    );

    const enumCodeMappingsExample = [[[0, "zero"], [1, "one"]]];

    expect(testResult.enumCodeMapping).toEqual(
      enumCodeMappingsExample,
    );
  },
});

function parseCsvForPlot(csv_str: string): {
  header: string[];
  series: number[][];
  splitIndex: number[][];
} {
  const rows = csv_str.split("\n");
  const schema = inferSchema(csv_str);
  const parser = initParser(schema);
  const local_header: string[] = rows[0].replace(/,\s*$/, "").split(",");
  const data: number[][] = parser.typedCols(csv_str).map((row) =>
    row.map((val) => {
      if (typeof val === "boolean") return val ? 1 : 0;
      return val;
    })
  );

  // Parse Enum name-value array to avoid plot errors
  const parsedSeriesForPlot: number[][] = data
    .slice(0, local_header.length)
    .map((series) => {
      const parsedEnumForPlot = series.map((value) => {
        if (
          value.toString().indexOf("(") !== -1 &&
          value.toString().indexOf(")") !== -1
        ) {
          const parseValue = value.toString().match(/\((\d+)\)/)![1];
          return Number(parseValue);
        } else {
          return value;
        }
      });
      return parsedEnumForPlot;
    });

  const indexArray = Array.from(
    { length: local_header.length },
    (_, index) => index,
  );

  return {
    header: local_header,
    series: parsedSeriesForPlot,
    splitIndex: [indexArray],
  };
}

Deno.test({
  name: "parseCsvForPlot",
  fn: () => {
    const exampleText = "a,b,c\n5.45,0,true\n5.4,0,false\n0,1,true";
    const result = parseCsvForPlot(exampleText);

    const seriesExample = [[5.45, 5.4, 0], [0, 0, 1], [1, 0, 1]];
    const headerExample = ["a", "b", "c"];
    const splitIndexExample = [[0, 1, 2]];

    expect(result.series).toEqual(seriesExample);
    expect(result.header).toEqual(headerExample);
    expect(result.splitIndex).toEqual(
      splitIndexExample,
    );
    expect(result.splitIndex).toBe(
      result.splitIndex,
    );
  },
});

function checkFileFormat(file: object): string {
  const newFileFormat = Object.entries(file)
    .map((line) => {
      const key = line[0];
      const value = line[1];
      if (typeof value !== "object") return [key, typeof value];
      const parseValue = checkFileFormat(value);
      return [key, parseValue];
    })
    .sort()
    .toString();

  return newFileFormat;
}

Deno.test("checkFileFormat", () => {
  const exampleFile: { file: { name: string; desc: string } } = {
    file: { name: "a", desc: "b" },
  };
  const result = "file,desc,string,name,string";
  expect(checkFileFormat(exampleFile)).toEqual(result);
});

function compareFileFormat(newFile: object, fileFormat: object): boolean {
  const newFileObject = checkFileFormat(newFile);
  const configFileObject = checkFileFormat(fileFormat);
  return newFileObject === configFileObject;
}

Deno.test("compareFileFormat", () => {
  const exampleFileA: { file: { name: string; desc: string } } = {
    file: { name: "a", desc: "b" },
  };
  const exampleFileB: { file: { name: string; desc: string } } = {
    file: { name: "d", desc: "c" },
  };
  expect(compareFileFormat(exampleFileA, exampleFileB)).toEqual(true);
});

function parseLogStartField(output: string): string[] {
  const parseOutput = output.replaceAll("[", "")
    .replaceAll("]", "")
    .split(":");
  const logFields = parseOutput[1]
    .split(",")
    .filter((value) => value !== "\n");
  return logFields;
}

Deno.test("parseLogStartField", () => {
  const exampleString = "[field]:a,b,c";
  const result = ["a", "b", "c"];
  expect(parseLogStartField(exampleString)).toEqual(result);
});

async function readJsonFile(path: string): Promise<object | null> {
  try {
    const output = await readTextFile(path);
    const parseFileToObject = JSON.parse(output);
    return parseFileToObject;
  } catch {
    return null;
  }
}

Deno.test("readJsonFile", async () => {
  const exampleFilePath = "abcd";
  expect(await readJsonFile(exampleFilePath)).toBeNull();
});

function clamp(
  nRange: number,
  nMin: number,
  nMax: number,
  fRange: number,
  fMin: number,
  fMax: number,
) {
  if (nRange > fRange) {
    nMin = fMin;
    nMax = fMax;
  } else if (nMin < fMin) {
    nMin = fMin;
    nMax = fMin + nRange;
  } else if (nMax > fMax) {
    nMax = fMax;
    nMin = fMax - nRange;
  }

  return [nMin, nMax];
}

Deno.test("clamp", () => {
  expect(clamp(5, 1, 1, 4, 1, 1)).toEqual([1, 1]);
});

function calculateDotFilter(
  domainWidth: number,
  xRange: number,
  plotDataLength: number,
): number[] {
  const scale: number = xRange / domainWidth;
  const array: number[] = [];

  let i: number = 0;
  while (scale > 0.1) {
    array.push(i);
    i += (Math.floor(scale) > 0
      ? Math.floor(scale)
      : parseFloat(scale.toFixed(1))) * 10;
    if (i >= plotDataLength) {
      break;
    }
  }
  if (scale <= 0.1) array.splice(0, array.length);
  return array;
}

Deno.test("calculateDotFilter", () => {
  const result = [0, 1, 2, 3, 4];
  expect(calculateDotFilter(1719, 227, 5)).toEqual(result);
});

async function parsePortList(port: string): Promise<object[]> {
  const portNames = port
    .split("\n")
    .map((portName) => {
      const matched = portName.match(/\(([^)]+)\)/);
      return matched;
    })
    .filter((e) => e !== null)
    .map((e) => e[1]);
  const ports = await Promise.all(
    portNames.map((id) => {
      const version = null;
      if (version !== null) {
        return {
          id: id,
          version: version,
        };
      } else {
        return {
          id: id,
          version: "",
        };
      }
    }),
  );
  return ports;
}

Deno.test("parsePortList", async () => {
  const result = [{ id: "a", version: "" }];
  expect(await parsePortList("(a)")).toEqual(result);
});

function parseFilePath(
  filePath: string | null,
  formName: string,
  extension: string,
): string {
  const fileNameFromPath = filePath
    ? filePath!
      .match(/[^?!//]+$/)!
      .toString()
    : "";
  const currentFilePath = filePath
    ? formName === fileNameFromPath
      ? filePath
      : filePath!.replace(fileNameFromPath, formName)
    : formName;

  return currentFilePath!.split(".").pop()!.toLowerCase() === extension
    ? `${currentFilePath}`
    : `${currentFilePath}.${extension}`;
}

Deno.test("parseFilePath", () => {
  expect(parseFilePath("abc.json", "test", "json")).toEqual("test.json");
});

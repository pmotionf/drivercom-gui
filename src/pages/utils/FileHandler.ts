import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { inferSchema, initParser } from "udsv";
import JSON5 from "json5";

type CsvFile = {
  header: string[];
  series: number[][];
  enumSeriesMap?: Map<string, Map<number, string>>;
};

interface IFileHandler {
  openFileDialog(extension: string): Promise<string | never>;
  saveFileDialog(
    defaultExtension: string,
    filePath: string,
    formTitle?: string,
  ): Promise<string | never>;
  readFile(path: string, fileFormat?: object): Promise<object | never>;
  readCsvFile(path: string): Promise<CsvFile | never>;
  writeFile(
    path: string,
    file: object | string,
    fileFormat?: object,
  ): Promise<void | never>;
  writeCsvFile(path: string, csvFile: CsvFile): Promise<void | never>;
  matchFileFormat(file: object, defaultFormat: object): boolean;
}

export class FileHandler implements IFileHandler {
  async openFileDialog(defaultExtension: string): Promise<string | never> {
    const path = await open({
      multiple: false,
      filters: [
        {
          name: defaultExtension.toUpperCase(),
          extensions: [defaultExtension.toLowerCase()],
        },
      ],
    });
    if (!path) throw new Error("The file path is invalid.");

    const extension = path.split(".").pop();
    if (!extension || extension.toLowerCase() != defaultExtension.toLowerCase())
      throw new Error("The file extension is invalid.");

    return path.replaceAll("\\", "/");
  }

  async saveFileDialog(
    defaultExtension: string,
    filePath: string,
    formTitle?: string,
  ): Promise<string | never> {
    let dialogPath: string = filePath;
    if (formTitle) {
      dialogPath = this.saveDialogPath(filePath, formTitle);
    }
    const path = await save({
      defaultPath:
        dialogPath!.split(".").pop()!.toLowerCase() ===
        defaultExtension.toLowerCase()
          ? `${dialogPath}`
          : `${dialogPath}.${defaultExtension.toLowerCase()}`,
      filters: [
        {
          name: defaultExtension.toUpperCase(),
          extensions: [defaultExtension.toLowerCase()],
        },
      ],
    });
    if (!path) throw new Error("The file path is invalid.");

    const extension = path.split(".").pop();
    if (extension != defaultExtension.toLowerCase())
      throw new Error("The file extension is invalid.");

    return path;
  }

  private saveDialogPath = (filePath: string, formTitle: string) => {
    const fileNameFromPath =
      filePath! && filePath.length !== 0
        ? filePath.match(/[^?!//]+$/)!.toString()
        : "";
    const currentFilePath =
      filePath! && filePath.length !== 0
        ? formTitle === fileNameFromPath
          ? filePath
          : filePath.replace(fileNameFromPath, formTitle)
        : formTitle;
    return currentFilePath;
  };

  matchFileFormat(file: object, defaultFormat: object): boolean {
    const newFile = this.checkFormat(file);
    const defaultFile = this.checkFormat(defaultFormat);
    const isFormatMatch = newFile === defaultFile;
    if (isFormatMatch) return isFormatMatch;
    else return false;
  }

  private checkFormat(file: object): string {
    const format = Object.entries(file)
      .map((entry) => {
        const key = entry[0];
        const value = entry[1];
        if (typeof value !== "object") return [key, typeof value];
        const parseValue = this.checkFormat(value);
        return [key, parseValue];
      })
      .sort()
      .toString();

    return format;
  }

  async readFile(path: string, fileFormat?: object): Promise<object | never> {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON5.parse(output);

      if (fileFormat) {
        if (!this.matchFileFormat(parseFileToObject, fileFormat)) {
          throw new Error("Invalid file format.");
        }
      }
      return parseFileToObject;
    } catch (e) {
      if (e) {
        throw new Error(e.toString());
      } else {
        throw new Error("The file is invalid.");
      }
    }
  }

  async readCsvFile(path: string): Promise<CsvFile | never> {
    const csv_str = await readTextFile(path);
    if (!csv_str) {
      throw new Error("File is empty");
    }
    return new Promise<CsvFile>((resolve, reject) => {
      const rows = csv_str.endsWith("\n")
        ? csv_str.slice(0, -2).split("\n")
        : csv_str.split("\n");
      if (rows.length < 2) {
        return reject("Not enough rows.");
      }

      const enumMappings: Map<string, Map<number, string>> = new Map();

      const schema = inferSchema(csv_str);
      const parser = initParser(schema);
      const local_header: string[] = rows[0].replace(/,\s*$/, "").split(",");
      const checkRowLength = rows.some(
        (row) =>
          row.replace(/,\s*$/, "").split(",").length !== local_header.length,
      );
      if (checkRowLength) {
        return reject("Header and data length mismatch.");
      }

      const data: number[][] = parser.typedCols(csv_str).map((row, rowIndex) =>
        row.map((val) => {
          if (typeof val === "boolean") {
            return val ? 1 : 0;
          } else if (typeof val === "string" && isNaN(Number(val))) {
            const stringVal: string = val;
            const removeParentheses = stringVal
              .replace(/^[^(]*\(/, "")
              .replace(/\)[^(]*$/, "");

            const enumSeriesName = local_header[rowIndex];
            if (enumMappings.has(enumSeriesName)) {
              if (
                !enumMappings
                  .get(enumSeriesName)!
                  .has(Number(removeParentheses))
              ) {
                const enumTypeName = stringVal
                  .match(/^[^(]*\(/)!
                  .toString()
                  .slice(0, -1);
                if (enumTypeName) {
                  enumMappings
                    .get(enumSeriesName)!
                    .set(Number(removeParentheses), enumTypeName.toString());
                }
              }
            } else {
              const enumValues: Map<number, string> = new Map();
              const enumTypeName = stringVal
                .match(/^[^(]*\(/)!
                .toString()
                .slice(0, -1);
              enumValues.set(Number(removeParentheses), enumTypeName);
              enumMappings.set(enumSeriesName, enumValues);
            }
            return Number(removeParentheses);
          } else {
            return val;
          }
        }),
      );

      const checkFinate = data
        .slice(0, -1)
        .map((checkData) => checkData.some((val) => Number.isFinite(val)));
      if (!checkFinate.every((val) => val)) {
        return reject(`Data has invalid value.`);
      }

      if (data.length < local_header.length) {
        const desc = `Data has ${data.length} columns, while header has ${local_header.length} labels.`;
        return reject(desc);
      }

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

      return resolve({
        header: local_header,
        series: parsedSeriesForPlot,
        enumSeriesMap:
          Array.from(enumMappings.keys()).length > 0 ? enumMappings : undefined,
      });
    });
  }

  async writeFile(
    path: string,
    file: object,
    fileFormat?: object,
  ): Promise<void | never> {
    if (fileFormat) {
      if (!this.matchFileFormat) {
        throw new Error("The file format is invalid.");
      }
    }
    const file_str = JSON5.stringify(file, null, "  ");

    try {
      await writeTextFile(path, file_str);
      return;
    } catch (e) {
      throw new Error(e ? (e as string) : "Fail to save file.");
    }
  }

  async writeCsvFile(path: string, csvFile: CsvFile): Promise<void | never> {
    const parseSeries = Array.from(
      { length: csvFile.series[0].length },
      (_, rowIndex) =>
        `\n${Array.from({ length: csvFile.header.length }, (_, cellIndex) => {
          if (
            csvFile.enumSeriesMap &&
            csvFile.enumSeriesMap.has(csvFile.header[cellIndex])
          ) {
            const seriesEnumName = csvFile.enumSeriesMap.get(
              csvFile.header[cellIndex],
            )!;
            const val = csvFile.series[cellIndex][rowIndex];
            return `${seriesEnumName.get(val) ? seriesEnumName.get(val) : undefined}(${val})`;
          } else {
            return csvFile.series[cellIndex][rowIndex];
          }
        })}`,
    );
    const csv_str = csvFile.header.toString() + "," + parseSeries + ",";
    try {
      await writeTextFile(path, csv_str);
      return;
    } catch (e) {
      throw new Error(e as string);
    }
  }
}

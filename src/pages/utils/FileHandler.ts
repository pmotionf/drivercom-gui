import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

interface IFileHandler {
  openFileDialog(extension: string): Promise<string | never>;
  saveFileDialog(
    defaultExtension: string,
    filePath: string,
    formTitle?: string,
  ): Promise<string | never>;
  readFile(path: string, fileFormat?: object): Promise<object | never>;
  writeFile(
    path: string,
    file: object | string,
    fileFormat?: object,
  ): Promise<void | never>;
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
        dialogPath!.split(".").pop()!.toLowerCase() === "json"
          ? `${dialogPath}`
          : `${dialogPath}.json`,
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
    const isNullIncluded = this.checkNullIncluded(file);
    if (isNullIncluded) return false;

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

  private checkNullIncluded(format: object): boolean {
    const values = Object.values(format);
    if (
      values.some(
        (val) =>
          val === null || (typeof val === "number" && !Number.isFinite(val)),
      )
    ) {
      return true;
    } else {
      let isNullIncluded = false;
      const objectList: object[] = values.filter(
        (val) => typeof val === "object",
      );
      for (let i = 0; i < objectList.length; i++) {
        const object = objectList[i];
        const result = this.checkNullIncluded(object);
        if (result) {
          isNullIncluded = true;
          break;
        }
      }
      return isNullIncluded;
    }
  }

  async readFile(path: string, fileFormat?: object): Promise<object | never> {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);
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

  async writeFile(
    path: string,
    file: object | string,
    fileFormat?: object,
  ): Promise<void | never> {
    if (fileFormat) {
      if (!this.matchFileFormat) {
        throw new Error("The file format is invalid.");
      }
    }

    try {
      const file_str =
        typeof file === "string" ? file : JSON.stringify(file, null, "  ");
      await writeTextFile(path, file_str);
      return;
    } catch (e) {
      throw new Error(e ? (e as string) : "Fail to save file.");
    }
  }
}

import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export const file = {
  // Open file dialog to open file
  openDialog: async (extension: string) => await openFileDialog(extension),
  // Open file dialog to save file
  saveDialog: async (
    extension: string,
    parsePath: string,
    formTitle?: string,
  ) => await openSaveFileDialog(extension, parsePath, formTitle),
  isFormatMatch: (newFile: object, defaultFile: object) => {
    return isFormatMatch(newFile, defaultFile);
  },
  read: async (path: string) => readJsonFile(path),
  write: async (path: string, file: object) => saveJsonFile(path, file),
};

async function openFileDialog(
  defaultExtension: string,
): Promise<string | never> {
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

const saveDialogPath = (filePath: string, formTitle: string) => {
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

async function openSaveFileDialog(
  defaultExtension: string,
  filePath: string,
  formTitle?: string,
): Promise<string | never> {
  let dialogPath: string = filePath;
  if (formTitle) {
    dialogPath = saveDialogPath(filePath, formTitle);
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

export function isFormatMatch(
  file: object,
  defaultFormat: object,
): boolean | never {
  const isNullIncluded = checkNullIncluded(file);
  if (isNullIncluded) throw new Error("The file is invalid. (null)");

  const newFile = checkFormat(file);
  const defaultFile = checkFormat(defaultFormat);
  const isFormatMatch = newFile === defaultFile;
  if (isFormatMatch) return isFormatMatch;
  else throw new Error("The file is invalid. (format)");
}

function checkFormat(file: object): string {
  const format = Object.entries(file)
    .map((entry) => {
      const key = entry[0];
      const value = entry[1];
      if (typeof value !== "object") return [key, typeof value];
      const parseValue = checkFormat(value);
      return [key, parseValue];
    })
    .sort()
    .toString();

  return format;
}

function checkNullIncluded(format: object): boolean {
  const values = Object.values(format);
  let isNullIncluded = false;
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (typeof val === "number") {
      if (!Number.isFinite(val)) {
        isNullIncluded = true;
        break;
      }
    } else if (typeof val === "object") {
      if (checkNullIncluded(val)) {
        isNullIncluded = true;
        break;
      }
    }
  }
  console.log(isNullIncluded);
  return isNullIncluded;
}

async function readJsonFile(path: string): Promise<object | never> {
  try {
    const output = await readTextFile(path);
    const parseFileToObject = JSON.parse(output);
    return parseFileToObject;
  } catch (e) {
    if (e) {
      throw new Error(e.toString());
    } else {
      throw new Error("The file is invalid.");
    }
  }
}

async function saveJsonFile(path: string, logForm: object) {
  const json_str = JSON.stringify(logForm, null, "  ");
  await writeTextFile(path, json_str);
}

import { createSignal, For, Show } from "solid-js";

import { ConfigForm } from "~/components/ConfigForm";
import { IconX } from "@tabler/icons-solidjs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import {
  configFormFileFormat,
  portId,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
} from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { IconButton } from "~/components/ui/icon-button";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

function Configuration() {
  const [config, setConfig] = createSignal({});
  const [formName, setFormName] = createSignal<string>("");
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [filePath, setFilePath] = createSignal<string | undefined>(undefined);

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function getConfigFromPort(): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const configGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.get`,
    ]);
    const output = await configGet.execute();
    return { stdout: output.stdout, stderr: output.stderr };
  }

  async function openFileDialog(): Promise<string | undefined> {
    const path = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      return undefined;
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      toaster.create({
        title: "Invalid File Extension",
        description: "The file extension is invalid.",
        type: "error",
      });
      return undefined;
    }
    return path.replaceAll("\\", "/");
  }

  async function readJsonFile(path: string): Promise<object | undefined> {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);
      return parseFileToObject;
    } catch {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      setRecentConfigFilePaths((prev) => {
        const newRecentFiles = prev.filter(
          (prevFilePath) => prevFilePath !== path,
        );
        return newRecentFiles;
      });
    }
  }

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

  function compareFileFormat(newFile: object, fileFormat: object): boolean {
    const newFileObject = checkFileFormat(newFile);
    const configFileObject = checkFileFormat(fileFormat);
    return newFileObject === configFileObject;
  }

  function setFormData(data: object, path: string) {
    setConfig(data);
    setFilePath(path);
    setFormName(path.split("/").pop()!);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter(
        (prevFilePath) => prevFilePath !== path,
      );
      return [path, ...newRecentFiles];
    });
    setIsFormOpen(true);
  }

  async function saveConfigAsFile() {
    const json_str = JSON.stringify(config(), null, "  ");
    const fileNameFromPath = filePath()
      ? filePath()!
        .match(/[^?!//]+$/)!
        .toString()
      : "";
    const currentFilePath = filePath()
      ? formName() === fileNameFromPath
        ? filePath()
        : filePath()!.replace(fileNameFromPath, formName())
      : formName();

    const path = await save({
      defaultPath: currentFilePath!.split(".").pop()!.toLowerCase() === "json"
        ? `${currentFilePath}`
        : `${currentFilePath}.json`,
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    });
    if (!path) {
      toaster.create({
        title: "Invalid File Path",
        description: "The specified file path is invalid.",
        type: "error",
      });
      return;
    }
    const extension = path.split(".").pop();
    if (extension != "json") {
      toaster.create({
        title: "Invalid File Extension",
        description: "The specified file extension is invalid.",
        type: "error",
      });
      return;
    }

    if (!filePath()) {
      const parsePath = path.replaceAll("\\", "/");
      setFilePath(parsePath);
      const currentPathFileName = parsePath.match(/[^//]+$/)!.toString();
      setFormName(currentPathFileName);
    }

    await writeTextFile(path, json_str);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter(
        (prevFilePath) => prevFilePath !== path,
      );
      return [path.replaceAll("\\", "/"), ...newRecentFiles];
    });
  }

  async function saveConfigToPort(): Promise<string> {
    const json_str = JSON.stringify(config(), null, "  ");
    const saveConfig = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.set`,
      json_str,
    ]);
    const output = await saveConfig.execute();
    return output.stderr;
  }

  // Check recent file list item is hovered
  const [isButtonHovered, setIsButtonHoverd] = createSignal<
    [boolean, number | null]
  >([false, null]);

  return (
    <>
      <div
        style={{
          height: "100%",
          width: `100%`,
          "justify-content": "center",
          display: "flex",
          //"padding-left": "6rem",
        }}
      >
        <Toast.Toaster toaster={toaster}>
          {(toast) => (
            <Toast.Root>
              <Toast.Title>{toast().title}</Toast.Title>
              <Toast.Description>{toast().description}</Toast.Description>
              <Toast.CloseTrigger>
                <IconX />
              </Toast.CloseTrigger>
            </Toast.Root>
          )}
        </Toast.Toaster>
        <Stack width="40%" height="100%">
          <Show when={!isFormOpen()}>
            <div
              style={{
                "padding-top": "4rem",
                "padding-bottom": "4rem",
                height: "100%",
                width: "100%",
              }}
            >
              <Text variant="heading" size="2xl" height="2rem">
                Configuration
              </Text>
              <Stack
                direction="row"
                marginTop="1.5rem"
                gap={`5%`}
                height="10rem"
              >
                <Button
                  width="30%"
                  variant="outline"
                  padding="4rem"
                  onClick={() => {
                    const newEmptyFile = JSON.parse(
                      JSON.stringify(configFormFileFormat()),
                    );
                    setFormName("New File");
                    setConfig(newEmptyFile);
                    setFilePath(undefined);
                    setIsFormOpen(true);
                  }}
                >
                  Create New Config
                </Button>
                <Button
                  width="30%"
                  variant="outline"
                  padding="4rem"
                  onClick={async () => {
                    const path = await openFileDialog();
                    if (!path) return;
                    const object = await readJsonFile(path);
                    const checkObject = compareFileFormat(
                      object!,
                      configFormFileFormat(),
                    );
                    if (!checkObject) {
                      toaster.create({
                        title: "Invalid File",
                        description: "The file is invalid.",
                        type: "error",
                      });
                      return;
                    }
                    setFormData(object!, path);
                  }}
                >
                  Open File
                </Button>
                <Button
                  width="30%"
                  variant="outline"
                  padding="4rem"
                  disabled={portId().length === 0}
                  onClick={async () => {
                    setFilePath(undefined);
                    const output = await getConfigFromPort();
                    if (output.stderr.length !== 0) {
                      toaster.create({
                        title: "Communication Error",
                        description: output.stderr,
                        type: "error",
                      });
                    } else {
                      const parseConfigToObject = JSON.parse(output.stdout);
                      setFormName(portId());
                      setConfig(parseConfigToObject);
                      setIsFormOpen(true);
                    }
                  }}
                >
                  Get From Port
                </Button>
              </Stack>
              <Show when={recentConfigFilePaths().length !== 0}>
                <Text size="xl" marginTop="2rem" fontWeight="bold">
                  Recent
                </Text>
                <Stack direction="row" width="100%" marginTop="0.5rem">
                  <Text
                    width="16rem"
                    size="sm"
                    fontWeight="light"
                    opacity="50%"
                  >
                    File
                  </Text>
                  <Text size="sm" fontWeight="light" opacity="50%">
                    Path
                  </Text>
                </Stack>
                <Stack
                  style={{ "overflow-y": "auto" }}
                  // -divPaddingTop(4rem) -titleTextHeight(2rem)
                  // -buttonHeight(10rem) -divPaddingBottom(4rem)
                  height={`calc(100% - 4rem - 2rem - 10rem - 4rem)`}
                  width="100%"
                  gap="0"
                  borderTopWidth="1"
                  borderBottomWidth="1"
                  overflowY="auto"
                >
                  <For each={recentConfigFilePaths()}>
                    {(path, index) => (
                      <Button
                        width="100%"
                        variant="ghost"
                        padding="0.5rem"
                        paddingTop="1rem"
                        paddingBottom="1rem"
                        onMouseEnter={() => {
                          setIsButtonHoverd([true, index()]);
                        }}
                        onMouseLeave={() => {
                          setIsButtonHoverd([false, null]);
                        }}
                        bgColor={isButtonHovered()[0] === true &&
                            isButtonHovered()[1] === index()
                          ? "bg.muted"
                          : "bg.canvas"}
                        gap="0"
                      >
                        <Text
                          userSelect="none"
                          onClick={async () => {
                            const object = await readJsonFile(path);
                            setFormData(object!, path);
                            setIsButtonHoverd([false, null]);
                          }}
                          size="md"
                          height="2rem"
                          fontWeight="medium"
                          style={{
                            "white-space": "nowrap",
                            "text-overflow": "ellipsis",
                            display: "block",
                            overflow: "hidden",
                            "text-align": "left",
                            "margin-top": "0.4rem",
                            width: "15rem",
                          }}
                        >
                          {path.match(/[^//]+$/)!.toString()}
                        </Text>
                        <Text
                          userSelect="none"
                          size="sm"
                          fontWeight="light"
                          marginLeft="0.5rem"
                          opacity="70%"
                          onClick={async () => {
                            const object = await readJsonFile(path);
                            setFormData(object!, path);
                            setIsButtonHoverd([false, null]);
                          }}
                          style={{
                            "white-space": "nowrap",
                            "text-overflow": "ellipsis",
                            display: "block",
                            overflow: "hidden",
                            "text-align": "left",
                            width: `calc(100% - 17rem)`,
                            "padding-left": "1rem",
                          }}
                        >
                          {path.replace(
                            path.match(/[^?!//]+$/)!.toString(),
                            "",
                          )}
                        </Text>
                        <Stack width="2rem">
                          <Show
                            when={isButtonHovered()[0] === true &&
                              isButtonHovered()[1] === index()}
                          >
                            <IconButton
                              padding="0"
                              opacity="50%"
                              variant="ghost"
                              borderRadius="2rem"
                              size="sm"
                              width="1rem"
                              marginRight="1rem"
                              onClick={() => {
                                setRecentConfigFilePaths((prev) => {
                                  const updateFilePath = prev.filter((_, i) => {
                                    return i !== index();
                                  });
                                  return updateFilePath;
                                });
                              }}
                            >
                              <IconX width="1rem" />
                            </IconButton>
                          </Show>
                        </Stack>
                      </Button>
                    )}
                  </For>
                </Stack>
              </Show>
            </div>
          </Show>
          <Show when={isFormOpen()}>
            <div
              style={{
                width: "100%",
                height: "100%",
                "padding-top": "2rem",
                "padding-bottom": "2rem",
              }}
            >
              <Card.Root
                paddingTop="3rem"
                paddingBottom="3rem"
                marginBottom="3rem"
                height="100%"
              >
                <ConfigForm
                  label={formName()}
                  onLabelChange={(e) => setFormName(e)}
                  config={config()}
                  onCancel={() => {
                    setIsFormOpen(false);
                  }}
                  onSaveConfigFile={() => {
                    saveConfigAsFile();
                  }}
                  onSaveConfigPort={async () => {
                    const outputError = await saveConfigToPort();
                    if (outputError.length !== 0) {
                      toaster.create({
                        title: "Communication Error",
                        description: outputError,
                        type: "error",
                      });
                      return;
                    }
                    toaster.create({
                      title: "Communication Success",
                      description: "Configuration saved to port successfully.",
                      type: "error",
                    });
                  }}
                />
              </Card.Root>
            </div>
          </Show>
        </Stack>
      </div>
    </>
  );
}

export default Configuration;

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
import { Menu } from "~/components/ui/menu";

function Configuration() {
  const [configureFile, setConfigureFile] = createSignal({});
  const [fileName, setFileName] = createSignal<string>("");
  const [isFileOpen, setIsFileOpen] = createSignal(false);
  const [filePath, setFilePath] = createSignal<string | undefined>(undefined);

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function getConfigFromPort() {
    const configGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.get`,
    ]);
    const output = await configGet.execute();
    const parseConfigToObject = JSON.parse(output.stdout);
    setFileName(portId());
    setConfigureFile(parseConfigToObject);
    setIsFileOpen(true);
  }

  async function openFileDialog(): Promise<string | undefined> {
    const path = await open({
      multiple: false,
      filters: [
        { name: "JSON", extensions: ["json"] },
      ],
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
        const newRecentFiles = prev.filter((prevFilePath) =>
          prevFilePath !== path
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

  function setFileData(file: object, path: string) {
    setConfigureFile(file);
    setFilePath(path);
    setFileName(path.split("/").pop()!);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter((prevFilePath) =>
        prevFilePath !== path
      );
      return [path, ...newRecentFiles];
    });
    setIsFileOpen(true);
  }

  async function saveConfigAsFile() {
    const json_str = JSON.stringify(configureFile(), null, "  ");
    const fileNameFromPath = filePath()
      ? filePath()!.match(/[^?!//]+$/)!.toString()
      : "";
    const currentFilePath = filePath()
      ? fileName() === fileNameFromPath ? filePath() : filePath()!.replace(
        fileNameFromPath,
        fileName(),
      )
      : fileName();

    const path = await save({
      defaultPath: currentFilePath!.slice(
          currentFilePath!.length - 5,
          currentFilePath!.length,
        ) === ".json"
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
      setFileName(currentPathFileName);
    }

    await writeTextFile(path, json_str);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter((prevFilePath) =>
        prevFilePath !== path
      );
      return [path.replaceAll("\\", "/"), ...newRecentFiles];
    });
  }

  async function saveConfigToPort() {
    if (portId().length === 0) return;
    const json_str = JSON.stringify(configureFile(), null, "  ");
    const saveConfig = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.set`,
      json_str,
    ]);
    await saveConfig.execute();
  }

  // Check recent file list item is hovered
  const [isButtonHovered, setIsButtonHoverd] = createSignal<
    [boolean, number | null]
  >([
    false,
    null,
  ]);

  return (
    <>
      <div
        style={{
          "padding-top": "4rem",
          "padding-bottom": "4rem",
          "height": "100%",
          "width": `100%`,
          "overflow-y": "auto",
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
        <Stack
          width="44rem"
          marginLeft={`calc((100% - 44rem) / 2)`}
          height="100%"
        >
          <Show when={!isFileOpen()}>
            <Text variant="heading" size="2xl">
              Configuration
            </Text>
            <Stack
              direction="row"
              marginTop="1.5rem"
              gap="1.5rem"
            >
              <Button
                variant="outline"
                padding="4rem"
                onClick={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(configFormFileFormat()),
                  );
                  setFileName("New File");
                  setConfigureFile(newEmptyFile);
                  setFilePath(undefined);
                  setIsFileOpen(true);
                }}
              >
                Create New File
              </Button>
              <Button
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
                  setFileData(object!, path);
                }}
              >
                Open File
              </Button>
              <Button
                variant="outline"
                padding="4rem"
                disabled={portId().length === 0}
                onClick={() => {
                  setFilePath(undefined);
                  getConfigFromPort();
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
                <Text
                  size="sm"
                  fontWeight="light"
                  opacity="50%"
                >
                  Path
                </Text>
              </Stack>
              <Stack
                style={{ "overflow-y": "auto" }}
                height="100%"
                width="100%"
                gap="0"
                marginLeft="-0.5rem"
                borderTopWidth="1"
                borderBottomWidth="1"
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
                          setFileData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        size="md"
                        height="2rem"
                        fontWeight="medium"
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          "display": "block",
                          "overflow": "hidden",
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
                          setFileData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          "display": "block",
                          "overflow": "hidden",
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
          </Show>
          <Show when={isFileOpen()}>
            <div style={{ width: "40rem", "margin-left": "2rem" }}>
              <Card.Root
                padding="2rem"
                paddingTop="3rem"
                marginBottom="3rem"
              >
                <ConfigForm
                  label={fileName()}
                  onLabelChange={(e) => setFileName(e)}
                  config={configureFile()}
                  onCancel={() => setIsFileOpen(false)}
                />
                <Card.Footer padding={0}>
                  <Stack direction="row-reverse">
                    <Menu.Root>
                      <Menu.Trigger>
                        <Button>
                          Save
                        </Button>
                      </Menu.Trigger>
                      <Menu.Positioner>
                        <Menu.Content width="8rem">
                          <Menu.Item
                            value="Save as file"
                            onClick={() => {
                              saveConfigAsFile();
                            }}
                            userSelect="none"
                          >
                            Save as file
                          </Menu.Item>
                          <Menu.Separator />
                          <Menu.Item
                            value="Save to port"
                            disabled={portId().length === 0}
                            onClick={() => saveConfigToPort()}
                            userSelect="none"
                          >
                            Save to port
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Positioner>
                    </Menu.Root>
                  </Stack>
                </Card.Footer>
              </Card.Root>
            </div>
          </Show>
        </Stack>
      </div>
    </>
  );
}

export default Configuration;

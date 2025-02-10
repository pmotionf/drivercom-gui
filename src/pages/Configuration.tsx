import { createSignal, For, Show } from "solid-js";

import { Button } from "~/components/ui/button";

import { ConfigForm } from "~/components/ConfigForm";
import { IconFile, IconX } from "@tabler/icons-solidjs";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { readTextFile } from "@tauri-apps/plugin-fs";
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

function Configuration() {
  const [configureFile, setConfigureFile] = createSignal({});
  const [fileName, setFileName] = createSignal("");
  const [isFileOpen, setIsFileOpen] = createSignal(false);

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

  async function openFileDialog() {
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
    return path;
  }

  function compareFileFormat(newFile: object, fileFormat: object): boolean {
    const newFileObject = Object.entries(newFile).sort();
    const configFileObject = Object.entries(fileFormat).sort();

    const newFileFormat = newFileObject.map((line) => {
      const key = line[0];
      const value = line[1];
      if (typeof value === "object") {
        const checkValue = Object.entries(value).map((valueLine) => {
          const valueKey = valueLine[0];
          const typeOfValue = typeof valueLine[1];
          return [valueKey, typeOfValue];
        });
        return checkValue;
      }
      return [key, typeof value];
    }).toString();

    const configFileFormat = configFileObject.map((line) => {
      const key = line[0];
      const value = line[1];
      if (typeof value === "object") {
        const checkValue = Object.entries(value).map((valueLine) => {
          const valueKey = valueLine[0];
          const typeOfValue = typeof valueLine[1];
          return [valueKey, typeOfValue];
        });
        return checkValue;
      }
      return [key, typeof value];
    }).toString();

    return newFileFormat === configFileFormat;
  }

  async function readJsonFile(path: string) {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);

      const checkFileFormat = compareFileFormat(
        parseFileToObject,
        configFormFileFormat(),
      );
      if (!checkFileFormat) {
        toaster.create({
          title: "Invalid File",
          description: "The file is invalid.",
          type: "error",
        });
        return;
      }

      const fileName = path.replaceAll("\\", "/").split("/").pop();
      setFileName(fileName!);
      setConfigureFile(parseFileToObject);
      setIsFileOpen(true);
      setRecentConfigFilePaths((prev) => {
        const newRecentFiles = prev.filter((prevFilePath) =>
          prevFilePath !== path
        );
        return [path, ...newRecentFiles];
      });
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
        return [...newRecentFiles];
      });
    }
  }

  return (
    <>
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
      <div
        style={{
          "padding-top": "4rem",
          "padding-bottom": "4rem",
          "height": "100%",
        }}
      >
        <Show
          when={!isFileOpen()}
          fallback={
            <Stack direction="row" justifyContent={"center"}>
              <ConfigForm
                label={fileName()}
                config={configureFile()}
                onErrorMessage={(msg) => toaster.create(msg)}
                onCancel={() => setIsFileOpen(false)}
              />
            </Stack>
          }
        >
          <Stack
            width="42rem"
            marginLeft={`calc((100% - 42rem) / 2)`}
            height={"100%"}
          >
            <Text variant={"heading"} size={"3xl"}>
              Configuration
            </Text>
            <Stack
              direction={"row"}
              marginTop={"1.5rem"}
            >
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(configFormFileFormat()),
                  );
                  setFileName("New File");
                  setConfigureFile(newEmptyFile);
                  setIsFileOpen(true);
                }}
              >
                Create New File
              </Button>
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={async () => {
                  const path = await openFileDialog();
                  if (!path) return;
                  readJsonFile(path);
                }}
              >
                Open File
              </Button>
              <Button
                variant={"outline"}
                padding={"4rem"}
                disabled={portId().length === 0}
                onClick={() => {
                  getConfigFromPort();
                }}
              >
                Get From Port
              </Button>
            </Stack>
            <Show when={recentConfigFilePaths().length !== 0}>
              <Text size={"xl"} marginTop={"2rem"} fontWeight={"bold"}>
                Recent
              </Text>
              <Stack
                marginTop={"1rem"}
                maxHeight={"100%"}
                style={{ "overflow-y": "auto" }}
              >
                <For each={recentConfigFilePaths()}>
                  {(path, index) => (
                    <Stack
                      style={{ padding: "1rem" }}
                      direction={"row"}
                      borderWidth={"1px"}
                      borderRadius={"0.5rem"}
                    >
                      <IconButton disabled width={"1rem"} cursor={"default"}>
                        <IconFile />
                      </IconButton>
                      <Text
                        cursor={"pointer"}
                        userSelect="none"
                        onClick={() => {
                          readJsonFile(path);
                        }}
                        size={"lg"}
                        marginLeft={"0.5rem"}
                        marginTop={"0.2rem"}
                        width={"20rem"}
                      >
                        {path.match(/[^\\\\]+$/)}
                      </Text>
                      <Text
                        userSelect="none"
                        fontWeight={"light"}
                        marginLeft={"0.5rem"}
                        marginTop={"0.4rem"}
                        width={"15rem"}
                        opacity={"70%"}
                      >
                        {path.match(/[^?!\\\\]+$/)}
                      </Text>
                      <Stack width={"100%"} direction={"row-reverse"}>
                        <IconButton
                          padding={"0"}
                          variant={"ghost"}
                          borderRadius={"1rem"}
                          onClick={() => {
                            setRecentConfigFilePaths((prev) => {
                              const updateFilePath = prev.filter((_, i) => {
                                return i !== index();
                              });
                              return updateFilePath;
                            });
                          }}
                        >
                          <IconX />
                        </IconButton>
                      </Stack>
                    </Stack>
                  )}
                </For>
              </Stack>
            </Show>
          </Stack>
        </Show>
      </div>
    </>
  );
}

export default Configuration;

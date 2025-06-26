import { createSignal, Show } from "solid-js";

import { ConfigForm } from "~/components/ConfigForm.tsx";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast.tsx";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

import {
  configFormFileFormat,
  portId,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
} from "~/GlobalState.ts";
import { Command } from "@tauri-apps/plugin-shell";
import { onMount } from "solid-js";
import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/styled/button.tsx";
import { Editable } from "~/components/ui/editable.tsx";
import { FileMenu } from "~/components/FileMenu.tsx";
import { PortMenu } from "~/components/PortMenu.tsx";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import { Text } from "~/components/ui/text";
import { IconX } from "@tabler/icons-solidjs";
import { ConnectButton } from "./Connect/ConnectButton.tsx";

function Configuration() {
  const [config, setConfig] = createSignal({});
  const [formName, setFormName] = createSignal<string>("");
  const [filePath, setFilePath] = createSignal<string | null>(null);
  const [render, setRender] = createSignal<boolean>(false);

  onMount(() => {
    setConfig(JSON.parse(JSON.stringify(configFormFileFormat())));
    setRender(true);
  });

  const refresh = () => {
    setRender(false);
    setRender(true);
  };

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

  async function openFileDialog(): Promise<string | null> {
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
      return null;
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      toaster.create({
        title: "Invalid File Extension",
        description: "The file extension is invalid.",
        type: "error",
      });
      return null;
    }
    return path.replaceAll("\\", "/");
  }

  async function readJsonFile(path: string): Promise<object | null> {
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
      return null;
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

  return (
    <>
      <div
        style={{
          "padding-top": "0.5rem",
          "padding-bottom": "0.5rem",
          height: "100%",
          width: `100% `,
          "justify-content": "center",
          display: "flex",
        }}
      >
        <Stack
          style={{
            width: "40%",
            height: `calc(100% - 1rem)`,
            "margin-top": "0.5rem",
            "padding-top": "1rem",
            "padding-bottom": "1rem",
            "padding-left": "1rem",
            "padding-right": "1rem",
            "min-width": "30rem",
            "border-radius": "0.5rem",
            "box-shadow": "0px 0px 15px 1px rgb(0,0,0,0.05)",
            "border-width": "1px",
          }}
          borderColor="bg.muted"
          backgroundColor="bg.default"
        >
          <Show when={render()}>
            <Stack direction="row" width="100%">
              <Tooltip.Root positioning={{ placement: "bottom-start" }}>
                <Tooltip.Trigger width={`calc(100% - 9rem)`}>
                  <Editable.Root
                    placeholder="File name"
                    defaultValue={formName() ? formName() : "New File"}
                    activationMode="dblclick"
                    onValueCommit={(e) => {
                      setFormName(e.value);
                    }}
                    fontWeight="bold"
                    fontSize="2xl"
                  >
                    <Editable.Area>
                      <Editable.Input width="100%" />
                      <Editable.Preview
                        width="100%"
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          display: "block",
                          overflow: "hidden",
                          "text-align": "left",
                        }}
                      />
                    </Editable.Area>
                  </Editable.Root>
                </Tooltip.Trigger>
                <Show when={filePath()}>
                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">{filePath()!}</Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Show>
              </Tooltip.Root>

              <FileMenu
                filePath={filePath() ? filePath()! : ""}
                recentFiles={recentConfigFilePaths()}
                onNewFile={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(configFormFileFormat()),
                  );
                  setFormName("New File");
                  setConfig(newEmptyFile);
                  setFilePath(null);
                  refresh();
                }}
                onOpenFile={async () => {
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
                  refresh();
                }}
                onOpenRecentFile={async (filePath: string) => {
                  const object = await readJsonFile(filePath);
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
                  setFormData(object!, filePath);
                  refresh();
                }}
                onDeleteRecentPath={(index: number) => {
                  setRecentConfigFilePaths((prev) => {
                    return prev.filter((_, i) => i !== index);
                  });
                }}
                onReloadFile={async () => {
                  const object = await readJsonFile(filePath()!);
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
                  setFormData(object!, filePath()!);
                  refresh();
                }}
                onSaveFile={() => saveConfigAsFile()}
              />
              <PortMenu
                disabled={portId().length === 0}
                onGetFromPort={async () => {
                  if (portId().length === 0) return;
                  setFilePath(null);
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
                    refresh();
                  }
                }}
                onSaveToPort={async () => {
                  if (portId().length === 0) return;
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
              >
                <Button
                  disabled={portId().length === 0}
                  variant="outline"
                  borderColor="bg.disabled"
                  borderRadius="0.4rem"
                >
                  Port
                </Button>
              </PortMenu>
            </Stack>

            <ConfigForm config={config()} label={formName()} />
          </Show>
        </Stack>
      </div>
      <ConnectButton
        style={{ position: "absolute", right: "0.5rem", top: "1rem" }}
      />
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
    </>
  );
}

export default Configuration;

import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text.tsx";
import {
  logFormFileFormat,
  Pages,
  panelContexts,
  panelKeys,
  portId,
  recentLogFilePaths,
  setPage,
  setRecentLogFilePaths,
  tabContexts,
} from "~/GlobalState.ts";
import { Command } from "@tauri-apps/plugin-shell";
import { createSignal, Show } from "solid-js";
import { LoggingForm } from "~/components/LoggingForm.tsx";
import { Toast } from "~/components/ui/toast.tsx";
import {
  IconFileDownload,
  IconPlayerPlay,
  IconPlayerStop,
  IconReload,
  IconX,
} from "@tabler/icons-solidjs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { onMount } from "solid-js";
import { Editable } from "~/components/ui/editable.tsx";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import { createEffect } from "solid-js";
import { on } from "solid-js";
import { PanelSizeContext } from "~/components/PanelLayout.tsx";
import { FileMenu } from "~/components/FileMenu.tsx";
import { PortMenu } from "~/components/PortMenu.tsx";
import { ConnectButton } from "./Connect/ConnectButton.tsx";
import { TabContext } from "~/components/Tab.tsx";
import { createStore } from "solid-js/store";
import { TabListContext } from "~/components/TabList.tsx";
import { Button } from "~/components/ui/button.tsx";
import { PlotContext } from "~/components/Plot.tsx";

export function Logging() {
  const [logConfigure, setLogConfigure] = createSignal({});
  const [formTitle, setFormTitle] = createSignal<string>("");
  const [filePath, setFilePath] = createSignal<string>("");

  // This signal is needed in UI when reload the file or port.
  const [renderLoggingForm, setRenderLoggingForm] =
    createSignal<boolean>(false);

  onMount(() => {
    setLogConfigure(JSON.parse(JSON.stringify(logFormFileFormat())));
    setRenderLoggingForm(true);
  });

  createEffect(
    on(
      () => portId(),
      async () => {
        const logState = await getCurrentLogStatus();
        setCurrentLogStatus(logState ? logState.logStatus : null);
        setCyclesCompleted(logState ? logState.cycle : null);
      },
    ),
  );

  async function GetLogConfigFromPort(): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const sideCommand = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.config.get`,
    ]);
    const output = await sideCommand.execute();
    return { stdout: output.stdout, stderr: output.stderr };
  }

  async function openFileDialog(): Promise<
    string | { title: string; description: string; type: string }
  > {
    const path = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) {
      return {
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      };
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      return {
        title: "Invalid File Extension",
        description: "The file extension is invalid.",
        type: "error",
      };
    }
    return path.replaceAll("\\", "/");
  }

  function checkFileFormat(file: object): string {
    const newFileFormat = Object.entries(file)
      .map((entry) => {
        const key = entry[0];
        const value = entry[1];
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
    const logFileObject = checkFileFormat(fileFormat);
    return newFileObject === logFileObject;
  }

  async function readJsonFile(path: string): Promise<object | null> {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);
      return parseFileToObject;
    } catch {
      return null;
    }
  }

  function setLogFormData(form: object, path: string) {
    setLogConfigure(form);
    setFormTitle(path.split("/").pop()!);
    setFilePath(path);
    refresh();
  }

  const [cyclesCompleted, setCyclesCompleted] = createSignal<number | null>(0);
  const [currentLogStatus, setCurrentLogStatus] = createSignal<string | null>(
    null,
  );
  createEffect(
    on(
      () => currentLogStatus(),
      () => {
        if (currentLogStatus() === "Log.Status.invalid") {
          toaster.create({
            title: "Invalid Log",
            description: "The log is invalid.",
            type: "error",
          });
        }
      },
      { defer: true },
    ),
  );

  async function getCurrentLogStatus(): Promise<null | {
    logStatus: string;
    cycle: number;
  }> {
    if (portId().length === 0) return null;
    const logStatus = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.status`,
    ]);
    const output = await logStatus.execute();
    const parseOutput = output.stdout.replaceAll(" ", "").replaceAll("\n", "");
    const currentLogStatusList = parseOutput.split(",").map((value) => {
      return value.split(":");
    });

    const currentCompletedLogCycle = Number(currentLogStatusList[1][1]);
    const currentLogState = currentLogStatusList[0][1];

    if (!currentLogState || isNaN(currentCompletedLogCycle)) return null;
    return { logStatus: currentLogState, cycle: currentCompletedLogCycle };
  }

  // Signal for display Log Get button loading while saving log.csv file.
  const [logGetBtnLoading, setLogGetBtnLoading] = createSignal(false);

  // Save log.csv file && Display `Log Get` button loading while saving log.csv file
  async function saveLogCsvFile(): Promise<
    string | { title: string; description: string; type: string } | null
  > {
    const logGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `--timeout`,
      `10000`,
      `log.get`,
    ]);
    const output = await logGet.execute();

    if (output) {
      const notEmptyLines = output.stdout
        .split("\n")
        .filter((line) => line.length > 0);

      if (output.stderr.length > 0) {
        return {
          title: "Communication Failure",
          description: output.stderr,
          type: "error",
        };
      }

      if (notEmptyLines.length <= 1) {
        return {
          title: "Invalid Log",
          description: "No log data found.",
          type: "error",
        };
      }

      const csvFile = output.stdout;
      return csvFile;
    }
    return null;
  }

  async function startLogging() {
    const logStart = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.start`,
    ]);
    await logStart.execute();
  }

  async function stopLogging() {
    const logStop = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.stop`,
    ]);
    await logStop.execute();
  }

  async function openSaveFileDialog(): Promise<string | null> {
    const fileNameFromPath =
      filePath! && filePath.length !== 0
        ? filePath()
            .match(/[^?!//]+$/)!
            .toString()
        : "";
    const currentFilePath =
      filePath! && filePath.length !== 0
        ? formTitle() === fileNameFromPath
          ? filePath()
          : filePath().replace(fileNameFromPath, formTitle)
        : formTitle();

    const path = await save({
      defaultPath:
        currentFilePath!.split(".").pop()!.toLowerCase() === "json"
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
      return null;
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      return null;
    }

    return path;
  }

  async function saveLogAsFile(path: string, logForm: object) {
    const json_str = JSON.stringify(logForm, null, "  ");
    await writeTextFile(path, json_str);
    setRecentLogFilePaths((prev) => {
      const parseFilePath = prev.filter((prevPath) => prevPath !== path);
      return [path.replaceAll("\\", "/"), ...parseFilePath];
    });
  }

  async function saveLogToPort(log: object): Promise<string> {
    const json_str = JSON.stringify(log, null, "  ");
    const logSave = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.config.set`,
      json_str,
    ]);
    const output = await logSave.execute();
    return output.stderr;
  }

  const refresh = () => {
    setRenderLoggingForm(false);
    setRenderLoggingForm(true);
  };

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const openNewTab = (newFilePath: string) => {
    if (!panelKeys.has(Pages.LogViewer)) {
      const uuid = crypto.randomUUID();
      panelKeys.set(Pages.LogViewer, uuid);
      panelContexts.set(uuid, createSignal<PanelSizeContext[]>([]));
    }
    const panelKey = panelKeys.get(Pages.LogViewer);
    if (panelKey && panelContexts.get(panelKey)) {
      const panelContext = panelContexts.get(panelKey)!;
      if (panelContext[0]().length === 0) {
        panelContext[1]([{ id: crypto.randomUUID(), size: 100 }]);
      }
      const ctx = panelContext[0]();
      const tabListId = ctx[0].id;
      if (!tabContexts.has(tabListId)) {
        tabContexts.set(
          tabListId,
          createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
        );
      }
      const tabCtx = tabContexts.get(tabListId);
      const newTabID = crypto.randomUUID();
      const newTab: TabContext = {
        id: newTabID,
        filePath: newFilePath.replaceAll("\\", "/"),
        tabName: "",
        plotContext: [{} as PlotContext],
      };

      setTimeout(() => {
        tabCtx![1]({
          tabContext: [
            ...(tabCtx![0].tabContext.length !== 0
              ? tabCtx![0].tabContext
              : []),
            newTab,
          ],
          focusedTab: newTabID,
        });
        setPage(Pages.LogViewer);
      }, 200);
    }
  };

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
          <Show when={renderLoggingForm()}>
            <Stack direction="row" width="100%">
              <Tooltip.Root positioning={{ placement: "bottom-start" }}>
                <Tooltip.Trigger width={`calc(100% - 13.5rem)`}>
                  <Editable.Root
                    placeholder="File name"
                    defaultValue={formTitle()}
                    activationMode="dblclick"
                    onValueCommit={(e) => {
                      setFormTitle(e.value);
                    }}
                    fontWeight="bold"
                    fontSize="2xl"
                    textAlign="left"
                  >
                    <Editable.Area>
                      <Editable.Input width="100%" />
                      <Editable.Preview
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          display: "block",
                          overflow: "hidden",
                        }}
                      />
                    </Editable.Area>
                  </Editable.Root>
                </Tooltip.Trigger>
                <Show when={filePath().length !== 0}>
                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">{filePath()}</Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Show>
              </Tooltip.Root>

              <FileMenu
                filePath={filePath()}
                recentFiles={recentLogFilePaths()}
                onNewFile={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(logFormFileFormat()),
                  );
                  setFormTitle("New File");
                  setLogConfigure(newEmptyFile);
                  setFilePath("");
                  refresh();
                }}
                onOpenFile={async () => {
                  const path = await openFileDialog();
                  if (typeof path !== "string") {
                    toaster.create(path);
                    return;
                  }

                  const logObj = await readJsonFile(path);
                  if (!logObj) {
                    toaster.create({
                      title: "Invalid File Path",
                      description: "The file path is invalid.",
                      type: "error",
                    });
                    return;
                  }

                  if (compareFileFormat(logObj, logFormFileFormat())) {
                    setLogFormData(logObj, path);
                    setRecentLogFilePaths((prev) => {
                      const newRecentFiles = prev.filter(
                        (prevFilePath) => prevFilePath !== path,
                      );
                      return [path, ...newRecentFiles];
                    });
                    refresh();
                  } else {
                    toaster.create({
                      title: "Invalid File",
                      description: "File format is invalid.",
                      type: "error",
                    });
                  }
                }}
                onOpenRecentFile={async (filePath: string) => {
                  const object = await readJsonFile(filePath);
                  if (!object) {
                    toaster.create({
                      title: "Invalid File Path",
                      description: "The file path is invalid.",
                      type: "error",
                    });
                    setRecentLogFilePaths((prev) => {
                      return prev.filter(
                        (prevFilePath) => prevFilePath !== filePath,
                      );
                    });
                    return;
                  }
                  setLogFormData(object!, filePath);
                }}
                onDeleteRecentPath={(index: number) => {
                  setRecentLogFilePaths((prev: string[]) => {
                    return prev.filter((_, i) => {
                      return i !== index;
                    });
                  });
                }}
                onReloadFile={async () => {
                  if (filePath().length === 0) return;
                  setRenderLoggingForm(false);

                  const logObj = await readJsonFile(filePath());
                  if (!logObj) {
                    toaster.create({
                      title: "Invalid File Path",
                      description: "The file path is invalid.",
                      type: "error",
                    });
                    setRecentLogFilePaths((prev) => {
                      return prev.filter(
                        (prevFilePath) => prevFilePath !== filePath(),
                      );
                    });
                    return;
                  }
                  setLogConfigure(logObj);
                  refresh();
                }}
                onSaveFile={async () => {
                  const path = await openSaveFileDialog();
                  if (!path) {
                    toaster.create({
                      title: "Invalid File Path",
                      description: "The specified file path is invalid.",
                      type: "error",
                    });
                    return;
                  }
                  await saveLogAsFile(path, logConfigure());
                }}
              />

              <Stack
                padding="0"
                direction="row"
                borderRadius="0.4rem"
                borderWidth="1px"
                borderColor="bg.disabled"
                gap="0"
              >
                <PortMenu
                  disabled={portId().length === 0 || logGetBtnLoading()}
                  onGetFromPort={async () => {
                    const output = await GetLogConfigFromPort();
                    if (output.stderr.length !== 0) {
                      toaster.create({
                        title: "Communication Error",
                        description: output.stderr,
                        type: "error",
                      });
                      return;
                    }
                    setFormTitle(portId());
                    setLogConfigure(JSON.parse(output.stdout));
                    setFilePath("");
                    refresh();
                  }}
                  onSaveToPort={async () => {
                    const outputError = await saveLogToPort(logConfigure());
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
                      description: "Log saved to port successfully.",
                      type: "error",
                    });

                    const logState = await getCurrentLogStatus();
                    setCurrentLogStatus(logState ? logState.logStatus : null);
                    setCyclesCompleted(logState ? logState.cycle : null);
                  }}
                />

                <Show
                  when={currentLogStatus() === "Log.Status.started"}
                  fallback={
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <IconButton
                          disabled={
                            portId().length === 0 ||
                            logGetBtnLoading() ||
                            currentLogStatus() === "Log.Status.invalid" ||
                            currentLogStatus() === "Log.Status.started" ||
                            currentLogStatus() === "Log.Status.waiting"
                          }
                          onClick={async () => {
                            await startLogging();
                            setTimeout(async () => {
                              const logState = await getCurrentLogStatus();
                              setCurrentLogStatus(
                                logState ? logState.logStatus : null,
                              );
                              setCyclesCompleted(
                                logState ? logState.cycle : null,
                              );
                            }, 100);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <IconPlayerPlay />
                        </IconButton>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content backgroundColor="bg.default">
                          <Text color="fg.default">Start Logging</Text>
                        </Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
                  }
                >
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <IconButton
                        onClick={async () => {
                          await stopLogging();
                          const logState = await getCurrentLogStatus();
                          setCurrentLogStatus(
                            logState ? logState.logStatus : null,
                          );
                          setCyclesCompleted(logState ? logState.cycle : null);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <IconPlayerStop />
                      </IconButton>
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content backgroundColor="bg.default">
                        <Text color="fg.default">Stop Logging</Text>
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
                </Show>

                <Show
                  when={
                    currentLogStatus() !== "Log.Status.stopped" ||
                    portId().length === 0 ||
                    currentLogStatus() === "Log.Status.invalid" ||
                    cyclesCompleted() === 0 ||
                    portId().length === 0
                  }
                  fallback={
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button
                          loading={logGetBtnLoading()}
                          onClick={async () => {
                            if (portId().length === 0) return;
                            const path = await save({
                              defaultPath:
                                formTitle().split(".").pop()!.toLowerCase() ===
                                "csv"
                                  ? `${formTitle()}`
                                  : `${formTitle()}.csv`,
                              filters: [
                                {
                                  name: "CSV",
                                  extensions: ["csv"],
                                },
                              ],
                            });

                            if (!path) {
                              toaster.create({
                                title: "Invalid File Path",
                                description: "The file path is invalid.",
                                type: "error",
                              });
                              setLogGetBtnLoading(false);
                              return;
                            }
                            const extension = path.split(".").pop();
                            if (extension != "csv") {
                              toaster.create({
                                title: "Invalid File Extension",
                                description: "The file extension is invalid.",
                                type: "error",
                              });
                              setLogGetBtnLoading(false);
                              return;
                            }
                            setLogGetBtnLoading(true);
                            const csvFile = await saveLogCsvFile();
                            setLogGetBtnLoading(false);
                            if (csvFile) {
                              if (typeof csvFile === "string") {
                                await writeTextFile(path, csvFile);
                                toaster.create({
                                  title: "Download Success",
                                  description: `The file is Downloaded at`,
                                  type: "success",
                                  action: {
                                    label: `${path}`,
                                    onClick: () => {
                                      openNewTab(path);
                                    },
                                  },
                                });
                              } else {
                                toaster.create(csvFile);
                              }
                            }
                          }}
                          variant="ghost"
                          userSelect="none"
                          size="sm"
                        >
                          <IconFileDownload />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content backgroundColor="bg.default">
                          <Text color="fg.default">Get Log</Text>
                        </Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
                  }
                >
                  {/* Refresh Log Status btn */}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <IconButton
                        disabled={portId().length === 0 || logGetBtnLoading()}
                        onClick={async () => {
                          const logState = await getCurrentLogStatus();
                          setCurrentLogStatus(
                            logState ? logState.logStatus : null,
                          );
                          setCyclesCompleted(logState ? logState.cycle : null);
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <IconReload />
                      </IconButton>
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content backgroundColor="bg.default">
                        <Text color="fg.default">Refresh Log Status</Text>
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
                </Show>
                {/* Get Log button need to add tooltip */}
              </Stack>
            </Stack>

            <LoggingForm formData={logConfigure()} />
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
            {toast().action && (
              <Toast.ActionTrigger>
                <Text
                  size="sm"
                  style={{
                    width: "100%",
                    height: "1rem",
                    display: "block",
                    "white-space": "none",
                    overflow: "hidden",
                    "text-overflow": "ellipsis",
                    "text-decoration": "underline",
                  }}
                  fontWeight="bold"
                >
                  {toast().action?.label}
                </Text>
              </Toast.ActionTrigger>
            )}
            <Toast.CloseTrigger>
              <IconX />
            </Toast.CloseTrigger>
          </Toast.Root>
        )}
      </Toast.Toaster>
    </>
  );
}

export default Logging;

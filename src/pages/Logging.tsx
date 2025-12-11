import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text.tsx";
import {
  portCommands,
  logFormFileFormat,
  Pages,
  pageKeys,
  portId,
  recentLogFilePaths,
  setRecentLogFilePaths,
  csvFileDownloads,
  setCsvFileDownloads,
  setPortId,
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
import { IconButton } from "~/components/ui/icon-button.tsx";
import { onMount } from "solid-js";
import { Editable } from "~/components/ui/editable.tsx";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import { createEffect } from "solid-js";
import { on } from "solid-js";
import { FileMenu } from "~/components/FileMenu.tsx";
import { PortMenu } from "~/components/PortMenu.tsx";
import { ConnectButton } from "./Connect/ConnectButton.tsx";
import { Button } from "~/components/ui/button.tsx";
import { FileHandler } from "./utils/FileHandler.ts";
import { logForm, setLogForm } from "~/GlobalState.ts";
import { AccordionStates } from "~/components/Form.tsx";
import { DownloadStates, DownloadStatus } from "~/components/DownloadList.tsx";
import JSON5 from "json5";

export type LoggingFormType = {
  title: string;
  filePath: string;
  logConfig: object;
  accordionStates: AccordionStates;
  originalFile: object;
};

export function Logging() {
  // This signal is needed in UI when reload the file or port.
  const [renderLoggingForm, setRenderLoggingForm] =
    createSignal<boolean>(false);

  onMount(async () => {
    if (!pageKeys.has(Pages.Logging)) {
      pageKeys.set(Pages.Logging, crypto.randomUUID());
    }
    if (Object.values(logForm.logConfig).length === 0) {
      const accordionStates: AccordionStates = new Map();
      setLogForm({
        title: "New file",
        logConfig: JSON5.parse(JSON5.stringify(logFormFileFormat())),
        originalFile: JSON5.parse(JSON5.stringify(logFormFileFormat())),
        filePath: "",
        accordionStates: accordionStates,
      });
    }
    setRenderLoggingForm(true);

    if (portId().length > 0) {
      try {
        if (checkAvailablePort(portId())) return;
        const logStatus = await getCurrentLogStatus(portId());
        setCurrentLogStatus(logStatus.logStatus);
        setCyclesCompleted(logStatus.cycle);
      } catch {
        setCurrentLogStatus(null);
        setCyclesCompleted(null);
      }
    }
  });

  createEffect(
    on(
      () => portId(),
      async () => {
        if (portId().length > 0) {
          try {
            if (checkAvailablePort(portId())) return;
            const logStatus = await getCurrentLogStatus(portId());
            setCurrentLogStatus(logStatus.logStatus);
            setCyclesCompleted(logStatus.cycle);
          } catch {
            setCurrentLogStatus(null);
            setCyclesCompleted(null);
          }
        }

        if (Array.from(portCommands.values()).length > 0) {
          Array.from(portCommands.values()).forEach((command) => {
            if (command.port !== portId()) {
              command.child.kill();
              portCommands.delete(command.child.pid);
            }
          });
        }
      },
      { defer: true },
    ),
  );

  const checkAvailablePort = (portId: string): boolean => {
    if (portId.length <= 0) {
      return false;
    }
    if (
      Array.from(portCommands.values()).some(
        (command) => command.port === portId,
      )
    ) {
      toaster.create({
        title: "Communication error",
        description: "Port is already in use.",
        type: "error",
      });
      return false;
    }
    return true;
  };

  async function GetLogConfigFromPort(portId: string): Promise<object> {
    const sideCommand = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
      `log.config.get`,
    ]);

    let stdout = "";
    sideCommand.stdout.on("data", (data) => {
      stdout = stdout + data;
    });

    let stderr = "";
    sideCommand.stderr.on("data", (data) => {
      stderr = stderr + data;
    });
    const child = await sideCommand.spawn();
    const pid = child.pid;
    portCommands.set(pid, { port: portId, child: child });

    return new Promise((resolve, reject) => {
      sideCommand.on("close", () => {
        portCommands.delete(pid);
        return resolve(JSON5.parse(stdout));
      });

      sideCommand.on("error", () => {
        portCommands.delete(pid);
        return reject(stderr);
      });
    });
  }

  function setLogFormData(form: object, path: string) {
    setLogForm({
      title: path.split("/").pop()!,
      filePath: path,
      logConfig: form,
      originalFile: JSON5.parse(JSON5.stringify(form)),
    });
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

  async function getCurrentLogStatus(portId: string): Promise<{
    logStatus: string;
    cycle: number;
  }> {
    const logStatus = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
      `log.status`,
    ]);

    let stdout = "";
    logStatus.stdout.on("data", (data) => {
      stdout = stdout + data;
    });

    let stderr = "";
    logStatus.stderr.on("data", (data) => {
      stderr = stderr + data;
    });

    const child = await logStatus.spawn();
    const pid = child.pid;
    portCommands.set(pid, { port: portId, child: child });

    return new Promise((resolve, reject) => {
      logStatus.on("close", async () => {
        portCommands.delete(pid);
        if (stdout.length < 1) return reject("Invalid log status.");
        const parseOutput = stdout.replaceAll(" ", "").replaceAll("\n", "");
        const currentLogStatusList = parseOutput.split(",").map((value) => {
          return value.split(":");
        });

        const currentCompletedLogCycle = Number(currentLogStatusList[1][1]);
        const currentLogState = currentLogStatusList[0][1];

        if (!currentLogState || isNaN(currentCompletedLogCycle))
          return reject("Invalid log status.");
        return resolve({
          logStatus: currentLogState,
          cycle: currentCompletedLogCycle,
        });
      });

      logStatus.on("error", async () => {
        portCommands.delete(pid);
        return reject(stderr);
      });
    });
  }

  // Signal for display Log Get button loading while saving log.csv file.
  const [logGetBtnLoading, setLogGetBtnLoading] = createSignal(false);

  // Save log.csv file && Display `Log Get` button loading while saving log.csv file
  async function saveLogCsvFile(
    filePath: string,
    portId: string,
    cycle: number,
  ) {
    const logGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
      `--timeout`,
      `10000`,
      `log.get`,
      `-f`,
      filePath,
    ]);

    let pid: number | null = null;
    let logCycles = 0;

    logGet.stdout.on("data", () => {
      logCycles = logCycles + 1;
      const index = csvFileDownloads.findIndex(
        (download) => download.filePath === filePath,
      );

      setCsvFileDownloads(
        index,
        "downloadProgress",
        Math.floor((logCycles / cycle) * 100),
      );
    });

    logGet.on("close", (data) => {
      if (data.code === null) {
        toaster.create({
          title: "Download Fail",
          description: "Fail to download file.",
          type: "error",
        });
        const index = csvFileDownloads.findIndex(
          (download) => download.filePath === filePath,
        );
        if (csvFileDownloads[index].status === DownloadStatus.Progressing) {
          setCsvFileDownloads(index, "status", DownloadStatus.Error);
        }
      } else {
        if (data.code == 0) {
          const index = csvFileDownloads.findIndex(
            (download) => download.filePath === filePath,
          );
          if (csvFileDownloads[index].status === DownloadStatus.Progressing) {
            setCsvFileDownloads(index, "status", DownloadStatus.Success);
          }
        } else {
          const index = csvFileDownloads.findIndex(
            (download) => download.filePath === filePath,
          );
          if (csvFileDownloads[index].status === DownloadStatus.Progressing) {
            setCsvFileDownloads(index, "status", DownloadStatus.Error);
          }
        }
      }

      logGet.removeAllListeners();
      if (pid) {
        portCommands.delete(pid);
      }
      setLogGetBtnLoading(false);
    });

    logGet.on("error", async (error) => {
      toaster.create({
        title: "Download Fail",
        description: error,
        type: "error",
      });

      const index = csvFileDownloads.findIndex(
        (download) => download.filePath === filePath,
      );
      if (csvFileDownloads[index].status === DownloadStatus.Progressing) {
        setCsvFileDownloads(index, "status", DownloadStatus.Error);
      }

      logGet.removeAllListeners();
      if (pid) {
        portCommands.delete(pid);
      }
      setLogGetBtnLoading(false);
    });

    const child = await logGet.spawn();
    pid = child.pid;
    portCommands.set(pid, { port: portId, child: child });
    const newDownload: DownloadStates = {
      filePath: filePath,
      status: DownloadStatus.Progressing,
      port: portId,
      pid: pid,
      downloadProgress: 0,
    };
    setCsvFileDownloads([newDownload, ...csvFileDownloads]);
  }

  async function startLogging(portId: string): Promise<void> {
    const logStart = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
      `log.start`,
    ]);

    let stderr = "";
    logStart.stderr.on("data", (data) => {
      stderr = stderr + data;
    });

    const child = await logStart.spawn();
    const pid = child.pid;
    portCommands.set(pid, { port: portId, child: child });

    return new Promise((resolve, reject) => {
      logStart.on("close", () => {
        portCommands.delete(pid);
        return resolve();
      });

      logStart.on("error", () => {
        portCommands.delete(pid);
        return reject(stderr);
      });
    });
  }

  async function stopLogging(portId: string): Promise<void> {
    const logStop = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
      `log.stop`,
    ]);

    let stderr = "";
    logStop.stderr.on("data", (data) => {
      stderr = stderr + data;
    });
    const child = await logStop.spawn();
    const pid = child.pid;
    portCommands.set(pid, { port: portId, child: child });

    return new Promise((resolve, reject) => {
      logStop.on("close", () => {
        portCommands.delete(pid);
        return resolve();
      });

      logStop.on("error", () => {
        portCommands.delete(pid);
        return reject(stderr);
      });
    });
  }

  async function saveLogToPort(log: object, portId: string): Promise<void> {
    const json_str = JSON.stringify(log, null, "  ");
    const logSave = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId,
      `log.config.set`,
      json_str,
    ]);

    let stderr = "";
    logSave.stderr.on("data", (data) => {
      stderr = stderr + data;
    });

    const child = await logSave.spawn();
    const pid = child.pid;
    portCommands.set(pid, { port: portId, child: child });

    return new Promise((resolve, reject) => {
      logSave.on("close", () => {
        portCommands.delete(pid);
        return resolve();
      });

      logSave.on("error", () => {
        portCommands.delete(pid);
        return reject(stderr);
      });
    });
  }

  const refresh = () => {
    setRenderLoggingForm(false);
    setRenderLoggingForm(true);
  };

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const fileHandler = new FileHandler();

  let scrollContainer: HTMLDivElement | undefined;
  const scrollToWrongField = (scrollContainer: HTMLDivElement) => {
    const top = Array.from(
      document.querySelectorAll(`[data-name*="config_field_error"]`),
    )[0].parentElement?.offsetTop;

    if (top) {
      const one_rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      scrollContainer.scrollTo({
        top: top - scrollContainer.offsetTop - one_rem,
      });
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
                    defaultValue={logForm.title}
                    activationMode="dblclick"
                    onValueCommit={(e) => {
                      setLogForm("title", e.value);
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
                <Show when={logForm.filePath.length !== 0}>
                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">{logForm.filePath}</Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Show>
              </Tooltip.Root>

              <FileMenu
                filePath={logForm.filePath}
                recentFiles={recentLogFilePaths()}
                onNewFile={() => {
                  const newEmptyFile = JSON5.parse(
                    JSON5.stringify(logFormFileFormat()),
                  );
                  setLogForm({
                    title: "New File",
                    logConfig: newEmptyFile,
                    filePath: "",
                  });
                  refresh();
                }}
                onOpenFile={async () => {
                  try {
                    const extension = "json5";
                    const path = await fileHandler.openFileDialog(extension);
                    const file = await fileHandler.readFile(
                      path,
                      logFormFileFormat(),
                    );
                    setLogFormData(file, path);
                    setRecentLogFilePaths((prev) => {
                      const newRecentFiles = prev.filter(
                        (prevFilePath) => prevFilePath !== path,
                      );
                      return [path, ...newRecentFiles];
                    });
                    refresh();
                  } catch {
                    toaster.create({
                      title: "Invalid File ",
                      description: "The file is invalid.",
                      type: "error",
                    });
                  }
                }}
                onOpenRecentFile={async (filePath: string) => {
                  try {
                    const file = await fileHandler.readFile(
                      filePath,
                      logFormFileFormat(),
                    );
                    setLogFormData(file, filePath);
                  } catch {
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
                  }
                }}
                onDeleteRecentPath={(index: number) => {
                  setRecentLogFilePaths((prev: string[]) => {
                    return prev.filter((_, i) => {
                      return i !== index;
                    });
                  });
                }}
                onReloadFile={async () => {
                  if (logForm.filePath.length === 0) return;
                  setRenderLoggingForm(false);
                  try {
                    const file = await fileHandler.readFile(
                      logForm.filePath,
                      logFormFileFormat(),
                    );
                    setLogForm("logConfig", file);
                    setLogForm(
                      "originalFile",
                      JSON5.parse(JSON5.stringify(file)),
                    );
                  } catch {
                    toaster.create({
                      title: "Invalid File Path",
                      description: "The file path is invalid.",
                      type: "error",
                    });
                    setRecentLogFilePaths((prev) => {
                      return prev.filter(
                        (prevFilePath) => prevFilePath !== logForm.filePath,
                      );
                    });
                  }
                  refresh();
                }}
                onSaveFile={async () => {
                  try {
                    if (
                      scrollContainer &&
                      document.querySelectorAll(
                        `[data-name*="config_field_error"]`,
                      ).length > 0
                    ) {
                      scrollToWrongField(scrollContainer);
                      toaster.create({
                        title: "Invalid File",
                        description: "The file is invalid.",
                        type: "error",
                      });
                      return;
                    }
                    const path = await fileHandler.saveFileDialog(
                      "json5",
                      logForm.filePath,
                      logForm.title,
                    );
                    await fileHandler.writeFile(path, logForm.logConfig);
                    if (logForm.filePath === path) {
                      setLogForm(
                        "originalFile",
                        JSON5.parse(JSON5.stringify(logForm.logConfig)),
                      );
                    }
                  } catch {
                    toaster.create({
                      title: "Invalid File",
                      description: "The file is invalid.",
                      type: "error",
                    });
                  }
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
                  portId={portId}
                  variant={"ghost"}
                  onGetFromPort={async () => {
                    try {
                      if (!checkAvailablePort(portId())) return;
                      const logConfig = await GetLogConfigFromPort(portId());
                      setLogForm({
                        title: portId(),
                        filePath: "",
                        logConfig: logConfig,
                      });
                      refresh();
                    } catch (e) {
                      setPortId("");
                      toaster.create({
                        title: "Communication Error",
                        description: e as string,
                        type: "error",
                      });
                      return;
                    }
                  }}
                  onSaveToPort={async () => {
                    if (
                      scrollContainer &&
                      document.querySelectorAll(
                        `[data-name*="config_field_error"]`,
                      ).length > 0
                    ) {
                      scrollToWrongField(scrollContainer);
                      toaster.create({
                        title: "Invalid File",
                        description: "The file is invalid.",
                        type: "error",
                      });
                      return;
                    }

                    try {
                      if (!checkAvailablePort(portId())) return;
                      await saveLogToPort(logForm.logConfig, portId());
                      toaster.create({
                        title: "Communication Success",
                        description: "Log saved to port successfully.",
                        type: "error",
                      });
                      const logStatus = await getCurrentLogStatus(portId());
                      setCurrentLogStatus(logStatus.logStatus);
                      setCyclesCompleted(logStatus.cycle);
                      if (logForm.filePath.length === 0) {
                        setLogForm(
                          "originalFile",
                          JSON5.parse(JSON5.stringify(logForm.logConfig)),
                        );
                      }
                    } catch (e) {
                      toaster.create({
                        title: "Communication Error",
                        description: e as string,
                        type: "error",
                      });
                      setCurrentLogStatus(null);
                      setCyclesCompleted(null);
                      return;
                    }
                  }}
                />

                <Show
                  when={currentLogStatus() === ".started"}
                  fallback={
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <IconButton
                          disabled={
                            portId().length === 0 ||
                            logGetBtnLoading() ||
                            currentLogStatus() === ".invalid" ||
                            currentLogStatus() === ".started" ||
                            currentLogStatus() === ".waiting" ||
                            csvFileDownloads.some(
                              (file) =>
                                file.status === DownloadStatus.Progressing,
                            )
                          }
                          onClick={async () => {
                            try {
                              if (!checkAvailablePort(portId())) return;
                              await startLogging(portId());

                              const csvFileDownloadIndex =
                                csvFileDownloads.findIndex(
                                  (download) => download.port === portId(),
                                );
                              if (
                                csvFileDownloadIndex > -1 &&
                                csvFileDownloads[csvFileDownloadIndex]
                                  .status === DownloadStatus.Paused
                              ) {
                                setCsvFileDownloads(
                                  csvFileDownloadIndex,
                                  "status",
                                  DownloadStatus.Cancel,
                                );
                              }

                              const logState =
                                await getCurrentLogStatus(portId());
                              setCurrentLogStatus(logState.logStatus);
                              setCyclesCompleted(logState.cycle);
                            } catch (e) {
                              toaster.create({
                                title: "Communication Error",
                                description: e as string,
                                type: "error",
                              });
                              return;
                            }
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
                          try {
                            if (!checkAvailablePort(portId())) return;
                            await stopLogging(portId());
                            const logState =
                              await getCurrentLogStatus(portId());
                            setCurrentLogStatus(logState.logStatus);
                            setCyclesCompleted(logState.cycle);
                          } catch (e) {
                            toaster.create({
                              title: "Communication Error",
                              description: e as string,
                              type: "error",
                            });
                            return;
                          }
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
                    currentLogStatus() !== ".stopped" ||
                    currentLogStatus() === ".invalid" ||
                    cyclesCompleted() === 0
                  }
                  fallback={
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button
                          loading={csvFileDownloads.some(
                            (file) =>
                              file.status === DownloadStatus.Progressing,
                          )}
                          onClick={async () => {
                            if (portId().length === 0) return;
                            try {
                              if (!checkAvailablePort(portId())) return;
                              const path = await fileHandler.saveFileDialog(
                                "csv",
                                logForm.filePath,
                                logForm.title,
                              );
                              setLogGetBtnLoading(true);
                              await saveLogCsvFile(
                                path,
                                portId(),
                                cyclesCompleted()!,
                              );
                            } catch {
                              toaster.create({
                                title: "Invalid File",
                                description: "The file is invalid.",
                                type: "error",
                              });
                              setLogGetBtnLoading(false);
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
                        disabled={portId().length === 0}
                        onClick={async () => {
                          try {
                            if (!checkAvailablePort(portId())) return;
                            const logState =
                              await getCurrentLogStatus(portId());
                            setCurrentLogStatus(logState.logStatus);
                            setCyclesCompleted(logState.cycle);
                          } catch {
                            setCurrentLogStatus(null);
                            setCyclesCompleted(null);
                          }
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

            <LoggingForm
              id={pageKeys.get(Pages.Logging)!}
              formData={logForm.logConfig}
              originalFile={logForm.originalFile}
              accordionStates={logForm.accordionStates}
              ref={scrollContainer}
            />
          </Show>
        </Stack>
      </div>

      <ConnectButton
        style={{ position: "absolute", top: "1rem", right: "1rem" }}
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

export default Logging;

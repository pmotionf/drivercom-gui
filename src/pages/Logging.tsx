import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text.tsx";
import {
  logDownloads,
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
import { createStore } from "solid-js/store";
import { TabContext, TabListContext } from "~/components/TabList.tsx";
import { Button } from "~/components/ui/button.tsx";
import { file } from "~/utils/file.ts";

export function Logging() {
  const [logConfigure, setLogConfigure] = createSignal({});
  const [formTitle, setFormTitle] = createSignal<string>("");
  const [filePath, setFilePath] = createSignal<string>("");

  // This signal is needed in UI when reload the file or port.
  const [renderLoggingForm, setRenderLoggingForm] =
    createSignal<boolean>(false);

  onMount(async () => {
    setLogConfigure(JSON.parse(JSON.stringify(logFormFileFormat())));
    setRenderLoggingForm(true);
    if (portId().length > 0) {
      const logStatus = await getCurrentLogStatus();
      setCurrentLogStatus(logStatus ? logStatus.logStatus : null);
      setCyclesCompleted(logStatus ? logStatus.cycle : null);
    }
  });

  createEffect(
    on(
      () => portId(),
      async () => {
        if (portId().length > 0) {
          const logState = await getCurrentLogStatus();
          setCurrentLogStatus(logState ? logState.logStatus : null);
          setCyclesCompleted(logState ? logState.cycle : null);
        } else {
          setCurrentLogStatus(null);
          setCyclesCompleted(null);
        }

        if (Array.from(logDownloads.values()).length > 0) {
          Array.from(logDownloads.values()).forEach((child) => {
            child.kill();
            logDownloads.delete(child.pid);
          });
        }
      },
      { defer: true },
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
    if (output.stdout.length === 0) return null;
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
  async function saveLogCsvFile(filePath: string) {
    const logGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `--timeout`,
      `10000`,
      `log.get`,
      `-f`,
      filePath,
    ]);

    let pid: number | null = null;

    logGet.on("close", (data) => {
      if (data.code === null) {
        toaster.create({
          title: "Download Fail",
          description: "Fail to download file.",
          type: "error",
        });
      } else {
        if (data.code == 0) {
          toaster.create({
            title: "Download Success",
            description: `The file is Downloaded at`,
            type: "success",
            action: {
              label: `${filePath}`,
              onClick: () => {
                openNewTab(filePath);
              },
            },
          });
        } else {
          toaster.create({
            title: "Download Fail",
            description: "Fail to download file.",
            type: "error",
          });
        }
      }

      logGet.removeAllListeners();
      if (pid) {
        logDownloads.delete(pid);
      }
      setLogGetBtnLoading(false);
    });

    logGet.on("error", async (error) => {
      toaster.create({
        title: "Download Fail",
        description: error,
        type: "error",
      });

      logGet.removeAllListeners();
      if (pid) {
        logDownloads.delete(pid);
      }
      setLogGetBtnLoading(false);
    });

    const child = await logGet.spawn();
    pid = child.pid;
    logDownloads.set(pid, child);
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
        tab: {
          id: newTabID,
          tabName: newFilePath
            .replaceAll("\\", "/")
            .match(/[^?!//]+$/!)!
            .toString()
            .slice(0, -4) as string,
        },
        tabPage: {
          logViewerTabPage: {
            filePath: newFilePath,
          },
          configTabPage: null,
        },
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

  const invalidFileMsg = (desc: string) => {
    return toaster.create({
      title: "Invalid File",
      description: desc.split(":")[1],
      type: "error",
    });
  };

  const addRecentFile = (path: string) => {
    return setRecentLogFilePaths((prev) => [
      path,
      ...prev.filter((prevPath) => prevPath !== path),
    ]);
  };

  const deleteRecentFile = (path: string) => {
    return setRecentLogFilePaths((prev) =>
      prev.filter((prevPath) => prevPath !== path),
    );
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
                  let newFile: object | null = null;
                  let path: string | null = null;
                  try {
                    path = await file.openDialog("json");
                    newFile = await file.read(path);
                    const isFormatMatch = file.isFormatMatch(
                      newFile!,
                      logFormFileFormat(),
                    );
                    if (isFormatMatch) {
                      setLogFormData(newFile, path);
                      addRecentFile(path.replaceAll(`\\`, "/"));
                      refresh();
                    }
                  } catch (e) {
                    if (e) {
                      invalidFileMsg(e.toString());
                    }
                    return;
                  }
                }}
                onOpenRecentFile={async (recentPath: string) => {
                  try {
                    const recentFile = await file.read(recentPath);
                    setLogFormData(recentFile, recentPath);
                  } catch (e) {
                    if (e) {
                      invalidFileMsg(e.toString());
                    }
                    deleteRecentFile(recentPath);
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
                  if (filePath().length === 0) return;
                  const recentPath = filePath();
                  try {
                    const recentFile = await file.read(recentPath);
                    setLogConfigure(recentFile);
                    refresh();
                  } catch (e) {
                    if (e) {
                      invalidFileMsg(e.toString());
                    }
                    deleteRecentFile(recentPath);
                  }
                }}
                onSaveFile={async () => {
                  try {
                    const path = await file.saveDialog(
                      "json",
                      filePath(),
                      formTitle(),
                    );
                    await file.write(path, logConfigure());
                    addRecentFile(path.replaceAll(`\\`, "/"));
                  } catch (e) {
                    if (e) {
                      invalidFileMsg(e.toString());
                    }
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
                            if (Array.from(logDownloads.values()).length > 0) {
                              toaster.create({
                                title: "Invalid Log",
                                description: "The log is invalid.",
                                type: "error",
                              });
                              return;
                            }
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
                    currentLogStatus() === "Log.Status.invalid" ||
                    cyclesCompleted() === 0
                  }
                  fallback={
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button
                          loading={logGetBtnLoading()}
                          onClick={async () => {
                            if (portId().length === 0) return;
                            try {
                              const path = await file.saveDialog(
                                filePath(),
                                formTitle(),
                              );
                              setLogGetBtnLoading(true);
                              await saveLogCsvFile(path);
                            } catch (e) {
                              if (e) {
                                invalidFileMsg(e.toString());
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
                        disabled={portId().length === 0}
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

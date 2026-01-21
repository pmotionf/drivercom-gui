import { createSignal, onMount, onCleanup, createEffect, on } from "solid-js";
import { Splitter } from "../components/ui/splitter.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import {
  IconChevronLeftPipe,
  IconChevronRightPipe,
  IconX,
} from "@tabler/icons-solidjs";
import { css } from "styled-system/css/css";
import { Show } from "solid-js/web";
import { Toast } from "~/components/ui/toast.tsx";
import {
  monitoringInputs,
  page,
  Pages,
  setDetectedServer,
  tcpClientIds,
} from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { IpAddress } from "~/components/System/IpHistory.tsx";
import { load } from "@tauri-apps/plugin-store";
import { Tabs } from "~/components/ui/tabs.tsx";
import { ControlPage } from "~/components/MonitoringSidebar/ControlPage.tsx";
import { ConnectPage } from "~/components/MonitoringSidebar/ConnectPage.tsx";
import {
  LineType,
  ServerHandler,
  TrackType,
} from "./Monitoring/ServerHandler.ts";
import { System } from "~/components/System/System.tsx";
import {
  Response_Track_Axis_Error,
  Response_Track_Driver_Error,
} from "~/components/proto/mmc/info_pb.ts";
import { StatusPage } from "~/components/MonitoringSidebar/StatusPage.tsx";
import { reconcile } from "solid-js/store";
import {
  exit,
  pullCarrier,
  stopPull,
  pushCarrier,
  stopPush,
  prepareMmccli,
  connectMmcServer,
  loadConfig,
  findMmcServer,
  stopCommand,
  getMmccliStatus,
  MmcCliState,
} from "./utils/MmcCliHandler.ts";
import { disconnect } from "@kuyoonjo/tauri-plugin-tcp";

export type Lines = LineType[];
export type Systems = TrackType[];

function Monitoring() {
  const [lines, setLines] = createStore<Lines>([]);
  const [systems, setSystems] = createStore<Systems>([]);

  const [isAutoClearMode, setIsAutoClearMode] = createSignal<boolean>(false);
  const serverHandler = new ServerHandler();

  onCleanup(async () => {
    if (lines.length > 0) {
      await serverHandler.disconnect();
      setSendingCmd(null);
      await exit();
    }
    const disconnectServer = tcpClientIds.map((id) => disconnect(id));
    await Promise.allSettled(disconnectServer);
    tcpClientIds.splice(0, tcpClientIds.length);
  });

  createEffect(
    on(
      () => lines.length,
      async () => {
        if (lines.length >= 1) {
          let lineId = lines[0].id;
          while (lines.length >= 1) {
            await getSystemInfo(lineId);
            lineId = lineId + 1 > lines.length ? 1 : lineId + 1;
          }
        }
      },
      { defer: true },
    ),
  );

  const getSystemInfo = async (lineId: number): Promise<void> => {
    try {
      const systemInfo = await serverHandler.getSystemInfo(lineId);
      if (systemInfo) {
        const lineIndex = lines.findIndex((line) => line.id === lineId);
        if (lineIndex === -1) return;
        setSystems(lineIndex, reconcile(systemInfo));

        if (isAutoClearMode()) {
          if (systemInfo.driverErrors && hasError(systemInfo.driverErrors)) {
            if (!systemInfo.axisErrors || !hasError(systemInfo.axisErrors)) {
              await serverHandler.clearError(lineId);
            }
          }
        }
      }
    } catch (e) {
      if (lines.length > 0) {
        setLines([]);
        setSystems([]);
        toaster.create({
          title: "Server Connection Error",
          description: e ? e.toString() : "The server is disconnected.",
          type: "error",
        });
      }
      await exit();
      setIsConnect(false);
    }
  };

  const hasError = (systemErrors: object[]): boolean => {
    const findErrorFields = systemErrors.map((errors) =>
      findErrorField(errors),
    );
    return findErrorFields.includes(true);
  };

  const findErrorField = (errors: object): boolean => {
    const values = Object.values(errors);
    let findError: boolean = false;

    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (typeof val === "boolean") {
        if (val) {
          findError = true;
          break;
        }
      } else if (typeof val === "object") {
        if (findErrorField(val)) {
          findError = true;
          break;
        }
      }
    }
    return findError;
  };

  // Get & Set recent ip history
  const [ipHistory, setIpHistory] = createSignal<IpAddress[]>([]);
  const [showConnectPage, setRender] = createSignal<boolean>(false);

  onMount(async () => {
    try {
      const store = await load("store.json", { autoSave: false });
      if (await store.has("ipHistory")) {
        const value = await store.get<IpAddress[]>("ipHistory");
        if (value) {
          setIpHistory(value);
        }
      }
    } catch (error) {
      throw error;
    }

    if (!monitoringInputs.has("IP")) {
      monitoringInputs.set("IP", createSignal<string>(""));
    }
    if (!monitoringInputs.has("port")) {
      monitoringInputs.set("port", createSignal<string>(""));
    }

    if (getMmccliStatus() !== MmcCliState.Unloaded) {
      await exit();
    }
    setRender(true);
  });

  createEffect(
    on(
      () => ipHistory(),
      async () => {
        const store = await load("store.json", { autoSave: false });
        await store.set("ipHistory", ipHistory());
        await store.save();
      },
      { defer: true },
    ),
  );

  const addIpHistory = async (ip: string, port: string) => {
    const serverName = await serverHandler.getServerName();
    const newIp: IpAddress = {
      ip: ip,
      port: port,
      name: serverName ? serverName : "",
    };

    setIpHistory((prev) => [
      newIp,
      ...prev.filter(
        (prevIp) => prevIp.ip !== newIp.ip || prevIp.port !== newIp.port,
      ),
    ]);
  };

  const deleteIpHistory = (ip: string, port: string) => {
    setIpHistory((prev) =>
      prev.filter((prevIp) => prevIp.ip !== ip || prevIp.port !== port),
    );
    setDetectedServer((prev) =>
      prev.filter((prevIp) => prevIp.ip !== ip || prevIp.port !== port),
    );
  };

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 16,
  });

  // Signals only for UI
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);
  const [connectBtnLoading, setConnetBtnLoading] = createSignal<boolean>(false);

  // Data for Status Page
  const systemErrors = (): {
    lineName: string;
    axisErrors: Response_Track_Axis_Error[];
    driverErrors: Response_Track_Driver_Error[];
  }[] => {
    return systems.map((system, i) => {
      return {
        lineName: lines.length > 0 ? lines[i].name : "",
        axisErrors: system.axisErrors ? system.axisErrors : [],
        driverErrors: system.driverErrors ? system.driverErrors : [],
      };
    });
  };

  const [isConnect, setIsConnect] = createSignal<boolean>(false);

  async function connectMmcCli(ip: string) {
    try {
      const findPort = await findMmcServer(ip);
      if (findPort && page() === Pages.Monitoring) {
        await prepareMmccli();
        await loadConfig(ip, findPort);
        await connectMmcServer();
        return Promise.resolve();
      }
      return Promise.reject("Invalid Tcp Connection");
    } catch {
      return Promise.reject("Invalid Tcp Connection");
    }
  }

  const [sendingCmd, setSendingCmd] = createSignal<{
    line: string;
    axisId: number;
  } | null>(null);

  const [mmcCliConnectLoading, setMmcCliConnectLoading] =
    createSignal<boolean>(false);
  const [disableMmcCliBtn, setDisableMmcCliBtn] = createSignal<boolean>(true);

  return (
    <>
      <Splitter.Root
        panels={[
          { id: `panel` },
          {
            id: `sidebar`,
            minSize: 20,
          },
        ]}
        size={[panelSize(), 100 - panelSize()]}
        onResize={(details) => {
          const size = details.size;
          setPanelSize(size[0]);
        }}
        gap="0"
        width="100%"
        height="100%"
      >
        <Splitter.Panel
          id={`panel`}
          borderWidth="0"
          backgroundColor="transparent"
        >
          <Show when={lines.length > 0}>
            <System
              lines={lines}
              systems={systems}
              sendingCommand={sendingCmd()}
              disableMmcCliBtn={disableMmcCliBtn()}
              onPull={async (
                lineName,
                commandDirection,
                axis,
                carrierId,
                destination,
                disableCas,
              ) => {
                try {
                  setSendingCmd({ line: lineName, axisId: Number(axis) });
                  await pullCarrier(
                    commandDirection,
                    lineName,
                    axis,
                    carrierId,
                    destination,
                    disableCas,
                  );
                  setSendingCmd(null);
                } catch (e) {
                  toaster.create({
                    title: "Error",
                    description: e as string,
                    type: "error",
                  });
                  setSendingCmd(null);
                }
              }}
              onStopPull={async (line, axisId) => {
                try {
                  setSendingCmd({ line: line, axisId: axisId });
                  await stopPull(line, axisId);
                  setSendingCmd(null);
                } catch (e) {
                  toaster.create({
                    title: "Error",
                    description: e as string,
                    type: "error",
                  });
                  setSendingCmd(null);
                }
              }}
              onPush={async (lineName, commandDirection, axis, carrierId) => {
                try {
                  setSendingCmd({ line: lineName, axisId: Number(axis) });
                  await pushCarrier(
                    commandDirection,
                    lineName,
                    axis,
                    carrierId,
                  );
                  setSendingCmd(null);
                } catch (e) {
                  toaster.create({
                    title: "Error",
                    description: e as string,
                    type: "error",
                  });
                  setSendingCmd(null);
                }
              }}
              onStopPush={async (line, axisId) => {
                try {
                  setSendingCmd({ line: line, axisId: axisId });
                  await stopPush(line, axisId);
                  setSendingCmd(null);
                } catch (e) {
                  toaster.create({
                    title: "Error",
                    description: e as string,
                    type: "error",
                  });
                  setSendingCmd(null);
                }
              }}
              onStopCommand={async (line, axisId) => {
                setSendingCmd({ line: line, axisId: axisId });
                await stopCommand();
                setSendingCmd(null);
              }}
            />
          </Show>
        </Splitter.Panel>

        {/* Resize trigger */}
        <IconButton
          size="sm"
          variant="ghost"
          onClick={() => setShowSideBar(!showSideBar())}
          position="absolute"
          top="0"
          right="0"
          zIndex="10"
        >
          <Show when={!showSideBar()} fallback={<IconChevronRightPipe />}>
            <IconChevronLeftPipe />
          </Show>
        </IconButton>

        <Show when={showSideBar()}>
          <Splitter.ResizeTrigger
            id={`panel:sidebar`}
            class={css({ borderInlineColor: "bg.default" })}
            style={{
              width: "1px",
              "border-radius": "0",
              padding: "0",
              margin: "0",
              "border-inline-width": "2px",
            }}
          />
          <Splitter.Panel
            id={`sidebar`}
            borderWidth="0"
            backgroundColor="transparent"
            minWidth="18rem"
          >
            <Tabs.Root
              defaultValue="Connect"
              style={{ width: "100%", height: "100%" }}
            >
              <Tabs.List gap="0">
                <Tabs.Trigger padding="0.5em" value="Connect">
                  {"Connect"}
                </Tabs.Trigger>
                <Tabs.Trigger value="Status" padding="0.5em">
                  {"Status"}
                </Tabs.Trigger>
                <Tabs.Trigger value="Control" padding="0.5em">
                  {"Control"}
                </Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>
              <Tabs.Content
                value="Connect"
                style={{ width: "100%", height: "100%" }}
                overflowY="auto"
              >
                <Show when={showConnectPage()}>
                  <ConnectPage
                    toaster={toaster}
                    inputs={monitoringInputs}
                    ipHistory={ipHistory()}
                    changeIpHistory={setIpHistory}
                    isConnect={isConnect()}
                    loading={connectBtnLoading()}
                    onConnectServer={async (ip: string, port: string) => {
                      setConnetBtnLoading(true);
                      try {
                        await serverHandler.connect(ip, port);
                        const serverResponse: LineType[] =
                          await serverHandler.getLineConfig();
                        await addIpHistory(ip, port);
                        setLines(serverResponse);
                        setConnetBtnLoading(false);
                        if (serverHandler.getStatus() === WebSocket.OPEN) {
                          setIsConnect(true);
                        }
                      } catch {
                        setConnetBtnLoading(false);
                        deleteIpHistory(ip, port);
                        await serverHandler.disconnect();
                        setIsConnect(false);
                      }
                    }}
                    onDisconnectServer={async () => {
                      setConnetBtnLoading(true);
                      setLines([]);
                      setSystems([]);

                      await serverHandler.disconnect();

                      setConnetBtnLoading(false);
                      setIsConnect(false);
                    }}
                    mmcCliBtnLoading={mmcCliConnectLoading()}
                    onConnectMmccli={async (ip: string) => {
                      setMmcCliConnectLoading(true);
                      try {
                        await connectMmcCli(ip);
                        setDisableMmcCliBtn(false);
                      } catch {
                        setSendingCmd(null);
                        setDisableMmcCliBtn(true);
                        await exit();
                      }

                      setMmcCliConnectLoading(false);
                      console.log("connect mmc-cli");
                    }}
                    onDisconnectMmccli={async (
                      isIpChange: boolean | undefined,
                    ) => {
                      setMmcCliConnectLoading(true);
                      setSendingCmd(null);
                      await exit();
                      setDisableMmcCliBtn(true);
                      if (!isIpChange) {
                        setMmcCliConnectLoading(false);
                      }
                      console.log("disconnect mmc-cli");
                    }}
                  />
                </Show>
              </Tabs.Content>
              <Tabs.Content value="Control">
                <ControlPage
                  isAutoMode={isAutoClearMode()}
                  changeAutoMode={setIsAutoClearMode}
                />
              </Tabs.Content>
              <Tabs.Content value="Status" overflowY="auto">
                <StatusPage
                  systemErrors={systemErrors()}
                  clearErrorAuto={isAutoClearMode()}
                />
              </Tabs.Content>
            </Tabs.Root>
          </Splitter.Panel>
        </Show>
      </Splitter.Root>
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

export default Monitoring;

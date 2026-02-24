import { createSignal, onMount, onCleanup, createEffect, on } from "solid-js";
import { Splitter } from "../components/ui/splitter.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-solidjs";
import { css } from "styled-system/css/css";
import { Show } from "solid-js/web";
import { Toast } from "~/components/ui/toast.tsx";
import {
  ipHistory,
  monitoringInputs,
  page,
  Pages,
  setDetectedServer,
  setIpHistory,
  tcpClientIds,
} from "~/store/GlobalState.ts";
import { createStore } from "solid-js/store";
import { IpAddress } from "~/components/System/IpHistory.tsx";
import { Tabs } from "~/components/ui/tabs.tsx";
import { ControlPage } from "~/components/MonitoringSidebar/ControlPage.tsx";
import { ConnectPage } from "~/components/MonitoringSidebar/ConnectPage.tsx";
import {
  LineType,
  ServerHandler,
  TrackType,
} from "./Monitoring/ServerHandler.ts";
import { SendingCommand, System } from "~/components/System/System.tsx";
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
  setSpeed,
  setAcceleration,
  setZero,
  calibrate,
  initialize,
  deinitialize,
  moveCarrier,
} from "../utils/MmcCliHandler.ts";
import { disconnect } from "@kuyoonjo/tauri-plugin-tcp";
import CarrierPage, {
  CarrierState,
} from "~/components/MonitoringSidebar/CarrierPage.tsx";
import { load } from "@tauri-apps/plugin-store";

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
      if (getMmccliStatus() !== MmcCliState.Unloaded) {
        await exit();
      }
      setIsConnect(false);
    }
    const disconnectServer = tcpClientIds.map((id) => disconnect(id));
    await Promise.allSettled(disconnectServer);
    tcpClientIds.splice(0, tcpClientIds.length);
  });

  createEffect(
    on(
      async () => lines.length,
      async () => {
        if (lines.length >= 1) {
          let lineId = lines[0].id;
          while (lines.length >= 1) {
            try {
              await getSystemInfo(lineId);
            } catch (e) {
              if (
                serverHandler.getStatus() &&
                serverHandler.getStatus() === WebSocket.OPEN
              ) {
                await serverHandler.disconnect();
              }

              if (getMmccliStatus() !== MmcCliState.Unloaded) {
                setDisableMmcCliBtn(true);
                await exit();
              }

              if (lines.length > 0) {
                setLines([]);
                setSystems([]);
                setIsConnect(false);
                setSendingCmd(null);

                toaster.create({
                  title: "Server Connection Error",
                  description: e ? e.toString() : "The server is disconnected.",
                  type: "error",
                });
              }
            }
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
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
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

  const [showConnectPage, setRender] = createSignal<boolean>(false);

  onMount(async () => {
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
  const [connectBtnLoading, setConnectBtnLoading] =
    createSignal<boolean>(false);

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

  const carrierStates = (): CarrierState[] => {
    return systems.map((system, i) => {
      return {
        lineName: lines.length > 0 ? lines[i].name : "",
        carrierStates: system.carrierState ? system.carrierState : [],
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

  const [sendingCmd, setSendingCmd] = createSignal<SendingCommand | null>(null);

  const [mmcCliConnectLoading, setMmcCliConnectLoading] =
    createSignal<boolean>(false);
  const [disableMmcCliBtn, setDisableMmcCliBtn] = createSignal<boolean>(true);

  const [carrierTabRender, setCarrierTabRender] = createSignal<boolean>(true);
  const carrierTabRefresh = () => {
    setCarrierTabRender(false);
    setCarrierTabRender(true);
  };

  createEffect(
    on(
      () => ipHistory(),
      async () => {
        const store = await load("store.json", {
          defaults: {
            configFilePath: undefined,
            logFilePath: undefined,
            ipHistory: undefined,
          },
          autoSave: false,
        });
        store.set("ipHistory", ipHistory());
      },
      { defer: true },
    ),
  );

  return (
    <>
      <Splitter.Root
        orientation="vertical"
        panels={[
          { id: `panel` },
          {
            id: `sidebar`,
            minSize: 35,
          },
        ]}
        size={!showSideBar() ? [95, 5] : [panelSize(), 100 - panelSize()]}
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
              onInitialize={async (
                lineName,
                axisId,
                direction,
                carrierId,
                axisLink,
              ) => {
                try {
                  setSendingCmd({ line: lineName, axisId: axisId });
                  await initialize(
                    lineName,
                    axisId,
                    direction,
                    carrierId,
                    axisLink,
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
              onDeinitialize={async (lineName, axisId) => {
                try {
                  setSendingCmd({ line: lineName, axisId: axisId });
                  await deinitialize(lineName, axisId);
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
              onLineCommands={async (params) => {
                setSendingCmd({ line: params.line, axisId: NaN });
                try {
                  if (params.speed) {
                    await setSpeed(params.line, params.speed);
                  }
                  if (params.acceleration) {
                    await setAcceleration(params.line, params.acceleration);
                  }
                  if (params.setZero) {
                    await setZero(params.line);
                  }
                  if (params.calibrate) {
                    await calibrate(params.line);
                  }
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
            />
          </Show>
        </Splitter.Panel>

        <Show when={showSideBar()}>
          <Splitter.ResizeTrigger
            id={`panel:sidebar`}
            class={css({ borderColor: "bg.default", background: "bg.canvas" })}
            style={{
              width: "100%",
              height: "1px",
              "border-radius": "0",
              padding: "0",
              margin: "0",
            }}
          />
        </Show>

        <Splitter.Panel
          id={`sidebar`}
          borderWidth="0"
          borderTopWidth={"1px"}
          borderColor={"bg.disabled"}
          backgroundColor="transparent"
        >
          <Tabs.Root
            defaultValue="Connect"
            style={{ width: "100%", height: "100%" }}
            variant="outline"
          >
            <Tabs.List
              gap="0"
              background={"bg.muted"}
              borderColor={"bg.disabled"}
            >
              <Tabs.Trigger
                padding="0.5em"
                value="Connect"
                borderRadius={"0"}
                borderTopWidth={"0"}
                borderBottomWidth={"1px"}
              >
                {"Connect"}
              </Tabs.Trigger>
              <Tabs.Trigger
                value="Status"
                padding="0.5em"
                borderRadius={"0"}
                borderTopWidth={"0"}
              >
                {"Status"}
              </Tabs.Trigger>
              <Tabs.Trigger
                value="Control"
                padding="0.5em"
                borderRadius={"0"}
                borderTopWidth={"0"}
              >
                {"Control"}
              </Tabs.Trigger>
              <Show when={carrierTabRender()}>
                <Tabs.Trigger
                  value="Carriers"
                  padding="0.5em"
                  borderRadius={"0"}
                  borderTopWidth={"0"}
                  disabled={
                    carrierStates()
                      .map((state) => state.carrierStates)
                      .concat().length < 1 ||
                    getMmccliStatus() === MmcCliState.Unloaded
                  }
                >
                  {"Carriers"}
                </Tabs.Trigger>
              </Show>
              {/* Resize trigger */}
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => setShowSideBar(!showSideBar())}
                position="absolute"
                top="0.1rem"
                right="0"
              >
                <Show when={!showSideBar()} fallback={<IconChevronDown />}>
                  <IconChevronUp />
                </Show>
              </IconButton>
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
                    setConnectBtnLoading(true);
                    try {
                      await serverHandler.connect(ip, port);
                      const serverResponse: LineType[] =
                        await serverHandler.getLineConfig();
                      await addIpHistory(ip, port);
                      setLines(serverResponse);
                      setConnectBtnLoading(false);
                      if (serverHandler.getStatus() === WebSocket.OPEN) {
                        setIsConnect(true);
                      }
                    } catch {
                      setConnectBtnLoading(false);
                      deleteIpHistory(ip, port);
                      await serverHandler.disconnect();
                      setIsConnect(false);
                    }
                  }}
                  onDisconnectServer={async () => {
                    setConnectBtnLoading(true);
                    setLines([]);
                    setSystems([]);

                    await serverHandler.disconnect();

                    setConnectBtnLoading(false);
                    setIsConnect(false);
                  }}
                  mmcCliBtnLoading={mmcCliConnectLoading()}
                  onConnectMmccli={async (ip: string) => {
                    setMmcCliConnectLoading(true);
                    try {
                      let checkWebsocket: ServerHandler | null =
                        new ServerHandler();
                      await checkWebsocket.connect(ip, "443");
                      await checkWebsocket.disconnect();
                      checkWebsocket = null;
                      await connectMmcCli(ip);
                      setDisableMmcCliBtn(false);
                      setMmcCliConnectLoading(false);
                      carrierTabRefresh();
                    } catch {
                      setMmcCliConnectLoading(false);
                      setSendingCmd(null);
                      if (!disableMmcCliBtn) {
                        setDisableMmcCliBtn(true);
                      }
                      if (getMmccliStatus() !== MmcCliState.Unloaded) {
                        await exit();
                      }
                    }
                  }}
                  onDisconnectMmccli={async (
                    isIpChange: boolean | undefined,
                  ) => {
                    setMmcCliConnectLoading(true);
                    setSendingCmd(null);
                    if (getMmccliStatus() !== MmcCliState.Unloaded) {
                      await exit();
                    }
                    setDisableMmcCliBtn(true);
                    if (!isIpChange) {
                      setMmcCliConnectLoading(false);
                    }
                  }}
                />
              </Show>
            </Tabs.Content>
            <Tabs.Content
              value="Control"
              style={{ width: "100%", height: "100%" }}
            >
              <ControlPage
                isAutoMode={isAutoClearMode()}
                changeAutoMode={setIsAutoClearMode}
              />
            </Tabs.Content>
            <Tabs.Content
              value="Status"
              overflowY="auto"
              style={{ width: "100%", height: "100%" }}
            >
              <StatusPage
                systemErrors={systemErrors()}
                clearErrorAuto={isAutoClearMode()}
              />
            </Tabs.Content>
            <Tabs.Content
              value="Carriers"
              overflowY="auto"
              style={{ width: "100%", height: "100%" }}
              paddingTop={"0rem"}
              paddingBottom={"0rem"}
            >
              <CarrierPage
                carrierStates={carrierStates()}
                sendingCommand={sendingCmd()}
                onCarrierMove={async (
                  line,
                  carrier,
                  target,
                  controlMode,
                  cas,
                ) => {
                  setSendingCmd({
                    line: line,
                    axisId: NaN,
                    movingCarrier: true,
                  });
                  try {
                    await moveCarrier(line, carrier, target, controlMode, cas);
                  } catch (e) {
                    toaster.create({
                      title: `Control Error`,
                      description: e as string,
                      type: "error",
                    });
                  }
                  setSendingCmd(null);
                }}
              />
            </Tabs.Content>
          </Tabs.Root>
        </Splitter.Panel>
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

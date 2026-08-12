import { createSignal, onMount, onCleanup, createEffect, on } from "solid-js";
import * as Splitter from "../../components/ui/splitter.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-solidjs";
import { css } from "styled-system/css/css";
import { Show } from "solid-js/web";
import {
  ipHistory,
  monitoringInputs,
  setDetectedServer,
  setIpHistory,
} from "~/store/GlobalState.ts";
import { createStore } from "solid-js/store";
import { IpAddress } from "~/pages/Monitoring/System/IpHistory.tsx";
import * as Tabs from "~/components/ui/tabs.tsx";
import { ControlPage } from "./MonitoringSidebar/ControlPage.tsx";
import { ConnectPage } from "./MonitoringSidebar/ConnectPage.tsx";
import {
  LineType,
  ServerHandler,
  TrackType,
} from "../../services/ServerHandler.ts";
import { SendingCommand, System } from "./System/System.tsx";
import {
  Response_Line_Axis_Error,
  Response_Line_Driver_Error,
} from "~/proto/mmc/info_pb.ts";
import { StatusPage } from "./MonitoringSidebar/StatusPage.tsx";
import { reconcile } from "solid-js/store";
import CarrierPage, { CarrierState } from "./MonitoringSidebar/CarrierPage.tsx";
import { load } from "@tauri-apps/plugin-store";
import { toaster } from "~/components/ui/toast.tsx";
import { Request_Direction } from "~/proto/mmc/command_pb.ts";
import { Control } from "~/proto/mmc/control_pb.ts";

export type Lines = LineType[];
export type Systems = TrackType[];

function Monitoring() {
  const [lines, setLines] = createStore<Lines>([]);
  const [systems, setSystems] = createStore<Systems>([]);

  const [isAutoClearMode, setIsAutoClearMode] = createSignal<boolean>(false);
  const monitoringServerHandler = new ServerHandler();
  const commandServerHandler = new ServerHandler();

  onCleanup(async () => {
    if (lines.length > 0) {
      await monitoringServerHandler.disconnect();
      await commandServerHandler.disconnect();
      setSendingCmd(null);
      setIsConnect(false);
    }
  });

  createEffect(
    on(
      async () => lines.length,
      async () => {
        if (lines.length >= 1) {
          while (lines.length >= 1) {
            try {
              await getSystemInfo(lines.map((line) => line.id));
            } catch (e) {
              if (
                monitoringServerHandler.getStatus() &&
                monitoringServerHandler.getStatus() === WebSocket.OPEN
              ) {
                await monitoringServerHandler.disconnect();
                await commandServerHandler.disconnect();
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
          }
        }
      },
      { defer: true },
    ),
  );

  const getSystemInfo = async (lineIds: number[]): Promise<void> => {
    try {
      const systemInfo = await monitoringServerHandler.getSystemInfo(lineIds);
      if (systemInfo) {
        if (isAutoClearMode()) {
          let lineId = lines[0].id;
          for await (const system of systemInfo) {
            if (system.driverErrors && hasError(system.driverErrors)) {
              if (!system.axisErrors || !hasError(system.axisErrors)) {
                await monitoringServerHandler.clearError(lineId);
              }
            }
            lineId++;
          }
        }
      }
      setSystems(reconcile(systemInfo));
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
    setRender(true);
  });

  const addIpHistory = async (ip: string, port: string) => {
    const serverName = await monitoringServerHandler.getServerName();
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

  // Signals only for UI
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);
  const [connectBtnLoading, setConnectBtnLoading] =
    createSignal<boolean>(false);

  // Data for Status Page
  const systemErrors = (): {
    lineName: string;
    axisErrors: Response_Line_Axis_Error[];
    driverErrors: Response_Line_Driver_Error[];
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

  const [sendingCmd, setSendingCmd] = createSignal<SendingCommand | null>(null);

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
          borderRadius="0"
          padding="0"
        >
          <Show when={lines.length > 0}>
            <System
              lines={lines}
              systems={systems}
              sendingCommand={sendingCmd()}
              onPull={async (
                lineIndex,
                commandDirection,
                axisId,
                carrierId,
                destination,
                disableCas,
              ) => {
                try {
                  const lineName = lines[lineIndex].name;
                  setSendingCmd({ line: lineName, axisId: axisId });
                  const lineId = lineIndex + 1;
                  const speed = lines[lineIndex].speed;
                  const acceleration = lines[lineIndex].acceleration;
                  await commandServerHandler.pull(
                    lineId,
                    axisId,
                    Number(carrierId),
                    commandDirection === "forward"
                      ? Request_Direction.FORWARD
                      : Request_Direction.BACKWARD,
                    speed,
                    acceleration,
                    typeof disableCas === "string"
                      ? disableCas === "off"
                        ? true
                        : false
                      : disableCas,
                    typeof destination === "string"
                      ? Number(destination)
                      : destination,
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
              onStopPull={async (lineIndex, axisId) => {
                try {
                  const lineName = lines[lineIndex].name;
                  setSendingCmd({ line: lineName, axisId: axisId });
                  const lineId = lineIndex + 1;
                  await commandServerHandler.stopPull(lineId, axisId);
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
              onPush={async (
                lineIndex,
                commandDirection,
                axisId,
                carrierId,
              ) => {
                try {
                  const lineName = lines[lineIndex].name;
                  setSendingCmd({ line: lineName, axisId: axisId });

                  const lineId = lineIndex + 1;
                  const speed = lines[lineIndex].speed;
                  const acceleration = lines[lineIndex].acceleration;
                  await commandServerHandler.push(
                    lineId,
                    axisId,
                    commandDirection === "forward"
                      ? Request_Direction.FORWARD
                      : Request_Direction.BACKWARD,
                    speed,
                    acceleration,
                    typeof carrierId === "string"
                      ? Number(carrierId)
                      : carrierId,
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
              onStopPush={async (lineIndex, axisId) => {
                try {
                  const lineName = lines[lineIndex].name;
                  setSendingCmd({ line: lineName, axisId: axisId });

                  const lineId = lineIndex + 1;
                  await commandServerHandler.stopPush(lineId, axisId);
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
              onInitialize={async (
                lineIndex,
                axisId,
                direction,
                carrierId,
                axisLink,
              ) => {
                try {
                  const lineName = lines[lineIndex].name;
                  setSendingCmd({ line: lineName, axisId: axisId });

                  const lineId = lineIndex + 1;
                  await commandServerHandler.initalize(
                    lineId,
                    axisId,
                    Number(carrierId),
                    direction === "backward"
                      ? Request_Direction.BACKWARD
                      : Request_Direction.FORWARD,
                    typeof axisLink === "string"
                      ? axisLink === "backward"
                        ? Request_Direction.BACKWARD
                        : axisLink === "none"
                          ? Request_Direction.UNSPECIFIED
                          : Request_Direction.FORWARD
                      : axisLink,
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
              onDeinitialize={async (lineIndex, axisId) => {
                try {
                  const lineName = lines[lineIndex].name;
                  setSendingCmd({ line: lineName, axisId: axisId });
                  const lineId = lineIndex + 1;
                  await commandServerHandler.deinitailize(lineId, axisId);
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
                const lineName = lines[params.lineIndex].name;
                setSendingCmd({ line: lineName, axisId: NaN });
                const lineId = params.lineIndex + 1;
                try {
                  if (params.speed) {
                    setLines(params.lineIndex, "speed", params.speed);
                  }
                  if (params.acceleration) {
                    setLines(
                      params.lineIndex,
                      "acceleration",
                      params.acceleration,
                    );
                  }
                  if (params.setZero) {
                    await commandServerHandler.setZero(lineId);
                  }
                  if (params.calibrate) {
                    await commandServerHandler.calibrate(lineId);
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
            class={css({
              background: "gray.1",
              borderRadius: "0",
              borderWidth: "0px",
              minHeight: "0.5",
            })}
          />
        </Show>

        <Splitter.Panel
          id={`sidebar`}
          borderWidth="0"
          borderTopWidth={"1px"}
          borderColor={"bg.disabled"}
          padding="0"
          borderRadius="0rem"
        >
          <Tabs.Root
            defaultValue="Connect"
            style={{ width: "100%", height: "100%" }}
            variant="line"
            gap="0"
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
              <Tabs.Trigger
                value="Carriers"
                padding="0.5em"
                borderRadius={"0"}
                borderTopWidth={"0"}
                disabled={
                  carrierStates()
                    .map((state) => state.carrierStates)
                    .concat().length < 1
                }
              >
                {"Carriers"}
              </Tabs.Trigger>
              {/* Resize trigger */}
              <IconButton
                size="sm"
                variant="plain"
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
              style={{
                width: "100%",
                height: "100%",
                padding: "0.5rem 1rem 0rem 1rem ",
              }}
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
                      await monitoringServerHandler.connect(ip, port);
                      await commandServerHandler.connect(ip, port);
                      const serverResponse: LineType[] =
                        await monitoringServerHandler.getLineConfig();
                      await addIpHistory(ip, port);
                      setLines(serverResponse);
                      setConnectBtnLoading(false);
                      if (
                        monitoringServerHandler.getStatus() === WebSocket.OPEN
                      ) {
                        setIsConnect(true);
                      }
                    } catch {
                      setConnectBtnLoading(false);
                      deleteIpHistory(ip, port);
                      await monitoringServerHandler.disconnect();
                      await commandServerHandler.disconnect();
                      setIsConnect(false);
                    }
                  }}
                  onDisconnectServer={async () => {
                    setConnectBtnLoading(true);
                    setLines([]);
                    setSystems([]);

                    await monitoringServerHandler.disconnect();
                    await commandServerHandler.disconnect();

                    setConnectBtnLoading(false);
                    setIsConnect(false);
                  }}
                />
              </Show>
            </Tabs.Content>
            <Tabs.Content
              value="Control"
              style={{
                width: "100%",
                height: "100%",
                padding: "0.5rem 1rem 0rem 1rem ",
              }}
            >
              <ControlPage
                isAutoMode={isAutoClearMode()}
                changeAutoMode={setIsAutoClearMode}
              />
            </Tabs.Content>
            <Tabs.Content
              value="Status"
              overflowY="auto"
              style={{
                width: "100%",
                height: "100%",
                padding: "0.5rem 1rem 0rem 1rem ",
              }}
            >
              <StatusPage
                systemErrors={systemErrors()}
                clearErrorAuto={isAutoClearMode()}
              />
            </Tabs.Content>
            <Tabs.Content
              value="Carriers"
              overflowY="auto"
              style={{
                width: "100%",
                height: "100%",
                padding: "0em 0.5rem 0rem 0.5rem ",
              }}
            >
              <CarrierPage
                carrierStates={carrierStates()}
                sendingCommand={sendingCmd()}
                onCarrierMove={async (
                  line,
                  carrier,
                  targetKind,
                  targetValue,
                  controlMode,
                  cas,
                ) => {
                  setSendingCmd({
                    line: line,
                    axisId: NaN,
                    movingCarrier: true,
                  });
                  const lineIndex = lines.findIndex(
                    (lineCtx) => lineCtx.name === line,
                  );
                  const lineId = lineIndex + 1;
                  const speed = lines[lineIndex].speed;
                  const acceleration = lines[lineIndex].acceleration;
                  try {
                    await commandServerHandler.moveCarrier(
                      lineId,
                      targetKind,
                      Number(targetValue),
                      carrier,
                      controlMode === "position"
                        ? Control.POSITION
                        : Control.VELOCITY,
                      cas === "off" ? true : false,
                      speed,
                      acceleration,
                    );
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
    </>
  );
}

export default Monitoring;

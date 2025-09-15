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
import { monitoringInputs } from "~/GlobalState.ts";
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
  /*@ts-ignore Ignore git acticon type check */
} from "~/components/proto/mmc/info_pb.ts";
import { StatusPage } from "~/components/MonitoringSidebar/StatusPage.tsx";

export type SystemConfig = {
  lines: { line: LineType; system?: TrackType }[];
};

function Monitoring() {
  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lines: [],
  });
  const [isAutoClearMode, setIsAutoClearMode] = createSignal<boolean>(false);
  const serverHandler = new ServerHandler();

  onCleanup(async () => {
    if (systemConfig.lines.length > 0) {
      await serverHandler.disconnect();
    }
  });

  createEffect(
    on(
      () => systemConfig.lines.length,
      async () => {
        if (systemConfig.lines.length < 1) {
          try {
            await serverHandler.disconnect();
          } catch (e) {
            toaster.create({
              title: "Server Connection Error",
              description: e as string,
              type: "error",
            });
          }
          return;
        } else {
          await getSystemInfo(1);
        }
      },
      { defer: true },
    ),
  );

  const getSystemInfo = async (lineId: number): Promise<void> => {
    if (systemConfig.lines.length < 1) return;
    try {
      const systemInfo = await serverHandler.getSystemInfo(
        lineId,
        systemConfig.lines[lineId - 1].line.axes,
      );
      if (systemInfo) {
        const lineIndex = lineId - 1;
        if (systemConfig.lines[lineIndex]) {
          setSystemConfig("lines", lineIndex, "system", systemInfo);
        }
        if (isAutoClearMode()) {
          if (systemInfo.driverErrors && hasError(systemInfo.driverErrors)) {
            if (!systemInfo.axisErrors || !hasError(systemInfo.axisErrors)) {
              await serverHandler.clearError(lineId);
            }
          }
        }
        return await getSystemInfo(
          systemConfig.lines.length >= lineId + 1 ? lineId + 1 : 1,
        );
      } else {
        return;
      }
    } catch {
      if (systemConfig.lines.length > 0) {
        setSystemConfig("lines", []);
      }
      return;
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
        (prevIp) => prevIp.ip !== newIp.ip && prevIp.port !== newIp.port,
      ),
    ]);
  };

  const deleteIpHistory = (ip: string, port: string) => {
    setIpHistory((prev) =>
      prev.filter((prevIp) => prevIp.ip !== ip && prevIp.port !== port),
    );
  };

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 16,
  });

  // Signals only for UI
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);
  const [isConnecting, setIsConnecting] = createSignal<boolean>(false);

  // Data for Status Page
  const systemErrors = (): {
    lineName: string;
    axisErrors: Response_Track_Axis_Error[];
    driverErrors: Response_Track_Driver_Error[];
  }[] => {
    return systemConfig.lines.map((line) => {
      return {
        lineName: line.line.name,
        axisErrors:
          line.system && line.system.axisErrors ? line.system.axisErrors : [],
        driverErrors:
          line.system && line.system.driverErrors
            ? line.system!.driverErrors
            : [],
      };
    });
  };

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
          <Show when={systemConfig.lines.length > 0}>
            <System value={systemConfig} />
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
                    isConnect={systemConfig.lines.length > 0}
                    isConnecting={isConnecting()}
                    onConnectServer={async (ip: string, port: string) => {
                      setIsConnecting(true);
                      try {
                        await serverHandler.connect(ip, port);
                        await addIpHistory(ip, port);
                        const serverResponse: LineType[] =
                          await serverHandler.getLineConfig();
                        setSystemConfig(
                          "lines",
                          serverResponse.map((line) => {
                            return { line: line };
                          }),
                        );
                      } catch {
                        deleteIpHistory(ip, port);
                      }
                      setIsConnecting(false);
                    }}
                    onDisconnectServer={() => {
                      setSystemConfig("lines", []);
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
                <StatusPage systemErrors={systemErrors()} />
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

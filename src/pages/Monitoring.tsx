import { Button } from "~/components/ui/button.tsx";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { createSignal, onMount } from "solid-js";
import { Splitter } from "../components/ui/splitter.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import {
  IconChevronLeftPipe,
  IconChevronRightPipe,
  IconX,
} from "@tabler/icons-solidjs";
import { css } from "styled-system/css/css";
import { Show } from "solid-js/web";
import { connect, disconnect, listen, send } from "@kuyoonjo/tauri-plugin-tcp";
import { onCleanup } from "solid-js";
import { Buffer } from "buffer";
import { createEffect } from "solid-js";
import { on } from "solid-js";
import { System } from "~/components/System/System.tsx";
import { Toast } from "~/components/ui/toast.tsx";
//@ts-ignore Ignore test in git action
import { mmc } from "~/components/proto/mmc.js";
import { UnlistenFn } from "@tauri-apps/api/event";
import { monitoringInputs } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { IpHistory, IpAddress } from "~/components/System/IpHistory.tsx";
import { load } from "@tauri-apps/plugin-store";

export type SystemConfig = {
  lines: {
    line: mmc.core.Response.LineConfig.ILine;
    system?: mmc.info.Response.ISystem;
  }[];
};

function Monitoring() {
  const [clientId, setClientId] = createSignal<string>(crypto.randomUUID());
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);
  let unlisten: UnlistenFn | null = null;

  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lines: [],
  });

  const disconnectServer = async (clientId: string) => {
    try {
      await disconnect(clientId);
      setClientId(crypto.randomUUID());
    } catch (e) {
      if (e) {
        toaster.create({
          title: "Disconnect Error",
          description: e as string,
          type: "error",
        });
      }
    }
  };

  createEffect(
    on(
      () => systemConfig.lines,
      async () => {
        if (systemConfig.lines.length > 0) {
          await sendRequestLoop();
        }
      },
      { defer: true },
    ),
  );

  async function requestSystemInfo(
    lineId: number,
    lines: mmc.core.Response.LineConfig.ILine[],
  ) {
    const payload = {
      info: {
        system: {
          lineId: lineId,
          driver: true,
          axis: true,
          carrier: true,
        },
      },
    };
    const msg = mmc.Request.fromObject(payload);
    const request: number[] = Array.from(mmc.Request.encode(msg).finish());
    try {
      await send(clientId(), request);
      if (lineId + 1 <= lines.length) {
        requestSystemInfo(lineId + 1, lines);
      }
    } catch {
      return null;
    }
  }

  async function sendRequestLoop() {
    if (unlisten === null && systemConfig.lines.length < 0) return;
    try {
      const sendSystemInfo = await requestSystemInfo(
        1,
        systemConfig.lines.map((line) => line.line),
      );

      if (sendSystemInfo !== null) {
        setTimeout(async () => {
          if (systemConfig.lines.length === 0) {
            if (unlisten !== null) {
              unlisten();
              unlisten = null;
              await disconnectServer(clientId());
              setSystemConfig({ lines: [] });
            }
            return;
          }
          await sendRequestLoop();
        }, 10);
      } else {
        if (unlisten !== null) {
          unlisten();
          unlisten = null;
          await disconnectServer(clientId());
          setSystemConfig({ lines: [] });
        }
      }
    } catch {
      if (unlisten !== null) {
        unlisten();
        unlisten = null;
        await disconnectServer(clientId());
        setSystemConfig({ lines: [] });
      }
    }
  }

  async function listenFromServer(): Promise<UnlistenFn> {
    return await listen((x) => {
      if (
        x.payload.id === clientId() &&
        x.payload.event.message &&
        x.payload.event.message.data
      ) {
        const msg = Buffer.from(x.payload.event.message!.data);
        const decode = mmc.Response.decode(msg);

        if (decode.core && decode.core.lineConfig) {
          //@ts-ignore Ignore test in git action
          const update = decode.core.lineConfig.lines!.map((line) => {
            return { line: line };
          });
          setSystemConfig({ lines: update });
        }

        if (decode.info && decode.info.system) {
          const index = decode.info!.system!.lineId! - 1;
          setSystemConfig("lines", index, "system", decode.info!.system);
        }
      }
    });
  }

  onCleanup(async () => {
    if (systemConfig.lines.length > 0) {
      await disconnectServer(clientId());
    }
  });

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 16,
  });

  const [isConnecting, setIsConnecting] = createSignal<boolean>(false);

  const connectServer = async (
    cid: string,
    address: string,
  ): Promise<null | string> => {
    try {
      await connect(cid, address);
      const payload: object = {
        core: {
          kind: "CORE_REQUEST_KIND_LINE_CONFIG",
        },
      };
      const msg = mmc.Request.fromObject(payload);
      const request: number[] = Array.from(mmc.Request.encode(msg).finish());

      if (unlisten === null) {
        unlisten = await listenFromServer();
      }
      await send(clientId(), request);
    } catch (error) {
      return error as string;
    }
    return null;
  };

  /* CSS Component height */
  const connectAreaHeight = "12rem";

  const [ipHistory, setIpHistory] = createSignal<IpAddress[]>([]);
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

  return (
    <>
      <Splitter.Root
        panels={[
          { id: `${clientId()}-panel` },
          { id: `${clientId()}-sidebar` },
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
          id={`${clientId()}-panel`}
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
        >
          <Show when={!showSideBar()} fallback={<IconChevronRightPipe />}>
            <IconChevronLeftPipe />
          </Show>
        </IconButton>

        {/* Side bar */}
        <Show when={showSideBar()}>
          <Splitter.ResizeTrigger
            id={`${clientId()}-panel:${clientId()}-sidebar`}
            class={css({ borderInlineColor: "bg.default" })}
            style={{
              width: "1px",
              "border-radius": "0",
              padding: "0",
              margin: "0",
              "border-inline-width": "2px",
            }}
          />
        </Show>

        <Show when={showSideBar()}>
          <Splitter.Panel
            minWidth="18rem"
            id={`${clientId()}-sidebar`}
            borderWidth="0"
            backgroundColor="transparent"
          >
            <div style={{ width: "100%", height: "100%" }}>
              {/* Connect Area */}
              <Stack
                style={{
                  height: connectAreaHeight,
                  width: "100%",
                  "border-bottom-width": "2px",
                  padding: "1rem",
                }}
              >
                <Text size="lg" fontWeight="bold">
                  Connect
                </Text>
                <Stack style={{ width: "100%" }} direction="row">
                  <div style={{ width: "50%" }}>
                    <Text
                      size="sm"
                      width="100%"
                      color="fg.muted"
                      marginTop="0.4rem"
                    >
                      IP
                    </Text>
                    <Stack
                      background="bg.muted"
                      width="100%"
                      borderRadius="0.5rem"
                      height="2rem"
                    >
                      <input
                        value={
                          monitoringInputs.get("IP")
                            ? monitoringInputs.get("IP")
                            : ""
                        }
                        onInput={(e) => {
                          if (typeof e.target.value === "string") {
                            monitoringInputs.set("IP", e.target.value);
                          }
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          outline: "none",
                          "white-space": "nowrap",
                          overflow: "hidden",
                          display: "block",
                          "text-overflow": "ellipsis",
                          "padding-left": "0.5rem",
                        }}
                      />
                    </Stack>
                  </div>
                  <div style={{ width: "50%" }}>
                    <Text
                      size="sm"
                      width="100%"
                      color="fg.default"
                      marginRight="0.5rem"
                      marginTop="0.4rem"
                    >
                      Port
                    </Text>
                    <Stack
                      background="bg.muted"
                      width="100%"
                      borderRadius="0.5rem"
                      height="2rem"
                    >
                      <input
                        value={
                          monitoringInputs.get("port")
                            ? monitoringInputs.get("port")
                            : ""
                        }
                        onInput={(e) => {
                          if (typeof e.target.value === "string") {
                            monitoringInputs.set("port", e.target.value);
                          }
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          outline: "none",
                          "white-space": "nowrap",
                          overflow: "hidden",
                          display: "block",
                          "text-overflow": "ellipsis",
                          "padding-left": "0.5rem",
                        }}
                      />
                    </Stack>
                  </div>
                </Stack>
                <Button
                  variant={
                    systemConfig.lines.length === 0 ? "solid" : "outline"
                  }
                  loading={isConnecting()}
                  onClick={async () => {
                    if (systemConfig.lines.length > 0) {
                      if (unlisten !== null) {
                        unlisten();
                        unlisten = null;
                        await disconnectServer(clientId());
                      }
                      setSystemConfig({ lines: [] });
                    } else {
                      setIsConnecting(true);
                      const address = `${monitoringInputs.get("IP")}:${monitoringInputs.get("port")}`;
                      const cid = clientId();

                      const result = await connectServer(cid, address);
                      if (typeof result === "string") {
                        toaster.create({
                          title: "Connection Error",
                          description: result as string,
                          type: "error",
                        });
                      } else {
                        const newIp = {
                          ip: `${monitoringInputs.get("IP")}`,
                          port: `${monitoringInputs.get("port")}`,
                        };
                        setIpHistory([
                          newIp,
                          ...ipHistory().filter(
                            ({ ip, port }) =>
                              ip !== newIp.ip && port !== newIp.port,
                          ),
                        ]);
                      }
                      setIsConnecting(false);
                    }
                  }}
                >
                  {systemConfig.lines.length === 0 ? "Connect" : "Cancel"}
                </Button>
              </Stack>
              {/* IP History Area */}
              <Show when={ipHistory().length > 0}>
                <div
                  style={{
                    width: "100%",
                    height: `calc(100% - ${connectAreaHeight})`,
                  }}
                >
                  <IpHistory
                    ipHistory={ipHistory()}
                    onDeleteIp={(ipIndex: number) => {
                      setIpHistory([
                        ...ipHistory().filter((_, i) => i !== ipIndex),
                      ]);
                    }}
                    onConnectServer={async (index: number) => {
                      if (systemConfig.lines.length > 0) {
                        toaster.create({
                          title: "Duplicate Connection",
                          description: "Sever is already connected",
                          type: "error",
                        });
                        return;
                      }
                      setIsConnecting(true);
                      const address = `${ipHistory()[index].ip}:${ipHistory()[index].port}`;
                      const cid = clientId();

                      const result = await connectServer(cid, address);
                      if (typeof result === "string") {
                        toaster.create({
                          title: "Connection Error",
                          description: result as string,
                          type: "error",
                        });
                        setIpHistory([
                          ...ipHistory().filter((_, i) => i !== index),
                        ]);
                      } else {
                        setIpHistory([
                          ipHistory()[index],
                          ...ipHistory().filter((_, i) => i !== index),
                        ]);
                      }
                      setIsConnecting(false);
                    }}
                  />
                </div>
              </Show>
            </div>
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

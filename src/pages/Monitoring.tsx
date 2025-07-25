import { Button } from "~/components/ui/button.tsx";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { createSignal } from "solid-js";
import { Splitter } from "../components/ui/splitter.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import {
  IconChevronLeftPipe,
  IconChevronRightPipe,
  IconX,
} from "@tabler/icons-solidjs";
import { css } from "styled-system/css/css";
import { Show } from "solid-js/web";
import { createStore } from "solid-js/store";
import { connect, disconnect, listen, send } from "@kuyoonjo/tauri-plugin-tcp";
import { onCleanup } from "solid-js";
import { Buffer } from "buffer";
import { createEffect } from "solid-js";
import { on } from "solid-js";
import { System } from "~/components/System/System.tsx";
import { Toast } from "~/components/ui/toast.tsx";
import { LineConfig } from "~/components/System/Line.tsx";
//@ts-ignore Ignore test in git action
import { mmc } from "~/components/proto/mmc.js";
import { UnlistenFn } from "@tauri-apps/api/event";

export type SystemConfig = {
  lineConfig: {
    lines: LineConfig[];
  };
};

function Monitoring() {
  const [clientId, setClientId] = createSignal<string>(crypto.randomUUID());
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);
  let unlisten: UnlistenFn | null = null;

  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lineConfig: { lines: [] },
  });
  const inputValues: Map<string, string> = new Map();

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
      () => systemConfig.lineConfig.lines,
      async () => {
        if (
          systemConfig.lineConfig.lines &&
          systemConfig.lineConfig.lines.length !== 0
        ) {
          await sendRequestLoop();
        }
      },
      { defer: true },
    ),
  );

  async function sendAxisInfo(lines: LineConfig[], lineId: number) {
    if (systemConfig.lineConfig.lines!.length === 0) return null;
    const payload = {
      info: {
        axis: {
          lineId: lineId,
          range: {
            startId: 1,
            endId: lines[lineId - 1].line.axes!,
          },
        },
      },
    };

    const msg = mmc.Request.create(payload);
    const request: number[] = Array.from(mmc.Request.encode(msg).finish());

    try {
      await send(clientId(), request);
    } catch {
      return null;
    }

    if (lineId + 1 <= lines.length) {
      await sendAxisInfo(lines, lineId + 1);
    }
  }

  async function sendCarrierInfo(
    lines: LineConfig[],
    lineId: number,
    axisId: number,
  ) {
    if (systemConfig.lineConfig.lines!.length === 0) return null;
    const axes = lines[lineId - 1].line.axes!;

    if (
      lines[lineId - 1].axisInfo &&
      lines[lineId - 1].axisInfo![axisId - 1] &&
      lines[lineId - 1].axisInfo![axisId - 1].carrierId
    ) {
      const payload = {
        info: {
          carrier: {
            lineId: lineId,
            carrierId: lines[lineId - 1].axisInfo![axisId - 1].carrierId,
          },
        },
      };

      const msg = mmc.Request.create(payload);
      const request: number[] = Array.from(mmc.Request.encode(msg).finish());
      try {
        await send(clientId(), request);
      } catch {
        return null;
      }
    }

    if (axisId + 1 <= axes) {
      sendCarrierInfo(lines, lineId, axisId + 1);
    } else if (lineId + 1 <= lines.length) {
      await sendCarrierInfo(lines, lineId + 1, 1);
    }
  }

  async function sendRequestLoop() {
    if (unlisten === null) return;
    try {
      const sendAxis = await sendAxisInfo(systemConfig.lineConfig.lines!, 1);
      const sendCarrier = await sendCarrierInfo(
        systemConfig.lineConfig.lines!,
        1,
        1,
      );
      if (sendAxis !== null && sendCarrier !== null) {
        setTimeout(async () => {
          if (systemConfig.lineConfig.lines!.length === 0) {
            if (unlisten !== null) {
              unlisten();
              unlisten = null;
              await disconnectServer(clientId());
              setSystemConfig("lineConfig", "lines", []);
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
          setSystemConfig("lineConfig", "lines", []);
        }
      }
    } catch {
      if (unlisten !== null) {
        unlisten();
        unlisten = null;
        await disconnectServer(clientId());
        setSystemConfig("lineConfig", "lines", []);
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

        if (
          decode.core &&
          decode.core.lineConfig &&
          typeof decode.core.lineConfig === "object"
        ) {
          //@ts-ignore Ignore test in git action
          const update = decode.core.lineConfig.lines!.map((lineData) => {
            return { line: lineData, carrierInfo: new Map() } as LineConfig;
          });
          setSystemConfig("lineConfig", "lines", update);
        }

        if (decode.info) {
          if (decode.info.axis) {
            setSystemConfig(
              "lineConfig",
              "lines",
              decode.info.axis.lineId! - 1,
              "axisInfo",
              decode.info.axis.axes!,
            );
          }

          if (decode.info.carrier) {
            const lineId = decode.info.carrier.lineId!;

            const carrier: mmc.info.Response.ICarrier = {
              cas: decode.info.carrier.cas,
              position: decode.info.carrier.position,
              state: decode.info.carrier.state,
            };

            systemConfig.lineConfig.lines[lineId - 1].carrierInfo!.set(
              decode.info.carrier.id!,
              carrier,
            );
          }
        }
      }
    });
  }

  onCleanup(() => {
    if (systemConfig.lineConfig.lines.length !== 0) {
      disconnect(clientId());
    }
  });

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 16,
  });

  const [isConnecting, setIsConnecting] = createSignal<boolean>(false);

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
          <Show when={systemConfig.lineConfig.lines.length > 0}>
            <div
              style={{ width: "100%", height: "100%", "overflow-y": "auto" }}
            >
              <System lineConfig={systemConfig.lineConfig.lines} />
            </div>
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
            <Stack direction="column" width="100%" height="100%">
              {/* Connect Area */}
              <Stack padding="1rem" width="100%" borderBottomWidth="2px">
                <Text size="lg" fontWeight="bold">
                  Connect
                </Text>
                <Stack direction="row" width="100%">
                  <Stack width="50%">
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
                          inputValues.get("IP") ? inputValues.get("IP") : ""
                        }
                        onInput={(e) => {
                          if (typeof e.target.value === "string") {
                            inputValues.set("IP", e.target.value);
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
                  </Stack>
                  <Stack width="50%">
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
                          inputValues.get("port") ? inputValues.get("port") : ""
                        }
                        onInput={(e) => {
                          if (typeof e.target.value === "string") {
                            inputValues.set("port", e.target.value);
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
                  </Stack>
                </Stack>
                <Button
                  variant={
                    systemConfig.lineConfig.lines.length !== 0
                      ? "outline"
                      : "solid"
                  }
                  loading={isConnecting()}
                  onClick={async () => {
                    if (systemConfig.lineConfig.lines.length !== 0) {
                      if (unlisten !== null) {
                        unlisten();
                        unlisten = null;
                        await disconnectServer(clientId());
                        setSystemConfig("lineConfig", "lines", []);
                      }
                      return;
                    }
                    const serverIp = inputValues.get("IP");
                    const port = inputValues.get("port");

                    if (
                      typeof serverIp == "string" &&
                      typeof port == "string"
                    ) {
                      setIsConnecting(true);

                      const address = `${serverIp}:${port}`;
                      const cid = clientId();

                      try {
                        await connect(cid, address);
                      } catch (error) {
                        toaster.create({
                          title: "Connection Error",
                          description: error as string,
                          type: "error",
                        });
                      }

                      const payload: object = {
                        core: {
                          kind: "CORE_REQUEST_KIND_LINE_CONFIG",
                        },
                      };
                      const msg = mmc.Request.fromObject(payload);
                      const request: number[] = Array.from(
                        mmc.Request.encode(msg).finish(),
                      );

                      if (unlisten === null) {
                        unlisten = await listenFromServer();
                      }

                      try {
                        await send(clientId(), request);
                      } catch (e) {
                        toaster.create({
                          title: "Connection Error",
                          description: e as string,
                          type: "error",
                        });
                      }

                      setIsConnecting(false);
                    } else {
                      toaster.create({
                        title: "Missing Input",
                        description:
                          "IP address and port number must be provided.",
                        type: "error",
                      });
                    }
                  }}
                >
                  {systemConfig.lineConfig.lines.length !== 0
                    ? "Cancel"
                    : "Connect"}
                </Button>
              </Stack>
            </Stack>
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

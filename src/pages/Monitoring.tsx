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

import { load, Root, Type } from "protobufjs"; // respectively "./node_modules/protobufjs"
import { Buffer } from "buffer";
import { createEffect } from "solid-js";
import { on } from "solid-js";
import { System } from "~/components/System/System.tsx";
import { Toast } from "~/components/ui/toast.tsx";
import { LineConfig } from "~/components/System/Line.tsx";
import { resolveResource, resourceDir } from "@tauri-apps/api/path";
import { exists, BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import path from "node:path";
import protobuf from "protobufjs";

import * as mmc from "~/components/proto/mmc.js";

export type SystemConfig = {
  lineConfig: {
    lines: LineConfig[];
  };
};

function Monitoring() {
  const [clientId, setClientId] = createSignal<string>("clientID");
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);

  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lineConfig: { lines: [] },
  });
  const inputValues: Map<string, string> = new Map();

  const disconnectServer = async (clientId: string): Promise<string | null> => {
    try {
      await disconnect(clientId);
    } catch (e) {
      if (e) {
        return e as string;
      }
    }
    return null;
  };

  createEffect(
    on(
      () => systemConfig.lineConfig.lines,
      async () => {
        if (systemConfig.lineConfig.lines.length === 0) {
          return;
        }

        //@ts-ignore
        load("src-tauri/resources/proto/mmc.proto", sendRequestLoop);
      },
      { defer: true },
    ),
  );

  async function sendAxisInfo(
    lines: LineConfig[],
    lineId: number,
    sendMessage: Type,
  ) {
    const payload = {
      info: {
        axis: {
          lineId: lineId,
          range: {
            startId: 1,
            endId: lines[lineId - 1].axes,
          },
        },
      },
    };

    const msg = sendMessage.create(payload);
    const request = Array.from(sendMessage.encode(msg).finish());

    try {
      await send(clientId(), request);
    } catch {
      await disconnect(clientId());
      return;
    }

    if (lineId + 1 <= lines.length) {
      await sendAxisInfo(lines, lineId + 1, sendMessage);
    }
  }

  async function sendRequestLoop(err: Error, root: Root) {
    if (systemConfig.lineConfig.lines.length === 0) return;
    if (err) throw err;
    if (!root) return;
    const sendMessage = root.lookupType("mmc.Request");

    await sendAxisInfo(systemConfig.lineConfig.lines, 1, sendMessage);
    setTimeout(sendRequestLoop.bind(null, err, root), 10);
  }

  createEffect(async () => {
    try {
      await listen((x) => {
        if (
          x.payload.id === clientId() &&
          x.payload.event.message &&
          x.payload.event.message.data
        ) {
          load(
            "src-tauri/resources/proto/mmc.proto",
            async function (err, root) {
              if (err) throw err;
              if (!root) return;

              const response = root.lookupType("mmc.Response");
              const msg = Buffer.from(x.payload.event.message!.data);
              const decode = response.decode(msg).toJSON();

              console.log(decode);

              if ("core" in decode && typeof decode.core === "object") {
                if (
                  "lineConfig" in decode.core &&
                  typeof decode.core.lineConfig === "object"
                ) {
                  setSystemConfig("lineConfig", decode.core.lineConfig);
                }
              } else if ("info" in decode && typeof decode.info === "object") {
                if (
                  "axis" in decode.info &&
                  "axes" in decode.info.axis &&
                  "lineId" in decode.info.axis
                ) {
                  if (
                    typeof decode.info.axis.lineId === "number" &&
                    typeof decode.info.axis.axes === "object" &&
                    systemConfig.lineConfig.lines.length !== 0
                  ) {
                    setSystemConfig(
                      "lineConfig",
                      "lines",
                      decode.info.axis.lineId - 1,
                      "axesInfo",
                      decode.info.axis.axes,
                    );
                  }
                }
              } else {
                await disconnect(clientId());
              }
            },
          );
        }
      });
    } catch {
      const disconnect = await disconnectServer(clientId());
      if (typeof disconnect === "string") {
        setClientId(crypto.randomUUID());
      } else {
        toaster.create({
          title: "Server Disconnected",
          description: "Server is disconnected",
          type: "success",
        });
      }
    }
  });

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
        size={[
          { id: `${clientId()}-panel`, size: panelSize() },
          {
            id: `${clientId()}-sidebar`,
            size: 100 - panelSize(),
          },
        ]}
        onSizeChange={(details) => {
          if (typeof details.size[0].size === "number") {
            setPanelSize(details.size[0].size);
          }
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
            <div style={{ width: "100%", height: "100%" }}>
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
                      const disconnect = await disconnectServer(clientId());
                      if (typeof disconnect === "string") {
                        setClientId(crypto.randomUUID());
                      } else {
                        toaster.create({
                          title: "Server Disconnected",
                          description: "Server is disconnected",
                          type: "success",
                        });
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
                          description: error.message,
                          type: "error",
                        });
                      }

                      load(
                        "resources/proto/mmc.proto",
                        async function (err, root) {
                          if (err) {
                            //console.log(err.stack);
                            await disconnectServer(clientId());
                            throw err;
                          }
                          if (!root) {
                            await disconnectServer(clientId());
                            return;
                          }

                          console.log(root);

                          const sendMsg = root.lookupType("mmc.Request");
                          const payload: object = {
                            core: {
                              kind: "CORE_REQUEST_KIND_LINE_CONFIG",
                            },
                          };
                          const msg = sendMsg.create(payload);
                          const request = Array.from(
                            sendMsg.encode(msg).finish(),
                          );
                          await send(clientId(), request);
                        },
                      );

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

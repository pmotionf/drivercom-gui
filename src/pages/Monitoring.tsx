import { Button } from "~/components/ui/styled/button.tsx";
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

import { load } from "protobufjs"; // respectively "./node_modules/protobufjs"
import { Buffer } from "buffer";
import { createEffect } from "solid-js";
import { on } from "solid-js";
import { System } from "~/components/System/System.tsx";

import { deadline } from "@std/async/deadline";
import { delay } from "@std/async/delay";
import { Toast } from "~/components/ui/toast.tsx";

let unlistenFn;

export type SystemConfig = {
  lineConfig: {
    lines: Line[];
  };
};

export type Line = {
  axes: number;
  name: string;
  hallAlarms?: { front?: boolean; back?: boolean }[];
};

function Monitoring() {
  const pageId = crypto.randomUUID();
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);

  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lineConfig: { lines: [] },
  });
  const inputValues: Map<string, string> = new Map();

  createEffect(
    on(
      () => systemConfig.lineConfig.lines,
      () => {
        if (systemConfig.lineConfig.lines.length === 0) return;
        //console.log("Start");
        //load("resources/all.proto", sendGetAxisInfo);
      },
      { defer: true },
    ),
  );

  let test = 0;
  let stop = false;

  async function sendGetAxisInfo(err, root) {
    if (stop) return;
    if (systemConfig.lineConfig.lines.length === 0) return;
    if (err) throw err;
    if (!root) return;
    const sendMessage = root.lookupType("mmc.SendCommand");

    for (const [lineIdx, line] of systemConfig.lineConfig.lines.entries()) {
      const payload = {
        getAxisInfo: {
          lineIdx: lineIdx,
          axisIdx: Array.from({ length: line.axes }, (_, i) => i),
        },
      };
      const command = sendMessage.create(payload);
      const cmdToBuffer = sendMessage.encode(command).finish();
      const parseBuffer = JSON.stringify(Object.values(cmdToBuffer))
        .slice(1, -1)
        .split(",")
        .map((str) => Number(str));

      await send(pageId, parseBuffer);
      console.log(parseBuffer);
      test = test + 1;
      console.log(test);

      try {
        if (unlistenFn) {
          unlistenFn();
        }
        unlistenFn = await deadline(
          listen((x) => {
            console.log(x.payload);

            if (x.payload.id === pageId && x.payload.event.message) {
              console.log(x.payload.event.message.data);
            } else {
              setSystemConfig("lineConfig", "lines", []);
              stop = true;
            }
          }),
          1000,
        );
      } catch (e) {
        console.log(e);
        setSystemConfig("lineConfig", "lines", []);
        stop = true;
        return;
      }
    }
    if (!stop) {
      setTimeout(sendGetAxisInfo.bind(null, err, root), 1000);
    }
  }

  onCleanup(() => {
    if (systemConfig.lineConfig.lines.length !== 0) {
      disconnect(pageId);
    }
  });

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 16,
  });

  return (
    <>
      <Splitter.Root
        size={[
          { id: `${pageId}-panel`, size: panelSize() },
          {
            id: `${pageId}-sidebar`,
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
          id={`${pageId}-panel`}
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
          position="absolute"
          right="0.5rem"
        >
          <Show when={!showSideBar()} fallback={<IconChevronRightPipe />}>
            <IconChevronLeftPipe />
          </Show>
        </IconButton>

        {/* Side bar */}
        <Show when={showSideBar()}>
          <Splitter.ResizeTrigger
            id={`${pageId}-panel:${pageId}-sidebar`}
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
            id={`${pageId}-sidebar`}
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
                  onClick={async () => {
                    if (systemConfig.lineConfig.lines.length !== 0) {
                      setSystemConfig("lineConfig", "lines", []);
                      await disconnect(pageId);
                      return;
                    }
                    const serverIp = inputValues.get("IP");
                    const port = inputValues.get("port");

                    if (
                      typeof serverIp == "string" &&
                      typeof port == "string"
                    ) {
                      const address = `${serverIp}:${port}`;
                      const cid = pageId;
                      await connect(cid, address)
                        .catch((error) => {
                          if (error) {
                            toaster.create({
                              title: "Connection Error",
                              description: error as string,
                              type: "error",
                            });
                            return;
                          }
                        })
                        .then(
                          await listen((x) => {
                            if (
                              x.payload.id === pageId &&
                              x.payload.event.message
                            ) {
                              const buffer = Buffer.from(
                                x.payload.event.message.data,
                              );
                              load("resources/all.proto", function (err, root) {
                                if (err) throw err;
                                if (!root) return;

                                const response =
                                  root.lookupType("mmc.Response");
                                const msg = response.decode(buffer!).toJSON();
                                setSystemConfig(msg);
                              });
                            }
                          }),
                        );
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

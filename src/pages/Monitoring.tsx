import { Button } from "~/components/ui/styled/button.tsx";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { createSignal } from "solid-js";
import { Splitter } from "../components/ui/splitter.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import {
  IconChevronLeftPipe,
  IconChevronRightPipe,
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

import protobuf from "protobufjs";

export type SystemConfig = {
  lineConfig: {
    lines: { axes: number; name: string; hallStatus?: boolean[] }[];
  };
};

function Monitoring() {
  const pageId = crypto.randomUUID();
  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);

  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lineConfig: { lines: [] },
  });
  const inputValues: Map<string, string> = new Map();

  const [isServerConnect, setIsServerConnect] = createSignal<boolean>(false);

  createEffect(
    on(
      () => isServerConnect(),
      () => {
        if (!isServerConnect()) {
          setSystemConfig("lineConfig", "lines", []);
          return;
        }
        listen((x) => {
          if (x.payload.id === pageId && x.payload.event.message) {
            const buffer = Buffer.from(x.payload.event.message.data);
            console.log(x);
            load("resources/all.proto", function (err, root) {
              if (err) throw err;
              if (!root) return;
              const proto = root.lookupType("mmc.Response");

              if (!proto) return;
              const response = proto.decode(buffer).toJSON();
              if (!response) return;
              const lineConfigKey = Object.keys(response).indexOf("lineConfig");
              if (lineConfigKey !== -1) {
                const lineConfig = Object.values(response)[lineConfigKey];
                try {
                  setSystemConfig("lineConfig", lineConfig);
                } catch {
                  return;
                }
              }
            });
          }
        });

        if (createMsg()) {
          listen((x) => {
            console.log(x);
            x.event;
          });
        }
      },
      { defer: true },
    ),
  );

  const createMsg = (): number[] | null => {
    protobuf.load("resources/all.proto").then((root) => {
      if (!root) return;
      const proto = root.lookupType("mmc.SendCommand");
      console.log(root.toJSON());
      const payLoad = {
        get_hall_status: {
          line_idx: 1,
          axis_idx: 1,
        },
      };

      const message = proto.create(payLoad);
      const command = proto.encode(message).finish();
      console.log(proto);

      console.log(proto.toObject(message));
      console.log(command);
      return command;
    });
    return null;
    /*load("resources/all.proto", function (err, root) {
      if (err) throw err;
      if (!root) return;
      const proto = root.lookupType("mmc.SendCommand");

      if (!proto) return;
      const payLoad = {
        GetHallStatus: { line: "front", axes: "1" },
      };

      const message = proto.create(payLoad);
      const command = proto.encode(message).finish();
      console.log(`command = ${Array.prototype.toString.call(command)}`);
      return command;
    });*/
  };

  createMsg();

  onCleanup(() => {
    if (isServerConnect()) {
      disconnect(pageId);
    }
  });

  return (
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
                      value={inputValues.get("IP") ? inputValues.get("IP") : ""}
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
                    color="fg.muted"
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
                variant={isServerConnect() ? "outline" : "solid"}
                onClick={() => {
                  if (isServerConnect()) {
                    disconnect(pageId);
                    setIsServerConnect(false);
                    return;
                  }
                  const serverIp = inputValues.get("IP");
                  const port = inputValues.get("port");

                  if (typeof serverIp == "string" && typeof port == "string") {
                    const address = `${serverIp}:${port}`;
                    const cid = pageId;
                    try {
                      connect(cid, address);
                    } catch {
                      setIsServerConnect(false);
                      return;
                    }
                    setIsServerConnect(true);

                    /*if (sendMsg()) {
                      send(pageId, sendMsg()!);
                      listen((x) => {
                        console.log(x);
                        x.event
                      });
                      }*/
                  }
                }}
              >
                {isServerConnect() ? "Cancel" : "Connect"}
              </Button>
            </Stack>
          </Stack>
        </Splitter.Panel>
      </Show>
    </Splitter.Root>
  );
}

export default Monitoring;

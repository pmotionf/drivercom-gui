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
import { connect, disconnect, listen, send } from "@kuyoonjo/tauri-plugin-tcp";
import { Buffer } from "buffer";
import { System } from "~/components/System/System.tsx";
import { Toast } from "~/components/ui/toast.tsx";
//@ts-ignore Ignore test in git action
import { mmc } from "~/components/proto/mmc.js";
import { UnlistenFn } from "@tauri-apps/api/event";
import { monitoringInputs } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { IpAddress } from "~/components/System/IpHistory.tsx";
import { load } from "@tauri-apps/plugin-store";
import { Tabs } from "~/components/ui/tabs.tsx";
import { ControlPage } from "~/components/MonitoringSidebar/ControlPage.tsx";
import { ConnectPage } from "~/components/MonitoringSidebar/ConnectPage.tsx";

export type SystemConfig = {
  lines: {
    line: mmc.core.Response.LineConfig.ILine;
    system?: mmc.info.Response.ISystem;
  }[];
};

export type serverClientId = {
  command: string;
  info: string;
};

function Monitoring() {
  const [clientId, setClientId] = createSignal<serverClientId>({
    command: crypto.randomUUID(),
    info: crypto.randomUUID(),
  });
  let infoUnlisten: UnlistenFn | null = null;
  let commandUnlisten: UnlistenFn | null = null;

  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);

  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lines: [],
  });
  const [isConnecting, setIsConnecting] = createSignal<boolean>(false);

  const sendRequest = async (cid: string, payload: object) => {
    const msg = mmc.Request.fromObject(payload);
    const buffer = mmc.Request.encode(msg).finish();
    const parseBuffer: number[] = Array.from(buffer);

    try {
      await send(cid, parseBuffer);
    } catch {
      setSystemConfig("lines", []);
      setIsSending([]);
    }
  };

  const connectServer = async (
    cid: serverClientId,
    address: string,
  ): Promise<null | string> => {
    try {
      await connect(cid.info, address);
      if (infoUnlisten === null) {
        infoUnlisten = await infoListener();
      }
      await connect(cid.command, address);
      if (commandUnlisten === null) {
        commandUnlisten = await commandListener();
      }

      let payload: object = {
        core: {
          kind: "CORE_REQUEST_KIND_LINE_CONFIG",
        },
      };
      await sendRequest(cid.info, payload);

      payload = {
        core: {
          kind: "CORE_REQUEST_KIND_SERVER_INFO",
        },
      };
      await sendRequest(cid.info, payload);
    } catch (error) {
      return error as string;
    }
    return null;
  };

  const disconnectServer = async (clientId: {
    command: string;
    info: string;
  }) => {
    if (systemConfig.lines.length < 1) return;
    try {
      if (commandUnlisten !== null) {
        commandUnlisten();
        commandUnlisten = null;
      }
      await disconnect(clientId.command);

      if (infoUnlisten !== null) {
        infoUnlisten();
        infoUnlisten = null;
      }
      await disconnect(clientId.info);
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

  onCleanup(async () => {
    if (systemConfig.lines.length > 0) {
      await disconnectServer(clientId());
    }
  });

  // Request system info part
  async function requestSystemInfo(
    lineId: number,
    lines: mmc.core.Response.LineConfig.ILine[],
  ) {
    if (infoUnlisten === null) return;
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
    await sendRequest(clientId().info, payload);
    if (lineId + 1 <= lines.length) {
      await requestSystemInfo(lineId + 1, lines);
    }
  }

  async function sendRequestLoop() {
    if (infoUnlisten === null && systemConfig.lines.length < 1) return;
    try {
      await requestSystemInfo(
        1,
        systemConfig.lines.map((line) => line.line),
      );

      setTimeout(async () => {
        if (systemConfig.lines.length < 1) {
          return;
        }
        await sendRequestLoop();
      }, 10);
    } catch {
      await disconnectServer(clientId());
      setSystemConfig({ lines: [] });
    }
  }

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

  async function infoListener(): Promise<UnlistenFn> {
    return await listen(async (x) => {
      if (
        x.payload.id === clientId().info &&
        x.payload.event.message &&
        x.payload.event.message.data
      ) {
        const msg = Buffer.from(x.payload.event.message!.data);
        const decode = mmc.Response.decode(msg);

        if (decode.core) {
          if (decode.core.lineConfig) {
            //@ts-ignore Ignore test in git action
            const update = decode.core.lineConfig.lines!.map((line) => {
              return { line: line };
            });
            setSystemConfig({ lines: update });
            return;
          }

          if (decode.core.server) {
            const serverName = decode.core.server.name;
            if (serverName) {
              setIpHistory((prev) => [
                { ...prev[0], name: serverName },
                ...prev.slice(1, prev.length),
              ]);
            }
            return;
          }
        }

        if (decode.info) {
          if (decode.info.system) {
            const index = decode.info!.system!.lineId! - 1;
            if (isAutomatic()) {
              if (decode.info.system.driverErrors) {
                const hasDriverError = hasError(
                  decode.info.system.driverErrors,
                );
                const hasAxisError = hasError(decode.info.system.axisErrors!);

                if (hasDriverError && !hasAxisError) {
                  const lineId = decode.info.system.lineId!;
                  if (
                    !isSending()
                      .map((send) => send.lineId)
                      .includes(lineId)
                  ) {
                    setIsSending((prev) => [
                      ...prev,
                      { lineId: lineId, isSending: false },
                    ]);
                  }
                }
              }
            }

            setSystemConfig("lines", index, "system", decode.info!.system);
            return;
          }
        }
      }
    });
  }

  const hasError = (fields: object[]): boolean => {
    const findErrorFields = fields.map((field) => findErrorField(field));
    return findErrorFields.includes(true);
  };

  const findErrorField = (fields: object): boolean => {
    const values = Object.values(fields);
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

  //Send Command
  const [isSending, setIsSending] = createSignal<
    { lineId: number; isSending: boolean }[]
  >([]);
  const [isAutomatic, setIsAutomatic] = createSignal<boolean>(false);

  createEffect(
    on(
      () => isSending(),
      async () => {
        if (isSending().length < 1) return;

        const parseIsSending = isSending().map((send) => send.isSending);
        const isSendingCommand = parseIsSending.includes(true);
        if (isSendingCommand) return;

        const lineId = isSending()[0].lineId;
        setIsSending((prev) => [
          { ...prev[0], isSending: true },
          ...prev.slice(1, prev.length),
        ]);
        await sendClearError(lineId);
      },
      { defer: true },
    ),
  );

  const sendClearError = async (lineId: number) => {
    const payload = {
      command: {
        clearErrors: {
          lineId: lineId,
        },
      },
    };
    if (
      isSending()
        .map((send) => send.lineId)
        .includes(lineId)
    ) {
      // Giving timeout to show user the error is erasing
      setTimeout(async () => {
        await sendRequest(clientId().command, payload);
      }, 200);
    }
  };

  async function commandListener(): Promise<UnlistenFn> {
    return await listen(async (x) => {
      if (
        x.payload.id === clientId().command &&
        x.payload.event.message &&
        x.payload.event.message.data
      ) {
        const msg = Buffer.from(x.payload.event.message!.data);
        const decode = mmc.Response.decode(msg);
        if (decode.command) {
          if (decode.command.commandId) {
            const payload = {
              info: {
                command: { id: decode.command.commandId },
              },
            };
            await sendRequest(clientId().command, payload);
          }

          if (decode.command.commandOperation) {
            const commandOperation = decode.command.commandOperation;
            const parseOperation =
              mmc.command.Response.CommandOperationStatus[commandOperation];
            if (parseOperation.includes("COMPLETED")) {
              setIsSending((prev) => prev.filter((send) => !send.isSending));
            }
          }
        }

        if (decode.info) {
          if (decode.info.commands) {
            const command = decode.info.commands.commands![0];
            const commandStatus = command.status;
            const commandId = command.id;
            const parseStatus =
              mmc.info.Response.Commands.Command.Status[
                commandStatus as mmc.info.Response.Commands.Command.Status
              ];

            if (parseStatus.includes("COMPLETED")) {
              const payload = {
                command: {
                  clearCommand: {
                    commandId: commandId,
                  },
                },
              };
              await sendRequest(clientId().command, payload);
            } else {
              const payload = {
                info: {
                  command: { id: commandId },
                },
              };
              await sendRequest(clientId().command, payload);
            }
          }
        }
      }
    });
  }

  // Get & Set recent ip history
  const [ipHistory, setIpHistory] = createSignal<IpAddress[]>([]);
  const [render, setRender] = createSignal<boolean>(false);

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

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 16,
  });

  return (
    <Show when={render()}>
      <Splitter.Root
        id={clientId().info}
        panels={[
          { id: `${clientId()}-panel` },
          {
            id: `${clientId()}-sidebar`,
            minSize: 18,
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
          <Splitter.Panel
            id={`${clientId()}-sidebar`}
            borderWidth="0"
            backgroundColor="transparent"
            minWidth="18rem"
          >
            <Tabs.Root
              defaultValue="Connect"
              style={{ width: "100%", height: "100%" }}
            >
              <Tabs.List>
                <Tabs.Trigger value="Connect" paddingTop="0.5rem">
                  {"Connect"}
                </Tabs.Trigger>
                <Tabs.Trigger value="Control" paddingTop="0.5rem">
                  {"Control"}
                </Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>
              <Tabs.Content
                value="Connect"
                style={{ width: "100%", height: "100%" }}
              >
                <ConnectPage
                  toaster={toaster}
                  ipHistory={ipHistory()}
                  changeIpHisory={setIpHistory}
                  isConnect={systemConfig.lines.length > 0}
                  isConnecting={isConnecting()}
                  onConnectServer={async (address) => {
                    setIsConnecting(true);
                    const cid = clientId();
                    const result = await connectServer(cid, address);
                    if (typeof result === "string") {
                      toaster.create({
                        title: "Connection Error",
                        description: result as string,
                        type: "error",
                      });
                      setIpHistory([
                        ...ipHistory().filter(
                          (history) =>
                            `${history.ip}:${history.port}` !== address,
                        ),
                      ]);
                    } else {
                      const newIp = {
                        ip: `${monitoringInputs.get("IP")![0]()}`,
                        port: `${monitoringInputs.get("port")![0]()}`,
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
                  }}
                  onDisconnectServer={async () => {
                    await disconnectServer(clientId());
                    setSystemConfig({ lines: [] });
                    setIsSending([]);
                    setClientId({
                      command: crypto.randomUUID(),
                      info: crypto.randomUUID(),
                    });
                  }}
                />
              </Tabs.Content>
              <Tabs.Content value="Control">
                <ControlPage
                  isAutoMode={isAutomatic()}
                  changeAutoMode={setIsAutomatic}
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
    </Show>
  );
}

export default Monitoring;

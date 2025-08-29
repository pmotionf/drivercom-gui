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
import {
  commandListener,
  connectServer,
  requestClearError,
  disconnectServer,
  requestSystemInfo,
  infoListener,
} from "./Monitoring/ServerHandler.ts";

export type SystemConfig = {
  lines: {
    line: mmc.core.Response.LineConfig.ILine;
    system?: mmc.info.Response.ISystem;
  }[];
};

export type ServerClientId = {
  command: string;
  info: string;
};

export type CurrentSendingCommand = {
  lineId: number;
  isSending: boolean;
};

function Monitoring() {
  const [clientId, setClientId] = createSignal<ServerClientId>({
    command: crypto.randomUUID(),
    info: crypto.randomUUID(),
  });

  const [systemConfig, setSystemConfig] = createStore<SystemConfig>({
    lines: [],
  });

  createEffect(
    on(
      () => systemConfig.lines,
      async () => {
        if (systemConfig.lines.length > 0) {
          await sendRequestLoop(isDisconnect());
        }
      },
      { defer: true },
    ),
  );

  async function sendRequestLoop(isDisconnect: boolean) {
    if (isDisconnect) return;
    try {
      const request = await requestSystemInfo(
        clientId().info,
        1,
        systemConfig.lines.map((line) => line.line),
      );

      setTimeout(async () => {
        if (request === null) {
          closeListeners();
          return;
        }
        await sendRequestLoop(isDisconnect);
      }, 10);
    } catch {
      await disconnectServer(clientId(), isDisconnect, toaster);
      setSystemConfig({ lines: [] });
    }
  }

  const isConnect = () => systemConfig.lines.length > 0;
  const isDisconnect = () => systemConfig.lines.length < 1;

  const [isConnecting, setIsConnecting] = createSignal<boolean>(false);

  let infoUnlisten: UnlistenFn | null = null;
  let commandUnlisten: UnlistenFn | null = null;
  const openListeners = async (cid: ServerClientId) => {
    if (infoUnlisten === null) {
      infoUnlisten = await infoListener(
        clientId().info,
        setSystemConfig,
        isAutoClearMode,
        setIpHistory,
        (lineId) => {
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
        },
      );
    }
    if (commandUnlisten === null) {
      commandUnlisten = await commandListener(
        cid.command,
        //After Complete command
        () => {
          setIsSending((prev) => prev.filter((send) => !send.isSending));
        },
        // Catch error
        async () => {
          await disconnectServer(clientId(), isDisconnect(), toaster);
          closeListeners();
        },
      );
    }
  };

  const closeListeners = () => {
    if (infoUnlisten !== null) {
      infoUnlisten();
      infoUnlisten = null;
    }
    if (commandUnlisten !== null) {
      commandUnlisten();
      commandUnlisten = null;
    }
    setSystemConfig("lines", []);
    setIsSending([]);
  };

  onCleanup(async () => {
    if (isConnect()) {
      closeListeners();
      await disconnectServer(clientId(), isDisconnect(), toaster);
    }
  });

  //Send Command
  const [isSending, setIsSending] = createSignal<
    { lineId: number; isSending: boolean }[]
  >([]);
  const [isAutoClearMode, setIsAutoClearMode] = createSignal<boolean>(false);

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
        await requestClearError(lineId, clientId().command);
      },
      { defer: true },
    ),
  );

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

  const [showSideBar, setShowSideBar] = createSignal<boolean>(true);
  const [panelSize, setPanelSize] = createSignal<number>(100);

  return (
    <Show when={render()}>
      <Splitter.Root
        id={clientId().info}
        panels={[
          { id: `${clientId()}-panel` },
          {
            id: `${clientId()}-sidebar`,
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
                    await openListeners(cid);

                    const result = await connectServer(cid, address);
                    if (typeof result === "string") {
                      toaster.create({
                        title: "Connection Error",
                        description: result as string,
                        type: "error",
                      });

                      setIpHistory((prev) =>
                        prev.filter(
                          (addr) => `${addr.ip}:${addr.port}` !== address,
                        ),
                      );
                    }
                    setIsConnecting(false);
                  }}
                  onDisconnectServer={async () => {
                    await disconnectServer(clientId(), isDisconnect(), toaster);
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
                  isAutoMode={isAutoClearMode()}
                  changeAutoMode={setIsAutoClearMode}
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

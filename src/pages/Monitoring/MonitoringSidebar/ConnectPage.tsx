import { Text } from "~/components/ui/text";
import {
  MonitoringInputs,
  detectedServer,
  setDetectedServer,
} from "~/store/GlobalState";
import { IpAddress, IpHistory } from "../System/IpHistory";
import { Setter } from "solid-js";
import { Button } from "~/components/ui/button";
import { Show } from "solid-js";
import { CreateToasterReturn } from "@ark-ui/solid";
import { css } from "styled-system/css";
import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { ServerHandler } from "~/services/ServerHandler";
import { IconArrowAutofitWidth } from "@tabler/icons-solidjs";
import { Tooltip } from "~/components/ui/tooltip";

export type ConnectPageProps = {
  isConnect: boolean;
  loading: boolean;
  mmcCliBtnLoading: boolean;
  onDisconnectServer?: (ip?: string, port?: string) => void;
  onConnectServer?: (ip: string, port: string) => void;
  onConnectMmccli?: (ip: string) => void;
  onDisconnectMmccli?: (isChangeIp?: boolean) => void;
  ipHistory: IpAddress[];
  changeIpHistory: Setter<IpAddress[]>;
  toaster: CreateToasterReturn;
  inputs: MonitoringInputs;
};

export const ConnectPage = (props: ConnectPageProps) => {
  const ip = () => {
    return props.inputs.get("IP")![0]();
  };
  const setIp = (newIp: string) => {
    return props.inputs.get("IP")![1](newIp);
  };

  const port = () => {
    return props.inputs.get("port")![0]();
  };
  const setPort = (newPort: string) => {
    return props.inputs.get("port")![1](newPort);
  };

  const ipRegex = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
  const isInvalidIp = (): boolean => {
    return !ipRegex.test(ip()) || port().length < 1 || isNaN(Number(port()));
  };

  const toaster = props.toaster;

  const [isDetecting, setIsDetecting] = createSignal<boolean>(false);

  const scanIpaddrs = async (ipAddrs: string[]): Promise<void> => {
    const findCommands = ipAddrs.map((addr) => findServer(addr));
    await Promise.allSettled(findCommands);
    return Promise.resolve();
  };

  const findServer = async (ipAddr: string): Promise<void> => {
    const port = "443";
    const handler = new ServerHandler();

    try {
      await handler.connect(ipAddr, port);
      if (handler.getStatus() && handler.getStatus() === WebSocket.OPEN) {
        const serverName = await handler.getServerName();
        const result = {
          ip: ipAddr,
          port: port,
          name: serverName ?? undefined,
        };
        setDetectedServer((prev) => [...prev, result]);
      }
    } catch {
      return Promise.resolve();
    } finally {
      if (handler.getStatus() && handler.getStatus() === WebSocket.OPEN) {
        await handler.disconnect();
      }
      return Promise.resolve();
    }
  };

  const [connectMmccli, setConnectMmccli] = createSignal<boolean>(false);

  async function timer(ms: number): Promise<NodeJS.Timeout> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function delay(ms: number) {
    const timeout = await timer(ms);
    clearTimeout(timeout);
    return Promise.resolve();
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
      }}
    >
      {/* Connect Area */}
      <div
        style={{
          height: "100%",
          width: "33.3%",
          "border-right-width": "2px",
          padding: "0em 1em 0em 0em",
        }}
      >
        <form
          style={{ width: "100%", height: "100%" }}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div style={{ display: "flex", width: "100%" }}>
            <Text size="lg" fontWeight="bold" width={`calc(100% - 1rem)`}>
              Connect
            </Text>
            <Tooltip.Root>
              <Tooltip.Trigger width={"min-content"}>
                <Button
                  size="xs"
                  variant={connectMmccli() ? "solid" : "subtle"}
                  opacity={connectMmccli() ? "1" : "0.5"}
                  loading={props.mmcCliBtnLoading}
                  onClick={() => {
                    setConnectMmccli(!connectMmccli());
                    if (connectMmccli()) {
                      if (props.isConnect) {
                        props.onConnectMmccli?.(ip());
                      }
                    } else {
                      if (props.isConnect) {
                        props.onDisconnectMmccli?.();
                      }
                    }
                  }}
                >
                  <IconArrowAutofitWidth />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  {connectMmccli() ? "Control enabled" : "Control disabled"}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </div>
          <div style={{ display: "flex", "margin-top": "1rem" }}>
            <Text size="sm" style={{ width: "50%" }}>
              IP
            </Text>
            <Text size="sm" style={{ width: "50%" }}>
              Port
            </Text>
          </div>
          <div style={{ display: "flex" }}>
            <input
              name="IP"
              value={ip()}
              onInput={(e) => {
                if (typeof e.target.value === "string") {
                  setIp(e.target.value);
                }
              }}
              type="text"
              class={css({ backgroundColor: "bg.muted" })}
              style={{
                width: `calc(50% - 1rem)`,
                padding: "0.2em 0.5em 0.2em 0.5em",
                "margin-right": "1rem",
                border: "none",
                outline: "none",
                "white-space": "nowrap",
                overflow: "hidden",
                display: "block",
                "text-overflow": "ellipsis",
                "border-radius": "0.5em",
              }}
            />
            <input
              name="port"
              value={port()}
              onInput={(e) => {
                if (typeof e.target.value === "string") {
                  setPort(e.target.value);
                }
              }}
              class={css({ backgroundColor: "bg.muted" })}
              style={{
                width: "50%",
                padding: "0.2em 0.5em 0.2em 0.5em",
                border: "none",
                outline: "none",
                "white-space": "nowrap",
                overflow: "hidden",
                display: "block",
                "text-overflow": "ellipsis",
                "border-radius": "0.5em",
              }}
            />
          </div>
          <Button
            marginTop="1.5em"
            variant={!props.isConnect ? "solid" : "outline"}
            loading={props.loading}
            onClick={async () => {
              if (props.isConnect) {
                if (props.mmcCliBtnLoading) {
                  toaster.create({
                    title: "Invalid request",
                    description: "MMC-CLI is still loading",
                    type: "error",
                  });
                  return;
                }
                props.onDisconnectServer?.();
                if (connectMmccli()) {
                  props.onDisconnectMmccli?.();
                }
              } else {
                if (isInvalidIp()) {
                  props.toaster.create({
                    title: "Invalid IP Address",
                    description: "The IP address is invalid.",
                    type: "error",
                  });
                  return;
                }
                props.onConnectServer?.(ip(), port());
                if (connectMmccli()) {
                  props.onConnectMmccli?.(ip());
                }
              }
            }}
            style={{ width: "100% " }}
          >
            {!props.isConnect ? "Connect" : "Disconnect"}
          </Button>
        </form>
      </div>

      <div
        style={{
          width: "33.3%",
          height: "100%",
          "border-right-width": "2px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            padding: "1em",
            height: "3em",
            "align-items": "center",
          }}
        >
          <Text width={`calc(100% - 3em)`} fontWeight={"bold"}>
            {"Scan Server"}
          </Text>
          <Button
            size="xs"
            loading={isDetecting()}
            variant="outline"
            onClick={async () => {
              setIsDetecting(true);
              try {
                setDetectedServer([]);
                const searchedIps = await invoke<string[]>("get_server_addrs");
                if (searchedIps.length > 0) {
                  await scanIpaddrs(searchedIps);
                }
                setIsDetecting(false);
              } catch {
                setIsDetecting(false);
              }
            }}
          >
            {"Scan"}
          </Button>
        </div>
        <Show
          when={detectedServer().length > 0}
          fallback={
            <div style={{ "padding-left": "1em" }}>
              <Text size="sm"> Not found.</Text>
            </div>
          }
        >
          <div style={{ width: "100%", height: `calc(100% - 2em)` }}>
            <IpHistory
              ipHistory={detectedServer()}
              onDeleteIp={(ipIndex: number) => {
                setDetectedServer((prev) =>
                  prev.filter((_, i) => i !== ipIndex),
                );
              }}
              onConnectServer={async (index: number) => {
                const newIp = detectedServer()[index].ip;
                const newPort = detectedServer()[index].port;
                if (props.loading) {
                  toaster.create({
                    title: "Already Connecting",
                    description:
                      newIp === ip() && newPort === port()
                        ? "Already connecting to server."
                        : "Already connecting to other server.",
                    type: "error",
                  });
                  return;
                }

                if (props.mmcCliBtnLoading) {
                  toaster.create({
                    title: "Invalid request",
                    description: "MMC-CLI is loading.",
                    type: "error",
                  });
                  return;
                }

                if (props.isConnect) {
                  if (newIp === ip() && newPort === port()) {
                    toaster.create({
                      title: "Connected Server",
                      description: "This server is already connected.",
                      type: "error",
                    });
                    return;
                  }

                  props.onDisconnectServer?.();
                  if (connectMmccli()) {
                    props.onDisconnectMmccli?.(true);
                  }
                  while (props.isConnect) {
                    await delay(1);
                  }
                }

                setIp(newIp);
                setPort(newPort);
                props.onConnectServer?.(ip(), port());
                if (connectMmccli()) {
                  props.onConnectMmccli?.(ip());
                }
              }}
            />
          </div>
        </Show>
      </div>
      {/* IP History Area */}
      <Show when={props.ipHistory.length > 0}>
        <div
          style={{
            width: "33.3%",
            height: `100%`,
          }}
        >
          <Text
            style={{
              "font-weight": "bold",
              height: "2em",
              "margin-top": "1em",
              "margin-left": "1em",
            }}
          >
            {"Recent"}
          </Text>
          <div style={{ width: "100%", height: `calc(100% - 2em)` }}>
            <IpHistory
              ipHistory={props.ipHistory}
              onDeleteIp={(ipIndex: number) => {
                props.changeIpHistory([
                  ...props.ipHistory.filter((_, i) => i !== ipIndex),
                ]);
              }}
              onConnectServer={async (index: number) => {
                const newIp = props.ipHistory[index].ip;
                const newPort = props.ipHistory[index].port;
                if (props.mmcCliBtnLoading) {
                  toaster.create({
                    title: "Invalid request",
                    description: "MMC-CLI is loading.",
                    type: "error",
                  });
                  return;
                }
                if (props.loading) {
                  toaster.create({
                    title: "Already Connecting",
                    description:
                      newIp === ip() && newPort === port()
                        ? "Already connecting to server."
                        : "Already connecting to other server.",
                    type: "error",
                  });
                  return;
                }

                if (props.isConnect) {
                  if (newIp === ip() && newPort === port()) {
                    toaster.create({
                      title: "Connected Server",
                      description: "This server is already connected.",
                      type: "error",
                    });
                    return;
                  }

                  props.onDisconnectServer?.();
                  if (connectMmccli()) {
                    props.onDisconnectMmccli?.(true);
                  }
                  while (props.isConnect) {
                    await delay(1);
                  }
                }

                setIp(newIp);
                setPort(newPort);
                props.onConnectServer?.(ip(), port());
                if (connectMmccli()) {
                  props.onConnectMmccli?.(ip());
                }
              }}
            />
          </div>
        </div>
      </Show>
    </div>
  );
};

import { Text } from "../ui/text";
import {
  MonitoringInputs,
  detectedServer,
  setDetectedServer,
} from "~/GlobalState";
import { IpAddress, IpHistory } from "../System/IpHistory";
import { Setter } from "solid-js";
import { Button } from "../ui/button";
import { Show } from "solid-js";
import { CreateToasterReturn } from "@ark-ui/solid";
import { css } from "styled-system/css";
import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { ServerHandler } from "~/pages/Monitoring/ServerHandler";

export type ConnectPageProps = {
  isConnect: boolean;
  loading: boolean;
  onDisconnectServer?: (ip?: string, port?: string) => void;
  onConnectServer?: (ip: string, port: string) => void;
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

  const connectAreaHeight = "11em";
  const toaster = props.toaster;

  const [isDetecting, setIsDetecting] = createSignal<boolean>(false);

  const scanIpaddrs = async (ipAddrs: string[]) => {
    const findServers = ipAddrs.map((addr) => findServer(addr));
    await Promise.all(findServers);
    return;
  };

  const findServer = async (ipAddr: string): Promise<void> => {
    const port = "443";
    const handler = new ServerHandler();
    try {
      await handler.connect(ipAddr, port);
      const serverName = await handler.getServerName();
      await handler.disconnect();
      const result = {
        ip: ipAddr,
        port: port,
        name: serverName ? serverName : undefined,
      };
      setDetectedServer((prev) => [...prev, result]);
    } catch {
      return;
    }
  };

  return (
    <>
      {/* Connect Area */}
      <div
        style={{
          height: connectAreaHeight,
          width: "100%",
          "border-bottom-width": "2px",
          padding: "0em 1em 0em 1em",
        }}
      >
        <form
          style={{ width: "100%", height: "100%" }}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Text size="lg" fontWeight="bold">
            Connect
          </Text>
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
            marginTop="0.8em"
            variant={!props.isConnect ? "solid" : "outline"}
            loading={props.loading}
            onClick={async () => {
              if (props.isConnect) {
                props.onDisconnectServer?.();
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
              }
            }}
            style={{ width: "100% " }}
          >
            {!props.isConnect ? "Connect" : "Disconnect"}
          </Button>
        </form>
      </div>
      {/* IP History Area */}
      <Show when={props.ipHistory.length > 0}>
        <div
          style={{
            width: "100%",
            height: `14em`,
            "border-bottom-width": "2px",
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
                  setIp(newIp);
                  setPort(newPort);
                  props.onDisconnectServer?.(ip(), port());
                  return;
                }

                setIp(newIp);
                setPort(newPort);
                props.onConnectServer?.(ip(), port());
              }}
            />
          </div>
        </div>
      </Show>

      <div
        style={{
          width: "100%",
          height:
            props.ipHistory.length > 0
              ? `calc(100% - 15em - ${connectAreaHeight} )`
              : `calc(100% - ${connectAreaHeight} )`,
          "padding-bottom": "3em",
          "padding-top": "0.5em",
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
                const searchedIps = await invoke<string[]>("get_server_addrs");
                setDetectedServer([]);
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
          <IpHistory
            ipHistory={detectedServer()}
            onDeleteIp={(ipIndex: number) => {
              setDetectedServer((prev) => prev.filter((_, i) => i !== ipIndex));
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

              if (props.isConnect) {
                if (newIp === ip() && newPort === port()) {
                  toaster.create({
                    title: "Connected Server",
                    description: "This server is already connected.",
                    type: "error",
                  });
                  return;
                }
                setIp(newIp);
                setPort(newPort);
                props.onDisconnectServer?.(ip(), port());
                return;
              }

              setIp(newIp);
              setPort(newPort);
              props.onConnectServer?.(ip(), port());
            }}
          />
        </Show>
      </div>
    </>
  );
};

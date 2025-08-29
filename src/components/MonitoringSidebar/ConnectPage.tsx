import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import { monitoringInputs } from "~/GlobalState";
import { IpAddress, IpHistory } from "../System/IpHistory";
import { Setter } from "solid-js";
import { Button } from "../ui/button";
import { Show } from "solid-js";
import { CreateToasterReturn } from "@ark-ui/solid";

export type ConnectPageProps = {
  isConnect: boolean;
  isConnecting: boolean;
  onDisconnectServer?: () => void;
  onConnectServer?: (address: string) => void;
  ipHistory: IpAddress[];
  changeIpHisory: Setter<IpAddress[]>;
  toaster: CreateToasterReturn;
};

export const ConnectPage = (props: ConnectPageProps) => {
  /* CSS Component height */
  const connectAreaHeight = "12rem";
  const toaster = props.toaster;

  return (
    <>
      {/* Connect Area */}
      <Stack
        style={{
          height: connectAreaHeight,
          width: "100%",
          "border-bottom-width": "2px",
          padding: "1rem",
          "padding-top": "0rem",
        }}
      >
        <Text size="lg" fontWeight="bold">
          Connect
        </Text>

        <Stack style={{ width: "100%" }} direction="row">
          <div style={{ width: "50%" }}>
            <Text size="sm" width="100%" color="fg.muted" marginTop="0.4rem">
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
                  monitoringInputs.has("IP")
                    ? monitoringInputs.get("IP")![0]()
                    : ""
                }
                onInput={(e) => {
                  if (typeof e.target.value === "string") {
                    monitoringInputs.get("IP")![1](e.target.value);
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
                  monitoringInputs.has("port")
                    ? monitoringInputs.get("port")![0]()
                    : ""
                }
                onInput={(e) => {
                  if (typeof e.target.value === "string") {
                    monitoringInputs.get("port")![1](e.target.value);
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
          marginTop="0.5rem"
          variant={!props.isConnect ? "solid" : "outline"}
          loading={props.isConnecting}
          onClick={async () => {
            if (props.isConnect) {
              props.onDisconnectServer?.();
            } else {
              const address = `${monitoringInputs.get("IP")![0]()}:${monitoringInputs.get("port")![0]()}`;
              props.onConnectServer?.(address);
            }
          }}
        >
          {!props.isConnect ? "Connect" : "Disconnect"}
        </Button>
      </Stack>
      {/* IP History Area */}
      <Show when={props.ipHistory.length > 0}>
        <div
          style={{
            width: "100%",
            height: `calc(100% - ${connectAreaHeight})`,
          }}
        >
          <IpHistory
            ipHistory={props.ipHistory}
            onDeleteIp={(ipIndex: number) => {
              props.changeIpHisory([
                ...props.ipHistory.filter((_, i) => i !== ipIndex),
              ]);
            }}
            onConnectServer={async (index: number) => {
              if (props.isConnect) {
                toaster.create({
                  title: "Duplicate Connection",
                  description: "Sever is already connected",
                  type: "error",
                });
                return;
              }
              const address = `${props.ipHistory[index].ip}:${props.ipHistory[index].port}`;
              monitoringInputs.get("IP")![1](props.ipHistory[index].ip);
              monitoringInputs.get("port")![1](props.ipHistory[index].port);
              props.onConnectServer?.(address);
            }}
          />
        </div>
      </Show>
    </>
  );
};

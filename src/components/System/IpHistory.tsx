import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import { For, Show } from "solid-js";
import { IconButton } from "../ui/icon-button";
import { IconX } from "@tabler/icons-solidjs";
import { createSignal } from "solid-js";

export type IpAddress = { ip: string; port: string; name?: string };

export type IpHistoryProps = {
  ipHistory: IpAddress[];
  onConnectServer?: (index: number) => void;
  onDeleteIp: (index: number) => void;
};

export function IpHistory(props: IpHistoryProps) {
  const [hoverDiv, setHoverDiv] = createSignal<number | null>(null);
  return (
    <div
      style={{
        width: "100%",
        gap: "0",
        padding: "1rem",
        height: "100%",
      }}
    >
      <Text
        style={{
          "font-weight": "bold",
          height: "2.5rem",
        }}
      >
        {"Recent"}
      </Text>
      <div
        style={{
          width: `calc(100% - 2rem)`,
          display: "flex",
          height: "1.5rem",
        }}
      >
        <Text width={"45%"} size="sm">
          {"Name"}
        </Text>
        <Text width={`40%`} size="sm">
          {"IP"}
        </Text>
        <Text size="sm" width="15%">
          {"Port"}
        </Text>
      </div>
      <div
        style={{
          width: "100%",
          height: `calc(100% - 4rem)`,
          "border-top-width": "1px",
          "border-bottom-width": "1px",
          "overflow-y": "auto",
          "margin-bottom": "1rem",
          "min-height": "2rem",
        }}
      >
        <For each={props.ipHistory}>
          {(ipAddress, index) => (
            <Stack
              direction="row"
              onMouseEnter={() => setHoverDiv(index())}
              onMouseLeave={() => setHoverDiv(null)}
              transition={`background-color 0.3s ease`}
              background={hoverDiv() !== index() ? "bg.canvas" : "bg.muted"}
              style={{
                cursor: "pointer",
                "border-radius": "0.2rem",
                width: "100%",
                gap: "0",
                height: "min-content",
              }}
            >
              <Stack
                direction="row"
                gap="0"
                style={{
                  width: `calc(100% - 2rem)`,
                  "padding-top": "0.3rem",
                  "padding-bottom": "0.3rem",
                  height: "2rem",
                }}
                onClick={async () => {
                  props.onConnectServer?.(index());
                }}
              >
                <Text
                  style={{
                    width: `45%`,
                    "user-select": "none",
                    "white-space": "nowrap",
                    "text-overflow": "ellipsis",
                    display: "block",
                    overflow: "hidden",
                    "padding-right": "0.5rem",
                  }}
                >
                  {ipAddress.name ? ipAddress.name : ""}
                </Text>
                <Text
                  style={{
                    width: `40%`,
                    "user-select": "none",
                    "white-space": "nowrap",
                    "text-overflow": "ellipsis",
                    display: "block",
                    overflow: "hidden",
                  }}
                >
                  {ipAddress.ip}
                </Text>
                <Text
                  style={{
                    "user-select": "none",
                    width: "15%",
                    "white-space": "nowrap",
                    "text-overflow": "ellipsis",
                    display: "block",
                    overflow: "hidden",
                  }}
                >
                  {ipAddress.port}
                </Text>
              </Stack>
              <Show when={index() === hoverDiv()}>
                <IconButton
                  variant="ghost"
                  size="xs"
                  style={{ width: "2rem", "border-radius": "2rem" }}
                  onClick={() => props.onDeleteIp(index())}
                >
                  <IconX />
                </IconButton>
              </Show>
            </Stack>
          )}
        </For>
      </div>
    </div>
  );
}

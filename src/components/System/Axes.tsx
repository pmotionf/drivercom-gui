import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text.tsx";
import { For, Show } from "solid-js/web";
import { Badge } from "../ui/badge.tsx";
import { Tooltip } from "../ui/tooltip.tsx";
import {
  Response_Track_Axis_Error,
  Response_Track_Axis_State,
  Response_Track_Carrier_State,
  Response_Track_Carrier_State_State,
  /*@ts-ignore Ignore git acticon type check */
} from "../proto/mmc/info_pb.ts";

export type AxisProps = {
  id: string;
  axisInfo: Response_Track_Axis_State;
  axisError: Response_Track_Axis_Error;
  carrier?: Response_Track_Carrier_State | null;
};

export function Axis(props: AxisProps) {
  const axisId = Number(props.id.split(":")[1]);
  return (
    <Stack
      width="9rem"
      height="7rem"
      borderRadius="0.5rem"
      borderWidth="1px"
      borderRightWidth={props.axisInfo.hallAlarmFront ? "5px" : "1px"}
      borderLeftWidth={props.axisInfo.hallAlarmBack ? "5px" : "1px"}
      borderRightColor={
        props.axisInfo.hallAlarmFront ? "accent.customGreen" : undefined
      }
      borderLeftColor={
        props.axisInfo.hallAlarmBack ? "accent.customGreen" : undefined
      }
      backgroundColor="bg.default"
      padding="0.5rem"
      gap="0"
    >
      <Stack
        height="min-content"
        width="100%"
        borderBottomWidth="0.02px"
        gap="1"
        direction="row"
        paddingBottom="0.3rem"
        borderColor="bg.muted"
        marginBottom="0.2rem"
      >
        <Tooltip.Root>
          <Tooltip.Trigger width="min-content">
            <Badge
              width="min-content"
              backgroundColor={
                props.axisError.overcurrent
                  ? "accent.customRed"
                  : props.axisInfo.motorActive
                    ? "accent.customGreen"
                    : "bg.emphasized"
              }
              paddingLeft="0.5rem"
              paddingRight="0.5rem"
              height="min-content"
              borderWidth="0"
            >
              <Text size="sm">Axis {axisId}</Text>
            </Badge>
          </Tooltip.Trigger>
          <Show
            when={
              Object.values(props.axisInfo).includes(true) ||
              Object.values(props.axisError).includes(true)
            }
          >
            <Tooltip.Positioner>
              <Tooltip.Content>
                <Show when={Object.values(props.axisInfo).includes(true)}>
                  <Text>Info</Text>
                  <For each={Object.entries(props.axisInfo)}>
                    {([key, value]) => {
                      if (typeof value == "boolean" && value) {
                        const prettierLabel = `${key[0].toUpperCase()}${key.slice(1, key.length)}`;
                        return <Text fontWeight="medium">{prettierLabel}</Text>;
                      }
                    }}
                  </For>
                </Show>
                <Show when={Object.values(props.axisError).includes(true)}>
                  <Text
                    marginTop={
                      Object.values(props.axisInfo).includes(true)
                        ? "0.5rem"
                        : "0"
                    }
                  >
                    Error
                  </Text>
                  <For each={Object.entries(props.axisError)}>
                    {([key, value]) => {
                      if (key !== "id" && value) {
                        const prettierLabel = `${key[0].toUpperCase()}${key.slice(1, key.length)}`;
                        return <Text fontWeight="medium">{prettierLabel}</Text>;
                      }
                    }}
                  </For>
                </Show>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Show>
        </Tooltip.Root>
        <Show when={props.axisInfo!.waitingPull || props.axisInfo!.waitingPush}>
          <div
            style={{
              width: "0.4rem",
              height: "0.4rem",
              "margin-top": "0.6rem",
              "border-radius": "1rem",
              "background-color": "accent.customOrange",
            }}
          />
        </Show>
      </Stack>

      <Show when={props.carrier && props.carrier!.id}>
        <div style={{ width: "100%", display: "flex" }}>
          <Text
            fontWeight="bold"
            height="1rem"
            width={`calc(100% - 2rem)`}
            color="fg.default"
            marginBottom="0.5rem"
          >
            Carrier {props.carrier!.id}
          </Text>
          <Tooltip.Root>
            <Tooltip.Trigger width="min-content">
              <Badge
                style={{
                  width: "min-content",
                  "border-width": "0",
                }}
                size="sm"
                backgroundColor={
                  props.carrier!.casDisabled
                    ? "accent.customOrange"
                    : props.carrier!.casTriggered
                      ? "accent.customGreen"
                      : "bg.emphasized"
                }
              >
                CAS
              </Badge>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <Text>
                  {props.carrier!.casDisabled
                    ? "Disabled"
                    : props.carrier!.casTriggered
                      ? "Triggered"
                      : "Enabled"}
                </Text>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </div>
        <Show when={props.carrier!.state}>
          <Stack direction="row" gap="0">
            <Text width="3rem" size="sm" fontWeight="bold">
              State
            </Text>
            <Tooltip.Root>
              <Tooltip.Trigger width={`calc(100% - 3rem)`}>
                <Text
                  width="100%"
                  size="sm"
                  style={{
                    "white-space": "nowrap",
                    display: "block",
                    overflow: "hidden",
                    "text-overflow": `ellipsis`,
                    "user-select": "none",
                    "text-align": "left",
                  }}
                >
                  {props.carrier!.state
                    ? Response_Track_Carrier_State_State[props.carrier!.state]
                        .toString()
                        .replace("CARRIER_STATE_", "")
                    : ""}
                </Text>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  {props.carrier!.state
                    ? Response_Track_Carrier_State_State[props.carrier!.state]
                        .toString()
                        .replace("CARRIER_STATE_", "")
                    : ""}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Stack>
        </Show>

        <Show when={props.carrier!.position}>
          <Stack direction="row" gap="0">
            <Text width="3rem" size="sm" fontWeight="bold">
              Pos
            </Text>
            <Text
              width={`calc(100% - 3rem)`}
              size="sm"
              style={{
                "text-overflow": "ellipsis",
                "white-space": "nowrap",
                display: "block",
                overflow: "hidden",
                "text-align": "right",
                "font-family": "monospace",
              }}
            >
              {`${props.carrier!.position!.toFixed(6)}m`}
            </Text>
          </Stack>
        </Show>
      </Show>
    </Stack>
  );
}

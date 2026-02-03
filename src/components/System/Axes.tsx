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
} from "../proto/mmc/info_pb.ts";
import { AxisControlProps, AxisControlButton } from "./AxisControlButton.tsx";

export type AxisProps = AxisControlProps & {
  id: string;
  axisInfo: Response_Track_Axis_State;
  axisError: Response_Track_Axis_Error;
  carrier: Response_Track_Carrier_State[] | null;
};

export function Axis(props: AxisProps) {
  const axisId = Number(props.id.split(":")[1]);

  const carrierState = () => {
    if (!props.carrier) return null;
    const carrierId = props.axisInfo.carrier;
    if (carrierId === 0) return null;
    const carrier = props.carrier!.filter(
      (carrier) => carrier.id === carrierId,
    );
    if (carrier[0]) {
      return carrier[0];
    }
    return null;
  };

  return (
    <Stack
      width="10rem"
      height="8rem"
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
      paddingTop="0.2rem"
      gap="0"
    >
      <Stack
        height="2rem"
        width="100%"
        borderBottomWidth="0.02px"
        gap="1"
        direction="row"
        borderColor="bg.muted"
        marginBottom="0.2rem"
      >
        <div
          style={{
            display: "flex",
            "align-items": "center",
            height: "100%",
            width: `calc(100% - 1em)`,
          }}
        >
          <Tooltip.Root>
            <Tooltip.Trigger width="min-content">
              <Badge
                width="min-content"
                backgroundColor={
                  props.axisInfo.waitingPull || props.axisInfo.waitingPush
                    ? "accent.customOrange"
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

            <Tooltip.Positioner>
              <Tooltip.Content>
                <Text>Info</Text>
                <For each={Object.entries(props.axisInfo)}>
                  {([key, value]) => {
                    if (typeof value == "boolean" && key.includes("waiting")) {
                      const prettierLabel = `${key[0].toUpperCase()}${key.slice(1, key.length)}`;
                      return (
                        <Text fontWeight="medium" opacity={value ? "1" : "0.4"}>
                          {prettierLabel}
                        </Text>
                      );
                    }
                  }}
                </For>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>

          <Show when={props.axisError.overcurrent}>
            <Tooltip.Root>
              <Tooltip.Trigger width="min-content">
                <Stack
                  backgroundColor="red.9"
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    "border-radius": "1rem",
                    "margin-left": "0.5em",
                  }}
                />
              </Tooltip.Trigger>

              <Tooltip.Positioner>
                <Tooltip.Content>
                  <Text>Error</Text>
                  <For each={Object.entries(props.axisError)}>
                    {([key, value]) => {
                      if (typeof value === "boolean" && value) {
                        const prettierLabel = `${key[0].toUpperCase()}${key.slice(1, key.length)}`;
                        return <Text fontWeight="medium">{prettierLabel}</Text>;
                      }
                    }}
                  </For>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Show>
        </div>
        <AxisControlButton
          variant={"ghost"}
          size="sm"
          borderRadius={"1em"}
          height="2rem"
          style={{ padding: "0" }}
          hasCarrier={
            props.carrier &&
            props.carrier.some(
              (carrier) =>
                carrier.axisMain === axisId ||
                (carrier.axisAuxiliary && carrier.axisAuxiliary === axisId),
            )
              ? true
              : false
          }
          sendingCommand={props.sendingCommand}
          disableCommandButton={props.disableCommandButton}
          disableMmcCliButton={props.disableMmcCliButton}
          stopPullDisabled={!props.axisInfo.waitingPull === true}
          stopPushDisabled={!props.axisInfo.waitingPush === true}
          onPull={(axisDirection, carrierId, cas, destination) =>
            props.onPull?.(axisDirection, carrierId, cas, destination)
          }
          onPush={(axisDirection, carrierId) => {
            props.onPush?.(axisDirection, carrierId);
          }}
          onStopPush={() => props.onStopPush?.()}
          onStopPull={() => props.onStopPull?.()}
          onStopCommand={() => props.onStopCommand?.()}
          onIntialize={(direction, carrierId, axisLink) =>
            props.onIntialize?.(direction, carrierId, axisLink)
          }
          onDeintialize={() => props.onDeintialize?.()}
        />
      </Stack>

      <Show when={carrierState()}>
        <div style={{ width: "100%", display: "flex" }}>
          <Text
            fontWeight="bold"
            height="1rem"
            width={`calc(100% - 2rem)`}
            color="fg.default"
            marginBottom="0.5rem"
          >
            Carrier {carrierState()!.id}
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
                  carrierState()!.casDisabled
                    ? "accent.customOrange"
                    : carrierState()!.casTriggered
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
                  {carrierState()!.casDisabled
                    ? "Disabled"
                    : carrierState()!.casTriggered
                      ? "Triggered"
                      : "Enabled"}
                </Text>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </div>

        <Show when={carrierState()!.position}>
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
              {`${(carrierState()!.position! * 1000).toFixed(3)}mm`}
            </Text>
          </Stack>
        </Show>
        <Stack direction="row" gap="0">
          <Text width="3rem" size="sm" fontWeight="bold">
            State
          </Text>
          <Tooltip.Root>
            <Tooltip.Trigger width={`calc(100% - 3rem)`}>
              <Text width="100%" size="sm" textAlign={"left"}>
                {typeof carrierState()!.state === "number"
                  ? Response_Track_Carrier_State_State[carrierState()!.state]
                      .toString()
                      .split(`_`)
                      .splice(2)
                      .toString()
                      .replaceAll(`,`, " ")
                  : ""}
              </Text>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                {typeof carrierState()!.state === "number"
                  ? Response_Track_Carrier_State_State[carrierState()!.state]
                      .toString()
                      .split(`_`)
                      .splice(2)
                      .toString()
                      .replaceAll(`,`, " ")
                  : ""}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Stack>
      </Show>
    </Stack>
  );
}

import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text.tsx";
import { For, Show } from "solid-js/web";
import { Badge } from "~/components/ui/badge.tsx";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import {
  Response_Line_Axis_Error,
  Response_Line_Axis_State,
  Response_Line_Carrier_State,
  Response_Line_Carrier_State_State,
} from "~/proto/mmc/info_pb.ts";
import { AxisControlProps, AxisControlButton } from "./AxisControlButton.tsx";

export type AxisProps = AxisControlProps & {
  id: string;
  axisInfo: Response_Line_Axis_State;
  axisError: Response_Line_Axis_Error;
  carrier: Response_Line_Carrier_State[] | null;
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
          <Tooltip content={
            <>
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
            </>
          }>
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
                <Text textStyle="sm">Axis {axisId}</Text>
              </Badge>
          </Tooltip>

          <Show when={props.axisError.overcurrent}>
            <Tooltip content={
              <>
                <Text>Error</Text>
                <For each={Object.entries(props.axisError)}>
                  {([key, value]) => {
                    if (typeof value === "boolean" && value) {
                      const prettierLabel = `${key[0].toUpperCase()}${key.slice(1, key.length)}`;
                      return <Text fontWeight="medium">{prettierLabel}</Text>;
                    }
                  }}
                </For>
              </>
            }>
                <Stack
                  backgroundColor="red.9"
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    "border-radius": "1rem",
                    "margin-left": "0.5em",
                  }}
                />
            </Tooltip>
          </Show>
        </div>
        <AxisControlButton
          variant={"plain"}
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
          onInitialize={(direction, carrierId, axisLink) =>
            props.onInitialize?.(direction, carrierId, axisLink)
          }
          onDeinitialize={() => props.onDeinitialize?.()}
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
          <Tooltip content={
            <Text>
              {carrierState()!.casDisabled
                ? "Disabled"
                : carrierState()!.casTriggered
                  ? "Triggered"
                  : "Enabled"}
            </Text>

          }>
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
          </Tooltip>
        </div>

        <Show when={carrierState()!.position}>
          <Stack direction="row" gap="0">
            <Text width="3rem" textStyle="sm" fontWeight="bold">
              Pos
            </Text>
            <Text
              width={`calc(100% - 3rem)`}
              textStyle="sm"
              style={{
                "text-overflow": "ellipsis",
                "white-space": "nowrap",
                display: "block",
                overflow: "hidden",
                "text-align": "right",
                "font-family": "monospace",
              }}
            >
              {`${carrierState()!.position!.toFixed(3)}mm`}
            </Text>
          </Stack>
        </Show>
        <Stack direction="row" gap="0">
          <Text width="3rem" textStyle="sm" fontWeight="bold">
            State
          </Text>
          <Tooltip content={
            typeof carrierState()!.state === "number"
              ? Response_Line_Carrier_State_State[carrierState()!.state]
                  .toString()
                  .split(`_`)
                  .splice(2)
                  .toString()
                  .replaceAll(`,`, " ")
              : ""
          }>
              <Text width="100%" textStyle="sm" textAlign={"left"}>
                {typeof carrierState()!.state === "number"
                  ? Response_Line_Carrier_State_State[carrierState()!.state]
                      .toString()
                      .split(`_`)
                      .splice(2)
                      .toString()
                      .replaceAll(`,`, " ")
                  : ""}
              </Text>

          </Tooltip>
        </Stack>
      </Show>
    </Stack>
  );
}

import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text.tsx";
import { Show } from "solid-js/web";
import { useAxesContext } from "./Driver.tsx";
import { Badge } from "../ui/badge.tsx";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";
import { Tooltip } from "../ui/tooltip.tsx";

export type AxisProps = {
  axisInfo: mmc.info.Response.System.Axis.IInfo[];
  axisError: mmc.info.Response.System.Axis.IError[];
  carrier?: mmc.info.Response.System.Carrier.IInfo[] | null;
};

export function Axis(props: AxisProps) {
  const axisContext = useAxesContext();
  if (!axisContext) return;
  const axisId = Number(axisContext.id.split(":")[1]);
  const axisIndex = axisId - 1;

  const axisInfo = (): mmc.info.Response.System.Axis.IInfo => {
    return props.axisInfo[axisIndex];
  };

  const axisError = (): mmc.info.Response.System.Axis.IError => {
    return props.axisError[axisIndex];
  };

  const carrier = (): mmc.info.Response.System.Carrier.IInfo | null => {
    if (props.carrier && props.carrier.length > 0) {
      const parseCarrier = props.carrier.filter(
        (carrier) =>
          carrier.axis!.auxiliary === axisId || carrier.axis!.main === axisId,
      );
      return parseCarrier.length > 0 ? parseCarrier[0] : null;
    } else {
      return null;
    }
  };

  return (
    <Stack
      width="9rem"
      height="7rem"
      borderRadius="0.5rem"
      borderWidth="1px"
      borderRightWidth={
        axisInfo().hallAlarm && axisInfo().hallAlarm!.front ? "5px" : "1px"
      }
      borderLeftWidth={
        axisInfo()!.hallAlarm && axisInfo()!.hallAlarm!.back ? "5px" : "1px"
      }
      borderRightColor={
        axisInfo()!.hallAlarm && axisInfo()!.hallAlarm!.front
          ? "accent.customGreen"
          : undefined
      }
      borderLeftColor={
        axisInfo()!.hallAlarm && axisInfo()!.hallAlarm!.back
          ? "accent.customGreen"
          : undefined
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
        <Badge
          width="min-content"
          backgroundColor={
            axisError().overcurrent
              ? "red"
              : axisInfo()!.motorEnabled
                ? "accent.customGreen"
                : "bg.emphasized"
          }
          paddingLeft="0.5rem"
          paddingRight="0.5rem"
          height="min-content"
          borderWidth="0"
        >
          <Text
            color={axisError().overcurrent ? "#ffffff" : "fg.default"}
            size="sm"
            fontWeight="medium"
          >
            Axis {axisId}
          </Text>
        </Badge>

        <Show when={axisInfo()!.waitingPull || axisInfo()!.waitingPush}>
          <Badge
            width="min-content"
            height="min-content"
            paddingLeft="0.5rem"
            paddingRight="0.5rem"
            borderWidth="0"
          >
            <Text width="100%" size="sm">
              {axisInfo()!.waitingPush
                ? axisInfo()!.waitingPull
                  ? "Waiting pull push"
                  : "Waiting push"
                : axisInfo()!.waitingPull
                  ? "Waiting pull"
                  : ""}
            </Text>
          </Badge>
        </Show>
      </Stack>

      <Show when={carrier() && carrier()!.id}>
        <div style={{ width: "100%", display: "flex" }}>
          <Text
            fontWeight="bold"
            height="1rem"
            width={`calc(100% - 2rem)`}
            color="fg.default"
            marginBottom="0.5rem"
          >
            Carrier {carrier()!.id}
          </Text>
          <Badge
            style={{
              width: "min-content",
              "border-width": "0",
              "margin-top": "0.2rem",
            }}
            size="sm"
            backgroundColor={
              carrier()!.cas
                ? carrier()!.cas!.triggered
                  ? "red"
                  : carrier()!.cas!.enabled
                    ? "accent.customGreen"
                    : "bg.emphasized"
                : "bg.emphasized"
            }
            color={
              carrier()!.cas && carrier()!.cas!.triggered
                ? "white"
                : "fg.default"
            }
          >
            CAS
          </Badge>
        </div>
        <Show when={carrier()!.state}>
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
                  {carrier()!.state
                    ? mmc.info.Response.System.Carrier.Info.State[
                        `${carrier()!.state}` as keyof typeof mmc.info.Response.System.Carrier.Info.State
                      ]
                        .toString()
                        .replace("CARRIER_STATE_", "")
                    : ""}
                </Text>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  {carrier()!.state
                    ? mmc.info.Response.System.Carrier.Info.State[
                        `${carrier()!.state}` as keyof typeof mmc.info.Response.System.Carrier.Info.State
                      ]
                        .toString()
                        .replace("carrier_STATE_", "")
                    : ""}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Stack>
        </Show>

        <Show when={carrier()!.position}>
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
              {carrier()!.position!.toFixed(6)}
            </Text>
          </Stack>
        </Show>
      </Show>
    </Stack>
  );
}

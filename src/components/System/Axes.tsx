import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text.tsx";
import { Show } from "solid-js/web";
import { useAxesContext } from "./Station.tsx";
import { Badge } from "../ui/badge.tsx";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";
import { Tooltip } from "../ui/tooltip.tsx";

export function Axis() {
  const axesContext = useAxesContext();
  if (!axesContext) return;

  const axisId = Number(axesContext.id.split(":")[1]);

  return (
    <Stack
      width="13rem"
      height="8rem"
      borderRadius="0.5rem"
      borderWidth="1px"
      borderRightWidth={
        axesContext.axisInfo.hallAlarm && axesContext.axisInfo.hallAlarm!.front
          ? "5px"
          : "1px"
      }
      borderLeftWidth={
        axesContext.axisInfo.hallAlarm && axesContext.axisInfo.hallAlarm!.back
          ? "5px"
          : "1px"
      }
      borderRightColor={
        axesContext.axisInfo.hallAlarm && axesContext.axisInfo.hallAlarm!.front
          ? "accent.customGreen"
          : undefined
      }
      borderLeftColor={
        axesContext.axisInfo.hallAlarm && axesContext.axisInfo.hallAlarm!.back
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
            axesContext.axisError.overcurrent
              ? "red"
              : axesContext.axisInfo.motorEnabled
                ? "accent.customGreen"
                : "bg.emphasized"
          }
          paddingLeft="0.5rem"
          paddingRight="0.5rem"
          height="min-content"
          borderWidth="0"
        >
          <Text
            color={axesContext.axisError.overcurrent ? "#ffffff" : "fg.default"}
            size="sm"
            fontWeight="medium"
          >
            Axis {axisId}
          </Text>
        </Badge>

        <Show
          when={
            axesContext.axisInfo.waitingPull || axesContext.axisInfo.waitingPush
          }
        >
          <Badge
            width="min-content"
            height="min-content"
            paddingLeft="0.5rem"
            paddingRight="0.5rem"
            borderWidth="0"
          >
            <Text width="100%" size="sm">
              {axesContext.axisInfo.waitingPush
                ? axesContext.axisInfo.waitingPull
                  ? "Waiting pull push"
                  : "Waiting push"
                : axesContext.axisInfo.waitingPull
                  ? "Waiting pull"
                  : ""}
            </Text>
          </Badge>
        </Show>
      </Stack>

      <Show when={axesContext.carrierInfo}>
        <Show when={axesContext.carrierInfo.id}>
          <Text
            fontWeight="bold"
            height="1rem"
            width="100%"
            color="fg.default"
            marginBottom="0.5rem"
          >
            Carrier {axesContext.carrierInfo!.id}
          </Text>
        </Show>
        <Show when={axesContext.carrierInfo.state}>
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
                  {axesContext.carrierInfo && axesContext.carrierInfo!.state
                    ? mmc.info.Response.System.Carrier.Info.State[
                        `${axesContext.carrierInfo!.state}` as keyof typeof mmc.info.Response.System.Carrier.Info.State
                      ]
                        .toString()
                        .replace("CARRIER_STATE_", "")
                    : ""}
                </Text>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  {axesContext.carrierInfo && axesContext.carrierInfo!.state
                    ? mmc.info.Response.System.Carrier.Info.State[
                        `${axesContext.carrierInfo!.state}` as keyof typeof mmc.info.Response.System.Carrier.Info.State
                      ]
                        .toString()
                        .replace("CARRIER_STATE_", "")
                    : ""}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Stack>
        </Show>

        <Show when={axesContext.carrierInfo!.position}>
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
              {axesContext.carrierInfo!.position!.toFixed(6)}
            </Text>
          </Stack>
          <Stack direction="row" gap="0">
            <Text width="3rem" size="sm" fontWeight="bold">
              CAS
            </Text>
            <Show
              when={
                axesContext.carrierInfo &&
                axesContext.carrierInfo!.cas &&
                axesContext.carrierInfo!.cas!.triggered
              }
            >
              <Text size="sm">Triggered</Text>
            </Show>
            <Show
              when={
                axesContext.carrierInfo &&
                axesContext.carrierInfo!.cas &&
                axesContext.carrierInfo!.cas!.enabled
              }
            >
              <Text size="sm">Enabled</Text>
            </Show>
          </Stack>
        </Show>
      </Show>
    </Stack>
  );
}

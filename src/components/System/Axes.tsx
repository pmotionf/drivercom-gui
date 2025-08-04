import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text.tsx";
import { Show } from "solid-js/web";
import { AxesContext } from "./Station.tsx";
import { useContext } from "solid-js";
import { Badge } from "../ui/badge.tsx";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";

export function Axis() {
  const axesContext = useContext(AxesContext);
  if (!axesContext) return;

  return (
    <Stack
      width="13rem"
      height="8rem"
      borderRadius="0.5rem"
      borderWidth="1px"
      borderRightWidth={
        axesContext.axes.hallAlarm && axesContext.axes.hallAlarm.front
          ? "5px"
          : "1px"
      }
      borderLeftWidth={
        axesContext.axes.hallAlarm && axesContext.axes.hallAlarm.back
          ? "5px"
          : "1px"
      }
      borderRightColor={
        axesContext.axes.hallAlarm && axesContext.axes.hallAlarm.front
          ? "accent.customGreen"
          : undefined
      }
      borderLeftColor={
        axesContext.axes.hallAlarm && axesContext.axes.hallAlarm.back
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
            axesContext.axesErrors.overcurrent
              ? "red"
              : axesContext.axes.motorEnabled
                ? "accent.customGreen"
                : "bg.emphasized"
          }
          paddingLeft="0.5rem"
          paddingRight="0.5rem"
          height="min-content"
          borderWidth="0"
        >
          <Text
            color={
              axesContext.axesErrors.overcurrent ? "#ffffff" : "fg.default"
            }
            size="sm"
            fontWeight="medium"
          >
            Axis {axesContext.id.split(":")[1]}
          </Text>
        </Badge>

        <Show
          when={axesContext.axes.waitingPull || axesContext.axes.waitingPush}
        >
          <Badge
            width="min-content"
            height="min-content"
            paddingLeft="0.5rem"
            paddingRight="0.5rem"
            borderWidth="0"
          >
            <Text width="100%" size="sm">
              {axesContext.axes.waitingPush
                ? axesContext.axes.waitingPull
                  ? "Waiting pull push"
                  : "Waiting push"
                : axesContext.axes.waitingPull
                  ? "Waiting pull"
                  : ""}
            </Text>
          </Badge>
        </Show>
      </Stack>

      <Show when={axesContext.axes.carrierId}>
        <Text
          fontWeight="bold"
          height="1rem"
          width="100%"
          color="fg.default"
          marginBottom="0.5rem"
        >
          Carrier {axesContext.axes.carrierId}
        </Text>

        <Stack direction="row" gap="0">
          <Text width="3rem" size="sm" fontWeight="bold">
            State
          </Text>
          <Text
            width={`calc(100% - 3rem)`}
            size="sm"
            textAlign="right"
            style={{
              "white-space": "nowrap",
              display: "block",
              overflow: "hidden",
              "text-overflow": `ellipsis`,
              "user-select": "none",
            }}
          >
            {axesContext.carrierInfo && axesContext.carrierInfo.state
              ? mmc.info.Response.System.Carrier.Info.State[
                  `${axesContext.carrierInfo.state}` as keyof typeof mmc.info.Response.System.Carrier.Info.State
                ]
                  .toString()
                  .replace("CARRIER_STATE_", "")
              : ""}
          </Text>
        </Stack>
        <Show when={axesContext.carrierInfo}>
          <Stack direction="row" gap="0">
            <Text width="3rem" size="sm" fontWeight="bold">
              CAS
            </Text>
            <Stack width={`calc(100% - 3rem)`}>
              <Show
                when={
                  axesContext.carrierInfo &&
                  axesContext.carrierInfo.cas &&
                  axesContext.carrierInfo.cas.triggered
                }
              >
                <Text size="sm">Triggered</Text>
              </Show>
              <Show
                when={
                  axesContext.carrierInfo &&
                  axesContext.carrierInfo.cas &&
                  axesContext.carrierInfo.cas.enabled
                }
              >
                <Text size="sm">Enabled</Text>
              </Show>
            </Stack>
          </Stack>
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
        </Show>
      </Show>
    </Stack>
  );
}

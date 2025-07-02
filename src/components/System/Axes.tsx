import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text.tsx";
import { Show } from "solid-js/web";
import { AxesContext } from "./Station.tsx";
import { useContext } from "solid-js";
import { Badge } from "../ui/badge.tsx";

export type AxesInfo = {
  hallAlarm?: { front?: boolean; back?: boolean };
  motorEnabled?: boolean;
  carrierId?: number;
  waitingPull?: boolean;
  waitingPush?: boolean;
  overCurrent?: boolean;
};

export type CarrierInfo = {
  state: string;
  location: number;
  mainAxisId: number;
  auxAxisId: number;
};

export function Axis() {
  const axesContext:
    | { axes: AxesInfo; id: string; carrierInfo?: CarrierInfo }
    | undefined = useContext(AxesContext);
  if (!axesContext) return;

  return (
    <Stack
      width="9rem"
      height="9rem"
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
        direction="column"
        paddingBottom="0.3rem"
        borderColor="bg.muted"
      >
        <Badge
          width="min-content"
          backgroundColor={
            axesContext.axes.overCurrent
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
            color={axesContext.axes.overCurrent ? "#ffffff" : "fg.default"}
            size="sm"
            fontWeight="medium"
          >
            Axis {axesContext.id.split(":")[1]}
          </Text>
        </Badge>
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
        <Show when={axesContext.carrierInfo}>
          <Text width="100%" size="sm">
            {axesContext.carrierInfo!.state.replace("STATE_POS_", "")}
          </Text>
          <Text width="100%" size="sm">
            {axesContext.carrierInfo!.location}
          </Text>
        </Show>
      </Show>

      <Show when={axesContext.axes.waitingPush}>
        <Text width="100%" size="sm">
          Waiting push
        </Text>
      </Show>
      <Show when={axesContext.axes.waitingPull}>
        <Text width="100%" size="sm">
          Waiting pull
        </Text>
      </Show>
    </Stack>
  );
}

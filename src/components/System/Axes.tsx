import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import { Show } from "solid-js/web";
import { AxesContext } from "./Station";
import { useContext } from "solid-js";

export type AxesInfo = {
  hallAlarm?: { front?: boolean; back?: boolean };
  motorEnabled?: boolean;
  carrierId?: number;
  waitingPull?: boolean;
  waitingPush?: boolean;
  overCurrent?: boolean;
};

export function Axis() {
  const axesContext: { axes: AxesInfo; id: string } | undefined = useContext(
    AxesContext,
  );
  if (!axesContext) return;

  return (
    <Stack
      width="9rem"
      height="9rem"
      borderRadius="0.5rem"
      borderWidth="1px"
      borderRightWidth={axesContext.axes.hallAlarm &&
          axesContext.axes.hallAlarm.front
        ? "3px"
        : "1px"}
      borderLeftWidth={axesContext.axes.hallAlarm &&
          axesContext.axes.hallAlarm.back
        ? "3px"
        : "1px"}
      borderRightColor={axesContext.axes.hallAlarm &&
          axesContext.axes.hallAlarm.front
        ? "lime"
        : undefined}
      borderLeftColor={axesContext.axes.hallAlarm &&
          axesContext.axes.hallAlarm.back
        ? "lime"
        : undefined}
      backgroundColor="bg.default"
      padding="0.5rem"
      gap="0"
    >
      <Text fontWeight="bold">Axis {axesContext.id.split(":")[1]}</Text>
      <Show when={axesContext.axes.carrierId}>
        <Text fontWeight="bold" size="sm">
          Carrier {axesContext.axes.carrierId}
        </Text>
      </Show>
      <Show when={axesContext.axes.motorEnabled}>
        <Text width="100%" size="sm">
          Motor Enabled
        </Text>
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
      <Show when={axesContext.axes.overCurrent}>
        <Text width="100%" size="sm">
          Over current
        </Text>
      </Show>
    </Stack>
  );
}

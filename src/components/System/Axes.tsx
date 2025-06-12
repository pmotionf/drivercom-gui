import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import { Show } from "solid-js/web";
import { AxesContext } from "./Station";
import { useContext } from "solid-js";
import { createEffect } from "solid-js";

export type AxesInfo = {
  hallAlarm?: { front?: boolean; back?: boolean };
  motorEnabled?: boolean;
  carrierId?: number;
  waitingPull?: boolean;
  waitingPush?: boolean;
  overCurrent?: boolean;
};

export function Axis() {
  const axesContext: AxesInfo | undefined = useContext(AxesContext);
  if (!axesContext) return;
  createEffect(() => {
    console.log(axesContext);
  });

  return (
    <Stack
      width="9rem"
      height="9rem"
      borderRadius="0.5rem"
      borderWidth="1px"
      borderRightWidth={axesContext.hallAlarm && axesContext.hallAlarm.front
        ? "3px"
        : "1px"}
      borderLeftWidth={axesContext.hallAlarm && axesContext.hallAlarm.back
        ? "3px"
        : "1px"}
      borderRightColor={axesContext.hallAlarm && axesContext.hallAlarm.front
        ? "lime"
        : undefined}
      borderLeftColor={axesContext.hallAlarm && axesContext.hallAlarm.back
        ? "lime"
        : undefined}
      backgroundColor="bg.default"
      padding="0.5rem"
      gap="0"
    >
      <Text fontWeight="bold">Axis</Text>
      <Show when={axesContext.carrierId}>
        <Text fontWeight="bold" size="sm">
          Carrier {axesContext.carrierId}
        </Text>
      </Show>
      <Show when={axesContext.motorEnabled}>
        <Text width="100%" size="sm">
          Motor Enabled
        </Text>
      </Show>
      <Show when={axesContext.waitingPush}>
        <Text width="100%" size="sm">
          Waiting push
        </Text>
      </Show>
      <Show when={axesContext.waitingPull}>
        <Text width="100%" size="sm">
          Waiting pull
        </Text>
      </Show>
      <Show when={axesContext.overCurrent}>
        <Text width="100%" size="sm">
          Over current
        </Text>
      </Show>
    </Stack>
  );
}

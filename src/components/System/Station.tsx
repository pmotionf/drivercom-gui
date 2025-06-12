import { Show, useContext } from "solid-js";
import { LineContext, useLineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { Text } from "../ui/text.tsx";
import { createEffect } from "solid-js";
import { createSignal } from "solid-js";
import { createContext } from "solid-js";
import { Store } from "solid-js/store";
import { AxesInfo } from "./Axes.tsx";

export const AxesContext = createContext<[AxesInfo | undefined, number]>();

export function Station() {
  const axesContext = useContext(LineContext);
  if (!axesContext) return;

  const axesArray = (axisLength: number): number[][] => {
    const prevAxes = Array.from({ length: axisLength }, (_, i) => i);

    const newAxes = Array.from({ length: axisLength / 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, index) => prevAxes[i * 3 + index]),
    );
    return newAxes;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        "overflow-x": "auto",
        "overflow-y": "hidden",
      }}
    >
      <Stack direction="row" width="100%" gap="1rem">
        <For each={axesArray(axesContext.axes)}>
          {(axes, index) => (
            <Stack
              width="29rem"
              height="10rem"
              marginBottom="1rem"
              direction="row"
              gap="0.5rem"
              borderRadius="0.2rem"
              padding="0.5rem"
              paddingBottom="1rem"
              borderWidth="1px"
              backgroundColor="bg.muted"
            >
              <For each={axes}>
                {(axis) => {
                  const [frontSensor, setFrontSensor] =
                    createSignal<boolean>(false);
                  const [backSensor, setBackSensor] =
                    createSignal<boolean>(false);
                  const [carrierId, setCarrierId] = createSignal<number | null>(
                    null,
                  );
                  const [moter, setMoter] = createSignal<boolean>(false);
                  const [waitingPull, setWaitingPull] =
                    createSignal<boolean>(false);
                  const [waitingPush, setWaitingPush] =
                    createSignal<boolean>(false);
                  const [overCurrent, setOverCurrent] =
                    createSignal<boolean>(false);

                  createEffect(() => {
                    if (axesContext.axesInfo && axesContext.axesInfo[axis]) {
                      const axisInfo = JSON.parse(
                        JSON.stringify(axesContext.axesInfo[axis]),
                      );
                      const hallSensor = axisInfo.hallAlarm;

                      if (axisInfo.carrierId) {
                        setCarrierId(axisInfo.carrierId);
                      } else {
                        setCarrierId(null);
                      }

                      if (axisInfo.motorEnabled) {
                        setMoter(axisInfo.motorEnabled);
                      } else {
                        setMoter(false);
                      }

                      if (axisInfo.waitingPush) {
                        setWaitingPush(axisInfo.waitingPush);
                      } else {
                        setWaitingPush(false);
                      }

                      if (axisInfo.waitingPull) {
                        setWaitingPull(axisInfo.waitingPull);
                      } else {
                        setWaitingPull(false);
                      }

                      if (axisInfo.overCurrent) {
                        setOverCurrent(axisInfo.overCurrent);
                      } else {
                        setOverCurrent(false);
                      }

                      if (hallSensor) {
                        if (hallSensor.front) {
                          setFrontSensor(hallSensor.front);
                        } else {
                          setFrontSensor(false);
                        }
                        if (hallSensor.back) {
                          setBackSensor(hallSensor.back);
                        } else {
                          setBackSensor(false);
                        }
                      } else {
                        setFrontSensor(false);
                        setBackSensor(false);
                      }
                    }
                  });

                  return (
                    <>
                      <Stack
                        width="9rem"
                        height="9rem"
                        borderRadius="0.5rem"
                        borderWidth="1px"
                        borderRightWidth={frontSensor() ? "3px" : "1px"}
                        borderLeftWidth={backSensor() ? "3px" : "1px"}
                        borderRightColor={frontSensor() ? "lime" : undefined}
                        borderLeftColor={backSensor() ? "lime" : undefined}
                        backgroundColor="bg.default"
                        padding="0.5rem"
                        gap="0"
                      >
                        <Text fontWeight="bold">Axis {axis + 1}</Text>
                        <Show when={carrierId()}>
                          <Text fontWeight="bold" size="sm">
                            Carrier {carrierId()}
                          </Text>
                        </Show>
                        <Show when={moter()}>
                          <Text width="100%" size="sm">
                            Moter Enabled
                          </Text>
                        </Show>
                        <Show when={waitingPush()}>
                          <Text width="100%" size="sm">
                            Waiting push
                          </Text>
                        </Show>
                        <Show when={waitingPull()}>
                          <Text width="100%" size="sm">
                            Waiting pull
                          </Text>
                        </Show>
                        <Show when={overCurrent()}>
                          <Text width="100%" size="sm">
                            Over current
                          </Text>
                        </Show>
                      </Stack>
                    </>
                  );
                }}
              </For>
            </Stack>
          )}
        </For>
      </Stack>
    </div>
  );
}

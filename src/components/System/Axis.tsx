import { useContext } from "solid-js";
import { LineContext, useLineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { Text } from "../ui/text.tsx";
import { createEffect } from "solid-js";

export function Axis() {
  const axesContext = useContext(LineContext);
  if (!axesContext) return;

  const axesArray = (axisLength: number): number[][] => {
    const prevAxes = Array.from({ length: axisLength }, (_, i) => i);

    const newAxes = Array.from({ length: axisLength / 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, index) => prevAxes[i * 3 + index]),
    );
    return newAxes;
  };

  createEffect(() => {
    console.log(axesContext.axesInfo![0]);
  });

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
              width="17rem"
              height="6rem"
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
                {(axis) => (
                  <Stack
                    width="5rem"
                    height="5rem"
                    borderRadius="0.5rem"
                    borderWidth="1px"
                    borderRightWidth={axesContext.axesInfo ? "3px" : "0px"}
                    borderLeftWidth={axesContext.axesInfo ? "3px" : "0px"}
                    borderRightColor="lime"
                    borderLeftColor="lime"
                    backgroundColor="bg.default"
                  >
                    <Text fontWeight="bold" padding="0.5rem">
                      Axis{axis + 1}
                    </Text>
                  </Stack>
                )}
              </For>
            </Stack>
          )}
        </For>
      </Stack>
    </div>
  );
}
